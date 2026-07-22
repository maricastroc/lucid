/**
 * Tier 3 · reescrita PROPOSTA e VERIFICADA — tipos (docs/HANDOFF.md §3; ADR-014).
 *
 * O diferencial do Lucid: a geração (LLM) nunca recebe confiança cega — a engine
 * determinística é o VERIFICADOR. Uma proposta só chega ao autor acompanhada de PROVA
 * determinística e SINAL heurístico, SEMPRE separados e SEMPRE honestos: mesmo tudo
 * passando, isso é "nenhuma falha de piso detectada", jamais um selo verde (mesma regra
 * do CLAUDE.md/I5 que já governa a sonda). A proposta é rotulada "gerada" e NUNCA aplicada
 * sozinha.
 *
 * Fronteira: estes tipos vivem em `report/**`, a única camada que pode conhecer `core` e
 * `probe` ao mesmo tempo. `core/**` nunca importa daqui.
 */
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
}

export interface RewriteProposal {
  proposerId: string;
  original: string;
  proposed: string;
  localeId?: string;
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
