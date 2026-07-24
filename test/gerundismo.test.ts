import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "gerundismo")
    .map((f) => f.span.text);

describe("gerundismo — detecção", () => {
  it("marca [ir + estar + gerúndio] em várias pessoas", () => {
    expect(spans("Nós vamos estar enviando o parecer.")).toEqual(["vamos estar enviando"]);
    expect(spans("A equipe vai estar analisando os autos.")).toEqual(["vai estar analisando"]);
    expect(spans("Eu vou estar verificando isso amanhã.")).toEqual(["vou estar verificando"]);
  });

  it("finding exige decisão humana, sem sugestão automática", () => {
    const f = analyze("Vou estar enviando o documento.").findings.find((x) => x.criterion === "gerundismo")!;
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("editorial-pt-br");
  });
});

describe("gerundismo — precisão", () => {
  it("forma simples (sem 'estar') não é gerundismo", () => {
    expect(spans("Vou enviar o parecer amanhã.")).toEqual([]);
  });

  it("'estar' + adjetivo (não gerúndio) não marca", () => {
    expect(spans("Você vai estar lindo na formatura.")).toEqual([]);
  });

  it("gerúndio sem o auxiliar 'ir' não marca (estou enviando)", () => {
    expect(spans("Estou enviando o documento agora.")).toEqual([]);
  });
});

describe("gerundismo — kill switch", () => {
  it("desligado não produz findings", () => {
    const config = { ...DEFAULT_CONFIG, gerundismo: { enabled: false } };
    const findings = analyze("Vou estar enviando o parecer.", config).findings.filter(
      (f) => f.criterion === "gerundismo",
    );
    expect(findings).toEqual([]);
  });
});
