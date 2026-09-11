import { createSingleItemListPass } from "../../_shared";
import type { PtConfig } from "../config";

export const singleItemListPass = createSingleItemListPass<PtConfig>({
  criterion: "single_item_list",
  enabled: (config) => config.singleItemList.enabled,
  text: {
    justification:
      "Lista com um único item. Uma lista serve para separar e comparar vários itens; com um só, ela não " +
      "ajuda a localizar nada e sugere que falta um item ou que o conteúdo caberia melhor no texto corrido. " +
      "É higiene estrutural (sinal fraco, sem diretriz direta da norma): escolher entre completar a lista ou " +
      "dissolvê-la na prosa é decisão de autor.",
  },
});
