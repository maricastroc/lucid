export const EVAL_SCHEMA_VERSION = 2;
export type CriterionCoverage = "curated" | "productive";
export type EvalState = "correto" | "limitacao_conhecida";

export interface EvalStamp {
  lucidVersion: string;
  localeId: string;
  standardVersion: string;
  configHash: string;
  dataHash: string;
  goldenHash: string;
}

export interface CountSummary {
  cases: number;
  negatives: number;
  limitations: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number | null;
  recall: number | null;
}

export interface SyllableSummary {
  words: number;
  limitations: number;
  exactRate: number | null;
  meanAbsoluteError: number | null;
}

export interface KnownLimitation {
  texto: string;
  motivo: string;
}

export interface Regression {
  texto: string;
  expectedCount: number;
  actualCount: number;
}

export interface DetectorReport {
  criterion: string;
  coverage: CriterionCoverage;
  summary: CountSummary;
  knownLimitations: readonly KnownLimitation[];
  regressions: readonly Regression[];
}

export type CaveatId =
  "count_scoring" | "circular_recall_curated" | "known_limitations_counted" | "unmeasured_criteria" | "no_layer_2";

export interface MethodCaveat {
  id: CaveatId;
  text: string;
}

export interface CriteriaCoverage {
  measured: readonly string[];
  goldenLabelledOnly: readonly string[];
  unitTestsOnly: readonly string[];
  total: number;
}

export interface EvalArtifact {
  schemaVersion: number;
  stamp: EvalStamp;
  method: { scoring: "count-per-passage"; caveats: readonly MethodCaveat[] };
  detectors: readonly DetectorReport[];
  services: { syllables: SyllableSummary };
  criteriaCoverage: CriteriaCoverage;
}
