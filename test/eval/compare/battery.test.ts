import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "@/llm";
import { analyze } from "@/locales/pt-BR";
import { STRATEGY_VERSION } from "@/report/rewrite";
import { PROBE_PROMPT_VERSION } from "@/lucid/probe/prompt";
import { loadKey } from "../rewrite-ab/runner";
import { MAX_OUTPUT_TOKENS } from "../baseline/plan";
import { sha256 } from "../baseline/recorder";
import { loadCalls } from "../baseline/run";
import {
  CANDIDATE_LEVEL,
  CANDIDATE_MODEL,
  candidateJobs,
  expectedConfig,
  runBattery,
  worstCaseCandidateUsd,
} from "./battery";
import { writeFinalReport } from "./final";
import { SPIKE_PRICING, spikeCost } from "./spike";

const COMPARE_DIR = path.join(process.cwd(), "eval/comparacao-gemini-3.8");
const ARM_DIR = path.join(COMPARE_DIR, "candidato-gemini-3.8-flash-low");
const CALLS = path.join(ARM_DIR, "calls.jsonl");
const STAMP = path.join(ARM_DIR, "stamp.json");
const BASE_CALLS = path.join(process.cwd(), "eval/baseline-gemini-2.5-flash/calls.jsonl");

const CAP_USD = 3.5;
const STOP_AT_USD = 3.45;

const say = (message: string): void => {
  process.stdout.write(`${message}\n`);
};
const git = (args: string): string => execSync(`git ${args}`, { encoding: "utf8" }).trim();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bateria 3.8 — o que o protocolo fixou (offline)", () => {
  it("usa os mesmos jobs da baseline, com chaves únicas e o modelo trocado só na chave", () => {
    const jobs = candidateJobs();
    expect(jobs).toHaveLength(684);
    expect(new Set(jobs.map((j) => j.key)).size).toBe(684);
    for (const c of jobs) {
      expect(c.key).toContain(`|${CANDIDATE_MODEL}|`);
      expect(c.key).not.toContain("gemini-2.5-flash");
    }
  });

  it("envia exatamente o generationConfig do protocolo em cada suíte", async () => {
    for (const suite of ["rewrite", "directed", "probe"] as const) {
      const fetchMock = vi.fn(
        async () =>
          new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"reescrita":"x"}' }] } }] }), {
            status: 200,
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      await new GeminiProvider("k", { thinkingLevel: CANDIDATE_LEVEL }).complete("p", {
        model: CANDIDATE_MODEL,
        temperature: 0,
        maxTokens: MAX_OUTPUT_TOKENS[suite],
      });
      const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(JSON.stringify(JSON.parse(init.body as string).generationConfig)).toBe(
        JSON.stringify(expectedConfig(suite)),
      );
    }
  });
});

describe.runIf(process.env.BATTERY_PLAN === "1")("bateria 3.8 — plano e custo (offline, zero chamadas)", () => {
  it("estima pelo que o teste de contrato mediu", () => {
    const jobs = candidateJobs();
    const tokensPerChar = 0.2843;
    const outputBySuite = { rewrite: 131, directed: 53, probe: 61 } as const;
    let expected = 0;
    let worst = 0;
    for (const c of jobs) {
      expected += spikeCost(c.job.prompt.length * tokensPerChar, outputBySuite[c.job.suite]);
      worst += worstCaseCandidateUsd(c);
    }
    say(`\n=== BATERIA ${CANDIDATE_MODEL} · ${CANDIDATE_LEVEL} · ${jobs.length} chamadas ===`);
    say(
      `esperado (saída pelo máximo do spike) ≈ US$ ${expected.toFixed(3)} · pior caso teórico US$ ${worst.toFixed(3)}`,
    );
    say(`trava: US$ ${STOP_AT_USD} (teto autorizado US$ ${CAP_USD})`);
    expect(jobs.length).toBe(684);
  });
});

describe.runIf(process.env.BATTERY_RUN === "1")("bateria 3.8 — execução (rede, paga)", () => {
  it(
    "roda as 3 rodadas das 3 suítes com a trava de custo",
    async () => {
      const apiKey = loadKey("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY ausente");
      if (git("status --porcelain") !== "")
        throw new Error("árvore com mudanças: a bateria só roda a partir de um commit");
      const jobs = candidateJobs();
      const meta = analyze("O pedido foi aprovado pelo diretor.").meta;
      const stamp = {
        purpose: "Braço candidato da comparação pré-registrada em eval/comparacao-gemini-3.8/protocolo.md.",
        createdAt: new Date().toISOString(),
        commit: git("rev-parse HEAD"),
        srcTree: git("rev-parse HEAD:src"),
        protocolSha256: sha256(fs.readFileSync(path.join(COMPARE_DIR, "protocolo.md"), "utf8")),
        ruler: { lucidVersion: meta.lucidVersion, dataHash: meta.dataHash, configHash: meta.configHash },
        model: CANDIDATE_MODEL,
        thinkingLevel: CANDIDATE_LEVEL,
        promptVersions: {
          rewrite: STRATEGY_VERSION.rewrite,
          directed: STRATEGY_VERSION.directed,
          probe: PROBE_PROMPT_VERSION,
        },
        generationConfig: {
          rewrite: expectedConfig("rewrite"),
          directed: expectedConfig("directed"),
          probe: expectedConfig("probe"),
        },
        pricing: SPIKE_PRICING,
        baseline: {
          calls: "eval/baseline-gemini-2.5-flash/calls.jsonl",
          sha256: sha256(fs.readFileSync(BASE_CALLS, "utf8")),
        },
        harness: ["battery.ts", "battery.test.ts", "compare.ts", "final.ts", "spike.ts"].map((name) => ({
          file: `test/eval/compare/${name}`,
          sha256: sha256(fs.readFileSync(path.join("test/eval/compare", name), "utf8")),
        })),
        credential: process.env.BATTERY_CREDENTIAL_NOTE ?? null,
        guard: { capUsd: CAP_USD, stopAtUsd: STOP_AT_USD },
      };
      fs.mkdirSync(ARM_DIR, { recursive: true });
      if (fs.existsSync(STAMP)) {
        const recorded = JSON.parse(fs.readFileSync(STAMP, "utf8")) as Record<string, unknown>;
        for (const field of [
          "srcTree",
          "protocolSha256",
          "ruler",
          "model",
          "thinkingLevel",
          "promptVersions",
          "generationConfig",
        ] as const) {
          if (JSON.stringify(recorded[field]) !== JSON.stringify(stamp[field])) {
            throw new Error(`o carimbo gravado diverge em '${field}': não misturo rodadas de estados diferentes`);
          }
        }
      } else {
        fs.writeFileSync(STAMP, `${JSON.stringify(stamp, null, 2)}\n`);
      }

      const startedAt = new Date().toISOString();
      const outcome = await runBattery(
        CALLS,
        jobs,
        apiKey,
        { stopAtUsd: STOP_AT_USD, maxNewCalls: jobs.length + 40 },
        say,
      );
      fs.writeFileSync(
        path.join(ARM_DIR, `execucao-${Date.now()}.json`),
        `${JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), commit: stamp.commit, outcome }, null, 2)}\n`,
      );
      say(JSON.stringify(outcome, null, 2));
      expect(loadCalls(CALLS).reduce((n, r) => n + r.costUsd, 0)).toBeLessThanOrEqual(CAP_USD);
    },
    4 * 60 * 60 * 1000,
  );
});

describe.runIf(process.env.FINAL_REPORT === "1")("comparação final (offline, zero chamadas)", () => {
  it(
    "pontua os dois braços e escreve o relatório final",
    async () => {
      const outDir = process.env.FINAL_OUT ?? COMPARE_DIR;
      const candidateCalls = process.env.FINAL_CANDIDATE_CALLS ?? CALLS;
      fs.mkdirSync(outDir, { recursive: true });
      await writeFinalReport(
        outDir,
        { label: "gemini-2.5-flash", callsFile: BASE_CALLS },
        { label: process.env.FINAL_CANDIDATE_LABEL ?? "gemini-3.8-flash·low", callsFile: candidateCalls },
        say,
      );
      expect(fs.existsSync(path.join(outDir, "relatorio-final.md"))).toBe(true);
    },
    30 * 60 * 1000,
  );
});
