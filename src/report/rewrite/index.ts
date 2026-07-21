/**
 * Tier 3 · orquestrador `proposeAndVerify` + barrel do módulo de reescrita (ADR-014).
 *
 * Fluxo (docs/HANDOFF.md §3): Detecção determinística (o `finding` já vem da Camada 1) →
 * Proposta (proposer) → Reanálise + verificação (`verifyRewrite`) → `VerifiedRewrite`
 * rotulado "gerada". NUNCA aplica sozinho; a decisão final é do autor.
 *
 * `report/**` é a única camada que conhece `core` e `probe` ao mesmo tempo.
 */
import type { Finding } from "../../lucid";
import type { RewriteProposer, VerifiedRewrite } from "./types";
import { verifyRewrite, type VerifyOptions } from "./verify";

export async function proposeAndVerify(
  text: string,
  finding: Finding,
  proposer: RewriteProposer,
  options: VerifyOptions = {},
): Promise<VerifiedRewrite> {
  const proposal = await proposer.propose({ text, finding });
  const verification = await verifyRewrite(text, finding, proposal, options);
  return { proposal, verification };
}

export { StubRewriteProposer } from "./proposer";
export { LlmRewriteProposer, parseRewrite } from "./llm-proposer";
export { buildRewritePrompt, REWRITE_PROMPT_VERSION } from "./prompt";
export { GroqProvider, GROQ_MODELS } from "./providers/groq";
export { ChatProviderError } from "./providers/types";
export type { ChatProvider, ChatCompletionOptions } from "./providers/types";
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
