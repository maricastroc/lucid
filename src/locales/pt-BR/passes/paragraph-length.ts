/**
 * Pass "parágrafo longo" — `5.2` (Localizável: o leitor encontra a informação).
 *
 * Um parágrafo com frases demais vira um paredão difícil de varrer. Sinal ESTRUTURAL (primeiro
 * uso da camada de blocos): marca o parágrafo inteiro quando ele passa de `maxSentences` frases.
 * Divisão de trabalho: uma ÚNICA frase longa é assunto do `long_sentence` — este critério só olha
 * a CONTAGEM de frases do parágrafo, para não se sobrepor. Não junta/divide sozinho (→ `requiresHuman`).
 */
import type { Finding, Pass } from "@/lucid/core/types";

const CRITERION = "paragraph_length";
const PRINCIPLE = "5.2";

export const paragraphLengthPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.paragraphLength.enabled) return [];

    const max = ctx.config.paragraphLength.maxSentences;
    const findings: Finding[] = [];

    for (const paragraph of ctx.doc.blocks) {
      if (paragraph.kind !== "paragraph") continue;
      const n = paragraph.sentences.length;
      if (n <= max) continue;
      findings.push({
        criterion: CRITERION,
        category: "structural",
        principle: PRINCIPLE,
        span: { start: paragraph.start, end: paragraph.end, text: paragraph.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Parágrafo longo — ${n} frases num só bloco pesam a leitura e dificultam localizar a ` +
          "informação. Considere quebrá-lo em parágrafos menores, um por ideia; a ferramenta não divide automaticamente.",
      });
    }

    return findings;
  },
};
