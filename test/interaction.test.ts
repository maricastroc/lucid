import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";

const FOUR_IN_ONE_SENTENCE =
  "É preciso fazer a verificação do relatório supramencionado, que foi assinado pelo gestor " +
  "responsável, doravante, antes do prazo final estabelecido no edital publicado.";

const PASSIVES_AND_JARGON =
  "Foi realizada a análise pela comissão e, em sede de recurso, o documento supracitado foi arquivado.";

describe("interaction — four criteria in the same sentence", () => {
  const d = analyze(FOUR_IN_ONE_SENTENCE);

  it("all four criteria show up, none suppresses another", () => {
    const criteria = new Set(d.findings.map((f) => f.criterion));
    expect(criteria).toEqual(new Set(["long_sentence", "passive_voice", "nominalization", "jargon"]));
  });

  it("the long_sentence span encloses the inner findings, but they are NOT deduplicated", () => {
    const long = d.findings.find((f) => f.criterion === "long_sentence")!;
    const inner = d.findings.filter((f) => f.criterion !== "long_sentence");
    expect(inner.length).toBeGreaterThan(0);
    for (const f of inner) {
      expect(f.span.start).toBeGreaterThanOrEqual(long.span.start);
      expect(f.span.end).toBeLessThanOrEqual(long.span.end);
    }

    expect(d.findings.length).toBe(5);
  });

  it("each finding reconstructs its own span; only jargon carries a curated equivalent (ADR-054)", () => {
    for (const f of d.findings) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
      if (f.suggestion !== undefined) {
        expect(f.suggestion.length).toBeGreaterThan(0);
        expect(f.criterion).toBe("jargon");
      }
    }
  });

  it("requiresHuman is per-finding: a passive with an agent and a single-mapping nominalization are false", () => {
    const passive = d.findings.find((f) => f.criterion === "passive_voice")!;
    const nominal = d.findings.find((f) => f.criterion === "nominalization")!;
    expect(passive.requiresHuman).toBe(false);
    expect(nominal.requiresHuman).toBe(false);
    expect(nominal.meta).toMatchObject({ baseVerb: "verificar" });
  });

  it("there are no duplicate findings (same criterion + same span)", () => {
    const keys = d.findings.map((f) => `${f.criterion}@${f.span.start}:${f.span.end}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("the findings are in non-decreasing (start, end) order", () => {
    for (let i = 1; i < d.findings.length; i++) {
      const a = d.findings[i - 1].span;
      const b = d.findings[i].span;
      expect(a.start < b.start || (a.start === b.start && a.end <= b.end)).toBe(true);
    }
  });

  it("the score reflects every active criterion, with coherent counts", () => {
    expect(d.score.totalFindings).toBe(5);
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    const passive = d.score.byCriterion.find((c) => c.criterion === "passive_voice")!;
    const nominal = d.score.byCriterion.find((c) => c.criterion === "nominalization")!;
    const long = d.score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    expect(jargon.count.warning).toBe(2);
    expect(passive.count.warning).toBe(1);
    expect(nominal.count.warning).toBe(1);
    expect(long.count.warning).toBe(1);
  });
});

describe("interaction — several passives and jargon terms with no long-sentence envelope", () => {
  const d = analyze(PASSIVES_AND_JARGON);

  it("two passives and two jargon terms coexist, with no long_sentence", () => {
    const counts: Record<string, number> = {};
    for (const f of d.findings) counts[f.criterion] = (counts[f.criterion] ?? 0) + 1;
    expect(counts).toEqual({ passive_voice: 2, jargon: 2 });
    expect(d.findings.some((f) => f.criterion === "long_sentence")).toBe(false);
  });

  it("the spans are disjoint and ordered; every excerpt reconstructs", () => {
    for (let i = 1; i < d.findings.length; i++) {
      expect(d.findings[i].span.start).toBeGreaterThanOrEqual(d.findings[i - 1].span.start);
    }
    for (const f of d.findings) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    }
  });

  it("jargon findings carry a suggestion; passives never do", () => {
    for (const f of d.findings) {
      if (f.criterion === "jargon") expect(f.suggestion).toBeTruthy();
      if (f.criterion === "passive_voice") expect(f.suggestion).toBeUndefined();
    }
  });
});
