import { describe, expect, it } from "vitest";
import { CRITERION_IDS } from "../../src/lucid";
import { dataHashFor, REGISTRY } from "../../src/locales/pt-BR/datasets/registry";
import type { DatasetId } from "../../src/locales/pt-BR/datasets/registry";
import {
  buildEvalArtifact,
  criteriaCoverage,
  DETECTOR_EVALUATORS,
  formatRate,
  hashGoldens,
  scoreCounts,
  serializeEvalArtifact,
  summarize,
} from "./compute";
import { EVAL_SCHEMA_VERSION } from "../../src/report/eval/contract";
import { GOLDEN_JARGAO } from "./jargon-golden";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";
import { GOLDEN_SILABAS } from "./silabas-golden";
import { GOLDEN_INTEGRADO } from "../golden/integrated-golden";

/**
 * Invariantes do artefato — SEM flag, roda no CI.
 *
 * O que este arquivo protege não é o valor dos números (isso é trabalho dos evals), e sim
 * as propriedades que fazem o artefato publicável: estampa presente, nenhum critério
 * sumindo em silêncio, limitação conhecida contando contra a métrica, e determinismo.
 */
describe("artefato de eval — invariantes de publicação", () => {
  const artifact = buildEvalArtifact();

  it("carrega a estampa completa: sem ela o número é alegação, não medida", () => {
    const { stamp } = artifact;
    expect(stamp.lucidVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(stamp.localeId).toBe("pt-BR");
    expect(stamp.standardVersion).toBe("ABNT NBR ISO 24495-1:2024");
    expect(stamp.configHash.length).toBeGreaterThan(0);
    expect(stamp.dataHash.length).toBeGreaterThan(0);
    expect(stamp.goldenHash.length).toBeGreaterThan(0);
  });

  it("o goldenHash muda quando o corpus muda — a medição depende do golden, não só do motor", () => {
    const base = hashGoldens();
    const comEntradaNova = hashGoldens({
      jargon: [...GOLDEN_JARGAO, { texto: "entrada sintética", expectedCount: 1 }],
      nominalization: GOLDEN_NOMINALIZACAO,
      passiveVoice: GOLDEN_VOZ_PASSIVA,
      syllables: GOLDEN_SILABAS,
      integrated: GOLDEN_INTEGRADO,
    });

    expect(base).toBe(artifact.stamp.goldenHash);
    expect(comEntradaNova).not.toBe(base);
  });

  it("a estampa de dado cobre TODOS os datasets, não só os usados pelos evals", () => {
    const todos = Object.keys(REGISTRY).sort() as DatasetId[];
    expect(artifact.stamp.dataHash).toBe(dataHashFor(todos));
    expect(todos.length).toBeGreaterThan(20);
  });

  it("todo critério da engine aparece em exatamente UMA camada de cobertura", () => {
    const { measured, goldenLabelledOnly, unitTestsOnly } = artifact.criteriaCoverage;
    const todos = [...measured, ...goldenLabelledOnly, ...unitTestsOnly];

    expect(todos.length).toBe(CRITERION_IDS.length);
    expect(new Set(todos).size).toBe(CRITERION_IDS.length);
    expect([...todos].sort()).toEqual([...CRITERION_IDS].sort());
  });

  it("a cobertura é DERIVADA das entradas — provado com universo sintético, não com lista fixa", () => {
    const cobertura = criteriaCoverage({
      criterionIds: ["com_eval", "so_rotulado", "so_unitario", "eval_e_rotulado"],
      evaluated: ["com_eval", "eval_e_rotulado"],
      labelled: ["so_rotulado", "eval_e_rotulado"],
    });

    expect(cobertura.measured).toEqual(["com_eval", "eval_e_rotulado"]);
    expect(cobertura.goldenLabelledOnly).toEqual(["so_rotulado"]);
    expect(cobertura.unitTestsOnly).toEqual(["so_unitario"]);
  });

  it("critério novo sem avaliador registrado aparece como NÃO medido (fail-safe)", () => {
    const real = artifact.criteriaCoverage;
    const comCriterioNovo = criteriaCoverage({
      criterionIds: [...CRITERION_IDS, "criterio_recem_criado"],
      evaluated: real.measured,
      labelled: real.goldenLabelledOnly,
    });

    expect(comCriterioNovo.unitTestsOnly).toContain("criterio_recem_criado");
    expect(comCriterioNovo.measured).not.toContain("criterio_recem_criado");
  });

  it("os critérios medidos vêm do REGISTRO de avaliadores, não de uma segunda lista", () => {
    expect(artifact.criteriaCoverage.measured).toEqual(
      CRITERION_IDS.filter((c) => DETECTOR_EVALUATORS.some((e) => e.criterion === c)),
    );
  });

  it("ORDEM CANÔNICA única: `detectors` e `measured` listam os mesmos critérios na mesma ordem", () => {
    expect(artifact.detectors.map((d) => d.criterion)).toEqual([...artifact.criteriaCoverage.measured]);
    const ranks = artifact.detectors.map((d) => (CRITERION_IDS as readonly string[]).indexOf(d.criterion));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("cada detector declara cobertura léxica, casos negativos e limitações conhecidas", () => {
    expect(artifact.detectors.length).toBeGreaterThan(0);
    for (const d of artifact.detectors) {
      expect(["curated", "productive"]).toContain(d.coverage);
      expect(d.summary.negatives, `${d.criterion} sem casos negativos`).toBeGreaterThan(0);
      for (const taxa of [d.summary.precision, d.summary.recall]) {
        expect(taxa, `${d.criterion} sem denominador`).not.toBeNull();
        expect(taxa!).toBeGreaterThan(0);
        expect(taxa!).toBeLessThanOrEqual(1);
      }
      for (const lim of d.knownLimitations) {
        expect(lim.motivo, `limitação sem motivo em ${d.criterion}`).not.toBe("");
      }
    }
  });

  it("sem denominador o valor é null, NUNCA 1 — não se fabrica 100% (coerência com ADR-066)", () => {
    const vazio = summarize([]);
    expect(vazio.precision).toBeNull();
    expect(vazio.recall).toBeNull();
    expect(vazio.cases).toBe(0);

    const soNegativos = summarize([
      { texto: "a", expectedCount: 0, actualCount: 0, estado: "correto", tp: 0, fp: 0, fn: 0 },
    ]);
    expect(soNegativos.precision).toBeNull();
    expect(soNegativos.recall).toBeNull();

    const umFP = summarize([
      { texto: "b", expectedCount: 0, actualCount: 1, estado: "correto", tp: 0, fp: 1, fn: 0 },
    ]);
    expect(umFP.precision).toBe(0);
    expect(umFP.recall).toBeNull();

    expect(formatRate(null)).toBe("—");
    expect(formatRate(0.9628)).toBe("96.3%");
  });

  it("o artefato declara schemaVersion — o consumidor externo não quebra em silêncio", () => {
    expect(artifact.schemaVersion).toBe(EVAL_SCHEMA_VERSION);
    expect(Number.isInteger(artifact.schemaVersion)).toBe(true);
    expect(artifact.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(Object.keys(artifact)[0]).toBe("schemaVersion");
  });

  it("limitação conhecida NÃO é excluída da métrica — a precisão publicada é a honesta", () => {
    const comLimitacao = artifact.detectors.filter((d) => d.knownLimitations.length > 0);
    expect(comLimitacao.length).toBeGreaterThan(0);
    expect(comLimitacao.some((d) => d.summary.fp + d.summary.fn > 0)).toBe(true);

    for (const d of artifact.detectors) {
      expect(d.knownLimitations.length, `${d.criterion}: lista ≠ contador`).toBe(d.summary.limitations);
    }
  });

  it("REGRESSÃO é categoria separada de limitação, e em build verde está vazia", () => {
    for (const d of artifact.detectors) {
      expect(d.regressions, `${d.criterion} tem falha NÃO declarada`).toEqual([]);
    }
  });

  it("os caveats viajam identificados por id — o teste pina o id, não a redação", () => {
    const ids = artifact.method.caveats.map((c) => c.id);
    expect(artifact.method.scoring).toBe("count-per-passage");
    expect(ids).toEqual([
      "count_scoring",
      "circular_recall_curated",
      "known_limitations_counted",
      "unmeasured_criteria",
      "no_layer_2",
    ]);

    for (const c of artifact.method.caveats) {
      expect(c.text.length, `caveat ${c.id} sem texto`).toBeGreaterThan(40);
    }

    expect(ids).toContain("circular_recall_curated");
  });

  it("determinístico: duas construções produzem serialização byte-idêntica", () => {
    expect(serializeEvalArtifact(buildEvalArtifact())).toBe(serializeEvalArtifact(buildEvalArtifact()));
  });

  it("sem timestamp: a identidade da rodada é a tripla (versão, config, dado)", () => {
    const json = serializeEvalArtifact(artifact);
    expect(json).not.toMatch(/generatedAt|timestamp/i);
    expect(json).not.toMatch(/20\d\d-\d\d-\d\dT/);
  });

  it("a convenção de pontuação é a mesma dos evals (contagem por trecho)", () => {
    expect(scoreCounts(1, 1)).toEqual({ tp: 1, fp: 0, fn: 0 });
    expect(scoreCounts(0, 2)).toEqual({ tp: 0, fp: 2, fn: 0 });
    expect(scoreCounts(2, 0)).toEqual({ tp: 0, fp: 0, fn: 2 });
    expect(scoreCounts(1, 2)).toEqual({ tp: 1, fp: 1, fn: 0 });
  });
});
