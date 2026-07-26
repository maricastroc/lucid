import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const ENABLED = { ...DEFAULT_CONFIG, adverbioMente: { enabled: true, minPorFrase: 3 } };

const spans = (text: string): string[] =>
  analyze(text, ENABLED)
    .findings.filter((f) => f.criterion === "adverbio_mente_denso")
    .map((f) => f.span.text);

describe("adverbio_mente_denso — DISCONTINUED (ADR-058)", () => {
  it("off by default: DEFAULT_CONFIG produces no findings", () => {
    const findings = analyze(
      "O processo foi conduzido rigorosamente, cuidadosamente e sistematicamente.",
    ).findings.filter((f) => f.criterion === "adverbio_mente_denso");
    expect(findings).toEqual([]);
  });

  it("the id is kept in the scorecard (historical interpretability), with a zero count by default", () => {
    const entry = analyze("Texto qualquer.").score.byCriterion.find((c) => c.criterion === "adverbio_mente_denso");
    expect(entry).toBeDefined();
    expect(entry!.count).toEqual({ info: 0, warning: 0, error: 0 });
  });
});

describe("adverbio_mente_denso — legacy behavior (when switched back on)", () => {
  it("marks each adverb when the sentence concentrates ≥3 in -mente", () => {
    expect(spans("O processo foi conduzido rigorosamente, cuidadosamente e sistematicamente.")).toEqual([
      "rigorosamente",
      "cuidadosamente",
      "sistematicamente",
    ]);
  });

  it("below the threshold (2 in the sentence) it does not mark", () => {
    expect(spans("O processo foi conduzido rigorosamente e cuidadosamente.")).toEqual([]);
  });

  it("the finding is info and requires a human decision", () => {
    const f = analyze("Foi feito rigorosamente, cuidadosamente e sistematicamente.", ENABLED).findings.find(
      (x) => x.criterion === "adverbio_mente_denso",
    )!;
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.source).toBe("editorial-pt-br");
    expect(f.normativeReference).toBeUndefined();
  });

  it("words ending in -mente that are not adverbs do not mark", () => {
    expect(spans("A semente na mente do juiz clemente permanece.")).toEqual([]);
  });
});
