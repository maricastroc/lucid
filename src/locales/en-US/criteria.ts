export const EN_LINGUISTIC_IDS = [
  "passive_voice",
  "hidden_verb",
  "reader_in_third_person",
  "ambiguous_shall",
  "undefined_acronym",
  "prose_enumeration",
] as const;

export const EN_REUSED_ENGINE_IDS = [
  "long_sentence",
  "paragraph_length",
  "long_heading",
  "heading_level_skip",
  "single_item_list",
] as const;

export const EN_ORGANIZATIONAL_IDS = ["organization_vocabulary"] as const;

export const EN_CRITERION_IDS = [...EN_LINGUISTIC_IDS, ...EN_REUSED_ENGINE_IDS, ...EN_ORGANIZATIONAL_IDS] as const;

export type EnCriterionId = (typeof EN_CRITERION_IDS)[number];

export function isEnCriterionId(value: string): value is EnCriterionId {
  return (EN_CRITERION_IDS as readonly string[]).includes(value);
}

export interface NotPorted {
  readonly criterion: string;
  readonly reason: string;
}

export const EN_NOT_PORTED: readonly NotPorted[] = [
  {
    criterion: "passiva_sintetica",
    reason: "English has no synthetic passive built with a clitic 'se': there is no phenomenon to detect.",
  },
  {
    criterion: "mais_que_perfeito_sintetico",
    reason: "English has no synthetic pluperfect: 'had done' is always analytic.",
  },
  {
    criterion: "mesoclise",
    reason: "English has no mesoclisis: a pronoun is never infixed inside a verb.",
  },
  {
    criterion: "gerundismo",
    reason:
      "The construction is standard English ('will be sending'); Portuguese gerundismo is a calque of it. " +
      "Porting the rule would flag correct English as a defect — the canonical case of why translating a " +
      "rule does not port a phenomenon.",
  },
];
