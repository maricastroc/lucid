/**
 * Pass "lista de um item só" (`single_item_list`) — `5.2`, fácil de localizar (Princípio 2).
 *
 * Uma lista existe para SEPARAR e COMPARAR vários itens — é o que a torna fácil de varrer. Uma
 * "lista" com um único item não separa nada: ou falta um item, ou o conteúdo caberia melhor no
 * texto corrido. Como o `salto_de_nivel_titulo` e o `long_heading`, só existe porque um formato
 * ESTRUTURADO (DOCX) fornece blocos `list`; texto puro não produz lista → nunca dispara.
 *
 * Determinístico e conservador (`items.length === 1`, sem heurística). NÃO resolve: decidir entre
 * completar a lista ou dissolvê-la na prosa é do autor (`requiresHuman`, sem `suggestion`).
 */
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
