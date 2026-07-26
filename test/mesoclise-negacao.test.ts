import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

describe("mesoclise — pronoun in the middle of the verb", () => {
  it("marks mesoclitic forms (future and conditional)", () => {
    expect(spans("O ato far-se-á público.", "mesoclise")).toEqual(["far-se-á"]);
    expect(spans("O relator dir-lhe-ia a decisão e recolher-se-ão os autos.", "mesoclise")).toEqual([
      "dir-lhe-ia",
      "recolher-se-ão",
    ]);
  });

  it("the finding requires a human decision, with no suggestion", () => {
    const f = analyze("O prazo contar-se-á em dias.").findings.find((x) => x.criterion === "mesoclise")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("editorial-pt-br");
  });

  it("ordinary enclisis is NOT mesoclisis", () => {
    expect(spans("O relator diz-se favorável e vai fazê-lo hoje.", "mesoclise")).toEqual([]);
  });

  it("look-alike names (bem-te-vi) do NOT mark", () => {
    expect(spans("O bem-te-vi cantou no telhado.", "mesoclise")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, mesoclise: { enabled: false } };
    expect(analyze("far-se-á", config).findings.filter((f) => f.criterion === "mesoclise")).toEqual([]);
  });
});

describe("dupla_negacao — litotes", () => {
  it("marks the curated double negatives", () => {
    expect(spans("Não é incomum que isso aconteça.", "dupla_negacao")).toEqual(["Não é incomum"]);
    expect(spans("O caso não é impossível e não deixa de ser relevante.", "dupla_negacao")).toEqual([
      "não é impossível",
      "não deixa de ser",
    ]);
  });

  it("the finding cites the direct form and requires a human decision", () => {
    const f = analyze("Não é improvável que o pedido seja aceito.").findings.find(
      (x) => x.criterion === "dupla_negacao",
    )!;
    expect(f.requiresHuman).toBe(true);
    expect(f.justification).toContain("é provável");
    expect(f.normativeReference?.section).toBe("5.3.3");
  });

  it("plain negation / negative concord does NOT mark (it is normal in PT)", () => {
    expect(spans("O órgão não recebeu nenhum recurso e não viu ninguém.", "dupla_negacao")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, duplaNegacao: { enabled: false } };
    expect(analyze("não é incomum", config).findings.filter((f) => f.criterion === "dupla_negacao")).toEqual([]);
  });
});
