import { createSingleItemListPass } from "../../_shared";
import type { PtConfig } from "../config";

export const singleItemListPass = createSingleItemListPass<PtConfig>({
  criterion: "single_item_list",
  enabled: (config) => config.singleItemList.enabled,
  text: {
    justification:
      "Lista com um único item. Uma lista serve para separar e comparar vários itens; com um só, ela sugere " +
      "que falta algum item ou que o conteúdo caberia melhor no texto corrido. Complete a lista ou leve o " +
      "item para o parágrafo. É um sinal fraco: a norma não trata disso diretamente.",
  },
});
