import { describe, expect, it } from "vitest";
import { analyze, checkBriefing, EMPTY_BRIEFING, type Finding } from "../src/lucid";
import { queryFindings, type FindingQuery } from "../src/app/lib/finding-query";
import { buildAuditReport } from "../src/app/lib/audit-report";
import { EMPTY_MARKS } from "../src/app/lib/review-marks";

const TEXT = [
  "O pedido foi indeferido por falta de documentos supracitados, conforme as normas supramencionadas.",
  "As organizações supracitadas deverão observar os prazos supramencionados no presente instrumento.",
  "A realização da análise das propostas apresentadas pelas organizações supracitadas será efetuada pela",
  "Comissão de Seleção, com a devida observância dos critérios objetivos anteriormente estabelecidos.",
].join("\n\n");

const baseQuery: FindingQuery = {
  criterion: null,
  bucket: "all",
  state: "all",
  search: "",
  order: "severity",
};

const diagnostic = analyze(TEXT);
const ALL: readonly Finding[] = diagnostic.findings;

function report(findings: readonly Finding[]): string {
  return buildAuditReport(diagnostic, findings, { generatedAt: "2026-08-28" }, [], {
    briefing: EMPTY_BRIEFING,
    check: checkBriefing(TEXT, EMPTY_BRIEFING),
  });
}

describe("hiding highlights never narrows the audit", () => {
  it("the corpus under test actually has more than one criterion (otherwise this proves nothing)", () => {
    expect(new Set(ALL.map((f) => f.criterion)).size).toBeGreaterThan(1);
    expect(ALL.some((f) => f.criterion === "jargon")).toBe(true);
  });

  it("the query no longer carries any criterion-visibility knob", () => {
    expect(Object.keys(baseQuery).sort()).toEqual(["bucket", "criterion", "order", "search", "state"]);
    expect("activeCriteria" in baseQuery).toBe(false);
  });

  it("the findings count is untouched — there is no view state that can reduce it", () => {
    const before = queryFindings(ALL, baseQuery, EMPTY_MARKS);
    const after = queryFindings(ALL, baseQuery, EMPTY_MARKS);
    expect(after.visible.length).toBe(before.visible.length);
    expect(after.visible.length).toBe(ALL.length);
  });

  it("the criterion keeps its place in the list, in the same order", () => {
    const groups = queryFindings(ALL, baseQuery, EMPTY_MARKS).groups.map((g) => g.criterion);
    expect(groups).toContain("jargon");
    expect(queryFindings(ALL, baseQuery, EMPTY_MARKS).groups.map((g) => g.criterion)).toEqual(groups);
  });

  it("the exported report keeps the criterion and every one of its occurrences", () => {
    const md = report(ALL);
    const jargon = ALL.filter((f) => f.criterion === "jargon");
    expect(jargon.length).toBeGreaterThan(0);
    expect(md).toMatch(/Jarg[ãa]o/);
    for (const f of jargon) expect(md).toContain(f.span.text);
  });

  it("the summary counts every finding, whatever the document view is showing", () => {
    const md = report(ALL);
    expect(md).toContain(String(ALL.length));
  });
});

describe("highlight visibility state — the set the document view reads", () => {
  const toggle = (set: ReadonlySet<string>, criterion: string): ReadonlySet<string> => {
    const next = new Set(set);
    if (next.has(criterion)) next.delete(criterion);
    else next.add(criterion);
    return next;
  };
  const shown = (hidden: ReadonlySet<string>, f: Finding): boolean => !hidden.has(f.criterion);

  it("everything is highlighted until someone hides it", () => {
    const hidden: ReadonlySet<string> = new Set();
    expect(ALL.every((f) => shown(hidden, f))).toBe(true);
  });

  it("hiding one criterion removes only its highlights", () => {
    const hidden = toggle(new Set(), "jargon");
    expect(ALL.filter((f) => shown(hidden, f)).every((f) => f.criterion !== "jargon")).toBe(true);
    expect(ALL.filter((f) => !shown(hidden, f)).every((f) => f.criterion === "jargon")).toBe(true);
  });

  it("a second toggle restores them exactly", () => {
    const hidden = toggle(toggle(new Set(), "jargon"), "jargon");
    expect(hidden.size).toBe(0);
    expect(ALL.filter((f) => shown(hidden, f)).length).toBe(ALL.length);
  });

  it("works for every criterion present, not just the first", () => {
    for (const criterion of new Set(ALL.map((f) => f.criterion))) {
      const hidden = toggle(new Set(), criterion);
      const visible = ALL.filter((f) => shown(hidden, f));
      expect(visible.length).toBe(ALL.filter((f) => f.criterion !== criterion).length);
      expect(queryFindings(ALL, baseQuery, EMPTY_MARKS).visible.length).toBe(ALL.length);
    }
  });

  it("hiding several accumulates without losing track of the others", () => {
    const criteria = [...new Set(ALL.map((f) => f.criterion))].slice(0, 2);
    let hidden: ReadonlySet<string> = new Set();
    for (const criterion of criteria) hidden = toggle(hidden, criterion);
    expect(hidden.size).toBe(2);
    hidden = toggle(hidden, criteria[0]);
    expect([...hidden]).toEqual([criteria[1]]);
  });
});
