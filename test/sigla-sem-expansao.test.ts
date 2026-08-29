import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "sigla_sem_expansao")
    .map((f) => f.span.text);

describe("sigla_sem_expansao — detection", () => {
  it("an acronym used without a prior definition triggers on the 1st occurrence", () => {
    expect(spans("A LGPD entrou em vigor e mudou tudo.")).toEqual(["LGPD"]);
  });

  it("marks only the FIRST undefined occurrence, not the repetitions", () => {
    expect(spans("O CADE analisou o caso. Depois, o CADE arquivou o processo. O CADE decidiu.")).toEqual(["CADE"]);
  });

  it("correct provenance and severity (warning, requiresHuman, no suggestion, ISO 5.3.2)", () => {
    const f = analyze("A LGPD entrou em vigor.").findings.find((x) => x.criterion === "sigla_sem_expansao")!;
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("iso-24495-1");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference?.section).toBe("5.3.2");
  });
});

describe("sigla_sem_expansao — recognized definition (does not mark)", () => {
  it("the 'Full Name (ACRONYM)' pattern defines the acronym", () => {
    expect(spans("A Lei Geral de Proteção de Dados (LGPD) entrou em vigor. A LGPD mudou tudo.")).toEqual([]);
  });

  it("the 'ACRONYM (Full name)' pattern also defines it", () => {
    expect(spans("O CADE (Conselho Administrativo de Defesa Econômica) foi acionado. O CADE decidiu.")).toEqual([]);
  });

  it("use BEFORE a late definition still marks the first occurrence", () => {
    expect(spans("A LGPD é recente. A Lei Geral de Proteção de Dados (LGPD) trata disso.")).toEqual(["LGPD"]);
  });
});

describe("sigla_sem_expansao — precision (low false positive rate)", () => {
  it("universal acronyms/state codes/units do not mark (allowlist)", () => {
    expect(spans("Informe o CPF e o CEP. O processo tramita em SP e no RJ.")).toEqual([]);
    expect(spans("O arquivo tem 10 MB e está em PDF.")).toEqual([]);
  });

  it("WELL-FORMED roman numerals do not mark", () => {
    expect(spans("O Capítulo II e o Título IV tratam do tema. A Guerra XII foi longa.")).toEqual([]);
    expect(spans("O item XXIV e a fase VIII do processo MMXXIV.")).toEqual([]);
  });

  it("all-caps for emphasis/headings (a run of capitals) does not mark", () => {
    expect(spans("REGRAS GERAIS DA EMPRESA")).toEqual([]);
    expect(spans("LEIA COM ATENÇÃO ANTES DE ASSINAR")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, siglaSemExpansao: { enabled: false } };
    expect(
      analyze("A LGPD entrou em vigor.", config).findings.filter((f) => f.criterion === "sigla_sem_expansao"),
    ).toEqual([]);
  });
});

describe("sigla_sem_expansao — acronyms made only of roman letters that are NOT numerals (F5)", () => {
  it("CID/DVD/LCD (letters from {IVXLCDM}, but a malformed roman numeral) mark again", () => {
    expect(spans("O CID informado estava errado.")).toEqual(["CID"]);
    expect(spans("Comprei um DVD novo ontem.")).toEqual(["DVD"]);
    expect(spans("A tela é um LCD antigo.")).toEqual(["LCD"]);
  });

  it("but a valid roman numeral (outside the allowlist) stays excluded", () => {
    expect(spans("O anexo MI e o item DL seguem no processo.")).toEqual([]);
  });
});

describe("sigla_sem_expansao — a letter run welded to digits is a fragment, not an acronym (A8)", () => {
  it.each([
    "A COVID-19 mudou tudo.",
    "O arquivo é MP3.",
    "A cúpula do G20 terminou.",
    "O IPTU-2025 vence em março.",
    "A norma NR-12 trata de máquinas.",
    "O padrão H.264 é antigo.",
  ])("does not mark a fragment of an alphanumeric designation: '%s'", (text) => {
    expect(spans(text)).toEqual([]);
  });

  it("welding is measured by offset: with a SPACE the acronym stands on its own and is marked", () => {
    expect(spans("Veja a NBR 5410 hoje.")).toEqual(["NBR"]);
    expect(spans("A Lei 8666 trata de licitações. O CADE analisou.")).toEqual(["CADE"]);
  });

  it("a digit BEFORE the letters welds just the same", () => {
    expect(spans("O padrão 4CIF ainda é usado.")).toEqual([]);
  });

  it("ordinary acronyms next to unrelated numbers are untouched", () => {
    expect(spans("Em 2025 a LGPD completou sete anos.")).toEqual(["LGPD"]);
  });
});
