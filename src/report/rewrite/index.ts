/**
 * Tier 3 · orquestrador `proposeAndVerify` + barrel do módulo de reescrita (ADR-014/016).
 *
 * Fluxo (docs/HANDOFF.md §3): um ALVO (`Span`) — a frase de um finding OU um parágrafo —
 * dentro do texto inteiro (contexto) → Proposta (proposer) → Reanálise + verificação
 * (`verifyRewrite`) → `VerifiedRewrite` rotulado "gerada". NUNCA aplica sozinho; a decisão é
 * do autor. Passar nas provas é ausência de falha, não aprovação (I5).
 *
 * `report/**` é a única camada que conhece `core` e `probe` ao mesmo tempo; a infra de rede
 * (`ChatProvider`) vem do módulo neutro `src/llm`.
 */
import type { Span } from "../../lucid";
import type { RewriteProposer, VerifiedRewrite } from "./types";
import { verifyRewrite, type VerifyOptions } from "./verify";

export async function proposeAndVerify(
  text: string,
  target: Span,
  proposer: RewriteProposer,
  options: VerifyOptions = {},
): Promise<VerifiedRewrite> {
  const proposal = await proposer.propose({ text, target, criterion: options.criterion });
  const verification = await verifyRewrite(text, target, proposal, options);
  return { proposal, verification };
}

export { StubRewriteProposer } from "./proposer";
export { LlmRewriteProposer, parseRewrite } from "./llm-proposer";
export { buildRewritePrompt, REWRITE_PROMPT_VERSION, STRATEGY_VERSION } from "./prompt";
export type { RewriteStrategy } from "./prompt";
export { applyProposal, verifyRewrite } from "./verify";
export type { VerifyOptions } from "./verify";
export type {
  MetricsDelta,
  Proof,
  RewriteProposal,
  RewriteProposer,
  RewriteRequest,
  RewriteVerification,
  VerificationSignal,
  VerifiedRewrite,
} from "./types";
