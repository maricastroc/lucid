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

describe("sortFindings — tie-breaking on each key, in the right order", () => {
  it("same start, different end → the shorter end comes first", () => {
    const a = finding({ span: { start: 5, end: 30, text: "a" } });
    const b = finding({ span: { start: 5, end: 10, text: "b" } });
    expect(sortFindings([a, b]).map((f) => f.span.text)).toEqual(["b", "a"]);
  });

  it("identical span, different criteria → alphabetical by criterion (jargon < long_sentence < nominalization < passive_voice)", () => {
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

  it("a full tie (start/end/criterion) preserves insertion order (stable sort)", () => {
    const base = { start: 0, end: 2, text: "t" };
    const a = finding({ span: { ...base }, justification: "A" });
    const b = finding({ span: { ...base }, justification: "B" });
    const c = finding({ span: { ...base }, justification: "C" });

    expect(sortFindings([a, b, c]).map((f) => f.justification)).toEqual(["A", "B", "C"]);
    expect(sortFindings([c, b, a]).map((f) => f.justification)).toEqual(["C", "B", "A"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      finding({ span: { start: 9, end: 10, text: "a" } }),
      finding({ span: { start: 1, end: 2, text: "b" } }),
    ];
    const copy = [...input];
    sortFindings(input);
    expect(input).toEqual(copy);
  });
});

describe("sortFindings — stability over real findings from analyze()", () => {
  const text =
    "É preciso fazer a verificação do relatório supramencionado, que foi assinado pelo gestor " +
    "responsável, doravante, antes do prazo final estabelecido no edital publicado.";

  it("real findings come in non-decreasing canonical order", () => {
    const { findings } = analyze(text);
    for (let i = 1; i < findings.length; i++) {
      const a = findings[i - 1];
      const b = findings[i];
      expect(a.span.start <= b.span.start).toBe(true);
      if (a.span.start === b.span.start) expect(a.span.end <= b.span.end).toBe(true);
    }
  });

  it("reordering the input and sorting again gives the same result (sort idempotence)", () => {
    const { findings } = analyze(text);
    const shuffled = [...findings].reverse();
    expect(sortFindings(shuffled)).toEqual(findings);
    expect(sortFindings(sortFindings(shuffled))).toEqual(findings);
  });

  it("in the real domain each (criterion, start) is unique → the order is fully determined", () => {
    const { findings } = analyze(text);
    const keys = findings.map((f) => `${f.criterion}@${f.span.start}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
