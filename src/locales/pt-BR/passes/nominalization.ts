import type { Finding, Pass } from "@/lucid/core/types";
import type { LightVerbForm, NominalizationEntry } from "../datasets/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "nominalization";
const PRINCIPLE = "5.3.3";

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
      `Nominalização com verbo-suporte — o verbo "${baseVerb}" substitui a construção ` +
      "diretamente, e o mapeamento é único e seguro. A ferramenta não reescreve: devolva " +
      "a ação ao verbo na sua edição, ou peça a reescrita à IA — a engine verifica o resultado."
    );
  }

  return (
    `Nominalização com verbo-suporte — o verbo "${baseVerb}" poderia substituir a ` +
    "construção diretamente, mas o mapeamento desta palavra para um único verbo não é " +
    "seguro o bastante; a escolha do verbo é decisão sua."
  );
}

export const nominalizationPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["verbos-leves.pt", "nominalizacoes.pt"],

  run(ctx) {
    if (!ctx.config.nominalization.enabled) return [];

    const findings: Finding[] = [];

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
          principle: PRINCIPLE,
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
