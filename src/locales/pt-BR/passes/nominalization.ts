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

function buildJustification(safeMapping: boolean, baseVerb: string): string {
  if (safeMapping) {
    return (
      "Nominalização com verbo-suporte: a ação está escondida num substantivo, e o verbo que corresponde " +
      `a ele é um só: “${baseVerb}”. Reescreva com esse verbo, conjugado, e ajuste o complemento. ` +
      "O Lucid não reescreve a frase: ele verifica a sua versão ou a proposta da IA."
    );
  }

  return (
    "Nominalização com verbo-suporte: a ação está escondida num substantivo. Esta palavra pode " +
    `corresponder a mais de um verbo (o registrado é “${baseVerb}”), e só o contexto decide qual. ` +
    "Escolha o verbo que diz a ação nesta frase e reescreva com ele."
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

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: !safeMapping,
          justification: buildJustification(safeMapping, nominalization.verb),
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
