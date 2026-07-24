import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "adverbios_vagos")
    .map((f) => f.span.text);

describe("adverbios_vagos — presença (ADR-058)", () => {
  it("marca cada advérbio vago, mesmo isolado (não depende de densidade)", () => {
    expect(spans("Basicamente, o pedido foi negado.")).toEqual(["Basicamente"]);
    expect(spans("O sistema está efetivamente fora do ar.")).toEqual(["efetivamente"]);
  });

  it("marca múltiplos na mesma frase", () => {
    expect(spans("Isso é realmente e absolutamente desnecessário.")).toEqual(["realmente", "absolutamente"]);
  });

  it("é ligado por padrão, info e exige decisão humana", () => {
    const f = analyze("Simplesmente não há prazo.").findings.find((x) => x.criterion === "adverbios_vagos")!;
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("editorial-pt-br");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference).toBeUndefined();
  });
});

describe("adverbios_vagos — precisão (não é 'qualquer advérbio em -mente')", () => {
  it("advérbios de MODO com conteúdo NÃO marcam (evita empurrar para 'de forma X')", () => {
    expect(spans("O documento deve ser assinado digitalmente e enviado mensalmente.")).toEqual([]);
    expect(spans("Ele resolveu o problema rapidamente e silenciosamente.")).toEqual([]);
    expect(spans("A audiência ocorrerá judicialmente na próxima semana.")).toEqual([]);
  });

  it("fronteiriços deixados FORA da lista inicial não marcam", () => {
    expect(spans("Isso ocorre naturalmente e afeta particularmente os idosos.")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, adverbiosVagos: { enabled: false } };
    expect(
      analyze("Basicamente, o pedido foi negado.", config).findings.filter((f) => f.criterion === "adverbios_vagos"),
    ).toEqual([]);
  });
});
