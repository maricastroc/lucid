import { describe, expect, it } from "vitest";
import { buildCoverageReport, coverageReport, CRITERION_IDS, localePtBR } from "../src/lucid";
import type { ClauseTree, CriterionTaxonomy } from "../src/lucid";
import { CLAUSE_TREE } from "../src/locales/pt-BR/clauses";

const ABNT = "ABNT NBR ISO 24495-1" as const;

function iso(section: string): CriterionTaxonomy[string] {
  return {
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: ABNT, section },
  };
}

function tree(nodes: ClauseTree["nodes"], exhaustive = false): ClauseTree {
  return { standard: "TEST-STD", transcription: "synthetic", exhaustive, nodes };
}

const leaf = (section: string, extra: Partial<ClauseTree["nodes"][number]> = {}) => ({
  section,
  title: `clause ${section}`,
  parent: null,
  principleGroup: null,
  provisional: false,
  ...extra,
});

describe("clause coverage — authority cannot be invented", () => {
  it("every ISO criterion cites a clause the transcribed tree declares", () => {
    expect(() => coverageReport()).not.toThrow();
  });

  it("a criterion citing a clause absent from the tree is a build error", () => {
    const taxonomy: CriterionTaxonomy = { made_up: iso("9.9.9") };
    expect(() => buildCoverageReport(CLAUSE_TREE, taxonomy)).toThrow(/9\.9\.9/);
  });

  it("a clause with no coverage and no declared limit is a build error", () => {
    expect(() => buildCoverageReport(tree([leaf("5.1")]), {})).toThrow(/limite declarado/);
  });

  it("`partial` without any coverage is a build error", () => {
    const nodes = [leaf("5.1", { limit: { kind: "partial", reason: "..." } })];
    expect(() => buildCoverageReport(tree(nodes), {})).toThrow(/sem detector nem instrumento/);
  });

  it("a limit claiming absence over a clause that has a detector is a build error", () => {
    const nodes = [leaf("5.1", { limit: { kind: "unbuilt", reason: "..." } })];
    expect(() => buildCoverageReport(tree(nodes), { c: iso("5.1") })).toThrow(/afirma ausência/);
  });

  it("a clause with subclauses may not declare its own limit", () => {
    const nodes = [
      leaf("5.3", { limit: { kind: "unbuilt", reason: "..." } }),
      leaf("5.3.2", { parent: "5.3", limit: { kind: "unbuilt", reason: "..." } }),
    ];
    expect(() => buildCoverageReport(tree(nodes), {})).toThrow(/derivado delas/);
  });

  it("a parent pointing at a clause that does not exist is a build error", () => {
    expect(() => buildCoverageReport(tree([leaf("5.3.2", { parent: "5.3" })]), {})).toThrow(/não existe/);
  });
});

describe("clause coverage — status roll-up", () => {
  function statusOf(nodes: ClauseTree["nodes"], taxonomy: CriterionTaxonomy, section: string) {
    const report = buildCoverageReport(tree(nodes), taxonomy);
    return report.clauses.find((clause) => clause.section === section)?.status;
  }

  const parentWith = (kinds: readonly ("detected" | "unbuilt" | "out_of_reach")[]) =>
    [
      leaf("5.3"),
      ...kinds.map((kind, i) =>
        leaf(`5.3.${i + 1}`, {
          parent: "5.3",
          ...(kind === "detected" ? {} : { limit: { kind, reason: "declared" } }),
        }),
      ),
    ] as ClauseTree["nodes"];

  const taxonomyFor = (kinds: readonly string[]): CriterionTaxonomy =>
    Object.fromEntries(kinds.flatMap((kind, i) => (kind === "detected" ? [[`c${i}`, iso(`5.3.${i + 1}`)]] : [])));

  it("all children detected rolls up to detected", () => {
    const kinds = ["detected", "detected"] as const;
    expect(statusOf(parentWith(kinds), taxonomyFor(kinds), "5.3")).toBe("detected");
  });

  it("a mix of detected and uncovered children rolls up to partial", () => {
    const kinds = ["detected", "unbuilt"] as const;
    expect(statusOf(parentWith(kinds), taxonomyFor(kinds), "5.3")).toBe("partial");
  });

  it("no covered child rolls up to the weakest declared limit", () => {
    const kinds = ["unbuilt", "out_of_reach"] as const;
    expect(statusOf(parentWith(kinds), taxonomyFor(kinds), "5.3")).toBe("unbuilt");
  });

  it("only out-of-reach children roll up to out_of_reach", () => {
    const kinds = ["out_of_reach", "out_of_reach"] as const;
    expect(statusOf(parentWith(kinds), taxonomyFor(kinds), "5.3")).toBe("out_of_reach");
  });
});

describe("clause coverage — the published report", () => {
  const report = coverageReport();

  it("never publishes a share over a tree that does not claim to be complete", () => {
    expect(report.exhaustive).toBe(false);
    expect(report.detectedShare).toBeNull();
  });

  it("a tree may not claim completeness while any clause title is unverified", () => {
    const provisional = CLAUSE_TREE.nodes.some((node) => node.provisional);
    expect(provisional && CLAUSE_TREE.exhaustive).toBe(false);
  });

  it("every clause short of `detected` carries a reason, unless it is derived", () => {
    for (const clause of report.clauses) {
      if (clause.status === "detected" || clause.derived) continue;
      expect(clause.reason, `clause ${clause.section}`).toBeTruthy();
    }
  });

  it("clauses come out in canonical section order", () => {
    const sections = report.clauses.map((clause) => clause.section);
    expect(sections).toEqual([
      "5.1",
      "5.1.1",
      "5.1.2",
      "5.1.3",
      "5.1.4",
      "5.1.5",
      "5.1.6",
      "5.2",
      "5.2.1",
      "5.2.2",
      "5.2.3",
      "5.2.4",
      "5.2.5",
      "5.3",
      "5.3.1",
      "5.3.2",
      "5.3.3",
      "5.3.4",
      "5.3.5",
      "5.3.6",
      "5.3.7",
      "5.3.8",
      "5.4",
      "5.4.1",
      "5.4.2",
      "5.4.3",
      "5.4.4",
    ]);
  });

  it("accounts for every criterion exactly once: cited clause or outside the standard", () => {
    const cited = report.clauses.flatMap((clause) => clause.criteria);
    const outside = report.outsideStandard.map((entry) => entry.criterion);
    expect([...cited, ...outside].sort()).toEqual([...CRITERION_IDS].sort());
  });

  it("no criterion outside the standard is given a clause", () => {
    for (const entry of report.outsideStandard) {
      expect(localePtBR.taxonomy[entry.criterion]).not.toHaveProperty("normativeReference");
    }
  });

  it("reports Principle 4 as out of reach, not as a backlog item", () => {
    const usable = report.clauses.find((clause) => clause.section === "5.4");
    expect(usable?.status).toBe("out_of_reach");
  });

  it("covers Principle 1 through a named instrument rather than a detector", () => {
    const relevant = report.clauses.find((clause) => clause.section === "5.1");
    const content = report.clauses.find((clause) => clause.section === "5.1.6");
    expect(relevant?.criteria).toEqual([]);
    expect(content?.criteria).toEqual([]);
    expect(content?.instruments).toEqual(["checkBriefing"]);
    expect(relevant?.status).toBe("partial");
  });

  it("the clause titles are the ones in the standard, and none is provisional any more", () => {
    const bySection = new Map(CLAUSE_TREE.nodes.map((node) => [node.section, node]));
    expect(bySection.get("5.3.4")?.title).toBe("Escreva frases concisas");
    expect(bySection.get("5.3.5")?.title).toBe("Escreva parágrafos claros e concisos");
    expect(CLAUSE_TREE.nodes.every((node) => !node.provisional)).toBe(true);
  });

  it("no criterion cites a clause that has subclauses of its own", () => {
    const withChildren = new Set(CLAUSE_TREE.nodes.flatMap((node) => (node.parent === null ? [] : [node.parent])));
    for (const clause of report.clauses) {
      if (!withChildren.has(clause.section)) continue;
      expect(clause.criteria, `clause ${clause.section}`).toEqual([]);
    }
  });
});
