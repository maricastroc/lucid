import { describe, expect, it } from "vitest";
import { analyze, type ParagraphBlock } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";

const paragraphsOf = (text: string): ParagraphBlock[] =>
  buildDocument(text).blocks.filter((b): b is ParagraphBlock => b.kind === "paragraph");

const spans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

describe("camada de blocos — parágrafos", () => {
  it("segmenta por linha em branco; sem linha em branco = 1 parágrafo", () => {
    expect(buildDocument("Uma frase. Outra frase.").blocks).toHaveLength(1);
    expect(buildDocument("Parágrafo um.\n\nParágrafo dois.").blocks).toHaveLength(2);
    expect(buildDocument("").blocks).toHaveLength(0);
  });

  it("texto puro só produz blocos de parágrafo; cada um agrega frases e contagem de palavras", () => {
    const doc = buildDocument("Frase um aqui. Frase dois aqui.\n\nOutro bloco só.");
    expect(doc.blocks.every((b) => b.kind === "paragraph")).toBe(true);
    const paras = paragraphsOf("Frase um aqui. Frase dois aqui.\n\nOutro bloco só.");
    expect(paras).toHaveLength(2);
    expect(paras[0].sentences).toHaveLength(2);
    expect(paras[1].sentences).toHaveLength(1);
    expect(paras[0].wordCount).toBeGreaterThan(paras[1].wordCount);
  });
});

describe("paragraph_length — parágrafo com frases demais", () => {
  it("marca parágrafo acima do limite de frases", () => {
    const seis = "Frase um. Frase dois. Frase três. Frase quatro. Frase cinco. Frase seis.";
    const findings = analyze(seis).findings.filter((f) => f.criterion === "paragraph_length");
    expect(findings).toHaveLength(1);
    expect(findings[0].normativeReference?.section).toBe("5.2");
    expect(findings[0].category).toBe("structural");
    expect(findings[0].requiresHuman).toBe(true);
  });

  it("parágrafo dentro do limite não marca (uma frase longa é assunto de long_sentence)", () => {
    expect(spans("Frase um. Frase dois. Frase três.", "paragraph_length")).toEqual([]);
  });

  it("conta por parágrafo, não pelo documento (2 parágrafos de 3 frases não marcam)", () => {
    const t = "Frase um. Frase dois. Frase três.\n\nFrase quatro. Frase cinco. Frase seis.";
    expect(spans(t, "paragraph_length")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, paragraphLength: { enabled: false, maxSentences: 5 } };
    const seis = "Frase um. Frase dois. Frase três. Frase quatro. Frase cinco. Frase seis.";
    expect(analyze(seis, config).findings.filter((f) => f.criterion === "paragraph_length")).toEqual([]);
  });
});

describe("prose_enumeration — enumeração em prosa", () => {
  it("marca parágrafo com ≥3 ordinais distintos a partir de 'primeiro'", () => {
    const t = "O rito tem fases. Primeiro, protocola-se. Segundo, analisa-se. Terceiro, decide-se.";
    const findings = analyze(t).findings.filter((f) => f.criterion === "prose_enumeration");
    expect(findings).toHaveLength(1);
    expect(findings[0].normativeReference?.section).toBe("5.2");
    expect(findings[0].requiresHuman).toBe(true);
  });

  it("'segundo' isolado (preposição) não marca — falta a âncora 'primeiro'", () => {
    expect(spans("Segundo o artigo, o prazo é de dez dias.", "prose_enumeration")).toEqual([]);
  });

  it("menos de 3 ordinais não marca", () => {
    expect(spans("Primeiro isto. Segundo aquilo.", "prose_enumeration")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, proseEnumeration: { enabled: false, minMarkers: 3 } };
    const t = "Primeiro, um. Segundo, dois. Terceiro, três.";
    expect(analyze(t, config).findings.filter((f) => f.criterion === "prose_enumeration")).toEqual([]);
  });
});
