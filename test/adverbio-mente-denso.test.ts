import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "adverbio_mente_denso")
    .map((f) => f.span.text);

describe("adverbio_mente_denso — densidade", () => {
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

  it("densidade é por frase, não pelo documento inteiro", () => {
    // dois advérbios em cada frase → nenhuma frase atinge o limiar 3
    expect(spans("Ele agiu rapidamente e claramente. Depois falou calmamente e diretamente.")).toEqual([]);
  });

  it("finding é info e exige decisão humana", () => {
    const f = analyze("Foi feito rigorosamente, cuidadosamente e sistematicamente.").findings.find(
      (x) => x.criterion === "adverbio_mente_denso",
    )!;
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.principle).toBe("5.3.4");
  });
});

describe("adverbio_mente_denso — precisão (não-advérbios em -mente)", () => {
  it("palavras terminadas em -mente que não são advérbio não marcam", () => {
    // semente, mente, clemente não estão no allowlist de advérbios
    expect(spans("A semente na mente do juiz clemente permanece.")).toEqual([]);
  });
});

describe("adverbio_mente_denso — kill switch", () => {
  it("desligado não produz findings", () => {
    const config = { ...DEFAULT_CONFIG, adverbioMente: { enabled: false, minPorFrase: 3 } };
    const findings = analyze("Foi feito rigorosamente, cuidadosamente e sistematicamente.", config).findings.filter(
      (f) => f.criterion === "adverbio_mente_denso",
    );
    expect(findings).toEqual([]);
  });
});
