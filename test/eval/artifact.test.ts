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

describe("eval artifact — publication invariants", () => {
  const artifact = buildEvalArtifact();

  it("carries the complete stamp: without it the number is a claim, not a measurement", () => {
    const { stamp } = artifact;
    expect(stamp.lucidVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(stamp.localeId).toBe("pt-BR");
    expect(stamp.standardVersion).toBe("ABNT NBR ISO 24495-1:2024");
    expect(stamp.configHash.length).toBeGreaterThan(0);
    expect(stamp.dataHash.length).toBeGreaterThan(0);
    expect(stamp.goldenHash.length).toBeGreaterThan(0);
  });

  it("goldenHash changes when the corpus changes — measurement depends on the golden, not only on the engine", () => {
    const base = hashGoldens();
    const withExtraEntry = hashGoldens({
      jargon: [...GOLDEN_JARGAO, { texto: "synthetic entry", expectedCount: 1 }],
      nominalization: GOLDEN_NOMINALIZACAO,
      passiveVoice: GOLDEN_VOZ_PASSIVA,
      syllables: GOLDEN_SILABAS,
      integrated: GOLDEN_INTEGRADO,
    });

    expect(base).toBe(artifact.stamp.goldenHash);
    expect(withExtraEntry).not.toBe(base);
  });

  it("the data stamp covers ALL datasets, not only those used by the evals", () => {
    const all = Object.keys(REGISTRY).sort() as DatasetId[];
    expect(artifact.stamp.dataHash).toBe(dataHashFor(all));
    expect(all.length).toBeGreaterThan(20);
  });

  it("every engine criterion appears in exactly ONE coverage layer", () => {
    const { measured, goldenLabelledOnly, unitTestsOnly } = artifact.criteriaCoverage;
    const all = [...measured, ...goldenLabelledOnly, ...unitTestsOnly];

    expect(all.length).toBe(CRITERION_IDS.length);
    expect(new Set(all).size).toBe(CRITERION_IDS.length);
    expect([...all].sort()).toEqual([...CRITERION_IDS].sort());
  });

  it("coverage is DERIVED from the inputs — proven with a synthetic universe, not a fixed list", () => {
    const coverage = criteriaCoverage({
      criterionIds: ["com_eval", "so_rotulado", "so_unitario", "eval_e_rotulado"],
      evaluated: ["com_eval", "eval_e_rotulado"],
      labelled: ["so_rotulado", "eval_e_rotulado"],
    });

    expect(coverage.measured).toEqual(["com_eval", "eval_e_rotulado"]);
    expect(coverage.goldenLabelledOnly).toEqual(["so_rotulado"]);
    expect(coverage.unitTestsOnly).toEqual(["so_unitario"]);
  });

  it("a new criterion with no registered evaluator shows up as NOT measured (fail-safe)", () => {
    const actual = artifact.criteriaCoverage;
    const withNewCriterion = criteriaCoverage({
      criterionIds: [...CRITERION_IDS, "criterio_recem_criado"],
      evaluated: actual.measured,
      labelled: actual.goldenLabelledOnly,
    });

    expect(withNewCriterion.unitTestsOnly).toContain("criterio_recem_criado");
    expect(withNewCriterion.measured).not.toContain("criterio_recem_criado");
  });

  it("measured criteria come from the evaluator REGISTRY, not from a second list", () => {
    expect(artifact.criteriaCoverage.measured).toEqual(
      CRITERION_IDS.filter((c) => DETECTOR_EVALUATORS.some((e) => e.criterion === c)),
    );
  });

  it("single CANONICAL ORDER: `detectors` and `measured` list the same criteria in the same order", () => {
    expect(artifact.detectors.map((d) => d.criterion)).toEqual([...artifact.criteriaCoverage.measured]);
    const ranks = artifact.detectors.map((d) => (CRITERION_IDS as readonly string[]).indexOf(d.criterion));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("every detector declares lexical coverage, negative cases and known limitations", () => {
    expect(artifact.detectors.length).toBeGreaterThan(0);
    for (const d of artifact.detectors) {
      expect(["curated", "productive"]).toContain(d.coverage);
      expect(d.summary.negatives, `${d.criterion} has no negative cases`).toBeGreaterThan(0);
      for (const rateValue of [d.summary.precision, d.summary.recall]) {
        expect(rateValue, `${d.criterion} has no denominator`).not.toBeNull();
        expect(rateValue!).toBeGreaterThan(0);
        expect(rateValue!).toBeLessThanOrEqual(1);
      }
      for (const lim of d.knownLimitations) {
        expect(lim.motivo, `limitation without motivo in ${d.criterion}`).not.toBe("");
      }
    }
  });

  it("with no denominator the value is null, NEVER 1 — 100% is not fabricated (consistent with ADR-066)", () => {
    const empty = summarize([]);
    expect(empty.precision).toBeNull();
    expect(empty.recall).toBeNull();
    expect(empty.cases).toBe(0);

    const negativesOnly = summarize([
      { texto: "a", expectedCount: 0, actualCount: 0, estado: "correto", tp: 0, fp: 0, fn: 0 },
    ]);
    expect(negativesOnly.precision).toBeNull();
    expect(negativesOnly.recall).toBeNull();

    const oneFP = summarize([
      { texto: "b", expectedCount: 0, actualCount: 1, estado: "correto", tp: 0, fp: 1, fn: 0 },
    ]);
    expect(oneFP.precision).toBe(0);
    expect(oneFP.recall).toBeNull();

    expect(formatRate(null)).toBe("—");
    expect(formatRate(0.9628)).toBe("96.3%");
  });

  it("the artifact declares schemaVersion — the external consumer does not break silently", () => {
    expect(artifact.schemaVersion).toBe(EVAL_SCHEMA_VERSION);
    expect(Number.isInteger(artifact.schemaVersion)).toBe(true);
    expect(artifact.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(Object.keys(artifact)[0]).toBe("schemaVersion");
  });

  it("a known limitation is NOT excluded from the metric — the published precision is the honest one", () => {
    const withLimitation = artifact.detectors.filter((d) => d.knownLimitations.length > 0);
    expect(withLimitation.length).toBeGreaterThan(0);
    expect(withLimitation.some((d) => d.summary.fp + d.summary.fn > 0)).toBe(true);

    for (const d of artifact.detectors) {
      expect(d.knownLimitations.length, `${d.criterion}: list ≠ counter`).toBe(d.summary.limitations);
    }
  });

  it("REGRESSION is a category separate from limitation, and it is empty on a green build", () => {
    for (const d of artifact.detectors) {
      expect(d.regressions, `${d.criterion} has an UNDECLARED failure`).toEqual([]);
    }
  });

  it("caveats travel identified by id — the test pins the id, not the wording", () => {
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
      expect(c.text.length, `caveat ${c.id} has no text`).toBeGreaterThan(40);
    }

    expect(ids).toContain("circular_recall_curated");
  });

  it("deterministic: two builds produce byte-identical serialization", () => {
    expect(serializeEvalArtifact(buildEvalArtifact())).toBe(serializeEvalArtifact(buildEvalArtifact()));
  });

  it("no timestamp: the run identity is the triple (version, config, data)", () => {
    const json = serializeEvalArtifact(artifact);
    expect(json).not.toMatch(/generatedAt|timestamp/i);
    expect(json).not.toMatch(/20\d\d-\d\d-\d\dT/);
  });

  it("the scoring convention is the same as the evals' (count per passage)", () => {
    expect(scoreCounts(1, 1)).toEqual({ tp: 1, fp: 0, fn: 0 });
    expect(scoreCounts(0, 2)).toEqual({ tp: 0, fp: 2, fn: 0 });
    expect(scoreCounts(2, 0)).toEqual({ tp: 0, fp: 0, fn: 2 });
    expect(scoreCounts(1, 2)).toEqual({ tp: 1, fp: 1, fn: 0 });
  });
});
