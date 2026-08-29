export const CORPUS_SCHEMA_VERSION = 1;

export type CriterionId = "sigla_sem_expansao" | "prose_enumeration" | "perifrase_inflada";

export type Split = "dev" | "test";

export type LabelTier = "human" | "consensus" | "model_only";

export type Route =
  "auto_consensus" | "human_divergence" | "human_low_confidence" | "human_audit_sample" | "human_labeler_failure";

export type Confidence = "alta" | "baixa";

export interface Occurrence {
  start: number;
  end: number;
  text: string;
}

export interface LicenseStamp {
  basis: string;
  label: string;
  reference: string;
}

export interface PiiScan {
  cpf: number;
  cnpj: number;
  email: number;
  scannerVersion: string;
}

export interface CorpusDocument {
  docId: string;
  sourceId: string;
  url: string;
  retrievedAt: string;
  httpStatus: number;
  contentType: string;
  rawSha256: string;
  textSha256: string;
  extractor: string;
  license: LicenseStamp;
  docType: string;
  piiScan: PiiScan;
  split: Split;
}

export interface CorpusPassage {
  passageId: string;
  docId: string;
  start: number;
  end: number;
  text: string;
  words: number;
  strata: {
    random: boolean;
    cued: CriterionId[];
  };
  split: Split;
}

export interface LabelerRun {
  passageId: string;
  criterion: CriterionId;
  labelerId: string;
  model: string;
  promptVersion: string;
  temperature: number;
  ok: boolean;
  error?: string;
  count: number;
  occurrences: Occurrence[];
  confidence: Confidence;
  rawResponse: string;
  at: string;
}

export interface AgreementReport {
  countMatch: boolean;
  binaryMatch: boolean;
  spanExactRate: number | null;
  minConfidence: Confidence;
}

export interface ConsolidatedLabel {
  passageId: string;
  criterion: CriterionId;
  count: number;
  occurrences: Occurrence[];
  tier: LabelTier;
  route: Route;
  agreement: AgreementReport;
  labelerRefs: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  note: string | null;
}

export interface HumanReview {
  passageId: string;
  criterion: CriterionId;
  count: number;
  occurrences: Occurrence[];
  reviewedBy: string;
  reviewedAt: string;
  route: Route;
  blind: boolean;
  note: string | null;
}

export interface LabelerSpec {
  id: string;
  model: string;
  promptVersion: string;
  temperature: number;
}

export interface CorpusManifest {
  corpusVersion: string;
  schemaVersion: number;
  createdAt: string;
  supersedes: string | null;
  sealed: boolean;
  splitSeed: string;
  testFraction: number;
  criteria: CriterionId[];
  counts: {
    documents: number;
    passages: number;
    labelled: number;
    humanReviewed: number;
  };
  hashes: {
    documents: string;
    passages: string;
    labels: Record<string, string>;
  };
  labelers: LabelerSpec[];
  policy: {
    consensusAuditRate: number;
    lowConfidenceRoutes: boolean;
    agreementFloor: number;
  };
}
