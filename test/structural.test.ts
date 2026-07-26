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

describe("block layer — paragraphs", () => {
  it("segments on blank lines; no blank line = 1 paragraph", () => {
    expect(buildDocument("Uma frase. Outra frase.").blocks).toHaveLength(1);
    expect(buildDocument("Parágrafo um.\n\nParágrafo dois.").blocks).toHaveLength(2);
    expect(buildDocument("").blocks).toHaveLength(0);
  });

  it("plain text yields paragraph blocks only; each aggregates sentences and a word count", () => {
    const doc = buildDocument("Frase um aqui. Frase dois aqui.\n\nOutro bloco só.");
    expect(doc.blocks.every((b) => b.kind === "paragraph")).toBe(true);
    const paras = paragraphsOf("Frase um aqui. Frase dois aqui.\n\nOutro bloco só.");
    expect(paras).toHaveLength(2);
    expect(paras[0].sentences).toHaveLength(2);
    expect(paras[1].sentences).toHaveLength(1);
    expect(paras[0].wordCount).toBeGreaterThan(paras[1].wordCount);
  });
});

describe("paragraph_length — a paragraph with too many sentences", () => {
  it("marks a paragraph above the sentence limit", () => {
    const six = "Frase um. Frase dois. Frase três. Frase quatro. Frase cinco. Frase seis.";
    const findings = analyze(six).findings.filter((f) => f.criterion === "paragraph_length");
    expect(findings).toHaveLength(1);
    expect(findings[0].normativeReference?.section).toBe("5.2");
    expect(findings[0].category).toBe("structural");
    expect(findings[0].requiresHuman).toBe(true);
  });

  it("a paragraph within the limit does not mark (one long sentence is long_sentence's business)", () => {
    expect(spans("Frase um. Frase dois. Frase três.", "paragraph_length")).toEqual([]);
  });

  it("counts per paragraph, not per document (2 paragraphs of 3 sentences do not mark)", () => {
    const t = "Frase um. Frase dois. Frase três.\n\nFrase quatro. Frase cinco. Frase seis.";
    expect(spans(t, "paragraph_length")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, paragraphLength: { enabled: false, maxSentences: 5 } };
    const six = "Frase um. Frase dois. Frase três. Frase quatro. Frase cinco. Frase seis.";
    expect(analyze(six, config).findings.filter((f) => f.criterion === "paragraph_length")).toEqual([]);
  });
});

describe("prose_enumeration — enumeration written as prose", () => {
  it("marks a paragraph with ≥3 distinct ordinals starting from 'primeiro'", () => {
    const t = "O rito tem fases. Primeiro, protocola-se. Segundo, analisa-se. Terceiro, decide-se.";
    const findings = analyze(t).findings.filter((f) => f.criterion === "prose_enumeration");
    expect(findings).toHaveLength(1);
    expect(findings[0].normativeReference?.section).toBe("5.2");
    expect(findings[0].requiresHuman).toBe(true);
  });

  it("a lone 'segundo' (the preposition) does not mark — the 'primeiro' anchor is missing", () => {
    expect(spans("Segundo o artigo, o prazo é de dez dias.", "prose_enumeration")).toEqual([]);
  });

  it("fewer than 3 ordinals does not mark", () => {
    expect(spans("Primeiro isto. Segundo aquilo.", "prose_enumeration")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, proseEnumeration: { enabled: false, minMarkers: 3 } };
    const t = "Primeiro, um. Segundo, dois. Terceiro, três.";
    expect(analyze(t, config).findings.filter((f) => f.criterion === "prose_enumeration")).toEqual([]);
  });
});
