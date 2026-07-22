/**
 * Pass "redundância" (pleonasmo e duplas redundantes) — `5.3.4` (frases concisas).
 *
 * "nula e sem efeito", "planejar antecipadamente", "certeza absoluta": um termo repete o sentido
 * do outro sem acrescentar informação. Léxico fechado e curado (`redundancias.pt`), casamento de
 * frase contígua (matcher compartilhado). Nunca aplica sozinho qual termo cortar (→ `requiresHuman`);
 * a forma enxuta vai só na justificativa.
 */
import type { Finding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "redundancia";
const PRINCIPLE = "5.3.4";

export const redundanciaPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  principle: PRINCIPLE,
  dataDeps: ["redundancias.pt"],

  run(ctx) {
    if (!ctx.config.redundancia.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("redundancias.pt");
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const enxuta = hit.entry.plain ? ` Bastaria “${hit.entry.plain}”.` : "";
        findings.push({
          criterion: CRITERION,
          category: "lexical",
          principle: PRINCIPLE,
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
