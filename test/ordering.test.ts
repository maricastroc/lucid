/**
 * Auditoria da ORDENAÇÃO FINAL — `sortFindings()` (docs/ARQUITETURA.md §7 passo 6).
 *
 * A ordenação canônica é por (span.start, span.end, criterion, principle), string por
 * code unit. Esta suíte demonstra que, para tudo que os quatro passes atuais podem
 * produzir, a ordem é TOTAL e determinística; e que o único empate residual possível
 * (findings idênticos em start/end/criterion/principle) é resolvido de forma estável
 * pela ordenação estável do JS (ES2019+), preservando a ordem determinística de
 * inserção. Ver ADR-009: a ordenação atual já é total e correta para o domínio real,
 * então é DOCUMENTADA e TESTADA, não alterada.
 *
 * `test/analyzer.test.ts` já cobre a robustez de `sortFindings` sob permutação de
 * entrada com 5 findings sintéticos; aqui focamos nos pares que a ordenação precisa
 * desempatar (mesmo start/fim diferente, mesmo span/critério diferente) e na
 * estabilidade sobre findings REAIS de `analyze()`.
 */
import { describe, expect, it } from "vitest";
import { analyze, sortFindings } from "../src/lucid/core/analyzer";
import type { Finding } from "../src/lucid/core/types";

function finding(overrides: Partial<Finding>): Finding {
  return {
    criterion: "passive_voice",
    category: "syntactic",
    principle: "5.3.3",
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
    const p = finding({ span: { ...span }, criterion: "passive_voice", principle: "5.3.3" });
    const j = finding({ span: { ...span }, criterion: "jargon", principle: "5.3.2" });
    const l = finding({ span: { ...span }, criterion: "long_sentence", principle: "5.3.4" });
    const n = finding({ span: { ...span }, criterion: "nominalization", principle: "5.3.3" });
    expect(sortFindings([p, j, l, n]).map((f) => f.criterion)).toEqual([
      "jargon",
      "long_sentence",
      "nominalization",
      "passive_voice",
    ]);
  });

  it("mesmo span e mesmo critério, princípios diferentes → ordem por princípio", () => {
    const span = { start: 0, end: 4, text: "z" };
    const a = finding({ span: { ...span }, criterion: "x", principle: "5.3.4" });
    const b = finding({ span: { ...span }, criterion: "x", principle: "5.3.2" });
    expect(sortFindings([a, b]).map((f) => f.principle)).toEqual(["5.3.2", "5.3.4"]);
  });

  it("empate total (start/end/criterion/principle) preserva a ordem de inserção (sort estável)", () => {
    const base = { start: 0, end: 2, text: "t" };
    const a = finding({ span: { ...base }, justification: "A" });
    const b = finding({ span: { ...base }, justification: "B" });
    const c = finding({ span: { ...base }, justification: "C" });
    // ordem de inserção preservada, deterministicamente
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
      const aKey: [number, number, string, string] = [a.span.start, a.span.end, a.criterion, a.principle];
      const bKey: [number, number, string, string] = [b.span.start, b.span.end, b.criterion, b.principle];
      expect(aKey[0] <= bKey[0]).toBe(true);
      if (aKey[0] === bKey[0]) expect(aKey[1] <= bKey[1]).toBe(true);
    }
  });

  it("reordenar a entrada e reordenar de novo dá o mesmo resultado (idempotência de ordenação)", () => {
    const { findings } = analyze(texto);
    const embaralhado = [...findings].reverse();
    expect(sortFindings(embaralhado)).toEqual(findings);
    expect(sortFindings(sortFindings(embaralhado))).toEqual(findings);
  });

  it("no domínio real, cada (criterion, start) é único → a ordem é totalmente determinada", () => {
    // dentro de um mesmo critério, os spans começam em posições distintas (cada pass avança
    // o cursor / ancora uma vez por posição), logo nunca há empate total real.
    const { findings } = analyze(texto);
    const chaves = findings.map((f) => `${f.criterion}@${f.span.start}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});
