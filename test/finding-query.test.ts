import { describe, expect, it } from "vitest";
import type { Finding } from "../src/lucid";
import { distinctTexts, normalize, queryFindings, type FindingQuery } from "../src/app/lib/finding-query";
import { EMPTY_MARKS, withMark, withMarks } from "../src/app/lib/review-marks";

function finding(criterion: string, start: number, text: string, over: Partial<Finding> = {}): Finding {
  return {
    criterion,
    category: "lexical",
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.2" },
    span: { start, end: start + text.length, text },
    severity: "warning",
    requiresHuman: true,
    justification: "",
    ...over,
  } as Finding;
}

const baseQuery: FindingQuery = {
  criterion: null,
  bucket: "all",
  state: "all",
  search: "",
  order: "severity",
};

const CORPUS: readonly Finding[] = [
  finding("long_sentence", 0, "uma frase muito longa", { severity: "error", category: "syntactic" }),
  finding("jargon", 40, "supracitadas", { requiresHuman: false, suggestion: "citadas acima" }),
  finding("passive_voice", 60, "foi realizada", { category: "syntactic" }),
  finding("jargon", 100, "Doravante"),
  finding("passive_voice", 130, "foi comunicada", { category: "syntactic" }),
  finding("jargon", 160, "supracitadas", { requiresHuman: false, suggestion: "citadas acima" }),
];

describe("finding query — grouping and order", () => {
  it("groups by criterion and orders groups by severity, then volume", () => {
    const { groups } = queryFindings(CORPUS, baseQuery, EMPTY_MARKS);
    expect(groups.map((g) => [g.criterion, g.items.length])).toEqual([
      ["long_sentence", 1],
      ["jargon", 3],
      ["passive_voice", 2],
    ]);
  });

  it("orders groups by position in the document when asked", () => {
    const { groups } = queryFindings(CORPUS, { ...baseQuery, order: "document" }, EMPTY_MARKS);
    expect(groups.map((g) => g.criterion)).toEqual(["long_sentence", "jargon", "passive_voice"]);
    expect(groups.map((g) => g.items[0].span.start)).toEqual([0, 40, 60]);
  });

  it("always lists occurrences within a group in document order", () => {
    const { groups } = queryFindings(CORPUS, baseQuery, EMPTY_MARKS);
    const jargon = groups.find((g) => g.criterion === "jargon");
    expect(jargon?.items.map((f) => f.span.start)).toEqual([40, 100, 160]);
  });

  it("hands prev/next exactly the concatenation of the visible groups", () => {
    const { groups, visible } = queryFindings(CORPUS, baseQuery, EMPTY_MARKS);
    expect(visible).toEqual(groups.flatMap((g) => g.items));
  });
});

describe("finding query — filters", () => {
  it("scopes to a single criterion without hiding that the others exist", () => {
    const { groups } = queryFindings(CORPUS, { ...baseQuery, criterion: "passive_voice" }, EMPTY_MARKS);
    expect(groups.map((g) => g.criterion)).toEqual(["passive_voice"]);
  });

  it("filters by the action the occurrence demands", () => {
    const safe = queryFindings(CORPUS, { ...baseQuery, bucket: "safe" }, EMPTY_MARKS);
    expect(safe.visible.map((f) => f.span.text)).toEqual(["supracitadas", "supracitadas"]);
    const human = queryFindings(CORPUS, { ...baseQuery, bucket: "human" }, EMPTY_MARKS);
    expect(human.visible).toHaveLength(4);
  });

  it("filters by review state, with pending meaning simply unmarked", () => {
    const marks = withMark(EMPTY_MARKS, CORPUS[1], "seen");
    const pending = queryFindings(CORPUS, { ...baseQuery, state: "pending" }, marks);
    expect(pending.visible).toHaveLength(5);
    const seen = queryFindings(CORPUS, { ...baseQuery, state: "seen" }, marks);
    expect(seen.visible.map((f) => f.span.start)).toEqual([40]);
    const dismissed = queryFindings(CORPUS, { ...baseQuery, state: "dismissed" }, marks);
    expect(dismissed.visible).toHaveLength(0);
  });

  it("searches the excerpt ignoring case, accents and surrounding space", () => {
    expect(queryFindings(CORPUS, { ...baseQuery, search: "SUPRACÍTADAS" }, EMPTY_MARKS).visible).toHaveLength(2);
    expect(queryFindings(CORPUS, { ...baseQuery, search: "  SupraCitadas " }, EMPTY_MARKS).visible).toHaveLength(2);
    expect(queryFindings(CORPUS, { ...baseQuery, search: "citad" }, EMPTY_MARKS).visible).toHaveLength(2);
    expect(queryFindings(CORPUS, { ...baseQuery, search: "nao existe" }, EMPTY_MARKS).visible).toHaveLength(0);
  });

  it("combines filters", () => {
    const marks = withMark(EMPTY_MARKS, CORPUS[1], "seen");
    const { visible } = queryFindings(
      CORPUS,
      { ...baseQuery, bucket: "safe", state: "pending", search: "supra" },
      marks,
    );
    expect(visible.map((f) => f.span.start)).toEqual([160]);
  });

  it("reports how many occurrences of a criterion the filters are hiding", () => {
    const marks = withMark(EMPTY_MARKS, CORPUS[1], "seen");
    const { groups } = queryFindings(CORPUS, { ...baseQuery, state: "pending" }, marks);
    expect(groups.find((g) => g.criterion === "jargon")?.filteredOut).toBe(1);
  });

  it("returns nothing at all when the filters exclude everything", () => {
    const marks = withMarks(EMPTY_MARKS, CORPUS, "seen");
    const { groups, visible } = queryFindings(CORPUS, { ...baseQuery, state: "pending" }, marks);
    expect(groups).toHaveLength(0);
    expect(visible).toHaveLength(0);
  });

  it("handles an empty diagnostic", () => {
    const { groups, visible } = queryFindings([], baseQuery, EMPTY_MARKS);
    expect(groups).toHaveLength(0);
    expect(visible).toHaveLength(0);
  });
});

describe("finding query — repetition", () => {
  it("counts distinct excerpts behind a pile of occurrences", () => {
    const jargon = CORPUS.filter((f) => f.criterion === "jargon");
    expect(jargon).toHaveLength(3);
    expect(distinctTexts(jargon)).toBe(2);
  });

  it("normalizes for comparison without mangling the stored text", () => {
    expect(normalize("  Supracitadas\n")).toBe("supracitadas");
    expect(normalize("ÓRGÃO")).toBe("orgao");
  });
});

describe("finding query — scale", () => {
  const many: readonly Finding[] = Array.from({ length: 2000 }, (_, i) =>
    finding(i % 3 === 0 ? "jargon" : i % 3 === 1 ? "passive_voice" : "long_sentence", i * 20, "supracitadas"),
  );

  it("keeps grouping and ordering coherent at two thousand occurrences", () => {
    const { groups, visible } = queryFindings(many, baseQuery, EMPTY_MARKS);
    expect(visible).toHaveLength(2000);
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(2000);
    for (const group of groups) {
      const starts = group.items.map((f) => f.span.start);
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    }
  });

  it("narrows two thousand occurrences to the pending ones after a batch mark", () => {
    const marks = withMarks(EMPTY_MARKS, many.slice(0, 1900), "seen");
    const { visible } = queryFindings(many, { ...baseQuery, state: "pending" }, marks);
    expect(visible).toHaveLength(100);
  });
});
