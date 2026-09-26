import { createLongHeadingPass } from "../../_shared";
import type { PtConfig } from "../config";

export const longHeadingPass = createLongHeadingPass<PtConfig>({
  criterion: "long_heading",
  enabled: (config) => config.longHeading.enabled,
  maxWords: (config) => config.longHeading.maxWords,
  text: {
    tooLong: (words, threshold) =>
      `Título com ${words} palavras. O Lucid marca títulos com mais de ${threshold} palavras; esse número é ` +
      "um parâmetro do produto, não da norma. Longo assim, o título deixa de servir como rótulo: o leitor " +
      "precisa lê-lo inteiro para saber o que a seção traz. Reduza-o ao essencial.",
    manySentences: (sentences) =>
      `Título formado por ${sentences} frases. Um título serve de rótulo para localizar a seção, não de ` +
      "texto corrido. Reduza-o a um rótulo curto e, se o restante for necessário, leve-o para o texto da seção.",
    endsAsStatement:
      "Título termina com ponto final, como uma frase. Títulos são rótulos e não levam ponto: tire o ponto " +
      "ou, se o trecho for uma frase do texto, confira se ele deveria mesmo estar marcado como título.",
  },
});
