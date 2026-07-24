import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "redundancia";

export const redundanciaPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["redundancias.pt"],

  run(ctx) {
    if (!ctx.config.redundancia.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("redundancias.pt");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const enxuta = hit.entry.plain ? ` Bastaria “${hit.entry.plain}”.` : "";
        findings.push({
          criterion: CRITERION,
          category: "lexical",
          span: { start: hit.start, end: hit.end, text: hit.text },
          severity: "warning",
          requiresHuman: true,
          justification:
            `Redundância — “${hit.text}” repete a mesma ideia em dois termos, sem acrescentar ` +
            `informação.${enxuta} A ferramenta não corta sozinha porque escolher o que remover é decisão sua.`,
        });
      }
    }

    return findings;
  },
};
