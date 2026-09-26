import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "../../_shared";
import type { PtConfig } from "../config";

const CRITERION = "perifrase_inflada";

export const perifraseInfladaPass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["perifrases.pt"],

  run(ctx) {
    if (!ctx.config.perifraseInflada.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("perifrases.pt");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const next = hit.entry.plain
          ? ` Forma enxuta registrada: “${hit.entry.plain}”. Confira se ela se encaixa nesta frase, inclusive ` +
            "com o que vem depois."
          : " Escolha a palavra simples que diga o mesmo nesta frase.";
        findings.push({
          criterion: CRITERION,
          category: "lexical",
          span: { start: hit.start, end: hit.end, text: hit.text },
          severity: "warning",
          requiresHuman: true,
          justification: `Perífrase inflada: “${hit.text}” ocupa o lugar de uma palavra simples e alonga a frase.${next}`,
        });
      }
    }

    return findings;
  },
};
