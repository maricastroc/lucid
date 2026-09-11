export { matchPhrasesInSentence } from "./phrase-match";
export type { CompiledPhrase, PhraseEntry, PhraseHit, PhrasePrepared } from "./phrase-match";

export { createSentenceLengthPass } from "./passes/sentence-length";
export type { SentenceLengthOptions, SentenceLengthText } from "./passes/sentence-length";

export { createParagraphLengthPass } from "./passes/paragraph-length";
export type { ParagraphLengthOptions, ParagraphLengthText } from "./passes/paragraph-length";

export { createLongHeadingPass } from "./passes/long-heading";
export type { LongHeadingOptions, LongHeadingText } from "./passes/long-heading";

export { createHeadingLevelSkipPass } from "./passes/heading-level-skip";
export type { HeadingLevelSkipOptions, HeadingLevelSkipText } from "./passes/heading-level-skip";

export { createSingleItemListPass } from "./passes/single-item-list";
export type { SingleItemListOptions, SingleItemListText } from "./passes/single-item-list";

export { compileOrgTerms, createOrganizationVocabularyPass } from "./passes/organization-vocabulary";
export type {
  OrganizationVocabularyOptions,
  OrganizationVocabularySettings,
  OrganizationVocabularyText,
} from "./passes/organization-vocabulary";
