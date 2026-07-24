import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const ENABLED = { ...DEFAULT_CONFIG, adverbioMente: { enabled: true, minPorFrase: 3 } };

const spans = (text: string): string[] =>
  analyze(text, ENABLED)
    .findings.filter((f) => f.criterion === "adverbio_mente_denso")
    .map((f) => f.span.text);

describe("adverbio_mente_denso — DESCONTINUADO (ADR-058)", () => {
  it("desligado por padrão: DEFAULT_CONFIG não produz findings", () => {
    const findings = analyze(
      "O processo foi conduzido rigorosamente, cuidadosamente e sistematicamente.",
    ).findings.filter((f) => f.criterion === "adverbio_mente_denso");
    expect(findings).toEqual([]);
  });

  it("id preservado no placar (interpretabilidade histórica), com contagem zero por padrão", () => {
    const entry = analyze("Texto qualquer.").score.byCriterion.find((c) => c.criterion === "adverbio_mente_denso");
    expect(entry).toBeDefined();
    expect(entry!.count).toEqual({ info: 0, warning: 0, error: 0 });
  });
});

describe("adverbio_mente_denso — comportamento legado (quando religado)", () => {
  it("marca cada advérbio quando a frase concentra ≥3 em -mente", () => {
    expect(spans("O processo foi conduzido rigorosamente, cuidadosamente e sistematicamente.")).toEqual([
      "rigorosamente",
      "cuidadosamente",
      "sistematicamente",
    ]);
  });

  it("abaixo do limiar (2 na frase) não marca", () => {
    expect(spans("O processo foi conduzido rigorosamente e cuidadosamente.")).toEqual([]);
  });

  it("finding é info e exige decisão humana", () => {
    const f = analyze("Foi feito rigorosamente, cuidadosamente e sistematicamente.", ENABLED).findings.find(
      (x) => x.criterion === "adverbio_mente_denso",
    )!;
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.source).toBe("editorial-pt-br");
    expect(f.normativeReference).toBeUndefined();
  });

  it("palavras terminadas em -mente que não são advérbio não marcam", () => {
    expect(spans("A semente na mente do juiz clemente permanece.")).toEqual([]);
  });
});
