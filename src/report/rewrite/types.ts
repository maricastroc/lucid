import type { Diagnostic, Finding, Span } from "../../lucid/core/types";
import type { RewriteStrategy } from "./prompt";

export interface LiteralMention {
  readonly key: string;
  readonly text: string;
}

export interface RewriteLocale {
  readonly id: string;
  analyze(text: string): Diagnostic;
  readonly firstPersonMarkers: RegExp;
  readonly jargonCriterionId: string;
  readonly thirdPersonAgentNouns: RegExp;
  readonly thirdPersonAgentSubject: RegExp;
  readonly deonticInSource: RegExp;
  readonly deonticIntroduced: RegExp;
  readonly legalCategories: RegExp;
  references(text: string): readonly LiteralMention[];
  deviceLabel(text: string): LiteralMention | null;
  valuesWithUnit(text: string): readonly LiteralMention[];
  writtenDates(text: string): readonly LiteralMention[];
}

export interface AgentDeclaration {
  span: Span;
  agent: string | null;
}

export interface RewriteRequest {
  text: string;
  target: Span;
  criterion?: string;
  strategy?: RewriteStrategy;
  briefing?: readonly Finding[];
  findings?: readonly Finding[];
  declarations?: readonly AgentDeclaration[];
  localeId?: string;
  signal?: AbortSignal;
}

export interface RewriteProvenance {
  readonly providerId: string;
  readonly model: string;
  readonly strategy: string;
  readonly generation: Readonly<Record<string, unknown>> | null;
  readonly promptHash: string;
  readonly promptChars: number;
}

export interface RewriteProposal {
  proposerId: string;
  original: string;
  proposed: string;
  localeId?: string;
  parseOutcome?: "ok" | "unparseable";
  provenance?: RewriteProvenance;
}

export type ProofOutcome = "confirmed" | "not_confirmed" | "addition" | "not_applicable";

export interface Proof {
  check:
    | "target_resolved"
    | "directed_findings_resolved"
    | "declared_agent_present"
    | "region_improved"
    | "no_new_findings"
    | "numbers_kept"
    | "numbers_added"
    | "dates_kept"
    | "dates_added"
    | "references_kept"
    | "references_added"
    | "label_kept"
    | "values_kept"
    | "values_added"
    | "written_dates_kept"
    | "written_dates_added"
    | "markup_added"
    | "no_new_jargon"
    | "no_invented_first_person";
  outcome: ProofOutcome;
  passed: boolean;
  detail: string;
}

export interface VerificationSignal {
  check:
    "entities_preserved" | "possible_invented_agent" | "possible_invented_obligation" | "possible_category_narrowed";
  flagged: boolean;
  detail: string;
}

export interface VerificationNotice {
  check: "awaiting_author";
  detail: string;
}

export interface MetricsDelta {
  readabilityBefore: number | null;
  readabilityAfter: number | null;
  wordsBefore: number;
  wordsAfter: number;
}

export interface RewriteVerification {
  proofs: Proof[];
  notices: VerificationNotice[];
  signals: VerificationSignal[];
  metrics: MetricsDelta;
}

export interface VerifiedRewrite {
  proposal: RewriteProposal;
  verification: RewriteVerification;
}

export interface RewriteProposer {
  readonly id: string;
  propose(request: RewriteRequest): Promise<RewriteProposal>;
}
