import {
  assistida,
  flat,
  metaBool,
  metaNum,
  metaStr,
  metaWords,
  quotedList,
  type PtNarrativeSet,
} from "../../lib/narrative-types";

const DOMAIN_EN: Record<string, string> = {
  administrative: "administrative",
  legal: "legal",
  general: "technical",
};

const BASE: PtNarrativeSet = {
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Sentence with ${w} words` : "Sentence length";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "This sentence has more words than Lucid's inspection parameter.";
      const standard = f.normativeReference?.standard ?? "ISO 24495-1";
      const parameter =
        metaStr(f, "thresholdStatus") === "provisional"
          ? "That number is provisional for this analysis language, not yet validated, and not a limit set by the standard"
          : "That number is a Lucid parameter, not a limit set by the standard";
      return (
        `This sentence has ${w} words, and Lucid inspects sentences above ${th}. ${parameter}: ` +
        `${standard} asks for concise sentences and varied length without stating a count. What matters is ` +
        "whether the sentence carries more than one idea: with only one, it can be fine and does not need to be split."
      );
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `The word count is exact${w != null && th != null ? ` (${w}, above ${th})` : ""}. Length alone, ` +
          "though, does not show whether the sentence holds one long idea or several stacked ones: institution " +
          "names, legal references and spelled-out amounts lengthen a sentence without adding ideas.",
      );
    },
  },
  passive_voice: {
    headline: (f) =>
      metaStr(f, "eventiveness") === "postposed_subject"
        ? "Passive voice with a postposed subject"
        : metaBool(f, "hasAgent")
          ? "Passive voice with agent"
          : "Passive voice without agent",
    prose: (f) => {
      const passage = `«${flat(f.span.text)}» combines a form of the verb “ser” with a participle.`;
      if (metaStr(f, "eventiveness") === "postposed_subject") {
        return `${passage} The clause opens on the verb and the subject follows the participle, an order only the passive allows. Lucid did not find who performs the action in the sentence.`;
      }
      return `${passage} ${
        metaBool(f, "hasAgent")
          ? "The agent, whoever performs the action, appears in the passage itself."
          : "Lucid did not find who performed the action in the sentence."
      }`;
    },
    confidence: (f) =>
      assistida(
        metaStr(f, "eventiveness") === "postposed_subject"
          ? "The verb-subject order confirms the passive. Lucid does not invent an agent that is not in the text."
          : metaBool(f, "hasAgent")
            ? "Lucid recognized both the passive and the agent in the text. Check that the agent is complete and that the active version keeps the same meaning."
            : "This is a form of “ser” followed by a participle. Lucid does not invent an agent that is not in the text.",
      ),
  },
  passiva_sintetica: {
    headline: () => "Synthetic passive (“se”)",
    prose: (f) =>
      metaStr(f, "position") === "proclitic"
        ? `In «${flat(f.span.text)}», the “se” comes before the verb and the text does not say who performs the action (in “não se aplica a multa”, who applies it?). Lucid only flags this “se” after a word that forces that position (here, “${metaStr(f, "attractor") ?? "não"}”), where it cannot be the conditional “se”.`
        : `In «${flat(f.span.text)}», the “se” comes after the verb and the text does not say who performs the action (in “aplica-se a multa”, who applies it?).`,
    confidence: () =>
      assistida(
        "Lucid located the construction reliably, but the role of the “se” depends on the sentence: it can be a passive, an indeterminate subject or a reflexive. Read the sentence and decide which case it is.",
      ),
  },
  nominalization: {
    headline: (f) => `With a generic verb: “${flat(f.span.text)}”`,
    prose: (f) => {
      const noun = metaStr(f, "nominalization");
      const light = metaStr(f, "lightVerb");
      return `In “${flat(f.span.text)}”, the action is written as a noun${noun ? ` (“${noun}”)` : ""} alongside a generic verb${
        light ? ` (“${light}”)` : ""
      }. With the matching verb, the sentence can be more direct.`;
    },
    confidence: (f) => {
      const base = metaStr(f, "baseVerb");
      if (!f.requiresHuman)
        return assistida(
          `According to Lucid's curated list, this noun corresponds to a single verb${base ? `, “${base}”` : ""}. The new sentence can be yours or an AI proposal; either way, Lucid verifies the result.`,
        );
      return assistida(
        `Lucid recognized the construction reliably, but this noun can map to more than one verb. Check which verb expresses the action in this sentence${base ? ` (perhaps “${base}”)` : ""}.`,
      );
    },
  },
  jargon: {
    headline: (f) => `${DOMAIN_EN[metaStr(f, "domain") ?? ""] ?? "Technical"} jargon`,
    prose: (f) =>
      `«${flat(f.span.text)}» is in Lucid's glossary as ${
        DOMAIN_EN[metaStr(f, "domain") ?? ""] ?? "technical"
      } vocabulary, unfamiliar to readers outside that field.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `Lucid's glossary records “${f.suggestion}” as an equivalent of “${flat(f.span.text)}”, with no other known sense and no change in government. Whether it fits this sentence is yours to check, before you click.`,
        };
      return assistida(
        "Lucid recognized the term reliably, but the glossary records no swap that works in every sentence: the sense here and what follows decide. Check the context before swapping.",
      );
    },
  },
  vocabulario_da_organizacao: {
    headline: () => "Organisation's vocabulary",
    prose: (f) =>
      `«${flat(f.span.text)}» is in the vocabulary your organisation declared unfamiliar to its own reader. ` +
      "This finding comes from the organisation, not from the standard.",
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `The term appears exactly as the organisation declared it, and the organisation recorded “${f.suggestion}” as its equivalent. Whether it fits this sentence is yours to check, before you click.`,
        };
      return assistida(
        "The term appears exactly as the organisation declared it, but no equivalent was recorded. Decide whether it stays, gets an explanation or is replaced; Lucid does not propose a substitute.",
      );
    },
  },
  sigla_sem_expansao: {
    headline: (f) => {
      const a = metaStr(f, "acronym");
      return a ? `Unexpanded acronym · “${a}”` : "Unexpanded acronym";
    },
    prose: (f) => {
      const a = metaStr(f, "acronym");
      return `The acronym${a ? ` “${a}”` : ""} appears here without having been spelled out before. Only this first occurrence is flagged.`;
    },
    confidence: () =>
      assistida(
        "Lucid reliably locates the first occurrence that was never introduced, but it does not know what the acronym stands for. Supply the full name at this first occurrence.",
      ),
  },
  subordinacao_densa: {
    headline: (f) => {
      const c = metaNum(f, "clauses");
      return c != null ? `Dense subordination · ${c} clauses` : "Dense subordination";
    },
    prose: (f) => {
      const c = metaNum(f, "clauses");
      const th = metaNum(f, "threshold");
      return `This sentence chains ${c ?? "several"} subordinate clauses${
        th != null ? `, and Lucid flags sentences from ${th} on` : ""
      }. The count comes from connectives on a curated list, without interpreting the content.`;
    },
    confidence: (f) => {
      const c = metaNum(f, "clauses");
      return assistida(
        `The connective count is exact${
          c != null ? ` (${c} in this sentence)` : ""
        }, but it does not measure whether the sentence became hard: some subordinate clauses are short and clear. Read the sentence and check whether it traps too many ideas.`,
      );
    },
  },
  leitor_terceira_pessoa: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun ? `Indirect address · “${noun}”` : "Talking about the reader";
    },
    prose: (f) => {
      const noun = metaStr(f, "readerNoun");
      const verb = metaStr(f, "deonticVerb");
      return `The text refers to the reader in the third person${noun ? ` (“${noun}”)` : ""}${
        verb ? ` and assigns them an obligation (“${verb}”)` : ""
      }: it talks about the reader instead of to them.`;
    },
    confidence: (f) => {
      const noun = metaStr(f, "readerNoun");
      return assistida(
        `Lucid reliably recognizes a word that usually names the reader, as the subject of an obligation. Check whether ${
          noun ? `“${noun}”` : "that person"
        } really is whoever reads the document, and whether addressing them directly suits the tone of the text.`,
      );
    },
  },
  salto_de_nivel_titulo: {
    headline: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return l != null && p != null ? `Heading skip · level ${p}→${l}` : "Heading level skip";
    },
    prose: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      const jump =
        l != null && p != null
          ? `The heading hierarchy jumps from level ${p} to level ${l}, without the level in between.`
          : "The heading hierarchy skips a level, without the level in between.";
      return `${jump} The level comes from the document's heading markup, not from the font size.`;
    },
    confidence: () =>
      assistida(
        "The levels are read exactly from the document's markup. Check whether this heading should move up a level or whether an intermediate heading is missing: that depends on how the content is organized.",
      ),
  },
  nominalizacao_encadeada: {
    headline: (f) => {
      if (metaStr(f, "kind") === "chain") {
        return metaBool(f, "strongLink")
          ? `One linked to another: “${flat(f.span.text)}”`
          : `Linked to another noun: “${flat(f.span.text)}”`;
      }
      const words = metaWords(f, "words");
      const count = metaNum(f, "count");
      return words.length > 0
        ? `${count ?? words.length} in this sentence: ${quotedList(words, "and")}`
        : "Several in this sentence";
    },
    prose: (f) => {
      if (metaStr(f, "kind") === "chain") {
        const actions = metaWords(f, "actions");
        const connectors = [...new Set(metaWords(f, "connectors"))];
        const tails = metaWords(f, "words").slice(1);
        if (metaBool(f, "strongLink") && actions.length >= 2) {
          return `${quotedList(actions, "and")} are actions written as nouns, and here one is linked to the other by ${quotedList(connectors, "and")}. In sequence, they can make the reading more abstract.`;
        }
        if (actions.length === 1 && tails.length > 0) {
          return `In “${flat(f.span.text)}”, the action “${actions[0]}” is written as a noun and is linked by ${quotedList(connectors, "and")} to ${tails.length === 1 ? "another noun" : "other nouns"}, ${quotedList(tails, "and")}.`;
        }
        return `In “${flat(f.span.text)}”, an action is written as a noun and is linked by “de” to another noun.`;
      }
      const words = metaWords(f, "words");
      const count = metaNum(f, "count") ?? words.length;
      const marked = flat(f.span.text);
      const others = [...words];
      const at = others.indexOf(marked);
      if (at >= 0) others.splice(at, 1);
      if (others.length === 0)
        return `This sentence has ${count} actions written as nouns. This point marks “${marked}”.`;
      return `This sentence has ${count} actions written as nouns. This point marks “${marked}”; ${quotedList(others, "and")} ${others.length === 1 ? "appears" : "appear"} in other points of this sentence.`;
    },
    confidence: () =>
      assistida(
        "Lucid recognizes these words from a curated list of action nouns. Whether the sentence reads better with the verb is your call.",
      ),
  },
  mais_que_perfeito_sintetico: {
    confidence: () =>
      assistida(
        "Lucid recognized the form reliably, and it is grammatically correct; what weighs is that it is rare in speech. When rewriting, check that the auxiliary and the person of the verb agree with the rest of the sentence.",
      ),
  },
  gerundismo: {
    confidence: () =>
      assistida(
        "Lucid recognized the pattern “ir + estar + gerund” reliably. When swapping it for the future or the present, check that the sentence still says when the action happens.",
      ),
  },
  adverbio_mente_denso: {
    confidence: () =>
      assistida(
        "Discontinued criterion, off by default: it counts how many -mente adverbs a sentence has, without assessing each one. “Vague adverbs” replaces it. Check which adverbs add meaning before cutting.",
      ),
  },
  adverbios_vagos: {
    confidence: () =>
      assistida(
        "Lucid recognized the adverb reliably, from a curated list. Whether it only reinforces or also changes what the sentence asserts depends on the emphasis you want.",
      ),
  },
  redundancia: {
    confidence: () =>
      assistida(
        "Lucid recognized the expression reliably, from a curated list. Which term to cut depends on the sentence: check that what remains says the same thing.",
      ),
  },
  perifrase_inflada: {
    confidence: () =>
      assistida(
        "Lucid recognized the phrase reliably, from a curated list. A shorter form can change the government or the meaning of what follows: check the whole sentence before swapping.",
      ),
  },
  paragraph_length: {
    confidence: () =>
      assistida(
        "The sentence count is exact, and the limit is a Lucid parameter, not one set by the standard. Check whether the paragraph covers more than one idea; where to split depends on how those ideas are organized.",
      ),
  },
  prose_enumeration: {
    confidence: () =>
      assistida(
        "Lucid recognized the sequence markers reliably. Check whether the items make sense on their own, in a list, or depend on the text that links them.",
      ),
  },
  mesoclise: {
    confidence: () =>
      assistida(
        "Lucid recognized the mesoclisis reliably, and it is grammatically correct; what weighs is that it is rare. Rewriting without it changes the construction of the sentence; check that the new version says who does what.",
      ),
  },
  dupla_negacao: {
    confidence: () =>
      assistida(
        "Lucid recognized the double negative reliably, from a curated list. Saying it directly (“é comum” instead of “não é incomum”) may lose the nuance you intended: check whether it matters here.",
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null ? `Long heading · ${w} words` : "Long heading";
    },
    confidence: () =>
      assistida(
        "The heading measurement (words, sentences and final full stop) is exact, and the word limit is a Lucid parameter. Check what the reader needs to locate the section; the rest can move into the text.",
      ),
  },
  single_item_list: {
    confidence: () =>
      assistida(
        "The count is exact: the list has only one item. Check whether an item is missing or whether the content fits better in running text.",
      ),
  },
};

export const NARRATIVE_UI_EN = BASE;
