import fs from "node:fs";
import path from "node:path";
import { GeminiProvider } from "@/llm";
import { LlmRewriteProposer } from "@/report/rewrite";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import type { ProbeResult } from "@/lucid/probe/types";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { buildPlan, MAX_OUTPUT_TOKENS, MODEL as BASE_MODEL, type Job } from "../baseline/plan";
import { installRecorder, recording, sha256, type AttemptRecord } from "../baseline/recorder";
import { latestByKey, loadCalls, probeRawParses, rewriteRawParses, type CallRow } from "../baseline/run";
import { spikeCost } from "./spike";

export const CANDIDATE_MODEL = "gemini-3.8-flash";
export const CANDIDATE_LEVEL = "low" as const;

export const expectedConfig = (suite: Job["suite"]): Record<string, unknown> => ({
  maxOutputTokens: MAX_OUTPUT_TOKENS[suite],
  responseMimeType: "application/json",
  thinkingConfig: { thinkingLevel: CANDIDATE_LEVEL },
});

export interface CandidateJob {
  readonly key: string;
  readonly job: Job;
}

export function candidateJobs(): CandidateJob[] {
  return buildPlan().jobs.map((job) => ({
    key: job.key.replace(`|${BASE_MODEL}|`, `|${CANDIDATE_MODEL}|`),
    job,
  }));
}

export const worstCaseCandidateUsd = (c: CandidateJob): number =>
  spikeCost(Math.ceil(c.job.prompt.length / 2.5), MAX_OUTPUT_TOKENS[c.job.suite]);

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function usageOf(metadata: unknown): CallRow["usage"] {
  if (typeof metadata !== "object" || metadata === null) return null;
  const m = metadata as Record<string, unknown>;
  return {
    prompt: num(m.promptTokenCount),
    candidates: num(m.candidatesTokenCount),
    thoughts: num(m.thoughtsTokenCount),
    total: num(m.totalTokenCount),
  };
}

const billed = (c: CandidateJob, attempts: readonly AttemptRecord[]): number =>
  attempts.reduce((sum, a) => {
    const u = usageOf(a.usageMetadata);
    if (u !== null) return sum + spikeCost(u.prompt, u.candidates + u.thoughts);
    return a.networkError !== null ? sum + worstCaseCandidateUsd(c) : sum;
  }, 0);

interface ExecValue {
  readonly proposed?: string;
  readonly original?: string;
  readonly parseOutcome?: "ok" | "unparseable";
  readonly probe?: ProbeResult;
  readonly stampedId: string;
}

async function execute(
  c: CandidateJob,
  apiKey: string,
): Promise<{ value: ExecValue | null; error: unknown; attempts: AttemptRecord[] }> {
  const provider = new GeminiProvider(apiKey, { thinkingLevel: CANDIDATE_LEVEL });
  const job = c.job;
  if (job.suite === "probe") {
    const probe = new LlmComprehensionProbe(provider, CANDIDATE_MODEL);
    return recording(async (): Promise<ExecValue> => ({
      probe: await probe.probe({ trecho: job.probeCase.trecho, pergunta: job.probeCase.pergunta }),
      stampedId: probe.id,
    }));
  }
  const proposer = new LlmRewriteProposer(provider, CANDIDATE_MODEL);
  return recording(async (): Promise<ExecValue> => {
    const proposal = await proposer.propose({
      text: job.target.text,
      target: job.target.span,
      criterion: job.criterion,
      localeId: rewriteLocalePtBR.id,
      strategy: job.strategy,
      briefing: job.briefing,
      findings: job.findings,
      declarations: job.declarations,
    });
    return {
      proposed: proposal.proposed,
      original: proposal.original,
      stampedId: proposal.proposerId,
    };
  });
}

export interface BatteryOutcome {
  readonly planned: number;
  readonly alreadyDone: number;
  readonly called: number;
  readonly errors: number;
  readonly spentUsd: number;
  readonly stoppedBy:
    "done" | "budget-guard" | "projection" | "call-ceiling" | "fatal" | "daily-quota" | "invalid-config";
  readonly stopDetail: string | null;
}

const FATAL_STATUSES = new Set([400, 401, 403, 404]);
const DAILY_QUOTA = /per ?day|PerDay|\bRPD\b|\bTPD\b/iu;

export async function runBattery(
  file: string,
  jobs: readonly CandidateJob[],
  apiKey: string,
  guard: { readonly stopAtUsd: number; readonly maxNewCalls: number },
  log: (message: string) => void,
  prior: ReadonlyMap<Job["suite"], { readonly usd: number; readonly chars: number }> = new Map(),
): Promise<BatteryOutcome> {
  const previous = loadCalls(file);
  const done = new Set([...latestByKey(previous).values()].filter((r) => r.outcome === "ok").map((r) => r.key));
  let spent = previous.reduce((sum, r) => sum + r.costUsd, 0);
  const alreadyDone = jobs.filter((c) => done.has(c.key)).length;
  const pending = jobs.filter((c) => !done.has(c.key));

  const observed = new Map<Job["suite"], { usd: number; chars: number }>(prior);
  for (const row of previous) {
    if (row.outcome !== "ok") continue;
    const o = observed.get(row.suite) ?? { usd: 0, chars: 0 };
    observed.set(row.suite, { usd: o.usd + row.costUsd, chars: o.chars + row.promptChars });
  }
  const expectedUsd = (c: CandidateJob): number => {
    const o = observed.get(c.job.suite);
    return o && o.chars > 0 ? (o.usd / o.chars) * c.job.prompt.length : worstCaseCandidateUsd(c);
  };
  const configChecked = new Set<Job["suite"]>(previous.filter((r) => r.outcome === "ok").map((r) => r.suite));

  const uninstall = installRecorder([apiKey]);
  let called = 0;
  let errors = 0;
  let stoppedBy: BatteryOutcome["stoppedBy"] = "done";
  let stopDetail: string | null = null;

  try {
    for (let i = 0; i < pending.length; i++) {
      const c = pending[i];
      const job = c.job;
      if (called >= guard.maxNewCalls) {
        stoppedBy = "call-ceiling";
        break;
      }
      if (spent + worstCaseCandidateUsd(c) > guard.stopAtUsd) {
        stoppedBy = "budget-guard";
        stopDetail = `gasto ${spent.toFixed(4)} + pior caso ${worstCaseCandidateUsd(c).toFixed(4)} > ${guard.stopAtUsd}`;
        break;
      }
      if (called > 0 && called % 10 === 0) {
        const projection = spent + pending.slice(i).reduce((sum, p) => sum + expectedUsd(p), 0);
        if (projection > guard.stopAtUsd) {
          stoppedBy = "projection";
          stopDetail = `projeção ${projection.toFixed(4)} > ${guard.stopAtUsd}`;
          break;
        }
      }

      const startedAt = Date.now();
      const { value, error, attempts } = await execute(c, apiKey);
      const latencyMs = Date.now() - startedAt;
      const final = [...attempts].reverse().find((a) => a.status === 200) ?? attempts[attempts.length - 1] ?? null;
      const usage = final ? usageOf(final.usageMetadata) : null;
      const cost = billed(c, attempts);
      spent += cost;
      called++;

      const errorMessage =
        error === null
          ? null
          : (error instanceof Error ? error.message : String(error)).split(apiKey).join("<redacted>");
      if (errorMessage !== null) errors++;
      const last = attempts[attempts.length - 1];
      const status = last && last.status !== null && last.status >= 400 ? last.status : null;

      const isRewrite = job.suite !== "probe";
      const row: CallRow = {
        key: c.key,
        suite: job.suite,
        run: job.run,
        at: new Date().toISOString(),
        model: CANDIDATE_MODEL,
        promptVersion: job.promptVersion,
        stampedId: value?.stampedId ?? "",
        itemId: isRewrite ? job.target.id : job.probeCase.id,
        document: isRewrite ? job.target.document : null,
        span: isRewrite ? { start: job.target.span.start, end: job.target.span.end } : null,
        criterion: isRewrite ? job.criterion : null,
        focus: isRewrite ? { start: job.focus.span.start, end: job.focus.span.end } : null,
        declarations:
          isRewrite && job.declarations
            ? job.declarations.map((d) => ({ span: { start: d.span.start, end: d.span.end }, agent: d.agent }))
            : null,
        promptChars: job.prompt.length,
        promptSha256: sha256(job.prompt),
        outcome: errorMessage === null ? "ok" : "error",
        error: errorMessage === null ? null : { message: errorMessage, status },
        parseOutcome: isRewrite
          ? final?.firstPartText
            ? rewriteRawParses(final.firstPartText)
              ? "ok"
              : "unparseable"
            : null
          : final?.firstPartText
            ? probeRawParses(final.firstPartText)
              ? "ok"
              : "unparseable"
            : null,
        original: isRewrite ? (value?.original ?? job.target.span.text) : null,
        proposed: isRewrite ? (value?.proposed ?? null) : null,
        probeResult: value?.probe ?? null,
        raw: final?.firstPartText ?? null,
        finishReason: final?.finishReason ?? null,
        finishMessage: final?.finishMessage ?? null,
        usage,
        usageMetadata: final?.usageMetadata ?? null,
        modelVersion: final?.modelVersion ?? null,
        responseId: final?.responseId ?? null,
        partsCount: final?.partsCount ?? null,
        generationConfig: final?.generationConfig ?? attempts[0]?.generationConfig ?? null,
        attempts: attempts.map((a) => ({
          at: a.at,
          status: a.status,
          latencyMs: a.latencyMs,
          finishReason: a.finishReason,
          apiError: a.apiError,
          networkError: a.networkError,
        })),
        latencyMs,
        costUsd: cost,
      };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${JSON.stringify(row)}\n`);

      const o = observed.get(job.suite) ?? { usd: 0, chars: 0 };
      if (row.outcome === "ok") observed.set(job.suite, { usd: o.usd + cost, chars: o.chars + job.prompt.length });

      if (called % 10 === 0 || errorMessage !== null) {
        log(
          `  ${alreadyDone + called}/${jobs.length} · gasto US$ ${spent.toFixed(4)} · erros ${errors} · ${c.key}` +
            (errorMessage ? ` · ERRO ${status ?? "-"}: ${errorMessage.slice(0, 160)}` : ""),
        );
      }

      if (row.outcome === "ok" && !configChecked.has(job.suite)) {
        const sent = JSON.stringify(row.generationConfig);
        const expected = JSON.stringify(expectedConfig(job.suite));
        if (sent !== expected || !(row.modelVersion ?? "").startsWith(CANDIDATE_MODEL)) {
          stoppedBy = "invalid-config";
          stopDetail = `${job.suite}: enviado ${sent} · esperado ${expected} · modelVersion ${row.modelVersion}`;
          break;
        }
        configChecked.add(job.suite);
      }
      if (errorMessage !== null && status !== null && FATAL_STATUSES.has(status)) {
        stoppedBy = "fatal";
        stopDetail = `${status}: ${errorMessage.slice(0, 300)}`;
        break;
      }
      if (errorMessage !== null && DAILY_QUOTA.test(errorMessage)) {
        stoppedBy = "daily-quota";
        stopDetail = errorMessage.slice(0, 300);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    uninstall();
  }

  return { planned: jobs.length, alreadyDone, called, errors, spentUsd: spent, stoppedBy, stopDetail };
}
