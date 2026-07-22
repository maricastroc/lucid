/**
 * Pass "perífrase inflada" — `5.3.4` (frases concisas).
 *
 * Locuções que ocupam o lugar de uma preposição/conjunção simples: "no sentido de" (→ "para"),
 * "com relação a" (→ "sobre"), "a fim de" (→ "para"). Léxico fechado e curado (`perifrases.pt`),
 * casamento de frase contígua (matcher compartilhado). Não troca sozinha (o encaixe depende do
 * contexto → `requiresHuman`); a forma enxuta vai na justificativa.
 */
import type { Finding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "perifrase_inflada";
const PRINCIPLE = "5.3.4";

export const perifraseInfladaPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  principle: PRINCIPLE,
  dataDeps: ["perifrases.pt"],

  run(ctx) {
    if (!ctx.config.perifraseInflada.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("perifrases.pt");
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const enxuta = hit.entry.plain ? ` Muitas vezes cabe só “${hit.entry.plain}”.` : "";
        findings.push({
          criterion: CRITERION,
          category: "lexical",
          principle: PRINCIPLE,
          span: { start: hit.start, end: hit.end, text: hit.text },
          severity: "warning",
          requiresHuman: true,
          justification:
            `Perífrase inflada — “${hit.text}” alonga a frase no lugar de uma palavra simples.${enxuta} ` +
            "A ferramenta não troca sozinha porque o encaixe depende do contexto.",
        });
      }
    }

    return findings;
  },
};
