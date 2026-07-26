import { describe, expect, it } from "vitest";
import { calculateFleschPt } from "../src/locales/pt-BR/readability/flesch-pt";

describe("calculateFleschPt — Martins et al. (1996) formula", () => {
  it("uses the 248.835 constant (not the English 206.835) when both averages are zero", () => {
    expect(calculateFleschPt(0, 0)).toBe(248.835);
  });

  it("computes correctly for known values", () => {
    expect(calculateFleschPt(5, 1.8)).toBeCloseTo(91.48, 10);
  });

  it("is sensitive to words per sentence (more words per sentence lowers the index)", () => {
    const short = calculateFleschPt(5, 1.5);
    const long = calculateFleschPt(30, 1.5);
    expect(long).toBeLessThan(short);
  });

  it("is sensitive to syllables per word (more syllables per word lowers the index)", () => {
    const simple = calculateFleschPt(10, 1.5);
    const complex = calculateFleschPt(10, 3.5);
    expect(complex).toBeLessThan(simple);
  });

  it("does no rounding at all (pure function, no fixed decimal places)", () => {
    const result = calculateFleschPt(7, 1.666666);
    const expectedRaw = 248.835 - 1.015 * 7 - 84.6 * 1.666666;
    expect(result).toBe(expectedRaw);
  });
});
