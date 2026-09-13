import type { EnCriterionId } from "@/locales/en-US/criteria";
import { assistida, flat, metaBool, metaNum, metaStr, type CriterionNarrative } from "../../lib/narrative-types";

export const EN_NARRATIVE_UI_EN: Record<EnCriterionId, CriterionNarrative> = {
  prose_enumeration: {
    headline: (f) => {
      const items = metaNum(f, "items");
      return items !== null ? `Enumeration in prose · ${items} items` : "Enumeration in prose";
    },
    prose: (f) => {
      const items = metaNum(f, "items") ?? 0;
      const notation = metaStr(f, "notation");
      const how =
        notation === "series"
          ? `a colon introduces ${items} comma-separated items inside one sentence`
          : notation === "ordinals"
            ? `${items} steps are announced with ordinal words (“First… Second… Third…”) in running text`
            : `${items} items are marked (“(a)… (b)… (c)…”) inside running text`;
      return `Here ${how}. The US federal guidelines recommend a vertical list, with a lead-in sentence, for requirements, steps and conditions. The minimum number of items is provisional and configurable.`;
    },
    confidence: () =>
      assistida(
        "The tool counts the items exactly, but turning the series into a list changes the structure of the text — and deciding whether a list helps this reader is yours. Lucid does not convert it.",
      ),
  },
  undefined_acronym: {
    headline: (f) => {
      const acronym = metaStr(f, "acronym");
      return acronym !== null ? `Undefined acronym · ${acronym}` : "Undefined acronym";
    },
    prose: (f) =>
      `“${metaStr(f, "acronym") ?? flat(f.span.text)}” appears here for the first time without being spelled out. The US federal guidelines ask to define an acronym on first use — “Federal Aviation Administration (FAA)” — or to replace it with a short name, such as “the committee”.`,
    confidence: () =>
      assistida(
        "The tool sees that the acronym has not been defined in the text yet, but it does not know what it stands for or whether your reader already knows it. Spelling it out — or deciding it does not need to be — is yours.",
      ),
  },
  ambiguous_shall: {
    headline: (f) => (metaBool(f, "negated") ? "Ambiguous “shall not”" : "Ambiguous “shall”"),
    prose: (f) =>
      metaBool(f, "negated")
        ? `“${flat(f.span.text)}” can state a prohibition or a prediction, and the sentence does not say which. For a prohibition, the federal guidelines recommend “must not”; for a prediction, “will not” is Lucid's note.`
        : `“${flat(f.span.text)}” can state an obligation, a discretion, a recommendation or a prediction, and the sentence does not say which. The federal guidelines recommend “must” (obligation), “may” (discretion) and “should” (recommendation); for a prediction, “will” is Lucid's note.`,
    confidence: () =>
      assistida(
        "The tool finds every “shall” exactly, but it does not choose the reading and does not replace the word: swapping in “must” where the text meant “may” would change what the reader is obliged to do. Only you know what the sentence means.",
      ),
  },
  reader_in_third_person: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun !== null ? `Reader in the third person · “${noun}”` : "Reader in the third person";
    },
    prose: (f) =>
      `“${flat(f.span.text)}” speaks of the reader as “${metaStr(f, "readerNoun") ?? ""}” and gives them an obligation or a permission (“${metaStr(f, "deontic") ?? ""}”). If the document is read by that person, addressing them as “you” makes plain who must act.`,
    confidence: () =>
      assistida(
        "The tool recognizes the noun and the modal, but it does not know who reads the document: if it addresses someone else — a caseworker who serves applicants, for instance — the third person is right. The decision is yours.",
      ),
  },
  hidden_verb: {
    headline: (f) => {
      const verb = metaStr(f, "verb");
      if (verb !== null) return `Hidden verb · “${verb}”`;
      return "Possibly hidden verb";
    },
    prose: (f) => {
      const verb = metaStr(f, "verb");
      const excerpt = `“${flat(f.span.text)}”`;
      if (verb !== null) {
        const inflected = metaBool(f, "swap")
          ? ""
          : ` Here the light verb is inflected (“${metaStr(f, "lightForm") ?? ""}”), and swapping without inflecting would break the sentence; Lucid does not inflect verbs.`;
        return `${excerpt} uses a noun where the verb “${verb}” would say the action directly. The equivalence is attested in the Federal Plain Language Guidelines (2011, p. 23).${inflected}`;
      }
      return `${excerpt} joins a light verb to a noun ending in “-${metaStr(f, "suffix") ?? ""}”, a suffix that usually turns a verb into a noun. No one-to-one equivalence is attested for this phrase, so Lucid does not name the verb.`;
    },
    confidence: (f) =>
      metaBool(f, "swap")
        ? {
            level: "segura",
            rationale: `The equivalence “${flat(f.span.text)}” → “${metaStr(f, "verb") ?? ""}” is attested in the source, and the light verb is in its base form, so the direct swap keeps the sentence grammatical. The decision to swap is still yours.`,
          }
        : assistida(
            "The suffix marks a noun derived from a verb, but it does not prove the noun hides the sentence's action, and without an attested equivalence Lucid does not choose the verb. Seeing whether one verb says it — and rewriting — is the author's work.",
          ),
  },
  passive_voice: {
    headline: (f) => (metaBool(f, "hasAgent") ? "Passive voice with an agent" : "Passive voice without an agent"),
    prose: (f) => {
      const excerpt = `“${flat(f.span.text)}” combines a form of “be” with a past participle.`;
      if (metaBool(f, "hasAgent")) return `${excerpt} Whoever acts appears after the verb, introduced by “by”.`;
      const state =
        metaStr(f, "form") === "present"
          ? " In the present tense without an agent, the construction can also describe a state (“the office is closed”) rather than an action; only the context decides."
          : "";
      return `${excerpt} The text does not say who performs the action.${state}`;
    },
    confidence: (f) =>
      metaBool(f, "hasAgent") && !metaBool(f, "agentTruncated")
        ? assistida(
            "The tool found the agent, but deciding whether the sentence reads better in the active voice — and rewriting it — is the author's work; Lucid does not convert voices.",
          )
        : assistida(
            "The agent is not in the text (or runs past the window Lucid reads): the tool refuses to invent who performs the action. Only you know who acts.",
          ),
  },
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Sentence with ${w} words` : "Sentence length";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "This sentence is above the inspection trigger for length.";
      const standard = f.normativeReference?.standard ?? "ISO 24495-1";
      return (
        `This sentence has ${w} words. Lucid inspects English sentences above ${th} words — that number is an ` +
        "interim reference borrowed from GOV.UK (United Kingdom), not a US federal recommendation, and it has not " +
        `been validated for American documents: it is provisional and configurable. ${standard} asks for concise ` +
        "sentences and varied length without stating a count. The main check is a different one: see whether the " +
        "sentence carries more than one idea."
      );
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `The tool counts words exactly${
          w != null && th != null ? ` (${w} words against a provisional trigger of ${th})` : ""
        }, but the trigger has not been validated for American English and length alone does not decide whether ` +
          "the sentence is clear. Reading the sentence and counting the ideas is yours to do.",
      );
    },
  },
  paragraph_length: {
    headline: (f) => {
      const n = metaNum(f, "sentences");
      return n != null ? `Paragraph with ${n} sentences` : "Long paragraph";
    },
    prose: (f) => {
      const n = metaNum(f, "sentences");
      const th = metaNum(f, "threshold");
      return (
        `This paragraph holds ${n ?? "many"} sentences in one block; Lucid inspects paragraphs above ` +
        `${th ?? "the configured limit"}. The limit is provisional: it is the upper end of “three to eight ` +
        "sentences” in the Federal Plain Language Guidelines (2011), attributed there to unnamed writing experts, " +
        "and it has not been validated."
      );
    },
    confidence: () =>
      assistida(
        "The tool counts the paragraph's sentences exactly, but where to break it into smaller blocks depends on how the ideas are organized — an author's decision.",
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null ? `Long heading · ${w} words` : "Sentence-shaped heading";
    },
    prose: (f) => {
      if (metaStr(f, "reason") === "sentence") {
        return "This heading is punctuated as a sentence. A heading works as a label for scanning the document; shaped as a sentence, it asks to be read rather than recognized.";
      }
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return (
        `This heading has ${w ?? "many"} words, above the provisional limit of ${th ?? "words"}. No US source nor ` +
        "ISO sets a heading length, and the federal guidelines recommend question headings, which can run longer — " +
        "so this is a point to look at, not a defect."
      );
    },
    confidence: () =>
      assistida(
        "The tool measures the heading exactly, but deciding whether it needs to be shorter — or is a question the reader would ask — is the author's work.",
      ),
  },
  heading_level_skip: {
    headline: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return l != null && p != null ? `Heading skip · level ${p}→${l}` : "Heading level skip";
    },
    prose: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return `The heading hierarchy jumps from level ${p ?? "the previous"} to ${l ?? "the next"}, without the intermediate step. The detector reads heading levels — it only exists because the document is structured.`;
    },
    confidence: () =>
      assistida(
        "The tool reads heading levels exactly, but deciding whether this heading should move up a level or whether an intermediate heading is missing depends on how the content is organized — the author's work.",
      ),
  },
  single_item_list: {
    headline: () => "One-item list",
    prose: () =>
      "This list has a single item. A list exists to compare several items; with only one, it may point to a missing item or to a sentence that would read better in running text.",
    confidence: () =>
      assistida(
        "The tool recognizes the one-item list, but deciding between completing the list and dissolving it into running text depends on the content — an author's decision.",
      ),
  },
  organization_vocabulary: {
    headline: () => "Organization vocabulary",
    prose: (f) =>
      `“${flat(f.span.text)}” is in the vocabulary your organization declared unfamiliar to its own reader. ` +
      "This does not come from the standard — it comes from whoever knows this document's audience.",
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `The organization recorded “${f.suggestion}” as this term's equivalent. It signs the equivalence — not the tool, not the standard; the change in the text is still yours.`,
        };
      return assistida(
        "The organization declared the term but recorded no equivalent. Without an attested swap, all that fits here is a signal.",
      );
    },
  },
};
