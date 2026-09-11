import { describe, expect, it } from "vitest";
import { measure } from "./measure";
import { GOLDEN_READER_EN } from "./reader-third-person-golden";

describe("en-US reader_in_third_person — directed golden, labelled only (no rate is published)", () => {
  const { results, summary } = measure(GOLDEN_READER_EN, "reader_in_third_person");

  it("has negatives and declared limitations", () => {
    expect(summary.negatives).toBeGreaterThanOrEqual(10);
    for (const entry of GOLDEN_READER_EN.filter((e) => e.status !== "correct")) {
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
