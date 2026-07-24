import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "single_item_list";

export const singleItemListPass: Pass = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    if (!ctx.config.singleItemList.enabled) return [];

    const findings: PassFinding[] = [];

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "list" || block.items.length !== 1) continue;

      findings.push({
        criterion: CRITERION,
        category: "structural",
        span: { start: block.start, end: block.end, text: block.text },
        severity: "info",
        requiresHuman: true,
        justification:
          "Lista com um único item. Uma lista serve para separar e comparar vários itens; com um só, ela não " +
          "ajuda a localizar nada e sugere que falta um item ou que o conteúdo caberia melhor no texto corrido. " +
          "É higiene estrutural (sinal fraco, sem diretriz direta da norma): escolher entre completar a lista ou " +
          "dissolvê-la na prosa é decisão de autor.",
        meta: { ordered: block.ordered },
      });
    }

    return findings;
  },
};
