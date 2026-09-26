import type { PassFinding, Pass } from "@/lucid/core/types";
import type { LightVerbForm, NominalizationEntry } from "../datasets/types";
import { getPrepared } from "../datasets/registry";
import type { PtConfig } from "../config";

const CRITERION = "nominalization";

const LIGHT_VERB_FORMS: ReadonlyMap<string, LightVerbForm> = getPrepared("verbos-leves.pt");
const NOMINALIZATIONS: ReadonlyMap<string, NominalizationEntry> = getPrepared("nominalizacoes.pt");

const DIRECT_DETERMINERS = new Set(["o", "a", "os", "as", "um", "uma"]);
const A_CONTRACTIONS = new Set(["à", "ao", "às", "aos"]);

function connectorSetFor(pattern: "direct" | "a"): ReadonlySet<string> {
  return pattern === "direct" ? DIRECT_DETERMINERS : A_CONTRACTIONS;
}

function buildJustification(
  safeMapping: boolean,
  baseVerb: string,
  span: string,
  lightVerb: string,
  noun: string,
): string {
  const found = `“${span}” usa o verbo genérico “${lightVerb}” com a ação escrita como substantivo, “${noun}”.`;
  if (safeMapping) {
    return (
      `${found} Pela lista curada do Lucid, esse substantivo corresponde a um único verbo: “${baseVerb}”. ` +
      "O Lucid não reescreve a frase: ele verifica a sua versão ou a proposta da IA."
    );
  }

  return (
    `${found} Esse substantivo pode corresponder a mais de um verbo (o registrado é “${baseVerb}”), e só o ` +
    "contexto decide qual."
  );
}

export const nominalizationPass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["verbos-leves.pt", "nominalizacoes.pt"],

  run(ctx) {
    if (!ctx.config.nominalization.enabled) return [];

    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      for (let i = 0; i < tokens.length; i++) {
        const verbToken = tokens[i];
        if (!verbToken.isWord) continue;

        const verbForm = LIGHT_VERB_FORMS.get(verbToken.lower);
        if (!verbForm) continue;

        const connectorToken = tokens[i + 1];
        if (!connectorToken?.isWord) continue;
        if (!connectorSetFor(verbForm.pattern).has(connectorToken.lower)) continue;

        const nominalizationToken = tokens[i + 2];
        if (!nominalizationToken?.isWord) continue;
        const nominalization = NOMINALIZATIONS.get(nominalizationToken.lower);
        if (!nominalization) continue;

        const safeMapping = nominalization.safeForSuggestion;
        const start = verbToken.start;
        const end = nominalizationToken.end;
        const text = ctx.doc.source.slice(start, end);

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text },
          severity: "warning",
          requiresHuman: !safeMapping,
          justification: buildJustification(
            safeMapping,
            nominalization.verb,
            text.replace(/\s+/gu, " "),
            verbForm.lemma,
            nominalizationToken.text,
          ),
          meta: {
            lightVerb: verbForm.lemma,
            nominalization: nominalizationToken.lower,
            baseVerb: nominalization.verb,
          },
        });
      }
    }

    return findings;
  },
};
