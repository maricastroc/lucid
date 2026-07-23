import type { Finding, Pass } from "@/lucid/core/types";

const CRITERION = "single_item_list";
const PRINCIPLE = "5.2";

export const singleItemListPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.singleItemList.enabled) return [];

    const findings: Finding[] = [];

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "list" || block.items.length !== 1) continue;

      findings.push({
        criterion: CRITERION,
        category: "structural",
        principle: PRINCIPLE,
        span: { start: block.start, end: block.end, text: block.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          "Lista com um único item. Uma lista serve para separar e comparar vários itens; com um só, ela não " +
          "ajuda a localizar nada e sugere que falta um item ou que o conteúdo caberia melhor no texto corrido. " +
          "Escolher entre completar a lista ou dissolvê-la na prosa é decisão de autor.",
        meta: { ordered: block.ordered },
      });
    }

    return findings;
  },
};
