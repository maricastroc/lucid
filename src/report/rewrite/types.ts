import type { Diagnostic, Finding, Span } from "../../lucid/core/types";
import type { RewriteStrategy } from "./prompt";

export interface RewriteLocale {
  readonly id: string;
  analyze(text: string): Diagnostic;
  readonly firstPersonMarkers: RegExp;
  readonly jargonCriterionId: string;
  readonly thirdPersonAgentNouns: RegExp;
  readonly thirdPersonAgentSubject: RegExp;
  readonly deonticInSource: RegExp;
  readonly deonticIntroduced: RegExp;
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

export interface RewriteProposal {
  proposerId: string;
  original: string;
  proposed: string;
  localeId?: string;
  parseOutcome?: "ok" | "unparseable";
}

export interface Proof {
  check:
    | "target_resolved"
    | "directed_findings_resolved"
    | "declared_agent_present"
    | "region_improved"
    | "no_new_findings"
    | "numbers_preserved"
    | "dates_preserved"
    | "no_new_jargon"
    | "no_invented_first_person";
  passed: boolean;
  detail: string;
}

export interface VerificationSignal {
  check: "entities_preserved" | "meaning_preserved" | "possible_invented_agent" | "possible_invented_obligation";
  flagged: boolean;
  detail: string;
}

export interface MetricsDelta {
  fleschPtBefore: number | null;
  fleschPtAfter: number | null;
  wordsBefore: number;
  wordsAfter: number;
}

export interface RewriteVerification {
  proofs: Proof[];
  signals: VerificationSignal[];
  metrics: MetricsDelta;
  hasBlockingFailure: boolean;
}

export interface VerifiedRewrite {
  proposal: RewriteProposal;
  verification: RewriteVerification;
}

export interface RewriteProposer {
  readonly id: string;
  propose(request: RewriteRequest): Promise<RewriteProposal>;
}
