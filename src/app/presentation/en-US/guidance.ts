import type { EnCriterionId } from "@/locales/en-US/criteria";
import type { ByUiLang } from "../types";

export type EnGuidedCriterion = Exclude<EnCriterionId, "long_sentence">;

export const EN_GUIDANCE: ByUiLang<Record<EnGuidedCriterion, string>> = {
  "pt-BR": {
    prose_enumeration:
      "Veja se os itens são requisitos, etapas ou condições que o leitor precisa conferir um a um. Se são, uma " +
      "lista vertical com frase de introdução ajuda; etapas em ordem podem ser numeradas. O Lucid não converte o texto.",
    undefined_acronym:
      "Escreva o nome completo no primeiro uso, com a sigla entre parênteses, ou troque a sigla por um apelido " +
      "que diga o que ela é (“the committee”, “the Act”). Se o seu leitor conhece a sigla, ela pode ficar como está.",
    ambiguous_shall:
      "Pergunte o que a frase quer do leitor: obrigação, use “must”; proibição, “must not”; faculdade, “may”; " +
      "recomendação, “should”; algo que vai acontecer, “will”. O Lucid não troca a palavra — escolher o sentido é seu.",
    reader_in_third_person:
      "Veja quem lê este documento. Se é a pessoa nomeada aqui, falar com ela como “you” — e da agência como " +
      "“we” — deixa claro quem deve agir. Se o documento se dirige a outra pessoa, a terceira pessoa pode estar certa.",
    hidden_verb:
      "Veja se um único verbo diz a ação. Quando a equivalência está atestada e a troca é direta, ela aparece " +
      "como troca por um clique; nos demais casos a reescrita é sua — o Lucid não compõe nem flexiona verbos.",
    passive_voice:
      "Pergunte quem faz a ação. Se o texto já diz (depois de “by”), considere começar a frase por esse agente. " +
      "Se não diz, só você sabe quem é — o Lucid não preenche. A passiva é legítima quando quem age não importa ao leitor.",
    paragraph_length:
      "Veja se o parágrafo trata de mais de um assunto. Se trata, cada assunto pode virar um bloco com a sua " +
      "primeira frase dizendo do que ele fala. O limite de frases é provisório; um parágrafo coeso pode ficar como está.",
    long_heading:
      "Pergunte o que o leitor procura nesta seção. Um título curto que nomeie isso — ou a pergunta que o " +
      "leitor faria — ajuda a varrer o documento. Títulos em forma de pergunta podem ser longos e estar certos.",
    heading_level_skip:
      "Confira se falta um título intermediário ou se este título deveria subir um nível. A hierarquia serve ao " +
      "sumário e a quem navega por leitor de tela.",
    single_item_list: "Decida se falta item na lista ou se o conteúdo cabe melhor numa frase do texto corrido.",
    organization_vocabulary:
      "Este termo foi declarado pela sua organização. Se ela registrou um equivalente, você pode aplicá-lo; se " +
      "não, cabe a você decidir como explicar o termo ao leitor.",
  },
  en: {
    prose_enumeration:
      "Check whether the items are requirements, steps or conditions the reader must check one by one. If they " +
      "are, a vertical list with a lead-in sentence helps; ordered steps can be numbered. Lucid does not convert the text.",
    undefined_acronym:
      "Write the full name on first use, with the acronym in parentheses, or replace the acronym with a short name " +
      "that says what it is (“the committee”, “the Act”). If your reader knows the acronym, it can stay as it is.",
    ambiguous_shall:
      "Ask what the sentence wants from the reader: an obligation takes “must”; a prohibition, “must not”; a " +
      "discretion, “may”; a recommendation, “should”; something that will happen, “will”. Lucid does not swap the " +
      "word — choosing the meaning is yours.",
    reader_in_third_person:
      "Check who reads this document. If it is the person named here, speaking to them as “you” — and of the " +
      "agency as “we” — makes plain who must act. If the document addresses someone else, the third person may be right.",
    hidden_verb:
      "See whether a single verb says the action. When the equivalence is attested and the swap is direct, it " +
      "appears as a one-click swap; otherwise the rewrite is yours — Lucid neither composes nor inflects verbs.",
    passive_voice:
      "Ask who performs the action. If the text already says (after “by”), consider opening the sentence with " +
      "that agent. If it does not, only you know who it is — Lucid does not fill it in. The passive is legitimate " +
      "when who acts does not matter to the reader.",
    paragraph_length:
      "Check whether the paragraph covers more than one topic. If it does, each topic can become its own block, " +
      "opening with a sentence that says what it is about. The sentence limit is provisional; a cohesive paragraph can stay as it is.",
    long_heading:
      "Ask what the reader is looking for in this section. A short heading that names it — or the question the " +
      "reader would ask — helps scanning. Question headings can be long and still be right.",
    heading_level_skip:
      "Check whether an intermediate heading is missing or whether this heading should move up a level. The " +
      "hierarchy serves the outline and people navigating with a screen reader.",
    single_item_list:
      "Decide whether the list is missing items or whether the content belongs in a sentence of running text.",
    organization_vocabulary:
      "Your organization declared this term. If it recorded an equivalent you can apply it; if not, deciding how " +
      "to explain the term to the reader is yours.",
  },
};
