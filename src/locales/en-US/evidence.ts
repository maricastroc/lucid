import type { EnCriterionId } from "./criteria";

export type EvidenceLevel = "measured" | "goldenLabelledOnly" | "unitTestsOnly";
export type EngineKind = "linguistic" | "reused" | "organizational";

export const IN_SAMPLE_SUITE =
  "In-sample regression suite: sentences written in the same session as the detector, by its author, knowing " +
  "its rules. The counts guard against regressions; they are not a precision or a recall of the detector and are " +
  "never published as such.";

export const MISSING_FOR_MEASURED: readonly string[] = [
  "a test set independent of the examples used while the detector was built",
  "authorship or selection separate from the construction of the detector",
  "random and cued strata",
  "a written labelling protocol, applied before the detector's output is seen",
  "published denominators and confidence intervals",
  "evaluation on real US documents",
  "a split sealed before the final measurement",
];

export interface RegressionSuite {
  readonly cases: number;
  readonly negatives: number;
  readonly knownLimitations: number;
  readonly outOfUniverse: number;
  readonly tp: number;
  readonly fp: number;
  readonly fn: number;
}

export interface EnEvidence {
  readonly engine: EngineKind;
  readonly evidence: EvidenceLevel;
  readonly regressionSuite?: RegressionSuite;
  readonly note: string;
}

const REUSED =
  "Engine shared with pt-BR (locales/_shared); the English contribution is the provisional threshold and the " +
  "presentation. Covered by unit tests and the en-US snapshot, with no golden of its own.";

export const EN_EVIDENCE: Readonly<Record<EnCriterionId, EnEvidence>> = {
  passive_voice: {
    engine: "linguistic",
    evidence: "goldenLabelledOnly",
    regressionSuite: { cases: 50, negatives: 20, knownLimitations: 3, outOfUniverse: 0, tp: 31, fp: 1, fn: 2 },
    note: "Detection is by form: any -ed participle after a form of 'be' is a candidate; the lexicon adds irregulars and excludes.",
  },
  hidden_verb: {
    engine: "linguistic",
    evidence: "goldenLabelledOnly",
    regressionSuite: { cases: 47, negatives: 22, knownLimitations: 3, outOfUniverse: 4, tp: 24, fp: 2, fn: 1 },
    note:
      "The suite counts only the productive half (light verb + -tion, -sion, -ment, -ance or -ence). That universe " +
      "keeps the lexicon from defining the phenomenon, but it does not make a sample written knowing the detector " +
      "any less in-sample. The five FPLG pairs of the curated half are checked against the guidelines' own rewrites.",
  },
  reader_in_third_person: {
    engine: "linguistic",
    evidence: "goldenLabelledOnly",
    regressionSuite: { cases: 30, negatives: 14, knownLimitations: 3, outOfUniverse: 0, tp: 14, fp: 1, fn: 2 },
    note: "Detection depends on a finite list of reader roles.",
  },
  ambiguous_shall: {
    engine: "linguistic",
    evidence: "unitTestsOnly",
    note: "Every 'shall' is flagged by design: there is no detection decision to measure, only a reading left to the author.",
  },
  undefined_acronym: {
    engine: "linguistic",
    evidence: "goldenLabelledOnly",
    regressionSuite: { cases: 28, negatives: 16, knownLimitations: 2, outOfUniverse: 0, tp: 14, fp: 2, fn: 0 },
    note: "Detection is by shape; the known-acronym list only excuses.",
  },
  prose_enumeration: {
    engine: "linguistic",
    evidence: "goldenLabelledOnly",
    regressionSuite: { cases: 20, negatives: 11, knownLimitations: 2, outOfUniverse: 0, tp: 8, fp: 1, fn: 1 },
    note: "The item threshold is a provisional product parameter.",
  },
  long_sentence: { engine: "reused", evidence: "unitTestsOnly", note: REUSED },
  paragraph_length: { engine: "reused", evidence: "unitTestsOnly", note: REUSED },
  long_heading: { engine: "reused", evidence: "unitTestsOnly", note: REUSED },
  heading_level_skip: { engine: "reused", evidence: "unitTestsOnly", note: REUSED },
  single_item_list: { engine: "reused", evidence: "unitTestsOnly", note: REUSED },
  organization_vocabulary: {
    engine: "organizational",
    evidence: "unitTestsOnly",
    note: "Declared by the organization: the equivalence is the organization's, not the tool's.",
  },
};
