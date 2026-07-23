import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import type { Finding } from "../src/lucid/core/types";

function assertProvenanciaCompleta(f: Finding, textoDiagnostico: string) {
  expect(f.criterion.length).toBeGreaterThan(0);
  expect(["lexical", "syntactic", "structural", "metric"]).toContain(f.category);
  expect(f.principle).toMatch(/^5\.\d/);
  expect(["info", "warning", "error"]).toContain(f.severity);
  expect(typeof f.requiresHuman).toBe("boolean");
  expect(f.justification.length).toBeGreaterThan(0);
  expect(typeof f.span.start).toBe("number");
  expect(typeof f.span.end).toBe("number");
  expect(f.span.end).toBeGreaterThan(f.span.start);

  if (f.suggestion !== undefined) expect(f.requiresHuman).toBe(false);
  expect(textoDiagnostico.slice(f.span.start, f.span.end)).toBe(f.span.text);
}

describe("proveniência — todo finding integrado é completo e reconstrutível", () => {
  const textos = [
    "O recurso foi negado em sede de apelação. O documento supracitado consta.",
    "É preciso fazer a análise de documentos pela comissão, doravante.",
    "As contas foram aprovadas pelo conselho.",
  ];
  it.each(textos)("todos os campos de proveniência presentes e span reconstrói: %s", (texto) => {
    const d = analyze(texto);
    expect(d.findings.length).toBeGreaterThan(0);
    for (const f of d.findings) assertProvenanciaCompleta(f, d.text);
  });
});

describe("proveniência — offsets sob Unicode e pontuação", () => {
  it("acentos (á, ç, ã) não deslocam o span", () => {
    const d = analyze("A informação foi divulgada pela assessoria de comunicação.");
    const passiva = d.findings.find((f) => f.criterion === "passive_voice");
    expect(passiva).toBeDefined();
    expect(d.text.slice(passiva!.span.start, passiva!.span.end)).toBe(passiva!.span.text);
  });

  it("aspas curvas “ ” são reconhecidas e o span de um finding fora delas continua correto", () => {
    const d = analyze("A decisão foi publicada, “sem prejuízo de” recurso posterior.");

    expect(d.findings.some((f) => f.criterion === "jargon")).toBe(false);
    const passiva = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(d.text.slice(passiva.span.start, passiva.span.end)).toBe(passiva.span.text);
  });

  it("travessão (—) entre findings não corrompe offsets", () => {
    const d = analyze("O prazo foi prorrogado — o documento supracitado segue válido.");
    for (const f of d.findings) expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    expect(d.findings.some((f) => f.criterion === "jargon" && f.span.text === "supracitado")).toBe(true);
  });

  it("emoji (par surrogate, 2 code units) antes de um finding desloca o offset em 2", () => {
    const semEmoji = "Veja o documento supracitado agora.";
    const comEmoji = "Veja 😀 o documento supracitado agora.";
    const d1 = analyze(semEmoji);
    const d2 = analyze(comEmoji);
    const j1 = d1.findings.find((f) => f.criterion === "jargon")!;
    const j2 = d2.findings.find((f) => f.criterion === "jargon")!;

    expect(j2.span.start - j1.span.start).toBe(3);

    expect(d2.text.slice(j2.span.start, j2.span.end)).toBe("supracitado");
    expect("😀".length).toBe(2);
  });

  it("quebras de linha e espaços repetidos preservam offsets globais entre parágrafos", () => {
    const d = analyze("Primeiro parágrafo.\n\n\nSegundo com o termo supracitado no meio.");
    const j = d.findings.find((f) => f.criterion === "jargon")!;
    expect(d.text.slice(j.span.start, j.span.end)).toBe("supracitado");
  });
});

describe("proveniência — normalização NFC e a convenção de offset", () => {
  it("entrada NFD é normalizada; offsets são relativos ao texto NFC exposto em Diagnostic.text", () => {
    const nfd = "A conclus\u00e3o foi publicada.".normalize("NFD");
    expect(nfd.normalize("NFC")).not.toBe(nfd);
    const d = analyze(nfd);

    expect(d.text).toBe(nfd.normalize("NFC"));
    expect(d.text.length).toBe(nfd.length - 1);

    const passiva = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(d.text.slice(passiva.span.start, passiva.span.end)).toBe(passiva.span.text);
    expect(passiva.span.text).toBe("foi publicada");
  });

  it("nominalização não carrega sugestão composta (ADR-054) — o verbo-base vive em meta, o span é citação", () => {
    const d = analyze("É preciso fazer a análise de documentos.");
    const nominal = d.findings.find((f) => f.criterion === "nominalization")!;
    expect(nominal.suggestion).toBeUndefined();
    expect(nominal.meta).toMatchObject({ baseVerb: "analisar" });
    expect(nominal.span.text).toBe("fazer a análise");
    expect(d.text.slice(nominal.span.start, nominal.span.end)).toBe("fazer a análise");
  });
});
