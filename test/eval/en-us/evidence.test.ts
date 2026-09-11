import { describe, expect, it } from "vitest";
import {
  EN_CRITERION_IDS,
  EN_LINGUISTIC_IDS,
  EN_ORGANIZATIONAL_IDS,
  EN_REUSED_ENGINE_IDS,
} from "@/locales/en-US/criteria";
import { EN_EVIDENCE, MISSING_FOR_MEASURED } from "@/locales/en-US/evidence";
import { GOLDEN_HIDDEN_VERB_EN } from "./hidden-verb-golden";
import { measure } from "./measure";
import { GOLDEN_PASSIVE_EN } from "./passive-voice-golden";
import { GOLDEN_PROSE_ENUMERATION_EN } from "./prose-enumeration-golden";
import { GOLDEN_READER_EN } from "./reader-third-person-golden";
import { GOLDEN_ACRONYM_EN } from "./undefined-acronym-golden";

describe("en-US evidence — nothing is measured, and the regression counts are what the suites yield", () => {
  it("every criterion of the catalogue declares an engine kind and an evidence level", () => {
    expect(Object.keys(EN_EVIDENCE).sort()).toEqual([...EN_CRITERION_IDS].sort());
    for (const id of EN_LINGUISTIC_IDS) expect(EN_EVIDENCE[id].engine).toBe("linguistic");
    for (const id of EN_REUSED_ENGINE_IDS) expect(EN_EVIDENCE[id].engine).toBe("reused");
    for (const id of EN_ORGANIZATIONAL_IDS) expect(EN_EVIDENCE[id].engine).toBe("organizational");
  });

  it("no en-US criterion is classified as measured", () => {
    for (const [id, e] of Object.entries(EN_EVIDENCE)) expect(e.evidence, id).not.toBe("measured");
  });

  it("only goldenLabelledOnly criteria carry a regression suite, and no reused engine claims more than unit tests", () => {
    for (const [id, e] of Object.entries(EN_EVIDENCE)) {
      expect(e.regressionSuite !== undefined, id).toBe(e.evidence === "goldenLabelledOnly");
    }
    for (const id of EN_REUSED_ENGINE_IDS) expect(EN_EVIDENCE[id].evidence).toBe("unitTestsOnly");
  });

  it("declares the seven conditions a promotion to measured would need", () => {
    expect(MISSING_FOR_MEASURED).toHaveLength(7);
  });

  it.each([
    ["passive_voice", GOLDEN_PASSIVE_EN, undefined],
    ["hidden_verb", GOLDEN_HIDDEN_VERB_EN, (meta: Record<string, unknown>) => meta.productive === true],
    ["undefined_acronym", GOLDEN_ACRONYM_EN, undefined],
    ["reader_in_third_person", GOLDEN_READER_EN, undefined],
    ["prose_enumeration", GOLDEN_PROSE_ENUMERATION_EN, undefined],
  ] as const)("the declared regression counts of %s are exactly what its suite yields today", (id, golden, filter) => {
    const { summary } = measure(golden, id, filter);
    expect({
      cases: summary.cases,
      negatives: summary.negatives,
      knownLimitations: summary.limitations,
      outOfUniverse: summary.outOfUniverse,
      tp: summary.tp,
      fp: summary.fp,
      fn: summary.fn,
    }).toEqual(EN_EVIDENCE[id].regressionSuite);
  });
});
