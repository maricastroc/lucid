import type { Config, ThresholdStatus } from "@/lucid/core/config";
import type { PassFinding, Pass } from "@/lucid/core/types";

export interface ParagraphLengthText {
  justification: (sentences: number, threshold: number) => string;
}

export interface ParagraphLengthOptions<C extends Config> {
  readonly criterion: string;
  readonly enabled: (config: C) => boolean;
  readonly maxSentences: (config: C) => number;
  readonly thresholdStatus?: ThresholdStatus;
  readonly text: ParagraphLengthText;
}

export function createParagraphLengthPass<C extends Config>(options: ParagraphLengthOptions<C>): Pass<C> {
  const { criterion, enabled, maxSentences, thresholdStatus, text } = options;
  return {
    criterion,
    category: "structural",
    engine: "shared",

    run(ctx) {
      if (!enabled(ctx.config)) return [];

      const max = maxSentences(ctx.config);
      const findings: PassFinding[] = [];

      for (const paragraph of ctx.doc.blocks) {
        if (paragraph.kind !== "paragraph") continue;
        const n = paragraph.sentences.length;
        if (n <= max) continue;
        findings.push({
          criterion,
          category: "structural",
          span: { start: paragraph.start, end: paragraph.end, text: paragraph.text },
          severity: "warning",
          requiresHuman: true,
          justification: text.justification(n, max),
          ...(thresholdStatus === undefined ? {} : { meta: { sentences: n, threshold: max, thresholdStatus } }),
        });
      }

      return findings;
    },
  };
}
