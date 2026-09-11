import type { Config, ThresholdStatus } from "@/lucid/core/config";
import type { PassFinding, Pass } from "@/lucid/core/types";

export interface LongHeadingText {
  tooLong: (words: number, threshold: number) => string;
  manySentences: (sentences: number) => string;
  endsAsStatement: string;
}

export interface LongHeadingOptions<C extends Config> {
  readonly criterion: string;
  readonly enabled: (config: C) => boolean;
  readonly maxWords: (config: C) => number;
  readonly thresholdStatus?: ThresholdStatus;
  readonly text: LongHeadingText;
}

function endsAsStatement(text: string): boolean {
  const t = text.trimEnd();
  if (t.endsWith("…") || t.endsWith("...")) return false;
  return t.endsWith(".");
}

export function createLongHeadingPass<C extends Config>(options: LongHeadingOptions<C>): Pass<C> {
  const { criterion, enabled, maxWords, thresholdStatus, text } = options;
  return {
    criterion,
    category: "structural",
    requires: ["heading"],
    engine: "shared",

    run(ctx) {
      if (!enabled(ctx.config)) return [];

      const max = maxWords(ctx.config);
      const findings: PassFinding[] = [];

      for (const block of ctx.doc.blocks) {
        if (block.kind !== "heading") continue;
        const span = { start: block.start, end: block.end, text: block.text };

        if (block.wordCount > max) {
          findings.push({
            criterion,
            category: "structural",
            span,
            severity: "warning",
            requiresHuman: true,
            justification: text.tooLong(block.wordCount, max),
            meta:
              thresholdStatus === undefined
                ? { reason: "length", words: block.wordCount, threshold: max }
                : { reason: "length", words: block.wordCount, threshold: max, thresholdStatus },
          });
          continue;
        }

        const multi = block.sentences.length >= 2;
        if (multi || endsAsStatement(block.text)) {
          findings.push({
            criterion,
            category: "structural",
            span,
            severity: "warning",
            requiresHuman: true,
            justification: multi ? text.manySentences(block.sentences.length) : text.endsAsStatement,
            meta: { reason: "sentence", words: block.wordCount, sentences: block.sentences.length },
          });
        }
      }

      return findings;
    },
  };
}
