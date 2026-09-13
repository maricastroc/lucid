import type { Pass } from "@/lucid/core/types";
import type { EnConfig } from "../config";
import { ambiguousShallPass } from "./ambiguous-shall";
import { hiddenVerbPass } from "./hidden-verb";
import { organizationVocabularyPass } from "./organization-vocabulary";
import { passiveVoicePass } from "./passive-voice";
import { proseEnumerationPass } from "./prose-enumeration";
import { readerThirdPersonPass } from "./reader-third-person";
import { undefinedAcronymPass } from "./undefined-acronym";
import {
  headingLevelSkipPass,
  longHeadingPass,
  paragraphLengthPass,
  sentenceLengthPass,
  singleItemListPass,
} from "./structural";

export const EN_PASSES: readonly Pass<EnConfig>[] = [
  passiveVoicePass,
  hiddenVerbPass,
  readerThirdPersonPass,
  ambiguousShallPass,
  undefinedAcronymPass,
  proseEnumerationPass,
  sentenceLengthPass,
  paragraphLengthPass,
  longHeadingPass,
  headingLevelSkipPass,
  singleItemListPass,
  organizationVocabularyPass,
];
