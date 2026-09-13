import type { Config, ThresholdStatus } from "@/lucid/core/config";
import type { PassFinding, Pass } from "@/lucid/core/types";

export interface SentenceLengthText {
  justification: (words: number, threshold: number) => string;
}

export interface SentenceLengthOptions<C extends Config> {
  readonly criterion: string;
  readonly warnAbove: (config: C) => number;
  readonly thresholdStatus?: ThresholdStatus;
  readonly text: SentenceLengthText;
}

export function createSentenceLengthPass<C extends Config>(options: SentenceLengthOptions<C>): Pass<C> {
  const { criterion, warnAbove, thresholdStatus, text } = options;
  return {
    criterion,
    category: "syntactic",
    engine: "shared",

    run(ctx) {
      const findings: PassFinding[] = [];
      const threshold = warnAbove(ctx.config);

      for (const sentence of ctx.doc.sentences) {
        if (sentence.wordCount <= threshold) continue;

        findings.push({
          criterion,
          category: "syntactic",
          span: { start: sentence.start, end: sentence.end, text: sentence.text },
          severity: "warning",
          requiresHuman: true,
          justification: text.justification(sentence.wordCount, threshold),
          meta:
            thresholdStatus === undefined
              ? { words: sentence.wordCount, threshold }
              : { words: sentence.wordCount, threshold, thresholdStatus },
        });
      }

      return findings;
    },
  };
}
