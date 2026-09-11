import { describe, expect, it } from "vitest";
import { measure, regressionLine } from "./measure";
import { GOLDEN_ACRONYM_EN } from "./undefined-acronym-golden";

describe("en-US undefined_acronym — in-sample regression suite", () => {
  const { results, summary } = measure(GOLDEN_ACRONYM_EN, "undefined_acronym");

  it("reports its counts as a regression suite, never as a measurement", () => {
    console.log(`\n${regressionLine("undefined_acronym", summary)}`);
    expect(summary.cases).toBeGreaterThan(0);
  });

  it("has negatives, and every limitation carries its reason", () => {
    expect(summary.negatives).toBeGreaterThanOrEqual(12);
    for (const entry of GOLDEN_ACRONYM_EN.filter((e) => e.status !== "correct")) {
      expect(entry.reason, entry.text).toBeTruthy();
    }
  });

  it("no 'correct' entry fails", () => {
    const failing = results.filter((r) => r.status === "correct" && (r.fp > 0 || r.fn > 0));
    expect(failing.map((r) => `${r.text} → ${r.actualCount}`)).toEqual([]);
  });

  it("every known limitation still behaves as declared", () => {
    for (const r of results.filter((x) => x.status === "known_limitation")) {
      expect(r.actualCount, r.text).not.toBe(r.expectedCount);
    }
  });
});
