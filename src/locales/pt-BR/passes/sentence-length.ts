import type { Config } from "@/lucid/core/config";
import type { Finding, Pass, Severity } from "@/lucid/core/types";

const CRITERION = "long_sentence";
const PRINCIPLE = "5.3.4";

interface ExceededThreshold {
  severity: Severity;
  threshold: number;
}

function evaluateThreshold(wordCount: number, config: Config): ExceededThreshold | null {
  const { warnAbove, errorAbove } = config.sentenceLength;

  if (wordCount > errorAbove) {
    return { severity: "error", threshold: errorAbove };
  }
  if (wordCount > warnAbove) {
    return { severity: "warning", threshold: warnAbove };
  }
  return null;
}

export const sentenceLengthPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,

  run(ctx) {
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const exceeded = evaluateThreshold(sentence.wordCount, ctx.config);
      if (!exceeded) continue;

      const { severity, threshold } = exceeded;

      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        principle: PRINCIPLE,
        span: { start: sentence.start, end: sentence.end, text: sentence.text },
        severity,
        requiresHuman: true,
        justification:
          `Frase com ${sentence.wordCount} palavras — acima do limite de ${threshold} ` +
          `(${severity === "error" ? "erro" : "alerta"}). Considere dividir em frases ` +
          "menores ou cortar informação supérflua; a ferramenta não reescreve " +
          "automaticamente.",
        meta: { words: sentence.wordCount, threshold },
      });
    }

    return findings;
  },
};
