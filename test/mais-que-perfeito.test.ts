import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "mais_que_perfeito_sintetico")
    .map((f) => f.span.text);

describe("mais_que_perfeito_sintetico — detecção", () => {
  it("marca formas regulares e irregulares de mais-que-perfeito sintético", () => {
    expect(spans("O órgão requerera o parecer.")).toEqual(["requerera"]);
    expect(spans("Ele já dissera que aprovara tudo.")).toEqual(["dissera", "aprovara"]);
    // irregulares opacos, impossíveis por regex
    expect(spans("Ela fizera o pedido e coubera a ela decidir.")).toEqual(["fizera", "coubera"]);
  });

  it("todo finding exige decisão humana e não sugere reescrita", () => {
    const f = analyze("O servidor requerera o documento.").findings.find(
      (x) => x.criterion === "mais_que_perfeito_sintetico",
    )!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.severity).toBe("warning");
    expect(f.principle).toBe("5.3.3");
  });
});

describe("mais_que_perfeito_sintetico — precisão (formas ambíguas NÃO marcam)", () => {
  it("'fora' (advérbio) não é marcado como pluperfect", () => {
    expect(spans("O documento ficou fora da pasta.")).toEqual([]);
  });

  it("'vira' (verbo virar) não é marcado", () => {
    expect(spans("O carro vira à esquerda no cruzamento.")).toEqual([]);
  });

  it("'foram' (pretérito perfeito) não é marcado", () => {
    expect(spans("Os documentos foram entregues no prazo.")).toEqual([]);
  });

  it("texto claro sem pluperfect não gera nada", () => {
    expect(spans("A comissão analisou o documento e comunicou a decisão.")).toEqual([]);
  });
});

describe("mais_que_perfeito_sintetico — kill switch", () => {
  it("desligado não produz findings", () => {
    const config = { ...DEFAULT_CONFIG, maisQuePerfeito: { enabled: false } };
    const findings = analyze("O órgão requerera o parecer.", config).findings.filter(
      (f) => f.criterion === "mais_que_perfeito_sintetico",
    );
    expect(findings).toEqual([]);
  });
});
