import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

describe("redundancia — pleonasmo e duplas", () => {
  it("marca duplas e pleonasmos cadastrados", () => {
    expect(spans("A decisão é nula e sem efeito.", "redundancia")).toEqual(["nula e sem efeito"]);
    expect(spans("Foi preciso planejar antecipadamente com certeza absoluta.", "redundancia")).toEqual([
      "planejar antecipadamente",
      "certeza absoluta",
    ]);
  });

  it("finding exige decisão humana e cita a forma enxuta, sem aplicar", () => {
    const f = analyze("Havia certeza absoluta.").findings.find((x) => x.criterion === "redundancia")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.justification).toContain("certeza");
    expect(f.principle).toBe("5.3.4");
  });

  it("texto sem redundância não marca", () => {
    expect(spans("A comissão analisou o documento com cuidado.", "redundancia")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, redundancia: { enabled: false } };
    expect(analyze("nula e sem efeito", config).findings.filter((f) => f.criterion === "redundancia")).toEqual([]);
  });
});

describe("perifrase_inflada — locuções empoladas", () => {
  it("marca perífrases cadastradas (longest-match, sem sobreposição)", () => {
    expect(spans("Trabalhamos no sentido de melhorar com relação a prazos.", "perifrase_inflada")).toEqual([
      "no sentido de",
      "com relação a",
    ]);
    expect(spans("Agimos a fim de cumprir no âmbito da lei.", "perifrase_inflada")).toEqual(["a fim de", "no âmbito da"]);
  });

  it("finding exige decisão humana e cita a forma enxuta", () => {
    const f = analyze("Escrevi com o objetivo de informar.").findings.find((x) => x.criterion === "perifrase_inflada")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.justification).toContain("para");
    expect(f.principle).toBe("5.3.4");
  });

  it("não colide com o glossário de jargão ('em sede de' segue sendo jargão, não perífrase)", () => {
    expect(spans("A questão foi decidida em sede de recurso.", "perifrase_inflada")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, perifraseInflada: { enabled: false } };
    expect(analyze("no sentido de", config).findings.filter((f) => f.criterion === "perifrase_inflada")).toEqual([]);
  });
});
