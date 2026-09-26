import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadKey } from "../rewrite-ab/runner";
import { buildPlan } from "../baseline/plan";
import { sha256 } from "../baseline/recorder";
import {
  buildSpike,
  promptOf,
  runSpike,
  SPIKE_MODEL,
  SPIKE_PRICING,
  spikeCost,
  worstCaseSpikeUsd,
  type SpikeRow,
} from "./spike";

const OUT_DIR = path.join(process.cwd(), "eval/comparacao-gemini-3.8/spike");
const CALLS = path.join(OUT_DIR, "calls.jsonl");
const STOP_AT_USD = 0.095;

const say = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const git = (args: string): string => execSync(`git ${args}`, { encoding: "utf8" }).trim();

describe.runIf(process.env.SPIKE_PLAN === "1")("3.8 spike — plan and cost (offline, zero calls)", () => {
  it("lists the calls and the worst case of each", () => {
    const jobs = buildSpike();
    let expected = 0;
    let worst = 0;
    say(`\n=== SPIKE ${SPIKE_MODEL} · ${jobs.length} chamadas · trava US$ ${STOP_AT_USD} ===`);
    for (const s of jobs) {
      const tokens = Math.round(promptOf(s).length / 3.4);
      const out = s.kind === "contract" ? 100 : s.kind === "probe" ? 300 : 700;
      const e = spikeCost(tokens, out);
      expected += e;
      worst += worstCaseSpikeUsd(s);
      say(
        `  ${s.key.padEnd(62)} prompt=${promptOf(s).length}c max=${s.maxTokens} esperado=${e.toFixed(4)} pior=${worstCaseSpikeUsd(s).toFixed(4)}`,
      );
    }
    say(`TOTAL esperado≈US$ ${expected.toFixed(4)} · pior caso US$ ${worst.toFixed(4)}`);
    expect(jobs.length).toBeGreaterThan(0);
  });
});

describe.runIf(process.env.SPIKE_RUN === "1")("3.8 spike — paid run (network)", () => {
  it(
    "runs the contract spike under the guard",
    async () => {
      const apiKey = loadKey("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY ausente");
      if (fs.existsSync(CALLS)) throw new Error("spike já gravado: não repito chamadas");
      const jobs = buildSpike();
      const startedAt = new Date().toISOString();
      const outcome = await runSpike(CALLS, jobs, apiKey, STOP_AT_USD, say);
      const execution = {
        startedAt,
        finishedAt: new Date().toISOString(),
        commit: git("rev-parse HEAD"),
        workingTreeChanges: git("status --porcelain").split("\n").filter(Boolean),
        model: SPIKE_MODEL,
        pricing: SPIKE_PRICING,
        stopAtUsd: STOP_AT_USD,
        authorizedUsd: 0.1,
        harness: ["spike.ts", "spike.test.ts"].map((name) => ({
          file: `test/eval/compare/${name}`,
          sha256: sha256(fs.readFileSync(path.join("test/eval/compare", name), "utf8")),
        })),
        credential: process.env.SPIKE_CREDENTIAL_NOTE ?? null,
        outcome,
      };
      fs.writeFileSync(path.join(OUT_DIR, "execucao.json"), `${JSON.stringify(execution, null, 2)}\n`);
      say(JSON.stringify(outcome, null, 2));
      expect(outcome.spentUsd).toBeLessThanOrEqual(0.1);
    },
    30 * 60 * 1000,
  );
});

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const max = (xs: readonly number[]): number => (xs.length ? Math.max(...xs) : 0);

describe.runIf(process.env.SPIKE_REPORT === "1")("3.8 spike — report (offline, zero calls)", () => {
  it("summarises the contract and projects the full battery", () => {
    const rows = fs
      .readFileSync(CALLS, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as SpikeRow);
    const md: string[] = [`# Teste de contrato · ${SPIKE_MODEL}`, ""];
    md.push(`Chamadas: ${rows.length} · custo observado US$ ${rows.reduce((s, r) => s + r.costUsd, 0).toFixed(4)}`);
    md.push("");
    md.push(
      "| chamada | nível | max | resultado | finishReason | entrada | saída | raciocínio | partes | legível | veto / provas | latência (ms) | US$ |",
    );
    md.push("|---|---|--:|---|---|--:|--:|--:|---|---|---|--:|--:|");
    for (const r of rows) {
      md.push(
        `| ${r.kind}·${r.itemId} | ${r.level ?? "—"} | ${r.maxOutputTokens} | ${r.outcome === "ok" ? "ok" : `erro ${r.error?.status ?? ""}`} | ${
          r.finishReason ?? "—"
        } | ${r.usage?.prompt ?? "—"} | ${r.usage?.candidates ?? "—"} | ${r.usage?.thoughts ?? "—"} | ${
          r.partShapes ? r.partShapes.map((p) => p.join("+")).join(" · ") : "—"
        } | ${r.parseOutcome ?? "—"} | ${
          r.verification
            ? `${r.verification.vetoed ? "veto" : "sem veto"} ${r.verification.failedProofs.join("+")}`
            : "—"
        } | ${r.latencyMs} | ${r.costUsd.toFixed(5)} |`,
      );
    }
    md.push("");
    md.push("## Erros e respostas do contrato");
    md.push("");
    for (const r of rows.filter((x) => x.kind === "contract" || x.outcome === "error")) {
      const apiError = r.attempts.map((a) => a.apiError).find((e) => e !== null);
      md.push(
        `- **${r.itemId}** (${r.level ?? "contrato"}): ${r.outcome} · HTTP ${r.attempts.map((a) => a.status).join(",")} · ` +
          `${apiError ? `${apiError.status}: ${apiError.message.slice(0, 220)}` : `finishReason ${r.finishReason} · resposta ${JSON.stringify((r.raw ?? "").slice(0, 80))}`}`,
      );
    }
    md.push("");

    const tokPerChar = (() => {
      const ok = rows.filter((r) => r.kind !== "contract" && r.usage && r.usage.prompt > 0);
      return ok.reduce((s, r) => s + (r.usage?.prompt ?? 0), 0) / ok.reduce((s, r) => s + r.promptChars, 0);
    })();
    const plan = buildPlan();
    const perRunChars = { rewrite: 0, directed: 0, probe: 0 };
    const perRunCalls = { rewrite: 0, directed: 0, probe: 0 };
    for (const j of plan.jobs.filter((x) => x.run === 1)) {
      perRunChars[j.suite] += j.prompt.length;
      perRunCalls[j.suite] += 1;
    }
    const outputOf = (
      kind: "rewrite" | "directed" | "probe",
      level: "low" | "medium",
      pick: (xs: number[]) => number,
    ): number | null => {
      const xs = rows
        .filter((r) => r.kind === kind && r.level === level && r.usage)
        .map((r) => (r.usage?.candidates ?? 0) + (r.usage?.thoughts ?? 0));
      return xs.length ? pick(xs) : null;
    };
    const project = (
      level: "low" | "medium",
      pick: (xs: number[]) => number,
      prices: { inputUsdPerMillion: number; outputUsdPerMillion: number },
    ) => {
      let total = 0;
      const parts: string[] = [];
      for (const suite of ["rewrite", "directed", "probe"] as const) {
        const out = outputOf(suite, level, pick) ?? outputOf("rewrite", level, pick) ?? 0;
        const calls = perRunCalls[suite] * 3;
        const input = perRunChars[suite] * 3 * tokPerChar;
        const usd = (input * prices.inputUsdPerMillion + calls * out * prices.outputUsdPerMillion) / 1_000_000;
        total += usd;
        parts.push(`${suite} ${calls} chamadas × ${Math.round(out)} tok de saída → US$ ${usd.toFixed(2)}`);
      }
      return { total, parts };
    };
    md.push("## Projeção da bateria completa (k = 3, 684 chamadas)");
    md.push("");
    md.push(`Tokens de entrada por caractere no 3.8, medidos no spike: ${tokPerChar.toFixed(4)}.`);
    md.push("");
    for (const level of ["low", "medium"] as const) {
      for (const [name, pick] of [
        ["média", mean],
        ["máximo observado", max],
      ] as const) {
        const now = project(level, pick, SPIKE_PRICING);
        const later = project(level, pick, SPIKE_PRICING.from2027);
        md.push(
          `- **${level} · saída pela ${name}**: US$ ${now.total.toFixed(2)} (preço de 2026) · US$ ${later.total.toFixed(2)} (preço de 2027) — ${now.parts.join("; ")}`,
        );
      }
    }
    fs.writeFileSync(path.join(OUT_DIR, "spike-report.md"), `${md.join("\n")}\n`);
    say(md.join("\n"));
    expect(rows.length).toBeGreaterThan(0);
  });
});
