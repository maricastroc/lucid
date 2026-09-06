export const EVAL_SCHEMA_VERSION = 3;
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
  | "count_scoring"
  | "circular_recall_curated"
  | "known_limitations_counted"
  | "unmeasured_criteria"
  | "no_layer_2"
  | "assisted_supervision";

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

export interface Interval {
  low: number;
  high: number;
}

export interface AssistedAgreement {
  n: number;
  rawAgreement: number;
  cohenKappa: number | null;
  gwetAc1: number | null;
  positiveRate: number;
}

export interface AssistedStratum {
  cases: number;
  negatives: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number | null;
  recall: number | null;
  precisionInterval: Interval | null;
  recallInterval: Interval | null;
}

export interface AssistedComposition {
  human: number;
  consensus: number;
  modelOnly: number;
}

export interface AssistedConsensusAudit {
  n: number;
  disagreements: number;
  errorRate: number | null;
  interval: Interval | null;
}

export interface AssistedMeasurement {
  criterion: string;
  promoted: boolean;
  withheldReason: string | null;
  agreementFloor: number;
  agreement: AssistedAgreement;
  composition: AssistedComposition;
  consensusAudit: AssistedConsensusAudit;
  strata: { random: AssistedStratum; cued: AssistedStratum };
}

export interface AssistedLabeler {
  id: string;
  model: string;
  promptVersion: string;
  temperature: number;
}

export type AssistedCaveatId = "assisted_labelling" | "cued_stratum_no_recall" | "count_scoring";

export interface AssistedCaveat {
  id: AssistedCaveatId;
  text: string;
}

export interface AssistedCorpus {
  corpusVersion: string;
  split: string;
  sealed: boolean;
  documents: number;
  passages: number;
  labelers: readonly AssistedLabeler[];
  hashes: { documents: string; passages: string; labels: Readonly<Record<string, string>> };
  measuredAssisted: readonly string[];
  withheld: readonly string[];
  criteria: readonly AssistedMeasurement[];
  caveats: readonly AssistedCaveat[];
}

export interface EvalArtifact {
  schemaVersion: number;
  stamp: EvalStamp;
  method: { scoring: "count-per-passage"; caveats: readonly MethodCaveat[] };
  detectors: readonly DetectorReport[];
  services: { syllables: SyllableSummary };
  criteriaCoverage: CriteriaCoverage;
  assistedCorpus: AssistedCorpus | null;
}
