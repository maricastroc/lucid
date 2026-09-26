import { EN_CRITERION_IDS, type EnCriterionId } from "@/locales/en-US/criteria";
import type { LocalePresentation } from "../types";
import { EN_META } from "./meta";
import { EN_NARRATIVE_UI_EN } from "./narrative.en";
import { EN_NARRATIVE_UI_PT } from "./narrative.pt";

export const EN_PRESENTATION: LocalePresentation<EnCriterionId> = {
  localeId: "en-US",
  ids: EN_CRITERION_IDS,
  meta: EN_META,
  narrative: { "pt-BR": EN_NARRATIVE_UI_PT, en: EN_NARRATIVE_UI_EN },
  humanLead: {
    "pt-BR": {
      long_sentence:
        "Leia a frase e veja se ela carrega mais de uma ideia. Se carregar, escolha onde separar e reescreva as " +
        "partes. Se carregar uma só, marque como revisado: o gatilho é provisório, e o tamanho sozinho não pede mudança.",
    },
    en: {
      long_sentence:
        "Read the sentence and see whether it carries more than one idea. If it does, choose where to split it and " +
        "rewrite the parts. If it carries only one, mark it as reviewed: the trigger is provisional, and length " +
        "alone does not call for a change.",
    },
  },
  swap: {
    "pt-BR": {
      hidden_verb: {
        source: "equivalente atestado nas FPLG 2011, p. 23",
        applyNote:
          "O Lucid só mostra o verbo quando o par está atestado na fonte e o verbo leve está na forma base. Ele " +
          "não verifica se o sentido se mantém nesta frase.",
      },
    },
    en: {
      hidden_verb: {
        source: "equivalent attested in the FPLG 2011, p. 23",
        applyNote:
          "Lucid shows the verb only when the source attests the pair and the light verb is in its base form. It " +
          "does not check whether the meaning holds in this sentence.",
      },
    },
  },
  curated: new Set<EnCriterionId>(["reader_in_third_person"]),
  thresholdNotes: {
    "pt-BR": {
      "sentenceLength.warnAbove":
        "Referência provisória emprestada do GOV.UK (Reino Unido), que recomenda dividir frases com mais de 25 " +
        "palavras. Não é recomendação federal americana e não foi validada para documentos americanos. Configurável.",
      "paragraphLength.maxSentences":
        "Limite superior de “três a oito frases”, das Federal Plain Language Guidelines (2011, p. 72), que o " +
        "atribuem a especialistas não nomeados. Provisório e não validado.",
      "longHeading.maxWords":
        "Nem a ISO nem as fontes americanas fixam tamanho de título. É um parâmetro provisório do Lucid, não validado.",
      "proseEnumeration.minItems":
        "Nem a ISO nem as fontes americanas fixam quantos itens pedem lista. As diretrizes federais (2011, pp. 71-72) " +
        "recomendam lista para séries de requisitos, etapas ou condições. O padrão, três, é um parâmetro provisório " +
        "do Lucid, não validado.",
    },
    en: {
      "sentenceLength.warnAbove":
        "Interim reference borrowed from GOV.UK (United Kingdom), which recommends splitting sentences over 25 " +
        "words. Not a US federal recommendation and not validated for American documents. Provisional and configurable.",
      "paragraphLength.maxSentences":
        "Upper end of “three to eight sentences” in the Federal Plain Language Guidelines (2011, p. 72), which " +
        "attribute it to unnamed writing experts. Provisional and not validated.",
      "longHeading.maxWords":
        "Neither ISO nor any US source sets a heading length. This is a provisional Lucid parameter, not validated.",
      "proseEnumeration.minItems":
        "Neither ISO nor any US source sets how many items call for a list. The federal guidelines (2011, pp. 71-72) " +
        "recommend a list for a series of requirements, steps or conditions. The default, three, is a provisional " +
        "Lucid parameter, not validated.",
    },
  },
};
