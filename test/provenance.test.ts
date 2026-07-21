/**
 * Auditoria de PROVENIÊNCIA e OFFSETS ao nível de `analyze()` (I3).
 *
 * Convenção de offset (documentada em docs/ARQUITETURA.md §3.2 e ADR-009): `span.start`/
 * `span.end` são índices de CODE UNIT UTF-16 sobre `Diagnostic.text`, e `Diagnostic.text`
 * é a entrada normalizada em NFC (`normalize.ts`). `end` é exclusivo. A invariante-mestra
 * é `Diagnostic.text.slice(start, end) === span.text` — nenhum pass reconstrói texto com
 * offsets próprios; todos fatiam o mesmo `source`.
 *
 * Caracteres fora do BMP (emoji) ocupam 2 code units (par surrogate) — os offsets
 * refletem isso, porque tudo em JS (`.length`, `.slice`) opera em code units UTF-16.
 */
import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid/core/analyzer";
import type { Finding } from "../src/lucid/core/types";

function assertProvenanciaCompleta(f: Finding, textoDiagnostico: string) {
  // campos obrigatórios do contrato
  expect(f.criterion.length).toBeGreaterThan(0);
  expect(["lexical", "syntactic", "structural", "metric"]).toContain(f.category);
  expect(f.principle).toMatch(/^5\.\d/);
  expect(["info", "warning", "error"]).toContain(f.severity);
  expect(typeof f.requiresHuman).toBe("boolean");
  expect(f.justification.length).toBeGreaterThan(0);
  expect(typeof f.span.start).toBe("number");
  expect(typeof f.span.end).toBe("number");
  expect(f.span.end).toBeGreaterThan(f.span.start);
  // requiresHuman e suggestion são coerentes entre si (I7): sugestão presente ⇒ não exige humano
  if (f.suggestion !== undefined) expect(f.requiresHuman).toBe(false);
  // a invariante-mestra de reconstrução
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
    // 'sem prejuízo de' suprimido pelas aspas; 'foi publicada' (fora) preservado
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
    // "😀 " = emoji (2) + espaço (1) = 3 code units inseridos antes do termo
    expect(j2.span.start - j1.span.start).toBe(3);
    // e ambos reconstroem
    expect(d2.text.slice(j2.span.start, j2.span.end)).toBe("supracitado");
    expect("😀".length).toBe(2); // documenta a convenção UTF-16
  });

  it("quebras de linha e espaços repetidos preservam offsets globais entre parágrafos", () => {
    const d = analyze("Primeiro parágrafo.\n\n\nSegundo com o termo supracitado no meio.");
    const j = d.findings.find((f) => f.criterion === "jargon")!;
    expect(d.text.slice(j.span.start, j.span.end)).toBe("supracitado");
  });
});

describe("proveniência — normalização NFC e a convenção de offset", () => {
  it("entrada NFD é normalizada; offsets são relativos ao texto NFC exposto em Diagnostic.text", () => {
    // "conclusão" com 'a'+combining tilde (NFD): 'ã' são 2 code units que compõem 1 (ã)
    const nfd = "A conclus\u00e3o foi publicada.".normalize("NFD"); // NFC -> NFD garantido
    expect(nfd.normalize("NFC")).not.toBe(nfd); // a entrada é genuinamente NFD
    const d = analyze(nfd);
    // Diagnostic.text é NFC (mais curto que a entrada bruta em 1 code unit)
    expect(d.text).toBe(nfd.normalize("NFC"));
    expect(d.text.length).toBe(nfd.length - 1);
    // o finding fatia corretamente o texto NFC, não a entrada bruta
    const passiva = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(d.text.slice(passiva.span.start, passiva.span.end)).toBe(passiva.span.text);
    expect(passiva.span.text).toBe("foi publicada");
  });

  it("a sugestão nunca é confundida com o texto original do span", () => {
    const d = analyze("É preciso fazer a análise de documentos.");
    const nominal = d.findings.find((f) => f.criterion === "nominalization")!;
    expect(nominal.suggestion).toBe("analisar documentos");
    // o span original permanece o texto de entrada, distinto da sugestão
    expect(nominal.span.text).toBe("fazer a análise de documentos");
    expect(d.text.slice(nominal.span.start, nominal.span.end)).toBe("fazer a análise de documentos");
  });
});
