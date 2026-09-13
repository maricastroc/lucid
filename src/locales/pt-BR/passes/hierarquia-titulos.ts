import { createHeadingLevelSkipPass } from "../../_shared";
import type { PtConfig } from "../config";

export const hierarquiaTitulosPass = createHeadingLevelSkipPass<PtConfig>({
  criterion: "salto_de_nivel_titulo",
  enabled: (config) => config.hierarquiaTitulos.enabled,
  text: {
    justification: (level, previousLevel) =>
      `Este título pula do nível ${previousLevel} para o ${level}, sem passar pelo ${previousLevel + 1}. ` +
      "Saltos na hierarquia quebram a leitura por estrutura (sumário, varredura, leitor de tela). Ajuste o " +
      "nível deste título ou insira um intermediário; a ferramenta não reorganiza a hierarquia por você.",
  },
});
