import type { Finding, Span } from "@/lucid";
import { buildRewritePrompt, STRATEGY_VERSION, type AgentDeclaration } from "@/report/rewrite";
import { buildProbePrompt, PROBE_PROMPT_VERSION } from "@/lucid/probe/prompt";
import { asksForAgent } from "../../../src/app/components/revision-note/agent-question";
import { GOLDEN_SONDA, type ProbeGoldenCase } from "../probe-golden";
import { loadEvalTargets, type EvalTarget } from "../rewrite-ab/targets";

export const MODEL = "gemini-2.5-flash";
export const RUNS = [1, 2] as const;

export const PRICING = {
  source: "https://ai.google.dev/gemini-api/docs/pricing",
  retrievedAt: "2026-09-26",
  tier: "Paid Tier · Standard",
  inputUsdPerMillion: 0.3,
  outputUsdPerMillion: 2.5,
  note: "saída inclui tokens de raciocínio",
} as const;

export const MAX_OUTPUT_TOKENS = { rewrite: 2048, directed: 2048, probe: 512 } as const;

export type Suite = "rewrite" | "directed" | "probe";

interface JobBase {
  readonly key: string;
  readonly suite: Suite;
  readonly run: number;
  readonly promptVersion: string;
  readonly prompt: string;
}

export interface RewriteJob extends JobBase {
  readonly suite: "rewrite" | "directed";
  readonly target: EvalTarget;
  readonly focus: Finding;
  readonly criterion: string;
  readonly briefing: readonly Finding[];
  readonly findings: readonly Finding[] | undefined;
  readonly declarations: readonly AgentDeclaration[] | undefined;
  readonly strategy: "directed" | undefined;
}

export interface ProbeJob extends JobBase {
  readonly suite: "probe";
  readonly probeCase: ProbeGoldenCase;
}

export type Job = RewriteJob | ProbeJob;

export const jobKey = (suite: Suite, promptVersion: string, id: string, run: number): string =>
  `${suite}|${promptVersion}|${MODEL}|${id}|r${run}`;

export function directedFocus(target: EvalTarget): Finding | null {
  return target.findings.find((f) => asksForAgent(f, target.text)) ?? null;
}

function rewriteJob(target: EvalTarget, run: number): RewriteJob {
  const focus = target.findings[0];
  const briefing = target.findings;
  const promptVersion = STRATEGY_VERSION.rewrite;
  return {
    key: jobKey("rewrite", promptVersion, target.id, run),
    suite: "rewrite",
    run,
    promptVersion,
    target,
    focus,
    criterion: focus.criterion,
    briefing,
    findings: undefined,
    declarations: undefined,
    strategy: undefined,
    prompt: buildRewritePrompt(target.text, target.span, {
      strategy: "rewrite",
      criterion: focus.criterion,
      findings: briefing,
    }),
  };
}

function directedJob(target: EvalTarget, focus: Finding, run: number): RewriteJob {
  const declarations: AgentDeclaration[] = [{ span: focus.span as Span, agent: null }];
  const promptVersion = STRATEGY_VERSION.directed;
  return {
    key: jobKey("directed", promptVersion, target.id, run),
    suite: "directed",
    run,
    promptVersion,
    target,
    focus,
    criterion: focus.criterion,
    briefing: target.findings,
    findings: target.findings,
    declarations,
    strategy: "directed",
    prompt: buildRewritePrompt(target.text, target.span, {
      strategy: "directed",
      criterion: focus.criterion,
      findings: target.findings,
      declarations,
    }),
  };
}

function probeJob(probeCase: ProbeGoldenCase, run: number): ProbeJob {
  return {
    key: jobKey("probe", PROBE_PROMPT_VERSION, probeCase.id, run),
    suite: "probe",
    run,
    promptVersion: PROBE_PROMPT_VERSION,
    probeCase,
    prompt: buildProbePrompt(probeCase.trecho, probeCase.pergunta),
  };
}

export interface Plan {
  readonly targets: readonly EvalTarget[];
  readonly directedTargets: readonly EvalTarget[];
  readonly jobs: readonly Job[];
}

export function buildPlan(): Plan {
  const targets = loadEvalTargets(500);
  const directed = targets
    .map((target) => ({ target, focus: directedFocus(target) }))
    .filter((d): d is { target: EvalTarget; focus: Finding } => d.focus !== null);

  const jobs: Job[] = [];
  for (const run of RUNS) {
    for (const target of targets) jobs.push(rewriteJob(target, run));
    for (const { target, focus } of directed) jobs.push(directedJob(target, focus, run));
    for (const probeCase of GOLDEN_SONDA) jobs.push(probeJob(probeCase, run));
  }
  return { targets, directedTargets: directed.map((d) => d.target), jobs };
}

export const costUsd = (inputTokens: number, outputTokens: number): number =>
  (inputTokens * PRICING.inputUsdPerMillion + outputTokens * PRICING.outputUsdPerMillion) / 1_000_000;
