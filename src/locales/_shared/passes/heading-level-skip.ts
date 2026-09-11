import type { Config } from "@/lucid/core/config";
import type { PassFinding, Pass } from "@/lucid/core/types";

export interface HeadingLevelSkipText {
  justification: (level: number, previousLevel: number) => string;
}

export interface HeadingLevelSkipOptions<C extends Config> {
  readonly criterion: string;
  readonly enabled: (config: C) => boolean;
  readonly text: HeadingLevelSkipText;
}

export function createHeadingLevelSkipPass<C extends Config>(options: HeadingLevelSkipOptions<C>): Pass<C> {
  const { criterion, enabled, text } = options;
  return {
    criterion,
    category: "structural",
    requires: ["heading"],
    engine: "shared",

    run(ctx) {
      if (!enabled(ctx.config)) return [];

      const findings: PassFinding[] = [];
      let prevLevel: number | null = null;

      for (const block of ctx.doc.blocks) {
        if (block.kind !== "heading") continue;

        if (prevLevel !== null && block.level > prevLevel + 1) {
          findings.push({
            criterion,
            category: "structural",
            span: { start: block.start, end: block.end, text: block.text },
            severity: "warning",
            requiresHuman: true,
            justification: text.justification(block.level, prevLevel),
            meta: { level: block.level, prevLevel },
          });
        }

        prevLevel = block.level;
      }

      return findings;
    },
  };
}
