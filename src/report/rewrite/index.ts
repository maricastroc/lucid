import type { Span } from "../../lucid";
import type { RewriteProposer, RewriteRequest, VerifiedRewrite } from "./types";
import { verifyRewrite, type VerifyOptions } from "./verify";

export type ProposeAndVerifyOptions = VerifyOptions &
  Pick<RewriteRequest, "strategy" | "briefing" | "findings" | "signal">;

export async function proposeAndVerify(
  text: string,
  target: Span,
  proposer: RewriteProposer,
  options: ProposeAndVerifyOptions = {},
): Promise<VerifiedRewrite> {
  const proposal = await proposer.propose({
    text,
    target,
    criterion: options.criterion,
    localeId: options.locale?.id,
    strategy: options.strategy,
    briefing: options.briefing,
    findings: options.findings,
    declarations: options.declarations,
    signal: options.signal,
  });
  const verification = await verifyRewrite(text, target, proposal, options);
  return { proposal, verification };
}

export { StubRewriteProposer } from "./proposer";
export { LlmRewriteProposer, parseRewrite } from "./llm-proposer";
export { buildRewritePrompt, REWRITE_PROMPT_VERSION, STRATEGY_VERSION } from "./prompt";
export { buildRewritePromptV4, composePromptV4, PROMPT_V4_PARTS } from "./prompt-v4";
export { criterionLabel, renderBriefing } from "./briefing";
export type { RewriteStrategy } from "./prompt";
export { applyProposal, totalBurden, verifyRewrite } from "./verify";
export { checkKind, NOT_VERIFIED, OVERCLAIM_VOCABULARY, PROOF_CHECKS, SIGNAL_CHECKS } from "./checks";
export type { CheckKind, CheckSpec, NotVerifiedDimension, ProofCheckSpec } from "./checks";
export type { VerifyOptions } from "./verify";
export type {
  AgentDeclaration,
  MetricsDelta,
  Proof,
  ProofOutcome,
  RewriteLocale,
  RewriteProposal,
  RewriteProposer,
  RewriteRequest,
  RewriteVerification,
  VerificationNotice,
  VerificationSignal,
  VerifiedRewrite,
} from "./types";
