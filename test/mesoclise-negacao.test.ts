import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

describe("mesoclise — pronome no meio do verbo", () => {
  it("marca formas de mesóclise (futuro e condicional)", () => {
    expect(spans("O ato far-se-á público.", "mesoclise")).toEqual(["far-se-á"]);
    expect(spans("O relator dir-lhe-ia a decisão e recolher-se-ão os autos.", "mesoclise")).toEqual([
      "dir-lhe-ia",
      "recolher-se-ão",
    ]);
  });

  it("finding exige decisão humana, sem sugestão", () => {
    const f = analyze("O prazo contar-se-á em dias.").findings.find((x) => x.criterion === "mesoclise")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("editorial-pt-br");
  });

  it("ênclise normal NÃO é mesóclise", () => {
    expect(spans("O relator diz-se favorável e vai fazê-lo hoje.", "mesoclise")).toEqual([]);
  });

  it("nomes com forma parecida (bem-te-vi) NÃO marcam", () => {
    expect(spans("O bem-te-vi cantou no telhado.", "mesoclise")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, mesoclise: { enabled: false } };
    expect(analyze("far-se-á", config).findings.filter((f) => f.criterion === "mesoclise")).toEqual([]);
  });
});

describe("dupla_negacao — litotes", () => {
  it("marca duplas negações cadastradas", () => {
    expect(spans("Não é incomum que isso aconteça.", "dupla_negacao")).toEqual(["Não é incomum"]);
    expect(spans("O caso não é impossível e não deixa de ser relevante.", "dupla_negacao")).toEqual([
      "não é impossível",
      "não deixa de ser",
    ]);
  });

  it("finding cita a forma direta, exige decisão humana", () => {
    const f = analyze("Não é improvável que o pedido seja aceito.").findings.find(
      (x) => x.criterion === "dupla_negacao",
    )!;
    expect(f.requiresHuman).toBe(true);
    expect(f.justification).toContain("é provável");
    expect(f.normativeReference?.section).toBe("5.3.3");
  });

  it("negação simples / concordância negativa NÃO marca (é normal em PT)", () => {
    expect(spans("O órgão não recebeu nenhum recurso e não viu ninguém.", "dupla_negacao")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, duplaNegacao: { enabled: false } };
    expect(analyze("não é incomum", config).findings.filter((f) => f.criterion === "dupla_negacao")).toEqual([]);
  });
});
