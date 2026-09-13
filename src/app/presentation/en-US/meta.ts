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
          "série no texto corrido — marcadores “(a) (b) (c)”, “(1) (2) (3)” ou “(i) (ii) (iii)”, ordinais no início da frase (“First… Second…”) ou itens separados por vírgula depois de dois-pontos —, a partir de um número provisório de itens",
        why:
          "Uma lista vertical deixa os itens mais fáceis de localizar e comparar. As diretrizes federais " +
          "americanas recomendam lista vertical, com frase de introdução, para requisitos, etapas e condições.",
      },
      en: {
        label: "Enumeration in prose",
        kind: "Document structure",
        principleName: "Easy to find",
        signal:
          "a series in running text — markers “(a) (b) (c)”, “(1) (2) (3)” or “(i) (ii) (iii)”, sentence-initial ordinals (“First… Second…”) or comma-separated items after a colon — from a provisional number of items",
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
          "americanas pedem defini-la no primeiro uso — ou trocá-la por um apelido que diga o que ela é.",
      },
      en: {
        label: "Undefined acronym",
        kind: "Lexical choice",
        principleName: "Familiar words",
        signal:
          "an all-caps acronym (2 to 6 letters) used before it is introduced as “Full Name (ACRONYM)” or “ACRONYM (Full Name)”; common acronyms from a short declared list are excused",
        why:
          "Readers need to know what an acronym stands for the first time they meet it. The US federal guidelines " +
          "ask to define it on first use — or to replace it with a short name that says what it is.",
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
          "toda ocorrência de “shall” ou “shall not” — a forma não diz se é obrigação, proibição, faculdade, recomendação ou previsão",
        why:
          "O leitor não sabe se precisa agir, se pode agir ou se algo vai acontecer. As diretrizes federais " +
          "americanas pedem “must”, “must not”, “may” ou “should” conforme o sentido. Extensão editorial do " +
          "inglês: a norma ISO não trata desta palavra.",
      },
      en: {
        label: "Ambiguous “shall”",
        kind: "Lexical choice",
        principleName: "Clear sentences",
        signal:
          "every “shall” or “shall not” — the form does not say whether it is an obligation, a prohibition, a discretion, a recommendation or a prediction",
        why:
          "The reader cannot tell whether they must act, may act or whether something will happen. The US federal " +
          "guidelines ask for “must”, “must not”, “may” or “should” depending on the meaning. An English " +
          "editorial extension: the ISO standard does not address this word.",
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
          "verbo leve (make, take, give…) + substantivo com sufixo deverbal (-tion, -sion, -ment, -ance, -ence); verbo sugerido só com equivalência 1:1 atestada",
        why:
          "A ação fica dentro de um substantivo e a frase precisa de um verbo extra para fazer sentido. As " +
          "diretrizes federais americanas chamam isso de hidden verb.",
      },
      en: {
        label: "Hidden verb",
        kind: "Lexical choice",
        principleName: "Clear sentences",
        signal:
          "light verb (make, take, give…) + noun with a deverbal suffix (-tion, -sion, -ment, -ance, -ence); a verb is suggested only with an attested one-to-one equivalence",
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
          "contagem de palavras da frase acima do gatilho provisório (referência interina do GOV.UK, configurável)",
        why:
          "Extensão é um gatilho de inspeção, não um defeito: a norma pede uma ideia por frase e variação de " +
          "tamanho, sem fixar número. Para inglês americano, o gatilho é uma referência interina emprestada do " +
          "GOV.UK (Reino Unido) — não é recomendação federal americana nem foi validado para documentos americanos.",
      },
      en: {
        label: "Sentence length",
        kind: "Sentence length",
        principleName: "Concise sentences",
        signal: "sentence word count above the provisional trigger (interim GOV.UK reference, configurable)",
        why:
          "Length is an inspection trigger, not a defect: the standard asks for one idea per sentence and for " +
          "varied length, without fixing a number. For US English the trigger is an interim reference borrowed " +
          "from GOV.UK (United Kingdom) — not a US federal recommendation, and not validated for American documents.",
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
          "Um paredão de frases dificulta varrer o texto e achar a informação. O limite vem do teto de “três a " +
          "oito frases” das Federal Plain Language Guidelines (2011), atribuído a especialistas não nomeados.",
      },
      en: {
        label: "Long paragraph",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "paragraph sentence count above the configured provisional limit",
        why:
          "A wall of sentences makes it hard to scan the text and locate the information. The limit is the upper " +
          "end of “three to eight sentences” in the Federal Plain Language Guidelines (2011), attributed there to " +
          "unnamed writing experts.",
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
          "Um título é um rótulo para varrer e localizar. Nenhuma fonte americana fixa tamanho de título, e as " +
          "diretrizes federais recomendam títulos em forma de pergunta, que podem ser mais longos.",
      },
      en: {
        label: "Long heading",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "heading above the provisional word limit, or punctuated as a sentence (structured documents only)",
        why:
          "A heading is a label for scanning and locating. No US source sets a heading length, and the federal " +
          "guidelines recommend question headings, which can run longer.",
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
        why: "Saltos na hierarquia de títulos quebram a leitura por estrutura — sumário, varredura, leitor de tela.",
      },
      en: {
        label: "Heading level skip",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "a heading whose level drops more than one step below the previous heading (structured documents only)",
        why: "Skips in the heading hierarchy break structural reading — outline, scanning, screen readers.",
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
        why: "Uma lista existe para comparar vários itens; com um só, não ajuda a localizar e sugere item faltando.",
      },
      en: {
        label: "One-item list",
        kind: "Document structure",
        principleName: "Easy to find",
        signal: "a list block with exactly one item (structured documents only)",
        why: "A list exists to compare several items; with only one it does not help locate anything and suggests a missing item.",
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
        why: "A organização declarou que este termo não é familiar ao leitor dela. A norma não conhece o vocabulário de uma casa; ela conhece.",
      },
      en: {
        label: "Organization vocabulary",
        kind: "Lexical choice",
        principleName: "Familiar words",
        signal: "exact match against a term the organization declared (longest match first)",
        why: "The organization declared this term unfamiliar to its own reader. The standard does not know a given office's vocabulary; the office does.",
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
