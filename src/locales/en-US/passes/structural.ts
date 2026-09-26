import {
  createHeadingLevelSkipPass,
  createLongHeadingPass,
  createParagraphLengthPass,
  createSentenceLengthPass,
  createSingleItemListPass,
} from "../../_shared";
import type { EnConfig } from "../config";

export const sentenceLengthPass = createSentenceLengthPass<EnConfig>({
  criterion: "long_sentence",
  warnAbove: (config) => config.sentenceLength.warnAbove,
  thresholdStatus: "provisional",
  text: {
    justification: (words, threshold) =>
      `Sentence of ${words} words. Check whether it carries more than one idea; if it carries only one, it may ` +
      `be fine as it is. Lucid inspects sentences above ${threshold} words. That trigger is provisional and ` +
      "configurable: an interim reference borrowed from GOV.UK (United Kingdom), not a US federal recommendation, " +
      "and not validated for American documents. ISO 24495-1 asks for concise sentences of varied length but sets " +
      "no number.",
  },
});

export const paragraphLengthPass = createParagraphLengthPass<EnConfig>({
  criterion: "paragraph_length",
  enabled: (config) => config.paragraphLength.enabled,
  maxSentences: (config) => config.paragraphLength.maxSentences,
  thresholdStatus: "provisional",
  text: {
    justification: (sentences, threshold) =>
      `Long paragraph: ${sentences} sentences in one block. If it covers more than one topic, consider one ` +
      `paragraph per topic. Lucid inspects paragraphs above ${threshold} sentences, a provisional trigger taken ` +
      "from the upper end of “three to eight sentences” in the Federal Plain Language Guidelines (2011); their " +
      "150-word ceiling is not measured.",
  },
});

export const longHeadingPass = createLongHeadingPass<EnConfig>({
  criterion: "long_heading",
  enabled: (config) => config.longHeading.enabled,
  maxWords: (config) => config.longHeading.maxWords,
  thresholdStatus: "provisional",
  text: {
    tooLong: (words, threshold) =>
      `Heading of ${words} words, above the provisional limit of ${threshold}. A heading is a label readers ` +
      "scan: if you shorten it, keep what the reader is looking for. No US guideline sets a word count for " +
      "headings, and question headings, which the federal guidelines recommend, can rightly run longer.",
    manySentences: (sentences) =>
      `Heading made of ${sentences} sentences. A heading is a label, not running text: reduce it to a short ` +
      "label the reader can scan.",
    endsAsStatement:
      "Heading ends with a period, like a sentence. Headings are labels: remove the period, or rework the " +
      "heading into a short label if it reads as a sentence.",
  },
});

export const headingLevelSkipPass = createHeadingLevelSkipPass<EnConfig>({
  criterion: "heading_level_skip",
  enabled: (config) => config.headingLevelSkip.enabled,
  text: {
    justification: (level, previousLevel) =>
      `This heading jumps from level ${previousLevel} to level ${level}, skipping level ${previousLevel + 1}. ` +
      "Change this heading's level or add the missing intermediate heading. Skipped levels break navigation by " +
      "structure: the table of contents, scanning and screen readers.",
  },
});

export const singleItemListPass = createSingleItemListPass<EnConfig>({
  criterion: "single_item_list",
  enabled: (config) => config.singleItemList.enabled,
  text: {
    justification:
      "List with a single item. A list separates and compares several items; with only one, an item may be " +
      "missing, or the content may belong in running text. Complete the list or turn the item into a sentence. " +
      "This is a weak structural signal, with no direct guideline in the standard.",
  },
});
