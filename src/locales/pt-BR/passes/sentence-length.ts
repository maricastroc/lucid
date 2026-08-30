import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "long_sentence";

export const sentenceLengthPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",

  run(ctx) {
    const findings: PassFinding[] = [];
    const { warnAbove } = ctx.config.sentenceLength;

    for (const sentence of ctx.doc.sentences) {
      if (sentence.wordCount <= warnAbove) continue;

      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        span: { start: sentence.start, end: sentence.end, text: sentence.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Frase com ${sentence.wordCount} palavras. O Lucid inspeciona frases acima de ` +
          `${warnAbove} palavras — um parâmetro do produto, não um limite da norma: a ABNT NBR ` +
          "ISO 24495-1 pede frases concisas e variação de tamanho, sem fixar número. Verifique se " +
          "a frase carrega mais de uma ideia; se carrega uma só, ela pode estar adequada como está.",
        meta: { words: sentence.wordCount, threshold: warnAbove },
      });
    }

    return findings;
  },
};
