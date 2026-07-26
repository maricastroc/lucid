import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import type { Finding } from "../src/lucid/core/types";

function assertCompleteProvenance(f: Finding, diagnosticText: string) {
  expect(f.criterion.length).toBeGreaterThan(0);
  expect(["lexical", "syntactic", "structural", "metric"]).toContain(f.category);
  expect(["iso-24495-1", "editorial-pt-br", "structural-heuristic"]).toContain(f.source);
  expect(["relevant", "findable", "understandable", "usable"]).toContain(f.principleGroup);
  expect(f.normativeReference !== undefined).toBe(f.source === "iso-24495-1");
  if (f.normativeReference) expect(f.normativeReference.section).toMatch(/^5\.\d/);
  expect(["info", "warning", "error"]).toContain(f.severity);
  expect(typeof f.requiresHuman).toBe("boolean");
  expect(f.justification.length).toBeGreaterThan(0);
  expect(typeof f.span.start).toBe("number");
  expect(typeof f.span.end).toBe("number");
  expect(f.span.end).toBeGreaterThan(f.span.start);

  if (f.suggestion !== undefined) expect(f.requiresHuman).toBe(false);
  expect(diagnosticText.slice(f.span.start, f.span.end)).toBe(f.span.text);
}

describe("provenance — every integrated finding is complete and reconstructible", () => {
  const texts = [
    "O recurso foi negado em sede de apelação. O documento supracitado consta.",
    "É preciso fazer a análise de documentos pela comissão, doravante.",
    "As contas foram aprovadas pelo conselho.",
  ];
  it.each(texts)("all provenance fields present and the span reconstructs: %s", (text) => {
    const d = analyze(text);
    expect(d.findings.length).toBeGreaterThan(0);
    for (const f of d.findings) assertCompleteProvenance(f, d.text);
  });
});

describe("provenance — offsets under Unicode and punctuation", () => {
  it("accents (á, ç, ã) do not shift the span", () => {
    const d = analyze("A informação foi divulgada pela assessoria de comunicação.");
    const passive = d.findings.find((f) => f.criterion === "passive_voice");
    expect(passive).toBeDefined();
    expect(d.text.slice(passive!.span.start, passive!.span.end)).toBe(passive!.span.text);
  });

  it("curly quotes “ ” are recognized and the span of a finding outside them stays correct", () => {
    const d = analyze("A decisão foi publicada, “sem prejuízo de” recurso posterior.");

    expect(d.findings.some((f) => f.criterion === "jargon")).toBe(false);
    const passive = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(d.text.slice(passive.span.start, passive.span.end)).toBe(passive.span.text);
  });

  it("an em dash (—) between findings does not corrupt offsets", () => {
    const d = analyze("O prazo foi prorrogado — o documento supracitado segue válido.");
    for (const f of d.findings) expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    expect(d.findings.some((f) => f.criterion === "jargon" && f.span.text === "supracitado")).toBe(true);
  });

  it("an emoji (surrogate pair, 2 code units) before a finding shifts the offset by 2", () => {
    const withoutEmoji = "Veja o documento supracitado agora.";
    const withEmoji = "Veja 😀 o documento supracitado agora.";
    const d1 = analyze(withoutEmoji);
    const d2 = analyze(withEmoji);
    const j1 = d1.findings.find((f) => f.criterion === "jargon")!;
    const j2 = d2.findings.find((f) => f.criterion === "jargon")!;

    expect(j2.span.start - j1.span.start).toBe(3);

    expect(d2.text.slice(j2.span.start, j2.span.end)).toBe("supracitado");
    expect("😀".length).toBe(2);
  });

  it("line breaks and repeated spaces preserve global offsets across paragraphs", () => {
    const d = analyze("Primeiro parágrafo.\n\n\nSegundo com o termo supracitado no meio.");
    const j = d.findings.find((f) => f.criterion === "jargon")!;
    expect(d.text.slice(j.span.start, j.span.end)).toBe("supracitado");
  });
});

describe("provenance — NFC normalization and the offset convention", () => {
  it("NFD input is normalized; offsets are relative to the NFC text exposed in Diagnostic.text", () => {
    const nfd = "A conclus\u00e3o foi publicada.".normalize("NFD");
    expect(nfd.normalize("NFC")).not.toBe(nfd);
    const d = analyze(nfd);

    expect(d.text).toBe(nfd.normalize("NFC"));
    expect(d.text.length).toBe(nfd.length - 1);

    const passive = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(d.text.slice(passive.span.start, passive.span.end)).toBe(passive.span.text);
    expect(passive.span.text).toBe("foi publicada");
  });

  it("nominalization carries no composed suggestion (ADR-054) — the base verb lives in meta, the span is a quote", () => {
    const d = analyze("É preciso fazer a análise de documentos.");
    const nominal = d.findings.find((f) => f.criterion === "nominalization")!;
    expect(nominal.suggestion).toBeUndefined();
    expect(nominal.meta).toMatchObject({ baseVerb: "analisar" });
    expect(nominal.span.text).toBe("fazer a análise");
    expect(d.text.slice(nominal.span.start, nominal.span.end)).toBe("fazer a análise");
  });
});
