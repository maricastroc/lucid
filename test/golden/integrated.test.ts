import { describe, expect, it } from "vitest";
import { analyze } from "../../src/lucid";
import type { Diagnostic, Finding } from "../../src/lucid/core/types";
import { GOLDEN_INTEGRADO } from "./integrated-golden";
import type { ExpectedFinding, GoldenCase, IntegratedCriterion } from "./integrated-golden";

const CRITERIA: readonly IntegratedCriterion[] = [
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
];

function findActual(diagnostic: Diagnostic, expected: ExpectedFinding): Finding | undefined {
  return diagnostic.findings.find(
    (f) => f.criterion === expected.criterion && f.span.start === expected.start && f.span.end === expected.end,
  );
}

describe("integrated golden — semantic assertions per case", () => {
  describe.each(GOLDEN_INTEGRADO)("$id — $description", (testCase: GoldenCase) => {
    const diagnostic = analyze(testCase.text);

    it("produces exactly the expected findings (total count)", () => {
      expect(diagnostic.findings).toHaveLength(testCase.expected.findings.length);
    });

    it("every expected finding exists with complete and correct provenance", () => {
      for (const expected of testCase.expected.findings) {
        const actual = findActual(diagnostic, expected);
        expect(
          actual,
          `missing finding: ${expected.criterion} @[${expected.start},${expected.end}] "${expected.spanText}"`,
        ).toBeDefined();
        if (!actual) continue;

        expect(actual.span.text).toBe(expected.spanText);
        expect(actual.severity).toBe(expected.severity);
        expect(actual.requiresHuman).toBe(expected.requiresHuman);
        expect(actual.suggestion).toBe(expected.suggestion);
        expect(actual.source).toBeDefined();
        expect(actual.normativeReference !== undefined).toBe(actual.source === "iso-24495-1");
        expect(actual.category).toBeDefined();
        expect(actual.justification.length).toBeGreaterThan(0);
        expect(diagnostic.text.slice(actual.span.start, actual.span.end)).toBe(actual.span.text);
      }
    });

    it("no unexpected finding shows up (no false positive)", () => {
      for (const actual of diagnostic.findings) {
        const predicted = testCase.expected.findings.some(
          (e) => e.criterion === actual.criterion && e.start === actual.span.start && e.end === actual.span.end,
        );
        expect(
          predicted,
          `unexpected finding: ${actual.criterion} @[${actual.span.start},${actual.span.end}] "${actual.span.text}"`,
        ).toBe(true);
      }
    });

    it("the main metrics check out", () => {
      expect(diagnostic.metrics.words).toBe(testCase.expected.metrics.words);
      expect(diagnostic.metrics.sentences).toBe(testCase.expected.metrics.sentences);
    });

    it("the score is coherent with the findings (derived counts, 4 criteria, no approval)", () => {
      expect(diagnostic.score.byCriterion).toHaveLength(CRITERIA.length);
      expect(diagnostic.score.totalFindings).toBe(diagnostic.findings.length);

      for (const criterion of CRITERIA) {
        const entry = diagnostic.score.byCriterion.find((c) => c.criterion === criterion);
        expect(entry, `criterion missing from the scorecard: ${criterion}`).toBeDefined();
        const expectedForCriterion = diagnostic.findings.filter((f) => f.criterion === criterion);
        const countSum = entry!.count.info + entry!.count.warning + entry!.count.error;
        expect(countSum).toBe(expectedForCriterion.length);
      }

      const json = JSON.stringify(diagnostic.score).toLowerCase();
      expect(json).not.toContain("aprovad");
      expect(json).not.toContain("approved");
    });
  });
});

describe("integrated golden — integrated summary (global and per-criterion metrics)", () => {
  interface Acc {
    tp: number;
    fp: number;
    fn: number;
    suggestionsEmitted: number;
    suggestionsCorrect: number;
    suggestionsUnsafe: number;
  }
  const zero = (): Acc => ({ tp: 0, fp: 0, fn: 0, suggestionsEmitted: 0, suggestionsCorrect: 0, suggestionsUnsafe: 0 });

  const global = zero();
  const byCriterion: Record<IntegratedCriterion, Acc> = {
    long_sentence: zero(),
    passive_voice: zero(),
    passiva_sintetica: zero(),
    nominalization: zero(),
    nominalizacao_encadeada: zero(),
    jargon: zero(),
    sigla_sem_expansao: zero(),
    mais_que_perfeito_sintetico: zero(),
    gerundismo: zero(),
    adverbio_mente_denso: zero(),
    adverbios_vagos: zero(),
    redundancia: zero(),
    perifrase_inflada: zero(),
    paragraph_length: zero(),
    prose_enumeration: zero(),
    mesoclise: zero(),
    dupla_negacao: zero(),
    subordinacao_densa: zero(),
    leitor_terceira_pessoa: zero(),
    salto_de_nivel_titulo: zero(),
    long_heading: zero(),
    single_item_list: zero(),
    heading_body_mismatch: zero(),
  };
  let findingsOnUnforeseenTerms = 0;
  let totalExpected = 0;

  for (const testCase of GOLDEN_INTEGRADO) {
    const diagnostic = analyze(testCase.text);
    totalExpected += testCase.expected.findings.length;

    for (const expected of testCase.expected.findings) {
      const actual = findActual(diagnostic, expected);
      const bucket = byCriterion[expected.criterion];
      if (actual) {
        global.tp++;
        bucket.tp++;
      } else {
        global.fn++;
        bucket.fn++;
      }

      if (expected.suggestion !== undefined) {
        if (actual?.suggestion === expected.suggestion) {
          global.suggestionsEmitted++;
          global.suggestionsCorrect++;
          bucket.suggestionsEmitted++;
          bucket.suggestionsCorrect++;
        }
      }
    }

    for (const actual of diagnostic.findings) {
      const criterion = actual.criterion as IntegratedCriterion;
      const expected = testCase.expected.findings.find(
        (e) => e.criterion === actual.criterion && e.start === actual.span.start && e.end === actual.span.end,
      );
      if (!expected) {
        global.fp++;
        byCriterion[criterion].fp++;
        findingsOnUnforeseenTerms++;
        if (actual.suggestion !== undefined) {
          global.suggestionsUnsafe++;
          byCriterion[criterion].suggestionsUnsafe++;
        }
        continue;
      }

      if (actual.suggestion !== undefined && actual.suggestion !== expected.suggestion) {
        global.suggestionsUnsafe++;
        byCriterion[criterion].suggestionsUnsafe++;
      }
    }
  }

  const precision = global.tp + global.fp === 0 ? 1 : global.tp / (global.tp + global.fp);
  const recall = global.tp + global.fn === 0 ? 1 : global.tp / (global.tp + global.fn);

  it("integrated report", () => {
    const lines: string[] = [
      `\n[integrated eval] documents=${GOLDEN_INTEGRADO.length} · expected findings=${totalExpected} · ` +
        `TP=${global.tp} FP=${global.fp} FN=${global.fn} · precision=${(precision * 100).toFixed(1)}% · recall=${(recall * 100).toFixed(1)}%`,
      `[integrated eval] suggestions: emitted=${global.suggestionsEmitted} correct=${global.suggestionsCorrect} unsafe=${global.suggestionsUnsafe} · ` +
        `findings on unforeseen terms (must be 0)=${findingsOnUnforeseenTerms}`,
    ];
    for (const criterion of CRITERIA) {
      const b = byCriterion[criterion];
      lines.push(
        `[integrated eval]   ${criterion}: TP=${b.tp} FP=${b.fp} FN=${b.fn} · correct suggestions=${b.suggestionsCorrect}/${b.suggestionsEmitted} · unsafe=${b.suggestionsUnsafe}`,
      );
    }
    console.log(lines.join("\n"));
    expect(GOLDEN_INTEGRADO.length).toBeGreaterThan(0);
  });

  it("zero unsafe suggestions (priority 1)", () => {
    expect(global.suggestionsUnsafe).toBe(0);
  });

  it("100% precision and zero findings on unforeseen terms (priority 2)", () => {
    expect(global.fp).toBe(0);
    expect(findingsOnUnforeseenTerms).toBe(0);
    expect(precision).toBe(1);
  });

  it("full recall over the reference golden set", () => {
    expect(global.fn).toBe(0);
    expect(recall).toBe(1);
  });
});
