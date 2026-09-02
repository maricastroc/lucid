import fs from "node:fs";
import path from "node:path";
import { GeminiProvider, GEMINI_MODELS, type ChatProvider } from "@/llm";
import { parseRewrite } from "@/report/rewrite";
import { candidateById } from "./candidates";
import type { EvalTarget } from "./targets";

export const MAX_TOKENS_PER_CALL = 2048;

export interface RunRow {
  readonly key: string;
  readonly at: string;
  readonly candidate: string;
  readonly model: string;
  readonly context: string;
  readonly targetId: string;
  readonly document: string;
  readonly start: number;
  readonly end: number;
  readonly original: string;
  readonly proposed: string;
  readonly parseOutcome: "ok" | "unparseable";
  readonly promptChars: number;
  readonly contextChars: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly truncated: boolean;
  readonly latencyMs: number;
  readonly error: string | null;
  readonly raw: string;
}

export const rowKey = (candidate: string, model: string, context: string, targetId: string): string =>
  `${candidate}|${model}|${context}|${targetId}`;

export function loadRows(file: string): RunRow[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as RunRow);
}

export function resultRows(file: string): RunRow[] {
  const latest = new Map<string, RunRow>();
  for (const row of loadRows(file)) latest.set(row.key, row);
  return [...latest.values()].filter((row) => row.error === null);
}

function appendRow(file: string, row: RunRow): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
}

export interface Keys {
  gemini: string | null;
}

export function loadKey(name: string): string | null {
  if (process.env[name]) return process.env[name] ?? null;
  try {
    const match = fs.readFileSync(".env", "utf8").match(new RegExp(`^${name}=(.+)$`, "m"));
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export function loadKeys(): Keys {
  return {
    gemini: loadKey("GEMINI_API_KEY"),
  };
}

interface Bound {
  provider: ChatProvider;
  usage: () => { prompt: number; completion: number; total: number };
}

export function providerFor(model: string, keys: Keys): Bound {
  const usageOf =
    (p: { lastUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null }) => () => ({
      prompt: p.lastUsage?.promptTokens ?? 0,
      completion: p.lastUsage?.completionTokens ?? 0,
      total: p.lastUsage?.totalTokens ?? 0,
    });
  if ((GEMINI_MODELS as readonly string[]).includes(model)) {
    if (!keys.gemini) throw new Error(`GEMINI_API_KEY ausente para ${model}`);
    const p = new GeminiProvider(keys.gemini);
    return { provider: p, usage: usageOf(p) };
  }
  throw new Error(`modelo sem provider conhecido: ${model}`);
}

export interface Job {
  readonly candidate: string;
  readonly model: string;
  readonly context: string;
  readonly target: EvalTarget;
  readonly contextText: string;
}

export interface Budget {
  readonly maxCalls: number;
  readonly maxTokens: number;
}

export interface RunSummary {
  readonly planned: number;
  readonly reused: number;
  readonly called: number;
  readonly failed: number;
  readonly tokens: number;
  readonly stoppedBy: "done" | "call-ceiling" | "token-ceiling" | "quota-exhausted";
  readonly quotaMessage?: string;
}

function isDailyQuota(message: string): boolean {
  return /tokens per day|requests per day|\bTPD\b|\bRPD\b/iu.test(message);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function runJobs(
  file: string,
  jobs: readonly Job[],
  keys: Keys,
  budget: Budget,
  log: (message: string) => void,
): Promise<RunSummary> {
  const done = new Set(resultRows(file).map((r) => r.key));
  const providers = new Map<string, Bound>();

  let called = 0;
  let failed = 0;
  let tokens = 0;
  let reused = 0;
  let stoppedBy: RunSummary["stoppedBy"] = "done";

  for (const job of jobs) {
    const key = rowKey(job.candidate, job.model, job.context, job.target.id);
    if (done.has(key)) {
      reused++;
      continue;
    }
    if (called >= budget.maxCalls) {
      stoppedBy = "call-ceiling";
      break;
    }
    if (tokens >= budget.maxTokens) {
      stoppedBy = "token-ceiling";
      break;
    }

    const candidate = candidateById(job.candidate);
    if (!candidate) throw new Error(`candidato desconhecido: ${job.candidate}`);
    const prompt = candidate.build(job.target, job.contextText);

    let bound = providers.get(job.model);
    if (!bound) {
      bound = providerFor(job.model, keys);
      providers.set(job.model, bound);
    }

    const startedAt = Date.now();
    let raw = "";
    let error: string | null = null;
    try {
      raw = await bound.provider.complete(prompt, {
        model: job.model,
        temperature: 0,
        maxTokens: MAX_TOKENS_PER_CALL,
      });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      failed++;
    }
    const latencyMs = Date.now() - startedAt;
    const usage = bound.usage();
    const parsed = error === null ? parseRewrite(raw) : null;

    const row: RunRow = {
      key,
      at: new Date().toISOString(),
      candidate: job.candidate,
      model: job.model,
      context: job.context,
      targetId: job.target.id,
      document: job.target.document,
      start: job.target.span.start,
      end: job.target.span.end,
      original: job.target.span.text,
      proposed: parsed ?? job.target.span.text,
      parseOutcome: parsed === null ? "unparseable" : "ok",
      promptChars: prompt.length,
      contextChars: job.contextText.length,
      promptTokens: usage.prompt,
      completionTokens: usage.completion,
      totalTokens: usage.total,
      truncated: usage.completion >= MAX_TOKENS_PER_CALL,
      latencyMs,
      error,
      raw,
    };
    appendRow(file, row);
    done.add(key);
    called++;
    tokens += usage.total;

    if (called % 5 === 0 || error !== null) {
      log(
        `  ${called} chamadas · ${tokens} tokens · ${failed} falhas · última: ${job.candidate}/${job.model}` +
          (error ? ` · ERRO: ${error}` : ""),
      );
    }

    if (error !== null && isDailyQuota(error)) {
      log(`  COTA DIÁRIA ESGOTADA em ${job.model} — parando. Nenhuma espera dentro desta corrida recupera isso.`);
      return {
        planned: jobs.length,
        reused,
        called,
        failed,
        tokens,
        stoppedBy: "quota-exhausted",
        quotaMessage: error,
      };
    }

    await sleep(600);
  }

  return { planned: jobs.length, reused, called, failed, tokens, stoppedBy };
}
