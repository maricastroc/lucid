import type { CriterionId } from "@/locales/pt-BR";
import type { CriterionText } from "../types";

export const TEXT_UI_EN: Record<CriterionId, CriterionText> = {
  passive_voice: {
    label: "Passive voice",
    kind: "Syntactic construction",
    principleName: "Clear sentences",
    signal: "a form of the verb “ser” followed by a participle, a few words apart at most",
    why: "Whoever acts disappears or moves to the end of the sentence. When the construction describes a state rather than an action, there is no agent to name: only the context can tell.",
  },
  passiva_sintetica: {
    label: "Synthetic passive (“se”)",
    kind: "Syntactic construction",
    principleName: "Clear sentences",
    signal:
      "“se” after the verb (aplica-se, publicam-se) or before it, right after words such as “não” and “que” (não se aplica); verbs that always take “se” (trata-se, refere-se…) are left out",
    why: "The “se” hides who performs the action, and the reader needs to know who does what.",
  },
  nominalization: {
    label: "Nominalization",
    kind: "Lexical choice",
    principleName: "Clear and concise sentences",
    signal:
      "a light verb (fazer, realizar, efetuar, proceder, promover) followed by an article or preposition and a noun derived from a verb, as consecutive words (“fazer a análise”)",
    why: "It hides the action inside a noun and lengthens the sentence for no gain.",
  },
  nominalizacao_encadeada: {
    label: "Chained nominalization",
    kind: "Lexical choice",
    principleName: "Clear and concise sentences",
    signal:
      "an action noun from a curated list linked by “de” to another abstract noun, or several of them in the same sentence",
    why: "Actions stacked as nouns hide who does what and weigh the sentence down.",
  },
  jargon: {
    label: "Jargon",
    kind: "Lexical choice",
    principleName: "Familiar words",
    signal: "a term written exactly as it appears in Lucid's glossary (the longest expression takes priority)",
    why: "A term that is little known outside its field pushes away the reader who is not a specialist.",
  },
  vocabulario_da_organizacao: {
    label: "Organisation's vocabulary",
    kind: "Lexical choice",
    principleName: "Familiar words",
    signal: "a term written exactly as the organisation declared it (the longest expression takes priority)",
    why: "A term the reader does not know stalls the reading. The organisation knows what its reader knows and declared this term; the standard has no way of knowing that.",
  },
  sigla_sem_expansao: {
    label: "Unexpanded acronym",
    kind: "Lexical choice",
    principleName: "Familiar words",
    signal:
      "an acronym (2 to 6 capital letters) used before being spelled out; state codes, units of measurement and very well-known acronyms are left out",
    why: "An acronym that was never introduced assumes the reader already knows it. Anyone who does not stalls right at the start.",
  },
  long_sentence: {
    label: "Sentence length",
    kind: "Sentence length",
    principleName: "Concise sentences",
    signal: "a sentence with more words than the number set in the editorial profile (a Lucid parameter)",
    why:
      "Long sentences tend to pile up ideas. The standard asks for one idea per sentence and for varied " +
      "length, without fixing a number. Length is a reason to reread the sentence, not a defect: a long " +
      "sentence carrying a single idea can be fine, and a short one can be hard for other reasons.",
  },
  mais_que_perfeito_sintetico: {
    label: "Synthetic pluperfect",
    kind: "Verb tense",
    principleName: "Clear sentences",
    signal:
      "a verb form from a synthetic pluperfect list (“fizera”, “dissera”), taken from PortiLexicon-UD with the ambiguous forms removed",
    why: "A verb form rarely heard in speech (“fizera” instead of “tinha feito”), and so harder to read.",
  },
  gerundismo: {
    label: "Gerundism",
    kind: "Syntactic construction",
    principleName: "Concise sentences",
    signal: "the pattern “ir + estar + gerund” (e.g. “vai estar enviando”)",
    why: "It lengthens the sentence for nothing: the simple form (“vai enviar”) is more direct.",
  },
  adverbios_vagos: {
    label: "Vague adverbs",
    kind: "Lexical choice",
    principleName: "Concise sentences",
    signal: "an intensifying or hedging adverb from a curated list (basicamente, efetivamente, realmente…)",
    why: "An adverb that reinforces without adding: it usually goes without changing what the sentence asserts.",
  },
  adverbio_mente_denso: {
    label: "-mente adverbs (discontinued)",
    kind: "Lexical choice",
    principleName: "Concise sentences",
    signal: "several -mente adverbs in the same sentence (list taken from PortiLexicon-UD)",
    why: "Many -mente adverbs in one sentence weigh the reading down. Discontinued criterion, off by default: “Vague adverbs” replaces it.",
  },
  redundancia: {
    label: "Redundancy",
    kind: "Lexical choice",
    principleName: "Concise sentences",
    signal: "an expression from a curated list of pleonasms and redundant pairs (“elo de ligação”)",
    why: "One term repeats the meaning of the other without adding information.",
  },
  perifrase_inflada: {
    label: "Inflated periphrasis",
    kind: "Lexical choice",
    principleName: "Concise sentences",
    signal:
      "a multiword phrase from a curated list standing in for a simple preposition or conjunction (“no sentido de”)",
    why: "It uses several words where a single one would do.",
  },
  paragraph_length: {
    label: "Long paragraph",
    kind: "Document structure",
    principleName: "Easy to find",
    signal: "a paragraph with more sentences than the number set in the editorial profile (a Lucid parameter)",
    why: "A block with many sentences makes it hard to scan the text and locate the information.",
  },
  prose_enumeration: {
    label: "Enumeration in prose",
    kind: "Document structure",
    principleName: "Easy to find",
    signal:
      "distinct sequence markers in the same paragraph, starting from the first (“primeiro… segundo…”, “(1)… (2)…”), at the minimum count set in the editorial profile",
    why: "Items buried in running text are harder to locate than in a list.",
  },
  mesoclise: {
    label: "Mesoclisis",
    kind: "Verb form",
    principleName: "Clear sentences",
    signal: "a pronoun inside the verb, before the future or conditional ending (“far-se-á”)",
    why: "An archaic form (“far-se-á”) that is hard to read: the ordinary form is more direct.",
  },
  dupla_negacao: {
    label: "Double negative",
    kind: "Syntactic construction",
    principleName: "Clear sentences",
    signal: "an expression from a curated list that asserts by negating the opposite (“não é incomum”)",
    why: "The reader has to undo the negation to reach the affirmative meaning.",
  },
  subordinacao_densa: {
    label: "Dense subordination",
    kind: "Syntactic construction",
    principleName: "Concise sentences",
    signal:
      "several subordinating connectives in the same sentence (“que”, “porque”, “embora”, “para que”…), from a curated list",
    why: "Many chained subordinate clauses trap too many ideas in one sentence and weigh the reading down.",
  },
  leitor_terceira_pessoa: {
    label: "Talking about the reader",
    kind: "Syntactic construction",
    principleName: "Clear sentences",
    signal:
      "a word naming the reader (“o interessado”, “o cidadão”) as the subject of a verb of obligation (“deve”, “deverá”), a few words apart at most",
    why: "Talking about the reader in the third person creates distance. Saying “você” closes the gap and makes clear who must act.",
  },
  salto_de_nivel_titulo: {
    label: "Heading level skip",
    kind: "Document structure",
    principleName: "Easy to find",
    signal:
      "a heading that drops more than one level below the previous heading (only when the document marks headings)",
    why: "Skips in the heading hierarchy get in the way of anyone reading by structure: the outline, quick scanning and screen readers.",
  },
  long_heading: {
    label: "Long heading",
    kind: "Document structure",
    principleName: "Easy to find",
    signal:
      "a heading with more words than the editorial profile limit, with more than one sentence, or ending in a full stop (only when the document marks headings)",
    why: "A heading is a label for locating a section. Long or shaped as a sentence, it stops doing that job.",
  },
  single_item_list: {
    label: "One-item list",
    kind: "Document structure",
    principleName: "Easy to find",
    signal: "a list with exactly one item (only when the document marks lists)",
    why: "A list exists to separate several items. With only one, it does not help locate anything and suggests an item is missing.",
  },
};
