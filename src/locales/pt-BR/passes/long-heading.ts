import { createLongHeadingPass } from "../../_shared";
import type { PtConfig } from "../config";

export const longHeadingPass = createLongHeadingPass<PtConfig>({
  criterion: "long_heading",
  enabled: (config) => config.longHeading.enabled,
  maxWords: (config) => config.longHeading.maxWords,
  text: {
    tooLong: (words, threshold) =>
      `Título com ${words} palavras (acima de ${threshold}). Um título é um rótulo para varrer e ` +
      "localizar a seção; quando fica longo, o leitor precisa lê-lo inteiro em vez de usá-lo como referência. " +
      "Encurtar exige decidir o que é essencial — a ferramenta não reescreve títulos.",
    manySentences: (sentences) =>
      `Título formado por ${sentences} frases — um título é um rótulo, não um texto corrido. ` +
      "Reduza a uma etiqueta curta que o leitor use para localizar a seção; a ferramenta não faz esse corte.",
    endsAsStatement:
      "Título termina com ponto final, como uma frase — títulos são rótulos e não fecham como oração. " +
      "Rever a forma é decisão de autor; a ferramenta não reescreve títulos.",
  },
});
