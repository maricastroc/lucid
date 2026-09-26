import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GeminiProvider, type ChatCompletionOptions, type ChatProvider } from "@/llm";
import { analyze } from "@/locales/pt-BR";
import { LlmRewriteProposer, STRATEGY_VERSION } from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import { PROBE_PROMPT_VERSION } from "@/lucid/probe/prompt";
import { GOLDEN_SONDA } from "../probe-golden";
import { loadKey } from "../rewrite-ab/runner";
import { buildPlan, costUsd, MAX_OUTPUT_TOKENS, MODEL, PRICING, RUNS, type Job } from "./plan";
import { installRecorder, recording, sha256 } from "./recorder";
import { latestByKey, loadCalls, runBaseline, worstCaseUsd } from "./run";
import { writeReport } from "./report";

export const OUT_DIR = path.join(process.cwd(), "eval/baseline-gemini-2.5-flash");
const CALLS = path.join(OUT_DIR, "calls.jsonl");
const STAMP = path.join(OUT_DIR, "stamp.json");

const CAP_USD = 2;
const STOP_AT_USD = 1.9;

const say = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const ruler = (): { lucidVersion: string; dataHash: string; configHash: string } => {
  const meta = analyze("O pedido foi aprovado pelo diretor.").meta;
  return { lucidVersion: meta.lucidVersion, dataHash: meta.dataHash, configHash: meta.configHash };
};

class CapturingProvider implements ChatProvider {
  readonly id = "gemini";
  readonly models = [MODEL] as const;
  readonly prompts: string[] = [];
  readonly options: ChatCompletionOptions[] = [];
  async complete(prompt: string, options: ChatCompletionOptions): Promise<string> {
    this.prompts.push(prompt);
    this.options.push(options);
    return '{"reescrita": "x"}';
  }
}

function git(args: string): string {
  return execSync(`git ${args}`, { encoding: "utf8" }).trim();
}

function buildStamp(plan: ReturnType<typeof buildPlan>): Record<string, unknown> {
  const corpusDir = "corpus/v1/text";
  const files = fs
    .readdirSync(corpusDir)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((name) => {
      const text = fs.readFileSync(path.join(corpusDir, name), "utf8");
      return { name, chars: text.length, sha256: sha256(text) };
    });
  return {
    purpose:
      "Fotografia do gemini-2.5-flash no estado atual do Lucid, antes da perda de acesso ao modelo. " +
      "Referência pareada para avaliar sucessores (gemini-3.8-flash, gemini-3.5-flash-lite).",
    createdAt: new Date().toISOString(),
    commit: git("rev-parse HEAD"),
    branch: git("rev-parse --abbrev-ref HEAD"),
    trackedTreeClean: git("status --porcelain --untracked-files=no") === "",
    harness: ["baseline.test.ts", "plan.ts", "recorder.ts", "run.ts", "report.ts"].map((name) => ({
      file: `test/eval/baseline/${name}`,
      sha256: sha256(fs.readFileSync(path.join("test/eval/baseline", name), "utf8")),
    })),
    credential: process.env.BASELINE_CREDENTIAL_NOTE ?? null,
    node: process.version,
    ruler: ruler(),
    model: MODEL,
    pricing: PRICING,
    promptVersions: {
      rewrite: STRATEGY_VERSION.rewrite,
      rewriteAbAlias: "lucid@v5",
      directed: STRATEGY_VERSION.directed,
      probe: PROBE_PROMPT_VERSION,
    },
    parametersInCode: {
      rewrite: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS.rewrite,
        responseMimeType: "application/json",
        thinkingBudget: 0,
      },
      directed: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS.directed,
        responseMimeType: "application/json",
        thinkingBudget: 0,
      },
      probe: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS.probe,
        responseMimeType: "application/json",
        thinkingBudget: 0,
      },
      note: "O generationConfig realmente enviado está gravado verbatim em cada linha de calls.jsonl.",
      retry: "GeminiProvider de produção: até 4 novas tentativas em HTTP 429; timeout de 45 s por tentativa.",
    },
    corpus: {
      version: "v1",
      dir: corpusDir,
      manifestSha256: sha256(fs.readFileSync("corpus/v1/manifest.json", "utf8")),
      files,
    },
    selection: {
      rewrite: {
        rule: "loadEvalTargets(500) do A/B: parágrafo, 150–700 caracteres, com ao menos um achado",
        targets: plan.targets.length,
        focus: "primeiro achado do parágrafo (o mesmo primaryCriterion do A/B)",
        briefing: "todos os achados que cruzam o parágrafo, como generateRewrite faz",
      },
      directed: {
        rule: "alvos do rewrite com um achado em que asksForAgent() é verdadeiro (a UI faz a pergunta do agente)",
        targets: plan.directedTargets.length,
        declaration:
          "{ agent: null } no ponto em foco: a resposta 'manter impessoal', a única que não exige inventar agente",
      },
      probe: {
        golden: "test/eval/probe-golden.ts",
        cases: GOLDEN_SONDA.length,
        goldenSha256: sha256(JSON.stringify(GOLDEN_SONDA)),
      },
    },
    runs: RUNS,
    order: "rodada 1: rewrite → directed → probe; rodada 2: rewrite → directed → probe",
    guard: {
      capUsd: CAP_USD,
      stopAtUsd: STOP_AT_USD,
      rule: "antes de cada chamada: gasto + pior caso da chamada (entrada a 2,5 caracteres/token, saída no teto) ≤ stopAtUsd; a cada 10 chamadas, projeção pelo uso observado ≤ stopAtUsd",
    },
    declaredExclusions: [
      "A sonda não roda dentro das suítes de reescrita (meaning_preserved), como no A/B (test/eval/rewrite-ab/README.md). Ela é medida à parte, na meta-eval.",
      "declared_agent_present não é exercitado: nenhum agente declarado por pessoa existe para estes alvos, e o avaliador não inventa um.",
    ],
    productionObservations: [
      "Na produção, a rota cria LlmRewriteProposer sem estratégia (src/app/api/rewrite/route.ts:77) e o id é fixado no construtor (src/report/rewrite/llm-proposer.ts:34): proposta feita com o prompt directed@4 sai carimbada rewrite@6. Aqui stampedId guarda o carimbo de produção e promptVersion guarda o prompt realmente usado.",
    ],
  };
}

describe("baseline 2.5 — o que é medido é o que a produção envia (offline)", () => {
  it("cada prompt planejado é, byte a byte, o que LlmRewriteProposer e LlmComprehensionProbe enviam", async () => {
    const plan = buildPlan();
    const firstRun = plan.jobs.filter((j) => j.run === RUNS[0]);
    expect(firstRun.length).toBe(plan.targets.length + plan.directedTargets.length + GOLDEN_SONDA.length);
    expect(new Set(plan.jobs.map((j) => j.key)).size).toBe(plan.jobs.length);
    for (const job of firstRun) {
      const provider = new CapturingProvider();
      if (job.suite === "probe") {
        await new LlmComprehensionProbe(provider, MODEL).probe({
          trecho: job.probeCase.trecho,
          pergunta: job.probeCase.pergunta,
        });
        expect(provider.options[0]).toMatchObject({ model: MODEL, temperature: 0, maxTokens: MAX_OUTPUT_TOKENS.probe });
      } else {
        await new LlmRewriteProposer(provider, MODEL).propose({
          text: job.target.text,
          target: job.target.span,
          criterion: job.criterion,
          localeId: rewriteLocalePtBR.id,
          strategy: job.strategy,
          briefing: job.briefing,
          findings: job.findings,
          declarations: job.declarations,
        });
        expect(provider.options[0]).toMatchObject({
          model: MODEL,
          temperature: 0,
          maxTokens: MAX_OUTPUT_TOKENS[job.suite],
        });
      }
      expect(provider.prompts[0], job.key).toBe(job.prompt);
    }
  });

  it("o gravador guarda o generationConfig enviado e nunca a chave", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"reescrita":"y"}' }] }, finishReason: "STOP" }],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2, totalTokenCount: 5 },
          modelVersion: MODEL,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    const uninstall = installRecorder(["segredo-de-teste"]);
    try {
      const { attempts } = await recording(() =>
        new GeminiProvider("segredo-de-teste").complete("oi", { model: MODEL, temperature: 0, maxTokens: 2048 }),
      );
      expect(attempts).toHaveLength(1);
      expect(attempts[0].generationConfig).toMatchObject({
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      });
      expect(attempts[0].finishReason).toBe("STOP");
      expect(JSON.stringify(attempts)).not.toContain("segredo-de-teste");
    } finally {
      uninstall();
      globalThis.fetch = realFetch;
    }
  });

  it.runIf(fs.existsSync(CALLS) && fs.existsSync(STAMP))(
    "cada prompt gravado ainda é reconstruído igual, enquanto a régua for a mesma",
    () => {
      const stamp = JSON.parse(fs.readFileSync(STAMP, "utf8")) as { ruler: ReturnType<typeof ruler> };
      const current = ruler();
      if (JSON.stringify(stamp.ruler) !== JSON.stringify(current)) return;
      const byKey = new Map(buildPlan().jobs.map((j) => [j.key, j]));
      const diverged = [...latestByKey(loadCalls(CALLS)).values()]
        .filter((row) => row.outcome === "ok")
        .filter((row) => byKey.get(row.key) && sha256(byKey.get(row.key)!.prompt) !== row.promptSha256)
        .map((row) => row.key);
      expect(diverged).toEqual([]);
    },
  );
});

function estimate(jobs: readonly Job[]) {
  const suites = ["rewrite", "directed", "probe"] as const;
  const expectedOut = { rewrite: 120, directed: 120, probe: 200 } as const;
  const highOut = { rewrite: 400, directed: 400, probe: 512 } as const;
  const rows = suites.map((suite) => {
    const js = jobs.filter((j) => j.suite === suite);
    const chars = js.reduce((n, j) => n + j.prompt.length, 0);
    const inExpected = Math.round(chars / 3.5);
    const inConservative = Math.round(chars / 3.0);
    return {
      suite,
      calls: js.length,
      promptChars: chars,
      meanChars: js.length ? Math.round(chars / js.length) : 0,
      maxChars: js.reduce((m, j) => Math.max(m, j.prompt.length), 0),
      inExpected,
      inConservative,
      usdExpected: costUsd(inExpected, js.length * expectedOut[suite]),
      usdHigh: costUsd(inConservative, js.length * highOut[suite]),
      usdWorst: js.reduce((sum, j) => sum + worstCaseUsd(j), 0),
    };
  });
  return rows;
}

describe.runIf(process.env.BASELINE_PLAN === "1")("baseline 2.5 — plano e custo (offline, zero chamadas)", () => {
  it("conta as chamadas e estima tokens e custo antes de qualquer chamada paga", () => {
    const plan = buildPlan();
    const rows = estimate(plan.jobs);
    say(`\n=== PLANO DA BASELINE · ${MODEL} · rodadas ${RUNS.join(", ")} ===`);
    say(
      `alvos rewrite: ${plan.targets.length} · alvos directed: ${plan.directedTargets.length} · casos da sonda: ${GOLDEN_SONDA.length}`,
    );
    for (const r of rows) {
      say(
        `${r.suite.padEnd(9)} chamadas=${r.calls} · prompt méd=${r.meanChars}c máx=${r.maxChars}c · ` +
          `entrada≈${r.inExpected} tok (conservador ${r.inConservative}) · ` +
          `US$ esperado=${r.usdExpected.toFixed(3)} alto=${r.usdHigh.toFixed(3)} pior=${r.usdWorst.toFixed(3)}`,
      );
    }
    const total = (k: "calls" | "inExpected" | "inConservative" | "usdExpected" | "usdHigh" | "usdWorst") =>
      rows.reduce((n, r) => n + r[k], 0);
    say(
      `TOTAL chamadas=${total("calls")} · entrada≈${total("inExpected")} tok (conservador ${total("inConservative")}) · ` +
        `US$ esperado=${total("usdExpected").toFixed(3)} alto=${total("usdHigh").toFixed(3)} pior teórico=${total("usdWorst").toFixed(3)}`,
    );
    say(
      `trava: para antes de qualquer chamada cujo pior caso leve o gasto acima de US$ ${STOP_AT_USD} (teto autorizado US$ ${CAP_USD})`,
    );
    expect(plan.jobs.length).toBeGreaterThan(0);
  });
});

describe.runIf(process.env.BASELINE_RUN === "1")("baseline 2.5 — execução (rede, paga)", () => {
  it(
    "roda as duas rodadas das três suítes com a trava de custo",
    async () => {
      const apiKey = loadKey("GEMINI_API_KEY");
      if (!apiKey) throw new Error("GEMINI_API_KEY ausente");
      const plan = buildPlan();
      const stamp = buildStamp(plan);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      if (fs.existsSync(STAMP)) {
        const recorded = JSON.parse(fs.readFileSync(STAMP, "utf8")) as Record<string, unknown>;
        for (const field of ["commit", "ruler", "model", "promptVersions"] as const) {
          if (JSON.stringify(recorded[field]) !== JSON.stringify(stamp[field])) {
            throw new Error(`o carimbo gravado diverge em '${field}': não misturo rodadas de estados diferentes`);
          }
        }
      } else {
        fs.writeFileSync(STAMP, `${JSON.stringify(stamp, null, 2)}\n`);
      }
      if (stamp.trackedTreeClean !== true)
        throw new Error("árvore com mudanças rastreadas: a fotografia não teria commit fiel");

      say(`\n=== BASELINE · ${plan.jobs.length} chamadas planejadas · trava US$ ${STOP_AT_USD} ===`);
      const outcome = await runBaseline(
        CALLS,
        plan.jobs,
        apiKey,
        { stopAtUsd: STOP_AT_USD, maxNewCalls: plan.jobs.length + 40 },
        say,
      );
      say(`\n${JSON.stringify(outcome, null, 2)}`);
      fs.writeFileSync(path.join(OUT_DIR, `outcome-${Date.now()}.json`), `${JSON.stringify(outcome, null, 2)}\n`);
      expect(outcome.spentUsd).toBeLessThanOrEqual(CAP_USD);
    },
    4 * 60 * 60 * 1000,
  );
});

describe.runIf(process.env.BASELINE_REPORT === "1")("baseline 2.5 — relatório (offline, zero chamadas)", () => {
  it(
    "pontua as respostas gravadas e escreve report.md e summary.json",
    async () => {
      const plan = buildPlan();
      await writeReport(OUT_DIR, CALLS, STAMP, plan, say);
      expect(fs.existsSync(path.join(OUT_DIR, "report.md"))).toBe(true);
    },
    30 * 60 * 1000,
  );
});
