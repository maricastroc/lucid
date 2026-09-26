import fs from "node:fs";
import path from "node:path";
import { GeminiProvider, type GeminiThinkingLevel } from "@/llm";
import { LlmRewriteProposer, verifyRewrite, type RewriteProposal } from "@/report/rewrite";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import type { ProbeResult } from "@/lucid/probe/types";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { buildPlan, type ProbeJob, type RewriteJob } from "../baseline/plan";
import { installRecorder, recording, sha256, type AttemptRecord } from "../baseline/recorder";
import { probeRawParses, rewriteRawParses } from "../baseline/run";

export const SPIKE_MODEL = "gemini-3.8-flash";

export const SPIKE_PRICING = {
  source: "https://ai.google.dev/gemini-api/docs/pricing",
  retrievedAt: "2026-09-26",
  tier: "Paid Tier · Standard · preço introdutório até 31/12/2026",
  inputUsdPerMillion: 0.75,
  outputUsdPerMillion: 3.75,
  from2027: { inputUsdPerMillion: 1.5, outputUsdPerMillion: 7.5 },
} as const;

export const spikeCost = (input: number, output: number): number =>
  (input * SPIKE_PRICING.inputUsdPerMillion + output * SPIKE_PRICING.outputUsdPerMillion) / 1_000_000;

const CONTRACT_PROMPT = 'Responda SOMENTE com este JSON, sem texto fora dele: {"ok": true}';

export type SpikeJob =
  | {
      readonly kind: "rewrite" | "directed";
      readonly key: string;
      readonly level: GeminiThinkingLevel;
      readonly job: RewriteJob;
      readonly maxTokens: number;
    }
  | {
      readonly kind: "probe";
      readonly key: string;
      readonly level: GeminiThinkingLevel;
      readonly job: ProbeJob;
      readonly maxTokens: number;
    }
  | {
      readonly kind: "contract";
      readonly key: string;
      readonly variant: string;
      readonly question: string;
      readonly generationConfig: Record<string, unknown>;
      readonly maxTokens: number;
    };

export const promptOf = (s: SpikeJob): string => (s.kind === "contract" ? CONTRACT_PROMPT : s.job.prompt);

export const worstCaseSpikeUsd = (s: SpikeJob): number => spikeCost(Math.ceil(promptOf(s).length / 2.5), s.maxTokens);

export function buildSpike(): SpikeJob[] {
  const plan = buildPlan();
  const firstRun = plan.jobs.filter((j) => j.run === 1);
  const rewrites = firstRun
    .filter((j): j is RewriteJob => j.suite === "rewrite")
    .sort((a, b) => a.prompt.length - b.prompt.length);
  const directed = firstRun
    .filter((j): j is RewriteJob => j.suite === "directed")
    .sort((a, b) => a.prompt.length - b.prompt.length)[0];
  const probes = firstRun.filter((j): j is ProbeJob => j.suite === "probe");

  const picked = [rewrites[0], rewrites[Math.floor(rewrites.length / 2)]];
  const sameParagraph = rewrites.find((j) => j.target.id === directed.target.id);
  if (sameParagraph && !picked.includes(sameParagraph)) picked.push(sameParagraph);
  else picked.push(rewrites[Math.floor(rewrites.length * 0.75)]);

  const probeCases = [
    probes.find((p) => p.probeCase.id === "casos-nao-enumerados")!,
    probes.find((p) => p.probeCase.categoria === "claro")!,
  ];

  const out: SpikeJob[] = [];
  for (const level of ["low", "medium"] as const) {
    for (const job of picked)
      out.push({ kind: "rewrite", key: `rewrite|${job.target.id}|${level}`, level, job, maxTokens: 2048 });
  }
  out.push({
    kind: "directed",
    key: `directed|${directed.target.id}|low`,
    level: "low",
    job: directed,
    maxTokens: 2048,
  });
  for (const level of ["low", "medium"] as const) {
    for (const job of probeCases)
      out.push({ kind: "probe", key: `probe|${job.probeCase.id}|${level}`, level, job, maxTokens: 512 });
  }
  const contract = (variant: string, question: string, generationConfig: Record<string, unknown>): SpikeJob => ({
    kind: "contract",
    key: `contract|${variant}`,
    variant,
    question,
    generationConfig,
    maxTokens: Number(generationConfig.maxOutputTokens ?? 256),
  });
  out.push(
    contract(
      "corpo-de-producao-do-2.5",
      "O que acontece se só a string do modelo mudar (temperature 0 e thinkingBudget 0)?",
      {
        temperature: 0,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    ),
    contract(
      "temperature-com-thinkingLevel",
      "temperature 0 junto de thinkingLevel low é aceito, recusado ou ignorado?",
      {
        temperature: 0,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "low" },
      },
    ),
    contract("thinkingLevel-minimal", "thinkingLevel minimal (documentado como erro no 3.8)", {
      maxOutputTokens: 256,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "minimal" },
    }),
    contract("thinkingLevel-e-thinkingBudget", "thinkingLevel e thinkingBudget juntos (documentado como 400)", {
      maxOutputTokens: 256,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "low", thinkingBudget: 0 },
    }),
  );
  return out;
}

export interface SpikeRow {
  readonly key: string;
  readonly kind: SpikeJob["kind"];
  readonly level: GeminiThinkingLevel | null;
  readonly variant: string | null;
  readonly itemId: string;
  readonly at: string;
  readonly model: string;
  readonly promptChars: number;
  readonly promptSha256: string;
  readonly maxOutputTokens: number;
  readonly outcome: "ok" | "error";
  readonly error: { readonly message: string; readonly status: number | null } | null;
  readonly parseOutcome: "ok" | "unparseable" | null;
  readonly original: string | null;
  readonly proposed: string | null;
  readonly probeResult: ProbeResult | null;
  readonly verification: {
    readonly vetoed: boolean;
    readonly failedProofs: readonly string[];
    readonly flaggedSignals: readonly string[];
  } | null;
  readonly raw: string | null;
  readonly finishReason: string | null;
  readonly usage: {
    readonly prompt: number;
    readonly candidates: number;
    readonly thoughts: number;
    readonly total: number;
  } | null;
  readonly usageMetadata: unknown;
  readonly modelVersion: string | null;
  readonly partsCount: number | null;
  readonly partShapes: readonly (readonly string[])[] | null;
  readonly generationConfig: unknown;
  readonly attempts: readonly {
    readonly status: number | null;
    readonly latencyMs: number;
    readonly finishReason: string | null;
    readonly apiError: AttemptRecord["apiError"];
    readonly networkError: string | null;
  }[];
  readonly latencyMs: number;
  readonly costUsd: number;
}

const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function usageOf(metadata: unknown): SpikeRow["usage"] {
  if (typeof metadata !== "object" || metadata === null) return null;
  const m = metadata as Record<string, unknown>;
  return {
    prompt: n(m.promptTokenCount),
    candidates: n(m.candidatesTokenCount),
    thoughts: n(m.thoughtsTokenCount),
    total: n(m.totalTokenCount),
  };
}

interface ExecValue {
  readonly proposal?: RewriteProposal;
  readonly probe?: ProbeResult;
}

async function execute(
  s: SpikeJob,
  apiKey: string,
): Promise<{ value: ExecValue | null; error: unknown; attempts: AttemptRecord[] }> {
  if (s.kind === "contract") {
    return recording(async (): Promise<ExecValue> => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${SPIKE_MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: CONTRACT_PROMPT }] }],
            generationConfig: s.generationConfig,
          }),
          signal: AbortSignal.timeout(45_000),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {};
    });
  }
  const provider = new GeminiProvider(apiKey, { thinkingLevel: s.level });
  if (s.kind === "probe") {
    const probe = new LlmComprehensionProbe(provider, SPIKE_MODEL);
    return recording(async () => ({
      probe: await probe.probe({ trecho: s.job.probeCase.trecho, pergunta: s.job.probeCase.pergunta }),
    }));
  }
  const proposer = new LlmRewriteProposer(provider, SPIKE_MODEL);
  return recording(async () => {
    const proposal = await proposer.propose({
      text: s.job.target.text,
      target: s.job.target.span,
      criterion: s.job.criterion,
      localeId: rewriteLocalePtBR.id,
      strategy: s.job.strategy,
      briefing: s.job.briefing,
      findings: s.job.findings,
      declarations: s.job.declarations,
    });
    return { proposal };
  });
}

export interface SpikeOutcome {
  readonly planned: number;
  readonly called: number;
  readonly spentUsd: number;
  readonly stoppedBy: "done" | "budget-guard";
  readonly stopDetail: string | null;
}

export async function runSpike(
  file: string,
  jobs: readonly SpikeJob[],
  apiKey: string,
  stopAtUsd: number,
  log: (message: string) => void,
): Promise<SpikeOutcome> {
  const uninstall = installRecorder([apiKey]);
  let spent = 0;
  let called = 0;
  try {
    for (const s of jobs) {
      if (spent + worstCaseSpikeUsd(s) > stopAtUsd) {
        return {
          planned: jobs.length,
          called,
          spentUsd: spent,
          stoppedBy: "budget-guard",
          stopDetail: `gasto ${spent.toFixed(4)} + pior caso ${worstCaseSpikeUsd(s).toFixed(4)} > ${stopAtUsd}`,
        };
      }
      const startedAt = Date.now();
      const { value, error, attempts } = await execute(s, apiKey);
      const latencyMs = Date.now() - startedAt;
      const final = [...attempts].reverse().find((a) => a.status === 200) ?? attempts[attempts.length - 1] ?? null;
      const usage = final ? usageOf(final.usageMetadata) : null;
      const cost = attempts.reduce((sum, a) => {
        const u = usageOf(a.usageMetadata);
        if (u !== null) return sum + spikeCost(u.prompt, u.candidates + u.thoughts);
        return a.networkError !== null ? sum + worstCaseSpikeUsd(s) : sum;
      }, 0);
      spent += cost;
      called++;

      const errorMessage =
        error === null
          ? null
          : (error instanceof Error ? error.message : String(error)).split(apiKey).join("<redacted>");
      const last = attempts[attempts.length - 1];
      const status = last && last.status !== null && last.status >= 400 ? last.status : null;

      let verification: SpikeRow["verification"] = null;
      const proposal = value?.proposal ?? null;
      if (proposal && s.kind !== "contract" && s.kind !== "probe") {
        const job = s.job;
        const v = await verifyRewrite(job.target.text, job.target.span, proposal, {
          locale: rewriteLocalePtBR,
          criterion: job.criterion,
          focus: {
            start: job.focus.span.start,
            end: job.focus.span.end,
            text: job.target.text.slice(job.focus.span.start, job.focus.span.end),
          },
          findings: job.findings,
          declarations: job.declarations,
        });
        verification = {
          vetoed: v.proofs.some((p) => !p.passed),
          failedProofs: v.proofs.filter((p) => !p.passed).map((p) => p.check),
          flaggedSignals: v.signals.filter((x) => x.flagged).map((x) => x.check),
        };
      }

      const prompt = promptOf(s);
      const row: SpikeRow = {
        key: s.key,
        kind: s.kind,
        level: s.kind === "contract" ? null : s.level,
        variant: s.kind === "contract" ? s.variant : null,
        itemId: s.kind === "contract" ? s.variant : s.kind === "probe" ? s.job.probeCase.id : s.job.target.id,
        at: new Date().toISOString(),
        model: SPIKE_MODEL,
        promptChars: prompt.length,
        promptSha256: sha256(prompt),
        maxOutputTokens: s.maxTokens,
        outcome: errorMessage === null ? "ok" : "error",
        error: errorMessage === null ? null : { message: errorMessage, status },
        parseOutcome:
          s.kind === "rewrite" || s.kind === "directed"
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
        original: proposal?.original ?? null,
        proposed: proposal?.proposed ?? null,
        probeResult: value?.probe ?? null,
        verification,
        raw: final?.firstPartText ?? null,
        finishReason: final?.finishReason ?? null,
        usage,
        usageMetadata: final?.usageMetadata ?? null,
        modelVersion: final?.modelVersion ?? null,
        partsCount: final?.partsCount ?? null,
        partShapes: final?.partShapes ?? null,
        generationConfig: final?.generationConfig ?? attempts[0]?.generationConfig ?? null,
        attempts: attempts.map((a) => ({
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
      log(
        `  ${called}/${jobs.length} · US$ ${spent.toFixed(4)} · ${s.key} · ${row.outcome} · ${row.finishReason ?? "-"} · ` +
          `pensamento=${usage?.thoughts ?? "-"} saída=${usage?.candidates ?? "-"}` +
          (errorMessage ? ` · ERRO ${status ?? "-"}: ${errorMessage.slice(0, 140)}` : ""),
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } finally {
    uninstall();
  }
  return { planned: jobs.length, called, spentUsd: spent, stoppedBy: "done", stopDetail: null };
}
