import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { interpret } from "../../src/lucid/probe/interpret";
import { StubComprehensionProbe } from "../../src/lucid/probe/stub-probe";
import { LlmComprehensionProbe } from "../../src/lucid/probe/llm-probe";
import type { ComprehensionProbe } from "../../src/lucid/probe/types";
import { GeminiProvider, GroqProvider } from "../../src/llm";
import { GOLDEN_SONDA, oracleFixtures, oracleResult, type ProbeGoldenCase } from "./probe-golden";

const RUN_LIVE = process.env.PROBE_EVAL === "1";

interface Row {
  id: string;
  categoria: string;
  humanoTrava: boolean;
  sondaFlag: boolean;
  concorda: boolean;
}

interface Matrix {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  recall: number;
  precision: number;
  accuracy: number;
}

async function runAgreement(probe: ComprehensionProbe, golden: readonly ProbeGoldenCase[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const c of golden) {
    const result = await probe.probe({ trecho: c.trecho, pergunta: c.pergunta });
    const sondaFlag = interpret(result).tipo === "flag";
    rows.push({
      id: c.id,
      categoria: c.categoria,
      humanoTrava: c.humanoTrava,
      sondaFlag,
      concorda: sondaFlag === c.humanoTrava,
    });
  }
  return rows;
}

function score(rows: readonly Row[]): Matrix {
  const tp = rows.filter((r) => r.humanoTrava && r.sondaFlag).length;
  const fn = rows.filter((r) => r.humanoTrava && !r.sondaFlag).length;
  const fp = rows.filter((r) => !r.humanoTrava && r.sondaFlag).length;
  const tn = rows.filter((r) => !r.humanoTrava && !r.sondaFlag).length;
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const accuracy = rows.length === 0 ? 1 : (tp + tn) / rows.length;
  return { tp, fn, fp, tn, recall, precision, accuracy };
}

describe("probe meta-eval — golden + harness (offline)", () => {
  it("well-formed golden: unique ids, filled fields, BOTH classes present", () => {
    const ids = GOLDEN_SONDA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of GOLDEN_SONDA) {
      expect(c.trecho.trim().length).toBeGreaterThan(0);
      expect(c.pergunta.trim().length).toBeGreaterThan(0);
      expect(c.porque.trim().length).toBeGreaterThan(0);
      if (c.humanoTrava) expect(c.modoDeFalha).toBeDefined();
    }

    expect(GOLDEN_SONDA.some((c) => c.humanoTrava)).toBe(true);
    expect(GOLDEN_SONDA.some((c) => !c.humanoTrava)).toBe(true);
  });

  it("harness: ORACLE probe (the perfect floor derived from the labels) → 100% agreement", async () => {
    const oracle = new StubComprehensionProbe(oracleFixtures(), { id: "oracle@golden" });
    const rows = await runAgreement(oracle, GOLDEN_SONDA);
    const m = score(rows);
    expect(rows.every((r) => r.concorda)).toBe(true);
    expect(m.recall).toBe(1);
    expect(m.precision).toBe(1);
    expect(m.accuracy).toBe(1);
  });

  it("harness: probe that ALWAYS neutralizes → recall 0 on stalls (the worst case is detectable)", async () => {
    const alwaysNeutral = new StubComprehensionProbe(
      {},
      {
        id: "always-neutral@test",
        fallback: {
          podeResponder: true,
          respostaExtraida: "x",
          ondeTravou: [],
          operacoesDeLeitura: [],
          precisouInferir: false,
        },
      },
    );
    const rows = await runAgreement(alwaysNeutral, GOLDEN_SONDA);
    const m = score(rows);
    expect(m.tp).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.fp).toBe(0);
  });

  it("harness: probe that ALWAYS stalls → recall 1, precision = base rate (a pessimistic floor has a cost)", async () => {
    const alwaysFlag = new StubComprehensionProbe(
      {},
      {
        id: "always-flag@test",
        fallback: {
          podeResponder: false,
          respostaExtraida: "o texto não diz",
          ondeTravou: [],
          operacoesDeLeitura: [],
          precisouInferir: false,
        },
      },
    );
    const rows = await runAgreement(alwaysFlag, GOLDEN_SONDA);
    const m = score(rows);
    const travamentos = GOLDEN_SONDA.filter((c) => c.humanoTrava).length;
    expect(m.recall).toBe(1);
    expect(m.tp + m.fp).toBe(GOLDEN_SONDA.length);
    expect(m.precision).toBeCloseTo(travamentos / GOLDEN_SONDA.length);
  });

  it("label→interpret bridge: every golden failure mode becomes `flag`; every clear case becomes `neutro`", () => {
    for (const c of GOLDEN_SONDA) {
      const esperado = c.humanoTrava ? "flag" : "neutro";
      expect(interpret(oracleResult(c)).tipo).toBe(esperado);
    }
  });
});

function loadKey(name: string): string | null {
  if (process.env[name]) return process.env[name] ?? null;
  try {
    const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${name}=(.+)$`, "m"));
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function buildLiveProbe(): LlmComprehensionProbe {
  const groq = loadKey("GROQ_API_KEY");
  const gemini = loadKey("GEMINI_API_KEY");
  const override = process.env.PROBE_EVAL_MODEL?.trim();
  if (override) {
    if (override.startsWith("gemini-")) {
      if (!gemini) throw new Error(`GEMINI_API_KEY ausente para ${override}`);
      return new LlmComprehensionProbe(new GeminiProvider(gemini), override);
    }
    if (!groq) throw new Error(`GROQ_API_KEY ausente para ${override}`);
    return new LlmComprehensionProbe(new GroqProvider(groq), override);
  }
  if (groq) return new LlmComprehensionProbe(new GroqProvider(groq), "openai/gpt-oss-120b");
  if (gemini) return new LlmComprehensionProbe(new GeminiProvider(gemini), "gemini-2.5-flash");
  throw new Error("nenhuma chave (GROQ_API_KEY / GEMINI_API_KEY) — exporte ou ponha no .env");
}

describe.runIf(RUN_LIVE)("meta-eval da sonda — ao vivo (rede)", () => {
  it("the real probe stalls where the human stalled (confusion matrix + recall floor)", async () => {
    const probe = buildLiveProbe();
    const rows = await runAgreement(probe, GOLDEN_SONDA);
    const m = score(rows);

    const lines: string[] = [];
    lines.push(`\n=== META-EVAL DA SONDA (${GOLDEN_SONDA.length} trechos) · sonda=${probe.id} ===`);
    lines.push(
      `agreement=${(m.accuracy * 100).toFixed(0)}% · recall(stalls)=${(m.recall * 100).toFixed(0)}% · precision=${(m.precision * 100).toFixed(0)}%`,
    );
    lines.push(`matriz: TP=${m.tp} FN=${m.fn} FP=${m.fp} TN=${m.tn}`);

    const categorias = [...new Set(rows.map((r) => r.categoria))].sort();
    lines.push("\npor categoria:");
    for (const cat of categorias) {
      const sub = rows.filter((r) => r.categoria === cat);
      const concordantes = sub.filter((r) => r.concorda).length;
      lines.push(`  ${cat}: ${concordantes}/${sub.length} concordam`);
    }

    for (const r of rows) {
      const mark = r.concorda ? "ok " : "XX ";
      lines.push(
        `  ${mark}[${r.categoria}] ${r.id}: human=${r.humanoTrava ? "stalls" : "reads"} · probe=${r.sondaFlag ? "flag" : "neutro"}`,
      );
    }
    lines.push(
      "\nHonest caveat (I5): small golden, 1 run, temperature 0. Agreement is a floor signal, not a scoreboard. " +
        "Passing is NEVER approval of comprehension — only the absence of a floor violation.",
    );
    process.stdout.write(`${lines.join("\n")}\n\n`);
    if (process.env.PROBE_EVAL_OUT) fs.writeFileSync(process.env.PROBE_EVAL_OUT, `${lines.join("\n")}\n`);

    expect(m.recall).toBeGreaterThanOrEqual(0.6);
    expect(m.precision).toBeGreaterThanOrEqual(0.7);
  }, 600_000);
});
