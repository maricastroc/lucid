import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "prose_enumeration";

const ORDINAL_RANK: Record<string, number> = {
  primeiro: 1, primeira: 1,
  segundo: 2, segunda: 2,
  terceiro: 3, terceira: 3,
  quarto: 4, quarta: 4,
  quinto: 5, quinta: 5,
  sexto: 6, sexta: 6,
};

export const proseEnumerationPass: Pass = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    if (!ctx.config.proseEnumeration.enabled) return [];

    const min = ctx.config.proseEnumeration.minMarkers;
    const findings: PassFinding[] = [];

    for (const paragraph of ctx.doc.blocks) {
      if (paragraph.kind !== "paragraph") continue;
      const ranks = new Set<number>();
      for (const sentence of paragraph.sentences) {
        for (const token of sentence.tokens) {
          if (token.isWord && token.lower in ORDINAL_RANK) ranks.add(ORDINAL_RANK[token.lower]);
        }
      }

      if (!ranks.has(1) || ranks.size < min) continue;

      findings.push({
        criterion: CRITERION,
        category: "structural",
        span: { start: paragraph.start, end: paragraph.end, text: paragraph.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Enumeração em prosa — ${ranks.size} itens ordinais (“primeiro… segundo… terceiro…”) embutidos ` +
          "no texto corrido. Uma lista deixaria os itens mais fáceis de localizar e comparar; a ferramenta não converte automaticamente.",
      });
    }

    return findings;
  },
};
