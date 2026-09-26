import { createParagraphLengthPass } from "../../_shared";
import type { PtConfig } from "../config";

export const paragraphLengthPass = createParagraphLengthPass<PtConfig>({
  criterion: "paragraph_length",
  enabled: (config) => config.paragraphLength.enabled,
  maxSentences: (config) => config.paragraphLength.maxSentences,
  text: {
    justification: (sentences, threshold) =>
      `Parágrafo com ${sentences} frases. O Lucid marca parágrafos com mais de ${threshold} frases; esse ` +
      "número é um parâmetro do produto, não da norma. Num bloco longo, a informação fica mais difícil de " +
      "localizar: se o parágrafo trata de mais de um assunto, separe um parágrafo por assunto.",
  },
});
