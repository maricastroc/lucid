import { EN_CRITERION_IDS, type EnCriterionId } from "@/locales/en-US/criteria";
import type { UiLang } from "../../i18n/types";
import type { ByUiLang, Channel, CriterionMeta, CriterionText } from "../types";

interface EnCriterionShape {
  readonly channel: Channel;
  readonly markStyleClass: string;
  readonly text: ByUiLang<CriterionText>;
}

const SHAPE: Record<EnCriterionId, EnCriterionShape> = {
  prose_enumeration: {
    channel: "passage",
    markStyleClass: "",
    text: {
      "pt-BR": {
        label: "Enumeração em prosa",
        kind: "Estrutura do documento",
        principleName: "Fácil de localizar",
        signal:
          "série no texto corrido (marcadores “(a) (b) (c)”, “(1) (2) (3)” ou “(i) (ii) (iii)”, ordinais no início da frase como “First… Second…” ou itens separados por vírgula depois de dois-pontos), a partir de um número provisório de itens",
        why:
          "Uma lista vertical deixa os itens mais fáceis de localizar e comparar. As diretrizes federais " +
          "americanas recomendam lista vertical, com frase de introdução, para requisitos, etapas e condições.",
      },
      en: {
        label: "Enumeration in prose",
        kind: "Document structure",
        principleName: "Easy to find",
        signal:
          "a series in running text (markers “(a) (b) (c)”, “(1) (2) (3)” or “(i) (ii) (iii)”, sentence-initial ordinals such as “First… Second…” or comma-separated items after a colon), from a provisional number of items",
        why:
          "A vertical list makes items easier to find and compare. The US federal guidelines recommend a " +
          "vertical list, with a lead-in sentence, for requirements, steps and conditions.",
      },
    },
  },
  undefined_acronym: {
    channel: "inline",
    markStyleClass: "mark-solid",
    text: {
      "pt-BR": {
        label: "Sigla sem expansão",
        kind: "Escolha lexical",
        principleName: "Palavras familiares",
        signal:
          "sigla em maiúsculas (2 a 6 letras) usada antes de ser apresentada como “Nome Completo (SIGLA)” ou “SIGLA (Nome Completo)”; siglas de uso comum de uma lista curta declarada ficam de fora",
        why:
          "O leitor precisa saber o que a sigla quer dizer na primeira vez que a encontra. As diretrizes federais " +
          "americanas pedem que ela seja definida no primeiro uso ou trocada por um nome curto que diga o que ela é.",
      },
      en: {
        label: "Undefined acronym",
        kind: "Lexical choice",
        principleName: "Familiar words",
        signal:
          "an all-caps acronym (2 to 6 letters) used before it is introduced as “Full Name (ACRONYM)” or “ACRONYM (Full Name)”; common acronyms from a short declared list are excused",
        why:
          "Readers need to know what an acronym stands for the first time they meet it. The US federal guidelines " +
          "ask writers to define it on first use or to replace it with a short name that says what it is.",
      },
    },
  },
  ambiguous_shall: {
    channel: "inline",
    markStyleClass: "mark-dotted",
    text: {
      "pt-BR": {
        label: "“Shall” ambíguo",
        kind: "Escolha lexical",
        principleName: "Frases claras",
        signal:
          "toda ocorrência de “shall” ou “shall not”: a forma não diz se é obrigação, proibição, faculdade, recomendação ou previsão",
        why:
          "O leitor não sabe se precisa agir, se pode agir ou se algo vai acontecer. As diretrizes federais " +
          "americanas pedem “must”, “must not”, “may” ou “should”, conforme o sentido. É uma extensão editorial do " +
          "catálogo em inglês: a ISO 24495-1 não trata desta palavra.",
      },
      en: {
        label: "Ambiguous “shall”",
        kind: "Lexical choice",
        principleName: "Clear sentences",
        signal:
          "every “shall” or “shall not”: the form does not say whether it is an obligation, a prohibition, a permission, a recommendation or a prediction",
        why:
          "The reader cannot tell whether they must act, may act or whether something will happen. The US federal " +
          "guidelines ask for “must”, “must not”, “may” or “should”, depending on the meaning. This is an editorial " +
          "extension of the English catalogue: ISO 24495-1 does not address this word.",
      },
    },
  },
  reader_in_third_person: {
    channel: "inline",
    markStyleClass: "mark-dotted",
    text: {
      "pt-BR": {
        label: "Fala indireta ao leitor",
        kind: "Construção sintática",
        principleName: "Frases claras",
        signal:
          "substantivo que nomeia o leitor (applicant, taxpayer, lessee…) em posição de sujeito + modal ou expressão deôntica (must, shall, is required to…) numa janela local",
        why:
          "Falar do leitor em terceira pessoa distancia e esconde quem deve agir. As diretrizes federais " +
          "americanas recomendam falar com o leitor como “you” e da agência como “we”.",
      },
      en: {
        label: "Reader in the third person",
        kind: "Syntactic construction",
        principleName: "Clear sentences",
        signal:
          "a noun naming the reader (applicant, taxpayer, lessee…) in subject position + a deontic modal or phrase (must, shall, is required to…) within a local window",
        why:
          "Talking about the reader in the third person creates distance and hides who must act. The US federal " +
          "guidelines recommend addressing the reader as “you” and the agency as “we”.",
      },
    },
  },
  hidden_verb: {
    channel: "inline",
    markStyleClass: "mark-dashed",
    text: {
      "pt-BR": {
        label: "Verbo escondido em substantivo",
        kind: "Escolha lexical",
        principleName: "Frases claras",
        signal:
          "verbo leve (make, take, give…) + substantivo com sufixo deverbal (-tion, -sion, -ment, -ance, -ence); o verbo só é indicado para os pares atestados na fonte",
        why:
          "A ação fica dentro de um substantivo, e a frase precisa de um verbo extra para fazer sentido. As " +
          "diretrizes federais americanas chamam isso de “hidden verb” (verbo escondido).",
      },
      en: {
        label: "Hidden verb",
        kind: "Lexical choice",
        principleName: "Clear sentences",
        signal:
          "light verb (make, take, give…) + noun with a deverbal suffix (-tion, -sion, -ment, -ance, -ence); a verb is named only for the pairs attested in the source",
        why:
          "The action sits inside a noun, and the sentence needs an extra verb to make sense. The US federal " +
          "guidelines call this a hidden verb.",
      },
    },
  },
  passive_voice: {
    channel: "inline",
    markStyleClass: "mark-dotted",
    text: {
      "pt-BR": {
        label: "Voz passiva",
        kind: "Construção sintática",
        principleName: "Frases claras",
        signal:
          "forma de “be” seguida de particípio passado (-ed ou irregular), com agente introduzido por “by” quando houver",
        why:
          "Quem pratica a ação some ou vai para o fim da frase. No presente e sem agente, a construção inglesa " +
          "também pode descrever um estado (“the office is closed”); nesses casos, só o contexto decide.",
      },
      en: {
        label: "Passive voice",
        kind: "Syntactic construction",
        principleName: "Clear sentences",
        signal:
          "a form of “be” followed by a past participle (-ed or irregular), with the agent introduced by “by” when present",
        why:
          "Whoever acts disappears or moves to the end of the sentence. In the present tense with no agent, the " +
          "construction can also describe a state (“the office is closed”); in those cases only the context decides.",
      },
    },
  },
  long_sentence: {
    channel: "passage",
    markStyleClass: "",
    text: {
      "pt-BR": {
        label: "Comprimento de frase",
        kind: "Extensão da frase",
        principleName: "Frases concisas",
        signal:
          "contagem de palavras da frase acima do gatilho provisório (referência emprestada do GOV.UK, configurável)",
        why:
          "Uma frase longa não é defeito por si só: é um ponto para inspecionar. A norma pede uma ideia por frase e " +
          "variação de tamanho, sem fixar número. Em inglês americano, o gatilho é uma referência provisória " +
          "emprestada do GOV.UK (Reino Unido): não é recomendação federal americana e não foi validado para " +
          "documentos americanos.",
      },
      en: {
        label: "Sentence length",
        kind: "Sentence length",
        principleName: "Concise sentences",
        signal: "sentence word count above the provisional trigger (interim GOV.UK reference, configurable)",
        why:
          "A long sentence is not a defect by itself; it is a point to inspect. The standard asks for one idea per " +
          "sentence and for varied length, without fixing a number. For US English, the trigger is an interim " +
          "reference borrowed from GOV.UK (United Kingdom): it is not a US federal recommendation and has not been " +
          "validated for American documents.",
      },
    },
  },
  paragraph_length: {
    channel: "passage",
    markStyleClass: "",
    text: {
      "pt-BR": {
        label: "Parágrafo longo",
        kind: "Estrutura do documento",
        principleName: "Fácil de localizar",
        signal: "contagem de frases do parágrafo acima do limite provisório configurado",
        why:
          "Um bloco extenso de frases dificulta varrer o texto e achar a informação. O limite provisório vem do teto " +
          "de “três a oito frases” das Federal Plain Language Guidelines (2011), que o atribuem a especialistas não " +
          "nomeados.",
      },
      en: {
        label: "Long paragraph",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "paragraph sentence count above the configured provisional limit",
        why:
          "A wall of sentences makes it hard to scan the text and find the information. The provisional limit is " +
          "the upper end of “three to eight sentences” in the Federal Plain Language Guidelines (2011), which " +
          "attribute it to unnamed writing experts.",
      },
    },
  },
  long_heading: {
    channel: "passage",
    markStyleClass: "",
    text: {
      "pt-BR": {
        label: "Título longo",
        kind: "Estrutura do documento",
        principleName: "Fácil de localizar",
        signal: "título acima do limite provisório de palavras, ou pontuado como frase (só em documento estruturado)",
        why:
          "Um título é um rótulo que o leitor varre para localizar o que procura. Nenhuma fonte americana fixa " +
          "tamanho de título, e as diretrizes federais recomendam títulos em forma de pergunta, que podem ser mais " +
          "longos.",
      },
      en: {
        label: "Long heading",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "heading above the provisional word limit, or punctuated as a sentence (structured documents only)",
        why:
          "A heading is a label readers scan to find what they need. No US source sets a heading length, and the " +
          "federal guidelines recommend question headings, which can run longer.",
      },
    },
  },
  heading_level_skip: {
    channel: "passage",
    markStyleClass: "",
    text: {
      "pt-BR": {
        label: "Salto de nível de título",
        kind: "Estrutura do documento",
        principleName: "Fácil de localizar",
        signal: "título cujo nível pula mais de um degrau abaixo do título anterior (só em documento estruturado)",
        why: "Saltos na hierarquia de títulos atrapalham quem navega pela estrutura: o sumário, a varredura e o leitor de tela.",
      },
      en: {
        label: "Heading level skip",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "a heading whose level drops more than one step below the previous heading (structured documents only)",
        why: "Skipped heading levels break navigation by structure: the outline, scanning and screen readers.",
      },
    },
  },
  single_item_list: {
    channel: "passage",
    markStyleClass: "",
    text: {
      "pt-BR": {
        label: "Lista de um item",
        kind: "Estrutura do documento",
        principleName: "Fácil de localizar",
        signal: "bloco de lista com exatamente um item (só em documento estruturado)",
        why: "Uma lista serve para comparar vários itens. Com um só, não ajuda o leitor a localizar nada e pode indicar item faltando.",
      },
      en: {
        label: "One-item list",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "a list block with exactly one item (structured documents only)",
        why: "A list compares several items. With only one, it does not help the reader find anything and may mean an item is missing.",
      },
    },
  },
  organization_vocabulary: {
    channel: "inline",
    markStyleClass: "mark-solid",
    text: {
      "pt-BR": {
        label: "Vocabulário da organização",
        kind: "Escolha lexical",
        principleName: "Palavras familiares",
        signal: "correspondência exata com um termo declarado pela organização (maior correspondência primeiro)",
        why: "A organização declarou que este termo não é familiar ao leitor dela. Esse vocabulário vem de quem conhece o público, não da norma.",
      },
      en: {
        label: "Organization vocabulary",
        kind: "Lexical choice",
        principleName: "Familiar words",
        signal: "exact match against a term the organization declared (longest match first)",
        why: "The organization declared this term unfamiliar to its readers. This vocabulary comes from the people who know the audience, not from the standard.",
      },
    },
  },
};

function metaIn(lang: UiLang): Record<EnCriterionId, CriterionMeta> {
  return Object.fromEntries(
    EN_CRITERION_IDS.map((id) => {
      const shape = SHAPE[id];
      return [id, { ruleId: id, channel: shape.channel, markStyleClass: shape.markStyleClass, ...shape.text[lang] }];
    }),
  ) as Record<EnCriterionId, CriterionMeta>;
}

export const EN_META: ByUiLang<Record<EnCriterionId, CriterionMeta>> = {
  "pt-BR": metaIn("pt-BR"),
  en: metaIn("en"),
};
