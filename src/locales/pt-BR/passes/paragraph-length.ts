import { createParagraphLengthPass } from "../../_shared";
import type { PtConfig } from "../config";

export const paragraphLengthPass = createParagraphLengthPass<PtConfig>({
  criterion: "paragraph_length",
  enabled: (config) => config.paragraphLength.enabled,
  maxSentences: (config) => config.paragraphLength.maxSentences,
  text: {
    justification: (sentences) =>
      `Parágrafo longo — ${sentences} frases num só bloco pesam a leitura e dificultam localizar a ` +
      "informação. Considere quebrá-lo em parágrafos menores, um por ideia; a ferramenta não divide automaticamente.",
  },
});
