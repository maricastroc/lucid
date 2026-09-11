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
      `Sentence of ${words} words. Lucid inspects sentences above ${threshold} words. That trigger is an ` +
      "interim reference borrowed from GOV.UK, the United Kingdom government's guidance; it is not a US federal " +
      "recommendation and has not been validated for American documents, so it stays provisional and " +
      "configurable. ISO 24495-1 asks for concise sentences and varied length without fixing a number. Check " +
      "whether the sentence carries more than one idea; if it carries one, it may be fine as it is.",
  },
});

export const paragraphLengthPass = createParagraphLengthPass<EnConfig>({
  criterion: "paragraph_length",
  enabled: (config) => config.paragraphLength.enabled,
  maxSentences: (config) => config.paragraphLength.maxSentences,
  thresholdStatus: "provisional",
  text: {
    justification: (sentences, threshold) =>
      `Long paragraph: ${sentences} sentences in one block. Lucid inspects paragraphs above ${threshold} ` +
      "sentences — a provisional trigger taken from the upper end of the Federal Plain Language Guidelines' " +
      '"three to eight sentences"; their 150-word ceiling is not measured here. Consider breaking it up, one ' +
      "idea per paragraph; the tool does not split automatically.",
  },
});

export const longHeadingPass = createLongHeadingPass<EnConfig>({
  criterion: "long_heading",
  enabled: (config) => config.longHeading.enabled,
  maxWords: (config) => config.longHeading.maxWords,
  thresholdStatus: "provisional",
  text: {
    tooLong: (words, threshold) =>
      `Heading of ${words} words (above ${threshold}). No US guideline fixes a word count for headings, so this ` +
      "trigger is provisional; question headings, which the federal guidelines recommend, can legitimately run " +
      "longer. A heading is a label to scan by: shortening it means deciding what is essential, and the tool " +
      "does not rewrite headings.",
    manySentences: (sentences) =>
      `Heading made of ${sentences} sentences — a heading is a label, not running text. Reduce it to a short ` +
      "label the reader can scan by; the tool does not make that cut.",
    endsAsStatement:
      "Heading ends with a period, like a sentence — headings are labels and do not close as a clause. " +
      "Reworking the form is the author's call; the tool does not rewrite headings.",
  },
});

export const headingLevelSkipPass = createHeadingLevelSkipPass<EnConfig>({
  criterion: "heading_level_skip",
  enabled: (config) => config.headingLevelSkip.enabled,
  text: {
    justification: (level, previousLevel) =>
      `This heading jumps from level ${previousLevel} to ${level} without passing through ${previousLevel + 1}. ` +
      "Skipped levels break reading by structure (table of contents, scanning, screen readers). Adjust this " +
      "heading's level or add an intermediate one; the tool does not reorganize the hierarchy for you.",
  },
});

export const singleItemListPass = createSingleItemListPass<EnConfig>({
  criterion: "single_item_list",
  enabled: (config) => config.singleItemList.enabled,
  text: {
    justification:
      "List with a single item. A list exists to separate and compare several items; with one, it helps no one " +
      "find anything and suggests either that an item is missing or that the content belongs in running text. " +
      "This is structural hygiene (a weak signal, with no direct guideline in the standard): completing the list " +
      "or folding it into the prose is the author's decision.",
  },
});
