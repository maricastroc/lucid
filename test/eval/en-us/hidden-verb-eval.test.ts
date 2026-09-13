import { describe, expect, it } from "vitest";
import { GOLDEN_HIDDEN_VERB_EN, HIDDEN_VERB_UNIVERSE } from "./hidden-verb-golden";
import { measure, regressionLine } from "./measure";

describe("en-US hidden_verb — in-sample regression suite of the productive half", () => {
  const productive = (meta: Record<string, unknown>) => meta.productive === true;
  const { results, summary } = measure(GOLDEN_HIDDEN_VERB_EN, "hidden_verb", productive);

  it("reports its counts as a regression suite over its declared universe, never as a measurement", () => {
    console.log(`\n${regressionLine("hidden_verb", summary)}\n  universe: ${HIDDEN_VERB_UNIVERSE}`);
    expect(summary.cases).toBeGreaterThan(0);
  });

  it("has negatives, and declares what lies outside the universe instead of dropping it", () => {
    expect(summary.negatives).toBeGreaterThanOrEqual(15);
    expect(summary.outOfUniverse).toBeGreaterThan(0);
    for (const entry of GOLDEN_HIDDEN_VERB_EN.filter((e) => e.status !== "correct")) {
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

  it("the out-of-universe cases the productive rule misses stay missed", () => {
    for (const r of results.filter((x) => x.status === "out_of_universe")) expect(r.actualCount, r.text).toBe(0);
  });
});
