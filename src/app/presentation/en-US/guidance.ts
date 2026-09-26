import type { EnCriterionId } from "@/locales/en-US/criteria";
import type { ByUiLang } from "../types";

export type EnGuidedCriterion = Exclude<EnCriterionId, "long_sentence">;

export const EN_GUIDANCE: ByUiLang<Record<EnGuidedCriterion, string>> = {
  "pt-BR": {
    prose_enumeration:
      "Veja se os itens são requisitos, etapas ou condições que o leitor precisa conferir um a um. Se forem, " +
      "transforme a série numa lista vertical com uma frase de introdução e numere as etapas que seguem uma ordem.",
    undefined_acronym:
      "Escreva o nome completo no primeiro uso, com a sigla entre parênteses, ou troque a sigla por um nome curto " +
      "que diga o que ela é (“the committee”, “the Act”). Se o seu leitor já conhece a sigla, ela pode ficar como está.",
    ambiguous_shall: "Decida o que a frase pede do leitor e troque “shall” pela palavra que diz isso.",
    reader_in_third_person:
      "Se o documento foi escrito para a pessoa nomeada aqui, reescreva a frase falando com ela como “you” " +
      "(“You must…”) e trate a agência como “we”.",
    hidden_verb:
      "Veja se um único verbo diz a ação. Se disser, reescreva a expressão com esse verbo, no tempo e na " +
      "concordância que a frase pede.",
    passive_voice:
      "Pergunte quem faz a ação. Se o texto já diz (depois de “by”), considere começar a frase por esse agente. " +
      "Se não diz e o leitor precisa saber, nomeie quem age. A passiva é legítima quando quem age não importa ao leitor.",
    paragraph_length:
      "Veja se o parágrafo trata de mais de um assunto. Se tratar, faça um parágrafo por assunto, cada um " +
      "começando pela frase que diz do que ele fala. Um parágrafo sobre um só assunto pode ficar como está.",
    long_heading:
      "Pergunte o que o leitor procura nesta seção e use um título curto que nomeie isso, ou a pergunta que o " +
      "leitor faria. Um título em forma de pergunta pode ser longo e estar certo.",
    heading_level_skip:
      "Confira se falta um título intermediário ou se este título deveria subir um nível. A hierarquia serve ao " +
      "sumário e a quem navega com leitor de tela.",
    single_item_list: "Complete a lista ou transforme o item numa frase do texto corrido.",
    organization_vocabulary:
      "Explique o termo ao leitor ou troque-o por palavras que ele conheça. Se a sua organização tiver uma forma " +
      "preferida, registre-a como equivalente do termo no vocabulário.",
  },
  en: {
    prose_enumeration:
      "See whether the items are requirements, steps or conditions the reader must go through one by one. If they " +
      "are, turn the series into a vertical list with a lead-in sentence, and number steps that follow an order.",
    undefined_acronym:
      "Write the full name on first use, with the acronym in parentheses, or replace the acronym with a short name " +
      "that says what it is (“the committee”, “the Act”). If your reader already knows the acronym, it can stay as it is.",
    ambiguous_shall: "Decide what the sentence asks of the reader, then replace “shall” with the word that says it.",
    reader_in_third_person:
      "If the document is written for the person named here, rewrite the sentence to address them as “you” " +
      "(“You must…”) and refer to the agency as “we”.",
    hidden_verb:
      "See whether a single verb says the action. If it does, rewrite the phrase with that verb, in the tense and " +
      "agreement the sentence needs.",
    passive_voice:
      "Ask who performs the action. If the text already says (after “by”), consider opening the sentence with " +
      "that agent. If it does not and the reader needs to know, name who acts. The passive is legitimate when who " +
      "acts does not matter to the reader.",
    paragraph_length:
      "Check whether the paragraph covers more than one topic. If it does, give each topic its own paragraph, " +
      "opening with a sentence that says what it is about. A paragraph on a single topic can stay as it is.",
    long_heading:
      "Ask what the reader is looking for in this section and use a short heading that names it, or the question " +
      "the reader would ask. A question heading can be long and still be right.",
    heading_level_skip:
      "Check whether an intermediate heading is missing or whether this heading should move up a level. The " +
      "hierarchy serves the outline and people navigating with a screen reader.",
    single_item_list: "Complete the list, or turn the item into a sentence in the running text.",
    organization_vocabulary:
      "Explain the term or replace it with words the reader knows. If your organization prefers a replacement, " +
      "record it as the term's equivalent in the vocabulary.",
  },
};
