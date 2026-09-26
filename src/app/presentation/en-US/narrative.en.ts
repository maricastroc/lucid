import type { EnCriterionId } from "@/locales/en-US/criteria";
import { assistida, flat, metaBool, metaNum, metaStr, type CriterionNarrative } from "../../lib/narrative-types";

function limitOf(threshold: number | null, unit: string): string {
  return threshold != null ? `Lucid's provisional limit of ${threshold} ${unit}` : "Lucid's provisional limit";
}

export const EN_NARRATIVE_UI_EN: Record<EnCriterionId, CriterionNarrative> = {
  prose_enumeration: {
    headline: (f) => {
      const items = metaNum(f, "items");
      return items !== null ? `Enumeration in prose · ${items} items` : "Enumeration in prose";
    },
    prose: (f) => {
      const items = metaNum(f, "items") ?? 0;
      const notation = metaStr(f, "notation");
      const threshold = metaNum(f, "threshold");
      const how =
        notation === "series"
          ? `a colon introduces ${items} comma-separated items inside one sentence`
          : notation === "ordinals"
            ? `${items} steps are announced with ordinal words (“First… Second… Third…”) in running text`
            : `${items} items are marked (“(a)… (b)… (c)…”) inside running text`;
      const minimum =
        threshold !== null
          ? `Lucid flags series of ${threshold} or more items; that minimum is provisional and configurable.`
          : "The minimum number of items is provisional and configurable.";
      return `Here ${how}. ${minimum}`;
    },
    confidence: () =>
      assistida(
        "Lucid counts the items exactly, but whether a list helps depends on what the items are and who reads them. Only you can judge that; Lucid does not turn the series into a list.",
      ),
  },
  undefined_acronym: {
    headline: (f) => {
      const acronym = metaStr(f, "acronym");
      return acronym !== null ? `Undefined acronym · ${acronym}` : "Undefined acronym";
    },
    prose: (f) =>
      `“${metaStr(f, "acronym") ?? flat(f.span.text)}” appears here for the first time without being spelled out. The US federal guidelines ask writers to define an acronym on first use, as in “Federal Aviation Administration (FAA)”.`,
    confidence: () =>
      assistida(
        "Lucid sees that the acronym has not been spelled out yet, but it does not know what it stands for or whether your reader already knows it. Only you have that information.",
      ),
  },
  ambiguous_shall: {
    headline: (f) => (metaBool(f, "negated") ? "Ambiguous “shall not”" : "Ambiguous “shall”"),
    prose: (f) =>
      metaBool(f, "negated")
        ? `“${flat(f.span.text)}” can state a prohibition or a prediction, and the sentence does not say which. The federal guidelines recommend “must not” for a prohibition; “will not” for a prediction is Lucid's addition.`
        : `“${flat(f.span.text)}” can state an obligation, a permission, a recommendation or a prediction, and the sentence does not say which. The federal guidelines recommend “must” for an obligation, “may” for a permission and “should” for a recommendation; “will” for a prediction is Lucid's addition.`,
    confidence: () =>
      assistida(
        "Lucid finds every “shall”, but it does not choose the meaning: putting “must” where the text meant “may” would change what the reader is required to do. Only you know what the sentence means.",
      ),
  },
  reader_in_third_person: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun !== null ? `Reader in the third person · “${noun}”` : "Reader in the third person";
    },
    prose: (f) =>
      `“${flat(f.span.text)}” refers to the reader as “${metaStr(f, "readerNoun") ?? ""}” and gives them an obligation or a permission (“${metaStr(f, "deontic") ?? ""}”). Addressing the reader as “you” shows who must act.`,
    confidence: () =>
      assistida(
        "Lucid recognizes the noun and the modal, but it does not know who the document is written for. If it addresses someone else, such as a caseworker who serves applicants, the third person is right.",
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
          : ` Here “${metaStr(f, "lightForm") ?? ""}” carries tense or agreement, so “${verb}” would need the matching form.`;
        return `${excerpt} puts the action in a noun; the verb “${verb}” says it directly. The Federal Plain Language Guidelines (2011, p. 23) list this pair.${inflected}`;
      }
      return `${excerpt} pairs a light verb with a noun ending in “-${metaStr(f, "suffix") ?? ""}”, a suffix that often turns a verb into a noun. No verb is attested for this phrase, so Lucid does not name the verb.`;
    },
    confidence: (f) => {
      const verb = metaStr(f, "verb");
      if (metaBool(f, "swap")) {
        return {
          level: "segura",
          rationale: `Check that “${verb ?? ""}” says what “${flat(f.span.text)}” says in this sentence before you use it.`,
        };
      }
      if (verb !== null) {
        return assistida(
          `Lucid does not inflect verbs, so it cannot offer “${verb}” in the form this sentence needs. Rewriting the phrase is up to you.`,
        );
      }
      return assistida(
        "The suffix often marks a noun made from a verb, but that does not prove the noun hides the sentence's action, and no verb is attested for this phrase.",
      );
    },
  },
  passive_voice: {
    headline: (f) => (metaBool(f, "hasAgent") ? "Passive voice with an agent" : "Passive voice without an agent"),
    prose: (f) => {
      const excerpt = `“${flat(f.span.text)}” combines a form of “be” with a past participle.`;
      if (metaBool(f, "hasAgent")) return `${excerpt} Who acts appears after the verb, introduced by “by”.`;
      const state =
        metaStr(f, "form") === "present"
          ? " In the present tense, the construction can also describe a state (“the office is closed”) rather than an action; only the context decides."
          : "";
      return `${excerpt} The text does not say who performs the action.${state}`;
    },
    confidence: (f) => {
      if (metaBool(f, "hasAgent") && !metaBool(f, "agentTruncated")) {
        return assistida(
          "Lucid found the agent, but whether the sentence reads better in the active voice depends on what the reader needs first. That is your call.",
        );
      }
      if (metaBool(f, "hasAgent")) {
        return assistida(
          "The agent runs past the stretch of text Lucid reads after “by”, so it may be incomplete here. Check who acts in the full sentence before you change it.",
        );
      }
      return assistida("Only you know who performs the action; Lucid does not guess or fill it in.");
    },
  },
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Sentence with ${w} words` : "Sentence length";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "This sentence is above the length trigger Lucid uses for English.";
      const standard = f.normativeReference?.standard ?? "ISO 24495-1";
      return (
        `This sentence has ${w} words, above the ${th}-word trigger Lucid uses for English. The trigger is ` +
        "provisional and configurable: an interim reference borrowed from GOV.UK (United Kingdom), not a US " +
        `federal recommendation, and not validated for American documents. ${standard} asks for concise ` +
        "sentences of varied length but sets no number."
      );
    },
    confidence: () =>
      assistida(
        "Lucid counts words exactly, but it cannot tell one long idea from several stacked ones. Length alone does not decide whether the sentence is clear.",
      ),
  },
  paragraph_length: {
    headline: (f) => {
      const n = metaNum(f, "sentences");
      return n != null ? `Paragraph with ${n} sentences` : "Long paragraph";
    },
    prose: (f) => {
      const n = metaNum(f, "sentences");
      return (
        `This paragraph has ${n ?? "many"} sentences in one block, above ${limitOf(metaNum(f, "threshold"), "sentences")}. ` +
        "The limit comes from the Federal Plain Language Guidelines (2011) and has not been validated."
      );
    },
    confidence: () =>
      assistida(
        "Lucid counts the sentences exactly, but where to break the paragraph depends on how the ideas are organized, and that is your decision.",
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null ? `Long heading · ${w} words` : "Sentence-shaped heading";
    },
    prose: (f) => {
      if (metaStr(f, "reason") === "sentence") {
        return "This heading is punctuated like a sentence. Readers scan headings as labels; a heading shaped as a sentence has to be read instead of recognized at a glance.";
      }
      const w = metaNum(f, "words");
      return (
        `This heading has ${w ?? "many"} words, above ${limitOf(metaNum(f, "threshold"), "words")}. Neither ISO nor any US ` +
        "source sets a heading length, and the federal guidelines recommend question headings, which can run " +
        "longer. Treat it as a point to check, not a defect."
      );
    },
    confidence: () =>
      assistida(
        "Lucid measures the heading exactly, but whether it works as a label for this reader, or as a question the reader would ask, is your call.",
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
      return l != null && p != null
        ? `The heading hierarchy jumps from level ${p} to level ${l} and skips the level in between.`
        : "The heading hierarchy skips a level here.";
    },
    confidence: () =>
      assistida(
        "Lucid reads the heading levels exactly, but which fix is right depends on how the content is organized, and only you know that.",
      ),
  },
  single_item_list: {
    headline: () => "One-item list",
    prose: () =>
      "This list has a single item. An item may be missing, or the content may read better as a sentence in the running text.",
    confidence: () =>
      assistida("Lucid reads the list structure exactly, but only you know whether an item is missing."),
  },
  organization_vocabulary: {
    headline: () => "Organization vocabulary",
    prose: (f) =>
      `“${flat(f.span.text)}” is on the list of terms your organization declared unfamiliar to its readers.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `Your organization recorded “${f.suggestion}” for this term. Lucid does not check the meaning: confirm that “${f.suggestion}” fits this sentence before you use it.`,
        };
      return assistida("Your organization recorded no equivalent for this term, so Lucid only flags it.");
    },
  },
};
