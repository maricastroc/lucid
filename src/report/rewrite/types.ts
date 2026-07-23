import type { Diagnostic, Finding, Span } from "../../lucid/core/types";
import type { RewriteStrategy } from "./prompt";

export interface RewriteLocale {
  readonly id: string;
  analyze(text: string): Diagnostic;
  readonly firstPersonMarkers: RegExp;
  readonly jargonCriterionId: string;
}

export interface RewriteRequest {
  text: string;
  target: Span;
  criterion?: string;
  strategy?: RewriteStrategy;
  findings?: readonly Finding[];
  localeId?: string;
  /** Cancela a geração (ex.: o usuário clicou "Cancelar", ou o cliente desconectou). */
  signal?: AbortSignal;
}

export interface RewriteProposal {
  proposerId: string;
  original: string;
  proposed: string;
  localeId?: string;
  /**
   * Diagnóstico do parse da resposta do provedor — só definido por proponentes baseados em LLM.
   * "unparseable": parseRewrite() não extraiu uma reescrita válida e o pipeline manteve `original`
   * em `proposed`; distingue essa queda de uma decisão legítima do modelo (ver llm-proposer.ts).
   */
  parseOutcome?: "ok" | "unparseable";
}

export interface Proof {
  check:
    | "target_resolved"
    | "directed_findings_resolved"
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
  check:
    | "entities_preserved"
    | "meaning_preserved";
  flagged: boolean;
  detail: string;
}

export interface MetricsDelta {
  fleschPtBefore: number;
  fleschPtAfter: number;
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
