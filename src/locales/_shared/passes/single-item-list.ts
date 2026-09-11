import type { Config } from "@/lucid/core/config";
import type { PassFinding, Pass } from "@/lucid/core/types";

export interface SingleItemListText {
  justification: string;
}

export interface SingleItemListOptions<C extends Config> {
  readonly criterion: string;
  readonly enabled: (config: C) => boolean;
  readonly text: SingleItemListText;
}

export function createSingleItemListPass<C extends Config>(options: SingleItemListOptions<C>): Pass<C> {
  const { criterion, enabled, text } = options;
  return {
    criterion,
    category: "structural",
    requires: ["list"],
    engine: "shared",

    run(ctx) {
      if (!enabled(ctx.config)) return [];

      const findings: PassFinding[] = [];

      for (const block of ctx.doc.blocks) {
        if (block.kind !== "list" || block.items.length !== 1) continue;

        findings.push({
          criterion,
          category: "structural",
          span: { start: block.start, end: block.end, text: block.text },
          severity: "info",
          requiresHuman: true,
          justification: text.justification,
          meta: { ordered: block.ordered },
        });
      }

      return findings;
    },
  };
}
