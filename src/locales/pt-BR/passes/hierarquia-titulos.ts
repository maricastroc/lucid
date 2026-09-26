import { createHeadingLevelSkipPass } from "../../_shared";
import type { PtConfig } from "../config";

export const hierarquiaTitulosPass = createHeadingLevelSkipPass<PtConfig>({
  criterion: "salto_de_nivel_titulo",
  enabled: (config) => config.hierarquiaTitulos.enabled,
  text: {
    justification: (level, previousLevel) =>
      `Este título pula do nível ${previousLevel} para o ${level}, sem passar pelo ${previousLevel + 1}. ` +
      "O salto confunde quem navega pela estrutura do documento (sumário, leitor de tela). Ajuste o nível " +
      `deste título ou inclua antes dele um título de nível ${previousLevel + 1}.`,
  },
});
