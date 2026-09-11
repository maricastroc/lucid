import { describe, expect, it } from "vitest";
import { measure, regressionLine } from "./measure";
import { GOLDEN_PASSIVE_EN } from "./passive-voice-golden";

describe("en-US passive_voice — in-sample regression suite", () => {
  const { results, summary } = measure(GOLDEN_PASSIVE_EN, "passive_voice");

  it("reports its counts as a regression suite, never as a measurement", () => {
    console.log(`\n${regressionLine("passive_voice", summary)}`);
    expect(summary.cases).toBeGreaterThan(0);
  });

  it("has negative cases", () => {
    expect(summary.negatives).toBeGreaterThanOrEqual(15);
  });

  it("every known limitation carries its reason", () => {
    for (const entry of GOLDEN_PASSIVE_EN.filter((e) => e.status === "known_limitation")) {
      expect(entry.reason, entry.text).toBeTruthy();
    }
  });

  it("no 'correct' entry fails", () => {
    const failing = results.filter((r) => r.status === "correct" && (r.fp > 0 || r.fn > 0));
    expect(failing.map((r) => `${r.text} → ${r.actualCount}`)).toEqual([]);
  });

  it("every known limitation still behaves as declared — a silent fix or a new break both show here", () => {
    for (const r of results.filter((x) => x.status === "known_limitation")) {
      expect(r.actualCount, r.text).not.toBe(r.expectedCount);
    }
  });
});
