import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { buildScore } from "../src/lucid/core/score";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import type { Config } from "../src/lucid/core/config";
import type { Finding } from "../src/lucid/core/types";

const TEXT_4 =
  "É preciso fazer a verificação do relatório supramencionado, que foi assinado pelo gestor " +
  "responsável, doravante, antes do prazo final estabelecido no edital publicado.";

describe("score — shape and bounds", () => {
  it("always exposes the registered criteria, even with no findings", () => {
    const d = analyze("O gato dorme.");
    expect(d.score.byCriterion.map((c) => c.criterion)).toEqual([
      "long_sentence",
      "passive_voice",
      "passiva_sintetica",
      "nominalization",
      "nominalizacao_encadeada",
      "jargon",
      "sigla_sem_expansao",
      "mais_que_perfeito_sintetico",
      "gerundismo",
      "adverbio_mente_denso",
      "adverbios_vagos",
      "redundancia",
      "perifrase_inflada",
      "paragraph_length",
      "prose_enumeration",
      "mesoclise",
      "dupla_negacao",
      "subordinacao_densa",
      "leitor_terceira_pessoa",
      "salto_de_nivel_titulo",
      "long_heading",
      "single_item_list",
      "heading_body_mismatch",
    ]);
    for (const c of d.score.byCriterion) {
      expect(c.count).toEqual({ info: 0, warning: 0, error: 0 });
      expect(c.densityPer100Words).toBe(0);
    }
  });

  it("counts and density are never negative; totalFindings = sum of the counts", () => {
    const d = analyze(TEXT_4);
    let sum = 0;
    for (const c of d.score.byCriterion) {
      expect(c.count.info).toBeGreaterThanOrEqual(0);
      expect(c.count.warning).toBeGreaterThanOrEqual(0);
      expect(c.count.error).toBeGreaterThanOrEqual(0);
      expect(c.densityPer100Words).toBeGreaterThanOrEqual(0);
      sum += c.count.info + c.count.warning + c.count.error;
    }
    expect(d.score.totalFindings).toBe(sum);
    expect(d.score.totalFindings).toBe(d.findings.length);
  });

  it("there is no approval/certification/guarantee vocabulary anywhere in the score", () => {
    const json = JSON.stringify(analyze(TEXT_4).score).toLowerCase();
    for (const forbidden of ["aprovad", "approved", "certific", "garant", "selo", '"ok"', "passou"]) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe("score — order independence and no double counting", () => {
  it("shuffling the findings does not change the score (buildScore directly)", () => {
    const d = analyze(TEXT_4);
    const inOrder = buildScore(d.findings, PASSES, d.metrics.words, DEFAULT_CONFIG);
    const reversed = buildScore([...d.findings].reverse(), PASSES, d.metrics.words, DEFAULT_CONFIG);
    expect(reversed).toEqual(inOrder);
    expect(reversed).toEqual(d.score);
  });

  it("each finding is counted exactly once, even with overlapping spans", () => {
    const d = analyze(TEXT_4);
    expect(d.findings).toHaveLength(5);
    expect(d.score.totalFindings).toBe(5);
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    expect(jargon.count.warning).toBe(2);
  });
});

describe("score — disabled criteria", () => {
  it("disabling a pass zeroes its criterion in the scorecard, but the criterion stays listed", () => {
    const config: Partial<Config> = { jargon: { enabled: false, suggestFromGlossary: true } };
    const d = analyze(TEXT_4, config);
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    expect(jargon).toBeDefined();
    expect(jargon.count).toEqual({ info: 0, warning: 0, error: 0 });
    expect(d.findings.some((f) => f.criterion === "jargon")).toBe(false);
  });

  it("disabling the informative jargon equivalent does not change the score COUNTS (a suggestion is not counted)", () => {
    const withSuggestion = analyze(TEXT_4);
    const withoutSuggestion = analyze(TEXT_4, {
      jargon: { enabled: true, suggestFromGlossary: false },
    });

    const counts = (findings: readonly Finding[]) =>
      buildScore(findings, PASSES, withSuggestion.metrics.words, DEFAULT_CONFIG).byCriterion.map((c) => c.count);
    expect(counts(withoutSuggestion.findings)).toEqual(counts(withSuggestion.findings));
  });
});

describe("score — derivation: metrics vs findings", () => {
  it("changing the sentence threshold (a counting metric) changes the score without touching the other criteria", () => {
    const base = analyze(TEXT_4);
    const withError = analyze(TEXT_4, { sentenceLength: { warnAbove: 5, errorAbove: 10 } });
    const longBase = base.score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    const longError = withError.score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    expect(longBase.count).toEqual({ info: 0, warning: 1, error: 0 });
    expect(longError.count).toEqual({ info: 0, warning: 0, error: 1 });

    for (const criterion of ["passive_voice", "nominalization", "jargon"] as const) {
      const a = base.score.byCriterion.find((c) => c.criterion === criterion)!;
      const b = withError.score.byCriterion.find((c) => c.criterion === criterion)!;
      expect(b.count).toEqual(a.count);
    }
  });

  it("density is findings-per-100-words, derived from the word count in the metrics", () => {
    const d = analyze("O documento supracitado vale.");
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    expect(jargon.count.warning).toBe(1);
    expect(jargon.densityPer100Words).toBe(25);
  });
});

describe("score — empty and very short text", () => {
  it("empty text: criteria zeroed, density 0 (no division by zero)", () => {
    const d = analyze("");
    expect(d.score.totalFindings).toBe(0);
    expect(d.score.byCriterion).toHaveLength(23);
    for (const c of d.score.byCriterion) {
      expect(c.count).toEqual({ info: 0, warning: 0, error: 0 });
      expect(c.densityPer100Words).toBe(0);
      expect(Number.isFinite(c.densityPer100Words)).toBe(true);
    }
  });

  it("text with only spaces: identical to empty in the score", () => {
    expect(analyze("     ").score).toEqual(analyze("").score);
  });

  it("very short text with no finding: density 0, counts 0", () => {
    const d = analyze("Oi.");
    expect(d.score.totalFindings).toBe(0);
    for (const c of d.score.byCriterion) expect(c.densityPer100Words).toBe(0);
  });
});

describe("score — stability", () => {
  it("the same input produces a deeply equal score", () => {
    expect(analyze(TEXT_4).score).toEqual(analyze(TEXT_4).score);
  });
});
