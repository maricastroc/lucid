import { createSentenceLengthPass } from "../../_shared";
import type { PtConfig } from "../config";

export const sentenceLengthPass = createSentenceLengthPass<PtConfig>({
  criterion: "long_sentence",
  warnAbove: (config) => config.sentenceLength.warnAbove,
  text: {
    justification: (words, threshold) =>
      `Frase com ${words} palavras. O Lucid inspeciona frases com mais de ${threshold} palavras; esse ` +
      "número é um parâmetro do produto, não um limite da norma, que pede frases concisas sem fixar " +
      "tamanho. Verifique se a frase carrega mais de uma ideia: se carregar, separe as ideias; se carregar " +
      "uma só, ela pode ficar como está.",
  },
});
