import { createSentenceLengthPass } from "../../_shared";
import type { PtConfig } from "../config";

export const sentenceLengthPass = createSentenceLengthPass<PtConfig>({
  criterion: "long_sentence",
  warnAbove: (config) => config.sentenceLength.warnAbove,
  text: {
    justification: (words, threshold) =>
      `Frase com ${words} palavras. O Lucid inspeciona frases acima de ` +
      `${threshold} palavras — um parâmetro do produto, não um limite da norma: a ABNT NBR ` +
      "ISO 24495-1 pede frases concisas e variação de tamanho, sem fixar número. Verifique se " +
      "a frase carrega mais de uma ideia; se carrega uma só, ela pode estar adequada como está.",
  },
});
