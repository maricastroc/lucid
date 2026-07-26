import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "adverbios_vagos")
    .map((f) => f.span.text);

describe("adverbios_vagos — presence (ADR-058)", () => {
  it("marks every vague adverb, even in isolation (density plays no part)", () => {
    expect(spans("Basicamente, o pedido foi negado.")).toEqual(["Basicamente"]);
    expect(spans("O sistema está efetivamente fora do ar.")).toEqual(["efetivamente"]);
  });

  it("marks several within the same sentence", () => {
    expect(spans("Isso é realmente e absolutamente desnecessário.")).toEqual(["realmente", "absolutamente"]);
  });

  it("is on by default, info severity, and requires a human decision", () => {
    const f = analyze("Simplesmente não há prazo.").findings.find((x) => x.criterion === "adverbios_vagos")!;
    expect(f.severity).toBe("info");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("editorial-pt-br");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference).toBeUndefined();
  });
});

describe("adverbios_vagos — precision (it is not 'any -mente adverb')", () => {
  it("MANNER adverbs carrying content do NOT mark (avoids pushing toward 'de forma X')", () => {
    expect(spans("O documento deve ser assinado digitalmente e enviado mensalmente.")).toEqual([]);
    expect(spans("Ele resolveu o problema rapidamente e silenciosamente.")).toEqual([]);
    expect(spans("A audiência ocorrerá judicialmente na próxima semana.")).toEqual([]);
  });

  it("borderline cases left OUT of the initial list do not mark", () => {
    expect(spans("Isso ocorre naturalmente e afeta particularmente os idosos.")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, adverbiosVagos: { enabled: false } };
    expect(
      analyze("Basicamente, o pedido foi negado.", config).findings.filter((f) => f.criterion === "adverbios_vagos"),
    ).toEqual([]);
  });
});
