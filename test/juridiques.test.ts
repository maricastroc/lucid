import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

describe("redundancia — pleonasm and doublets", () => {
  it("marks the curated doublets and pleonasms", () => {
    expect(spans("A decisão é nula e sem efeito.", "redundancia")).toEqual(["nula e sem efeito"]);
    expect(spans("Foi preciso planejar antecipadamente com certeza absoluta.", "redundancia")).toEqual([
      "planejar antecipadamente",
      "certeza absoluta",
    ]);
  });

  it("the finding requires a human decision and cites the lean form without applying it", () => {
    const f = analyze("Havia certeza absoluta.").findings.find((x) => x.criterion === "redundancia")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.justification).toContain("certeza");
    expect(f.normativeReference?.section).toBe("5.3.4");
  });

  it("text with no redundancy does not mark", () => {
    expect(spans("A comissão analisou o documento com cuidado.", "redundancia")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, redundancia: { enabled: false } };
    expect(analyze("nula e sem efeito", config).findings.filter((f) => f.criterion === "redundancia")).toEqual([]);
  });
});

describe("perifrase_inflada — inflated phrasings", () => {
  it("marks the curated periphrases (longest-match, no overlap)", () => {
    expect(spans("Trabalhamos no sentido de melhorar com relação a prazos.", "perifrase_inflada")).toEqual([
      "no sentido de",
      "com relação a",
    ]);
    expect(spans("Agimos a fim de cumprir no âmbito da lei.", "perifrase_inflada")).toEqual(["a fim de", "no âmbito da"]);
  });

  it("the finding requires a human decision and cites the lean form", () => {
    const f = analyze("Escrevi com o objetivo de informar.").findings.find((x) => x.criterion === "perifrase_inflada")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.justification).toContain("para");
    expect(f.normativeReference?.section).toBe("5.3.4");
  });

  it("does not collide with the jargon glossary ('em sede de' stays jargon, not a periphrasis)", () => {
    expect(spans("A questão foi decidida em sede de recurso.", "perifrase_inflada")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, perifraseInflada: { enabled: false } };
    expect(analyze("no sentido de", config).findings.filter((f) => f.criterion === "perifrase_inflada")).toEqual([]);
  });
});
