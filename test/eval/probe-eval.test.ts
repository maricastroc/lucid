/**
 * META-EVAL da sonda de compreensão (Camada 2) — CLAUDE.md, "Disciplina de eval":
 * "Meta-eval da sonda: a sonda tem que travar onde os humanos travaram. Medir concordância com os
 * rótulos. Prompt e modelo versionados; regressão quebra o build."
 *
 * Duas camadas, como o benchmark de reescrita:
 *  - CI (offline, sempre roda): prova que o GOLDEN é bem-formado, que o HARNESS de concordância
 *    computa a matriz certa (com sondas-oráculo controladas), e que a ponte rótulo→`interpret`
 *    mapeia os dois modos de falha para `flag`. Não mede a sonda real (sem rede na CI).
 *  - Ao vivo (`PROBE_EVAL=1`, fora da CI): roda a sonda LLM REAL sobre o golden, imprime a matriz de
 *    confusão + concordância, e TRAVA um piso de recall nos travamentos — a sonda tem que pegar onde
 *    o humano travou. Modelo/prompt versionados no `id` da sonda (anti-drift), impresso no relatório.
 *
 * Eixos medidos (classe positiva = "travar", isto é, `interpret` → `flag`):
 *  - recall  = travamentos humanos que a sonda pegou  (o que MAIS importa: um miss é a sonda falhando)
 *  - precision = flags da sonda que eram travamentos de verdade (piso pessimista tolera FP; medimos)
 */
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
    rows.push({ id: c.id, categoria: c.categoria, humanoTrava: c.humanoTrava, sondaFlag, concorda: sondaFlag === c.humanoTrava });
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

/* ============================ CAMADA CI (offline, determinística) ============================ */

describe("meta-eval da sonda — golden + harness (offline)", () => {
  it("golden bem-formado: ids únicos, campos preenchidos, DUAS classes presentes", () => {
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

  it("harness: sonda-ORÁCULO (o piso perfeito derivado dos rótulos) → 100% de concordância", async () => {
    const oracle = new StubComprehensionProbe(oracleFixtures(), { id: "oracle@golden" });
    const rows = await runAgreement(oracle, GOLDEN_SONDA);
    const m = score(rows);
    expect(rows.every((r) => r.concorda)).toBe(true);
    expect(m.recall).toBe(1);
    expect(m.precision).toBe(1);
    expect(m.accuracy).toBe(1);
  });

  it("harness: sonda que SEMPRE neutraliza → recall 0 nos travamentos (o pior caso é detectável)", async () => {
    const alwaysNeutral = new StubComprehensionProbe(
      {},
      {
        id: "always-neutral@test",
        fallback: { podeResponder: true, respostaExtraida: "x", ondeTravou: [], operacoesDeLeitura: [], precisouInferir: false },
      },
    );
    const rows = await runAgreement(alwaysNeutral, GOLDEN_SONDA);
    const m = score(rows);
    expect(m.tp).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.fp).toBe(0);
  });

  it("harness: sonda que SEMPRE trava → recall 1, precisão = taxa-base (piso pessimista tem custo)", async () => {
    const alwaysFlag = new StubComprehensionProbe(
      {},
      { id: "always-flag@test", fallback: { podeResponder: false, respostaExtraida: "o texto não diz", ondeTravou: [], operacoesDeLeitura: [], precisouInferir: false } },
    );
    const rows = await runAgreement(alwaysFlag, GOLDEN_SONDA);
    const m = score(rows);
    const travamentos = GOLDEN_SONDA.filter((c) => c.humanoTrava).length;
    expect(m.recall).toBe(1);
    expect(m.tp + m.fp).toBe(GOLDEN_SONDA.length);
    expect(m.precision).toBeCloseTo(travamentos / GOLDEN_SONDA.length);
  });

  it("ponte rótulo→interpret: cada modo de falha do golden vira `flag`; cada caso claro vira `neutro`", () => {
    for (const c of GOLDEN_SONDA) {
      const esperado = c.humanoTrava ? "flag" : "neutro";
      expect(interpret(oracleResult(c)).tipo).toBe(esperado);
    }
  });
});

/* ============================ CAMADA AO VIVO (rede — fora da CI) ============================== */

function loadKey(name: string): string | null {
  if (process.env[name]) return process.env[name] ?? null;
  try {
    const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${name}=(.+)$`, "m"));
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Constrói a sonda REAL. Modelo escolhível por `PROBE_EVAL_MODEL` (provider inferido do id: nomes
 * `gemini-*` → Gemini; o resto → Groq). Sem override: modelo grátis default (Groq 8B, ou Gemini flash
 * se só houver essa chave). A sonda roda num modelo BARATO de propósito — não é o sistema sob teste.
 */
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
  if (groq) return new LlmComprehensionProbe(new GroqProvider(groq), "llama-3.1-8b-instant");
  if (gemini) return new LlmComprehensionProbe(new GeminiProvider(gemini), "gemini-2.5-flash");
  throw new Error("nenhuma chave (GROQ_API_KEY / GEMINI_API_KEY) — exporte ou ponha no .env");
}

describe.runIf(RUN_LIVE)("meta-eval da sonda — ao vivo (rede)", () => {
  it(
    "a sonda real trava onde o humano travou (matriz de confusão + piso de recall)",
    async () => {
      const probe = buildLiveProbe();
      const rows = await runAgreement(probe, GOLDEN_SONDA);
      const m = score(rows);

      const linhas: string[] = [];
      linhas.push(`\n=== META-EVAL DA SONDA (${GOLDEN_SONDA.length} trechos) · sonda=${probe.id} ===`);
      linhas.push(`concordância=${(m.accuracy * 100).toFixed(0)}% · recall(travamentos)=${(m.recall * 100).toFixed(0)}% · precisão=${(m.precision * 100).toFixed(0)}%`);
      linhas.push(`matriz: TP=${m.tp} FN=${m.fn} FP=${m.fp} TN=${m.tn}`);
      for (const r of rows) {
        const marca = r.concorda ? "ok " : "XX ";
        linhas.push(`  ${marca}[${r.categoria}] ${r.id}: humano=${r.humanoTrava ? "trava" : "lê"} · sonda=${r.sondaFlag ? "flag" : "neutro"}`);
      }
      linhas.push(
        "\nRessalva honesta (I5): golden pequeno, 1 corrida, temperature 0. Concordância é sinal de piso, não placar. " +
          "Passar NUNCA é aprovação de compreensão — só ausência de violação de piso.",
      );
      process.stdout.write(`${linhas.join("\n")}\n\n`);
      if (process.env.PROBE_EVAL_OUT) fs.writeFileSync(process.env.PROBE_EVAL_OUT, `${linhas.join("\n")}\n`);

      expect(m.recall).toBeGreaterThanOrEqual(0.6);
    },
    600_000,
  );
});
