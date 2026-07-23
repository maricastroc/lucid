import type { Span } from "../../lucid";
import type { RewriteProposer, RewriteRequest, VerifiedRewrite } from "./types";
import { verifyRewrite, type VerifyOptions } from "./verify";

export type ProposeAndVerifyOptions = VerifyOptions & Pick<RewriteRequest, "strategy" | "findings" | "signal">;

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
export type { RewriteStrategy } from "./prompt";
export { applyProposal, totalBurden, verifyRewrite } from "./verify";
export type { VerifyOptions } from "./verify";
export type {
  AgentDeclaration,
  MetricsDelta,
  Proof,
  RewriteLocale,
  RewriteProposal,
  RewriteProposer,
  RewriteRequest,
  RewriteVerification,
  VerificationSignal,
  VerifiedRewrite,
} from "./types";
