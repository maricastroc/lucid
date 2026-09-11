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
        "Leia a frase e decida se ela carrega mais de uma ideia. Se carrega, você escolhe onde separar e como " +
        "recompor; se carrega uma só, marque como vista — o gatilho é provisório e a extensão sozinha não obriga a nada.",
    },
    en: {
      long_sentence:
        "Read the sentence and decide whether it carries more than one idea. If it does, you choose where to " +
        "separate and how to recompose; if it carries one, mark it as seen — the trigger is provisional and " +
        "length alone compels nothing.",
    },
  },
  swap: {
    "pt-BR": {
      hidden_verb: {
        source: "equivalência 1:1 atestada (FPLG 2011, p. 23)",
        applyNote:
          "A troca é sua: a ferramenta só garante que o par está atestado na fonte e que o verbo leve está na " +
          "forma base. Aplicada uma ocorrência por vez, e a engine reaudita o texto depois.",
      },
    },
    en: {
      hidden_verb: {
        source: "1:1 equivalence attested (FPLG 2011, p. 23)",
        applyNote:
          "The swap is yours: the tool only vouches that the pair is attested in the source and that the light " +
          "verb is in its base form. Applied one at a time, and the engine re-audits the text afterwards.",
      },
    },
  },
  curated: new Set<EnCriterionId>(["reader_in_third_person"]),
  thresholdNotes: {
    "pt-BR": {
      "sentenceLength.warnAbove":
        "Referência interina emprestada do GOV.UK (Reino Unido): dividir frases com mais de 25 palavras. Não é " +
        "recomendação federal americana e não foi validada para documentos americanos. Provisória e configurável.",
      "paragraphLength.maxSentences":
        "Teto de “três a oito frases” das Federal Plain Language Guidelines (2011, p. 72), atribuído a " +
        "especialistas não nomeados. Provisório; não validado.",
      "longHeading.maxWords":
        "Nenhuma fonte americana nem a ISO fixa tamanho de título: parâmetro provisório do produto, não validado.",
      "proseEnumeration.minItems":
        "Nenhuma fonte americana nem a ISO fixa quantos itens pedem lista; as diretrizes federais (2011, pp. 71-72) " +
        "recomendam lista para séries de requisitos, etapas e condições. Três é parâmetro provisório do produto, não validado.",
    },
    en: {
      "sentenceLength.warnAbove":
        "Interim reference borrowed from GOV.UK (United Kingdom): split sentences over 25 words. Not a US federal " +
        "recommendation and not validated for American documents. Provisional and configurable.",
      "paragraphLength.maxSentences":
        "Upper end of “three to eight sentences” in the Federal Plain Language Guidelines (2011, p. 72), " +
        "attributed to unnamed writing experts. Provisional; not validated.",
      "longHeading.maxWords":
        "No US source nor ISO sets a heading length: a provisional product parameter, not validated.",
      "proseEnumeration.minItems":
        "No US source nor ISO sets how many items call for a list; the federal guidelines (2011, pp. 71-72) " +
        "recommend a list for series of requirements, steps and conditions. Three is a provisional product parameter, not validated.",
    },
  },
};
