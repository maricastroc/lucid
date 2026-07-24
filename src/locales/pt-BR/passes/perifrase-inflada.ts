import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "perifrase_inflada";

export const perifraseInfladaPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["perifrases.pt"],

  run(ctx) {
    if (!ctx.config.perifraseInflada.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("perifrases.pt");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const enxuta = hit.entry.plain ? ` Muitas vezes cabe só “${hit.entry.plain}”.` : "";
        findings.push({
          criterion: CRITERION,
          category: "lexical",
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
