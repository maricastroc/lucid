import { describe, expect, it } from "vitest";
import { analyze, sortFindings } from "../src/lucid";
import type { Finding } from "../src/lucid/core/types";

function finding(overrides: Partial<Finding>): Finding {
  return {
    criterion: "passive_voice",
    category: "syntactic",
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.3" },
    span: { start: 0, end: 1, text: "x" },
    severity: "warning",
    requiresHuman: true,
    justification: "j",
    ...overrides,
  };
}

describe("sortFindings — desempate por cada chave, na ordem certa", () => {
  it("mesmo start, fim diferente → o de fim menor vem primeiro", () => {
    const a = finding({ span: { start: 5, end: 30, text: "a" } });
    const b = finding({ span: { start: 5, end: 10, text: "b" } });
    expect(sortFindings([a, b]).map((f) => f.span.text)).toEqual(["b", "a"]);
  });

  it("span idêntico, critérios diferentes → ordem alfabética de critério (jargon < long_sentence < nominalization < passive_voice)", () => {
    const span = { start: 3, end: 8, text: "s" };
    const p = finding({ span: { ...span }, criterion: "passive_voice" });
    const j = finding({ span: { ...span }, criterion: "jargon" });
    const l = finding({ span: { ...span }, criterion: "long_sentence" });
    const n = finding({ span: { ...span }, criterion: "nominalization" });
    expect(sortFindings([p, j, l, n]).map((f) => f.criterion)).toEqual([
      "jargon",
      "long_sentence",
      "nominalization",
      "passive_voice",
    ]);
  });

  it("empate total (start/end/criterion) preserva a ordem de inserção (sort estável)", () => {
    const base = { start: 0, end: 2, text: "t" };
    const a = finding({ span: { ...base }, justification: "A" });
    const b = finding({ span: { ...base }, justification: "B" });
    const c = finding({ span: { ...base }, justification: "C" });

    expect(sortFindings([a, b, c]).map((f) => f.justification)).toEqual(["A", "B", "C"]);
    expect(sortFindings([c, b, a]).map((f) => f.justification)).toEqual(["C", "B", "A"]);
  });

  it("não muta o array de entrada", () => {
    const entrada = [finding({ span: { start: 9, end: 10, text: "a" } }), finding({ span: { start: 1, end: 2, text: "b" } })];
    const copia = [...entrada];
    sortFindings(entrada);
    expect(entrada).toEqual(copia);
  });
});

describe("sortFindings — estabilidade sobre findings reais de analyze()", () => {
  const texto =
    "É preciso fazer a verificação do relatório supramencionado, que foi assinado pelo gestor " +
    "responsável, doravante, antes do prazo final estabelecido no edital publicado.";

  it("findings reais estão em ordem canônica não-decrescente", () => {
    const { findings } = analyze(texto);
    for (let i = 1; i < findings.length; i++) {
      const a = findings[i - 1];
      const b = findings[i];
      expect(a.span.start <= b.span.start).toBe(true);
      if (a.span.start === b.span.start) expect(a.span.end <= b.span.end).toBe(true);
    }
  });

  it("reordenar a entrada e reordenar de novo dá o mesmo resultado (idempotência de ordenação)", () => {
    const { findings } = analyze(texto);
    const embaralhado = [...findings].reverse();
    expect(sortFindings(embaralhado)).toEqual(findings);
    expect(sortFindings(sortFindings(embaralhado))).toEqual(findings);
  });

  it("no domínio real, cada (criterion, start) é único → a ordem é totalmente determinada", () => {
    const { findings } = analyze(texto);
    const chaves = findings.map((f) => `${f.criterion}@${f.span.start}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
