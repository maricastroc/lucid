import fs from "node:fs";
import path from "node:path";
import { GeminiProvider } from "@/llm";
import { LlmRewriteProposer } from "@/report/rewrite";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import type { ProbeResult } from "@/lucid/probe/types";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { installRecorder, recording, sha256, type AttemptRecord } from "./recorder";
import { costUsd, MAX_OUTPUT_TOKENS, MODEL, type Job } from "./plan";

export interface Usage {
  readonly prompt: number;
  readonly candidates: number;
  readonly thoughts: number;
  readonly total: number;
}

export interface AttemptSummary {
  readonly at: string;
  readonly status: number | null;
  readonly latencyMs: number;
  readonly finishReason: string | null;
  readonly apiError: AttemptRecord["apiError"];
  readonly networkError: string | null;
}

export interface CallRow {
  readonly key: string;
  readonly suite: Job["suite"];
  readonly run: number;
  readonly at: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly stampedId: string;
  readonly itemId: string;
  readonly document: string | null;
  readonly span: { readonly start: number; readonly end: number } | null;
  readonly criterion: string | null;
  readonly focus: { readonly start: number; readonly end: number } | null;
  readonly declarations:
    readonly { readonly span: { start: number; end: number }; readonly agent: string | null }[] | null;
  readonly promptChars: number;
  readonly promptSha256: string;
  readonly outcome: "ok" | "error";
  readonly error: { readonly message: string; readonly status: number | null } | null;
  readonly parseOutcome: "ok" | "unparseable" | null;
  readonly original: string | null;
  readonly proposed: string | null;
  readonly probeResult: ProbeResult | null;
  readonly raw: string | null;
  readonly finishReason: string | null;
  readonly finishMessage: string | null;
  readonly usage: Usage | null;
  readonly usageMetadata: unknown;
  readonly modelVersion: string | null;
  readonly responseId: string | null;
  readonly partsCount: number | null;
  readonly generationConfig: unknown;
  readonly attempts: readonly AttemptSummary[];
  readonly latencyMs: number;
  readonly costUsd: number;
}

export function loadCalls(file: string): CallRow[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as CallRow);
}

export function latestByKey(rows: readonly CallRow[]): Map<string, CallRow> {
  const out = new Map<string, CallRow>();
  for (const row of rows) {
    const previous = out.get(row.key);
    if (!previous || previous.outcome !== "ok" || row.outcome === "ok") out.set(row.key, row);
  }
  return out;
}

export function probeRawParses(raw: string): boolean {
  const attempt = (candidate: string): boolean => {
    try {
      const parsed: unknown = JSON.parse(candidate);
      return typeof parsed === "object" && parsed !== null;
    } catch {
      return false;
    }
  };
  if (attempt(raw.trim())) return true;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start && attempt(raw.slice(start, end + 1));
}

const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

function usageOf(metadata: unknown): Usage | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const m = metadata as Record<string, unknown>;
  return {
    prompt: num(m.promptTokenCount),
    candidates: num(m.candidatesTokenCount),
    thoughts: num(m.thoughtsTokenCount),
    total: num(m.totalTokenCount),
  };
}

const CONSERVATIVE_CHARS_PER_TOKEN = 2.5;

export const worstCaseUsd = (job: Job): number =>
  costUsd(Math.ceil(job.prompt.length / CONSERVATIVE_CHARS_PER_TOKEN), MAX_OUTPUT_TOKENS[job.suite]);

const billedCost = (job: Job, attempts: readonly AttemptRecord[]): number =>
  attempts.reduce((sum, a) => {
    const u = usageOf(a.usageMetadata);
    if (u !== null) return sum + costUsd(u.prompt, u.candidates + u.thoughts);
    return a.networkError !== null ? sum + worstCaseUsd(job) : sum;
  }, 0);

const FATAL_STATUSES = new Set([400, 401, 403, 404]);
const DAILY_QUOTA = /per ?day|PerDay|\bRPD\b|\bTPD\b/iu;

export interface Guard {
  readonly stopAtUsd: number;
  readonly maxNewCalls: number;
}

export interface RunOutcome {
  readonly planned: number;
  readonly alreadyDone: number;
  readonly called: number;
  readonly errors: number;
  readonly spentUsd: number;
  readonly stoppedBy: "done" | "budget-guard" | "projection" | "call-ceiling" | "fatal" | "daily-quota";
  readonly stopDetail: string | null;
}

async function execute(
  job: Job,
  apiKey: string,
): Promise<{
  value: {
    proposed?: string;
    original?: string;
    parseOutcome?: "ok" | "unparseable";
    probe?: ProbeResult;
    stampedId: string;
  } | null;
  error: unknown;
  attempts: AttemptRecord[];
}> {
  if (job.suite === "probe") {
    const probe = new LlmComprehensionProbe(new GeminiProvider(apiKey), MODEL);
    return recording(async () => ({
      probe: await probe.probe({ trecho: job.probeCase.trecho, pergunta: job.probeCase.pergunta }),
      stampedId: probe.id,
    }));
  }
  const proposer = new LlmRewriteProposer(new GeminiProvider(apiKey), MODEL);
  return recording(async () => {
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
      parseOutcome: proposal.parseOutcome,
      stampedId: proposal.proposerId,
    };
  });
}

function statusOf(attempts: readonly AttemptRecord[]): number | null {
  const last = attempts[attempts.length - 1];
  return last && last.status !== null && last.status >= 400 ? last.status : null;
}

export async function runBaseline(
  file: string,
  jobs: readonly Job[],
  apiKey: string,
  guard: Guard,
  log: (message: string) => void,
): Promise<RunOutcome> {
  const previous = loadCalls(file);
  const done = new Set([...latestByKey(previous).values()].filter((r) => r.outcome === "ok").map((r) => r.key));
  let spent = previous.reduce((sum, r) => sum + r.costUsd, 0);
  const alreadyDone = jobs.filter((j) => done.has(j.key)).length;
  const pending = jobs.filter((j) => !done.has(j.key));

  const observed = new Map<Job["suite"], { usd: number; chars: number }>();
  const expectedUsd = (job: Job): number => {
    const o = observed.get(job.suite);
    return o && o.chars > 0 ? (o.usd / o.chars) * job.prompt.length : worstCaseUsd(job);
  };

  const uninstall = installRecorder([apiKey]);
  let called = 0;
  let errors = 0;
  let stoppedBy: RunOutcome["stoppedBy"] = "done";
  let stopDetail: string | null = null;

  try {
    for (let i = 0; i < pending.length; i++) {
      const job = pending[i];
      if (called >= guard.maxNewCalls) {
        stoppedBy = "call-ceiling";
        break;
      }
      if (spent + worstCaseUsd(job) > guard.stopAtUsd) {
        stoppedBy = "budget-guard";
        stopDetail = `gasto ${spent.toFixed(4)} + pior caso ${worstCaseUsd(job).toFixed(4)} > ${guard.stopAtUsd}`;
        break;
      }
      if (called > 0 && called % 10 === 0) {
        const projection = spent + pending.slice(i).reduce((sum, j) => sum + expectedUsd(j), 0);
        if (projection > guard.stopAtUsd) {
          stoppedBy = "projection";
          stopDetail = `projeção ${projection.toFixed(4)} > ${guard.stopAtUsd}`;
          break;
        }
      }

      const startedAt = Date.now();
      const { value, error, attempts } = await execute(job, apiKey);
      const latencyMs = Date.now() - startedAt;
      const final = [...attempts].reverse().find((a) => a.status === 200) ?? attempts[attempts.length - 1] ?? null;
      const usage = final ? usageOf(final.usageMetadata) : null;
      const cost = billedCost(job, attempts);
      spent += cost;
      called++;

      const errorMessage =
        error === null
          ? null
          : (error instanceof Error ? error.message : String(error)).split(apiKey).join("<redacted>");
      if (errorMessage !== null) errors++;
      const status = statusOf(attempts);

      const isRewrite = job.suite !== "probe";
      const row: CallRow = {
        key: job.key,
        suite: job.suite,
        run: job.run,
        at: new Date().toISOString(),
        model: MODEL,
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
          ? (value?.parseOutcome ?? null)
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
          `  ${alreadyDone + called}/${jobs.length} · gasto US$ ${spent.toFixed(4)} · erros ${errors} · ${job.key}` +
            (errorMessage ? ` · ERRO ${status ?? "-"}: ${errorMessage.slice(0, 160)}` : ""),
        );
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
