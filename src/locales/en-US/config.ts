import type { Config, ConfigSchema, OrgTerm, ThresholdBasis } from "@/lucid/core/config";

export interface EnConfig extends Config {
  sentenceLength: {
    warnAbove: number;
  };
  paragraphLength: {
    enabled: boolean;
    maxSentences: number;
  };
  longHeading: {
    enabled: boolean;
    maxWords: number;
  };
  headingLevelSkip: {
    enabled: boolean;
  };
  singleItemList: {
    enabled: boolean;
  };
  proseEnumeration: {
    enabled: boolean;
    minItems: number;
  };
  organizationVocabulary: {
    enabled: boolean;
    terms: readonly OrgTerm[];
  };
  metrics: {
    decimalPlaces: number;
  };
}

export const EN_DEFAULT_CONFIG: EnConfig = {
  sentenceLength: {
    warnAbove: 25,
  },
  paragraphLength: {
    enabled: true,
    maxSentences: 8,
  },
  longHeading: {
    enabled: true,
    maxWords: 12,
  },
  headingLevelSkip: {
    enabled: true,
  },
  singleItemList: {
    enabled: true,
  },
  proseEnumeration: {
    enabled: true,
    minItems: 3,
  },
  organizationVocabulary: {
    enabled: true,
    terms: [],
  },
  metrics: {
    decimalPlaces: 1,
  },
};

const SENTENCE_BASIS: ThresholdBasis = {
  status: "provisional",
  basis:
    "Interim reference borrowed from GOV.UK, the United Kingdom government's style guidance: 'split up " +
    "sentences that are over 25 words long'. It is not a US federal recommendation: the Federal Plain " +
    "Language Guidelines (2011, p. 56) and digital.gov set no per-sentence number, and ISO 24495-1 fixes none. " +
    "Used as an interim reference in the en-US catalogue; it has not been validated for American documents. " +
    "Provisional and configurable.",
};

const PARAGRAPH_BASIS: ThresholdBasis = {
  status: "provisional",
  basis:
    "Upper end of 'no more than 150 words in three to eight sentences' in the Federal Plain Language " +
    "Guidelines (2011, p. 72), attributed there to unnamed 'writing experts'. The 150- and 250-word ceilings " +
    "are not measured. Provisional; not validated.",
};

const HEADING_BASIS: ThresholdBasis = {
  status: "provisional",
  basis:
    "No US or ISO source sets a heading length. The Federal Plain Language Guidelines (2011, p. 19) say only " +
    "that headings should be shorter than the content that follows them, and recommend question headings, " +
    "which run longer. Provisional product parameter; not validated.",
};

const PROSE_BASIS: ThresholdBasis = {
  status: "provisional",
  basis:
    "No US or ISO source sets how many items call for a list. The Federal Plain Language Guidelines (2011, " +
    "pp. 71-72) recommend a vertical list for a series of requirements, steps or conditions, and their example " +
    "turns a five-item series into one. Three items is a provisional product parameter; not validated.",
};

export const EN_CONFIG_SCHEMA: ConfigSchema = {
  sentenceLength: { criterion: "long_sentence", thresholds: { warnAbove: SENTENCE_BASIS } },
  paragraphLength: { criterion: "paragraph_length", thresholds: { maxSentences: PARAGRAPH_BASIS } },
  longHeading: { criterion: "long_heading", thresholds: { maxWords: HEADING_BASIS } },
  headingLevelSkip: { criterion: "heading_level_skip" },
  singleItemList: { criterion: "single_item_list" },
  proseEnumeration: { criterion: "prose_enumeration", thresholds: { minItems: PROSE_BASIS } },
  organizationVocabulary: { criterion: "organization_vocabulary", role: "organization-vocabulary" },
  metrics: { criterion: null },
};
