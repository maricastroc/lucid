import { describe, expect, it } from "vitest";
import {
  analyze,
  analyzeDocument,
  buildCoverageReport,
  buildDocument,
  buildStructuredDocument,
  coverageReport,
  ptDocumentServices,
} from "../src/lucid";
import type { ClauseTree, Finding, RawBlock } from "../src/lucid";
import { hasStructuralMarkers } from "../src/lucid/core/document/text-blocks";
import { metaFor } from "../src/app/lib/criteria";
import { copyFor } from "../src/app/i18n/copy";
import { GOLDEN_INTEGRADO } from "./golden/integrated-golden";

const BLOCKS: readonly RawBlock[] = [
  {
    kind: "heading",
    level: 1,
    text: "Do procedimento de concessão do auxílio e das obrigações do requerente perante a administração",
  },
  { kind: "heading", level: 3, text: "Quem pode pedir" },
  { kind: "paragraph", text: "O requerente faz jus ao auxílio. O documento supracitado foi juntado aos autos." },
  { kind: "list", ordered: false, items: ["Servidor efetivo"] },
];

const REQUIRES_DECLARED_STRUCTURE = [
  "heading_body_mismatch",
  "long_heading",
  "salto_de_nivel_titulo",
  "single_item_list",
] as const;

function asMarkdown(blocks: readonly RawBlock[]): string {
  return blocks
    .map((block) =>
      block.kind === "heading"
        ? `${"#".repeat(block.level)} ${block.text}`
        : block.kind === "list"
          ? block.items.map((item) => `- ${item}`).join("\n")
          : block.text,
    )
    .join("\n\n");
}

function asProse(blocks: readonly RawBlock[]): string {
  return blocks.map((block) => (block.kind === "list" ? block.items.join("\n") : block.text)).join("\n\n");
}

const criteriaOf = (findings: readonly Finding[]): string[] => [...new Set(findings.map((f) => f.criterion))].sort();

const structured = () => analyzeDocument(buildStructuredDocument(BLOCKS, ptDocumentServices)).findings;
const markdown = () => analyze(asMarkdown(BLOCKS)).findings;
const prose = () => analyze(asProse(BLOCKS)).findings;

describe("experiment 001 — coverage follows declared structure, not the container", () => {
  it("a structured import and marked-up plain text audit identically", () => {
    expect(criteriaOf(markdown())).toEqual(criteriaOf(structured()));
    expect(markdown()).toHaveLength(structured().length);
  });

  it("the same content as prose loses exactly the structure-dependent criteria", () => {
    const lost = criteriaOf(structured()).filter((criterion) => !criteriaOf(prose()).includes(criterion));
    expect(lost).toEqual([...REQUIRES_DECLARED_STRUCTURE]);
  });

  it("prose collapses every block to a paragraph, so no heading or list exists to audit", () => {
    expect([...new Set(buildDocument(asProse(BLOCKS)).blocks.map((b) => b.kind))]).toEqual(["paragraph"]);
    expect([...new Set(buildDocument(asMarkdown(BLOCKS)).blocks.map((b) => b.kind))].sort()).toEqual([
      "heading",
      "list",
      "paragraph",
    ]);
  });

  it("the engine can already tell the two apart", () => {
    expect(hasStructuralMarkers(asMarkdown(BLOCKS))).toBe(true);
    expect(hasStructuralMarkers(asProse(BLOCKS))).toBe(false);
  });

  it("the size of the loss, as published in the experiment", () => {
    expect(structured()).toHaveLength(6);
    expect(prose()).toHaveLength(2);
  });

  it("the corpus exercises these criteria — it did not when 001 was measured (0 of 20)", () => {
    const declaring = GOLDEN_INTEGRADO.filter((testCase) => hasStructuralMarkers(testCase.text));
    expect(declaring.map((testCase) => testCase.id)).toEqual(["estrutura_declarada_titulos_e_lista"]);
  });

  it("half of the detectors the map credits to Principle 2 depend on declared structure", () => {
    const findable = coverageReport().clauses.find((clause) => clause.section === "5.2");
    const structural = (findable?.criteria ?? []).filter((criterion) =>
      (REQUIRES_DECLARED_STRUCTURE as readonly string[]).includes(criterion),
    );
    expect(findable?.criteria).toHaveLength(4);
    expect(structural.sort()).toEqual(["long_heading", "salto_de_nivel_titulo"]);
  });
});

describe("the coverage map answers for a document, not only for the instrument (ADR-084)", () => {
  const proseDoc = () => buildDocument(asProse(BLOCKS));
  const markedDoc = () => buildDocument(asMarkdown(BLOCKS));

  it("declares which scope it is answering in", () => {
    expect(coverageReport().scope).toBe("instrument");
    expect(coverageReport(proseDoc()).scope).toBe("document");
  });

  it("the instrument map is silent about no criterion — it describes the tool, not a document", () => {
    expect(coverageReport().silentCriteria).toEqual([]);
    for (const clause of coverageReport().clauses) expect(clause.silent).toEqual([]);
  });

  it("over prose, it names exactly the criteria that had no object", () => {
    expect(coverageReport(proseDoc()).silentCriteria).toEqual([...REQUIRES_DECLARED_STRUCTURE]);
  });

  it("over a document that declares structure, nothing is silent", () => {
    expect(coverageReport(markedDoc()).silentCriteria).toEqual([]);
  });

  it("degrades Principle 2 from its instrument status when half its detectors cannot look", () => {
    const findable = coverageReport(proseDoc()).clauses.find((clause) => clause.section === "5.2");
    expect(findable?.silent).toEqual(["long_heading", "salto_de_nivel_titulo"]);
    expect(findable?.status).toBe("partial");
  });

  it("`unreachable` is derived from a document and can never be declared in the tree", () => {
    const nodes = [
      {
        section: "5.1",
        title: "t",
        parent: null,
        principleGroup: null,
        provisional: false,
        limit: { kind: "unreachable", reason: "..." },
      },
    ] as unknown as ClauseTree["nodes"];
    expect(() => buildCoverageReport({ standard: "T", transcription: "s", exhaustive: false, nodes }, {})).toThrow();
  });
});

describe("the interface says it too, in both languages (ADR-084)", () => {
  it("every criterion that can go silent has its own label — metaFor falls back to jargon otherwise", () => {
    for (const lang of ["pt-BR", "en"] as const) {
      for (const criterion of REQUIRES_DECLARED_STRUCTURE) {
        expect(metaFor(criterion, lang).ruleId, `${criterion} @ ${lang}`).toBe(criterion);
      }
    }
  });

  it("says what happened, how many criteria it cost, and what to do about it", () => {
    for (const lang of ["pt-BR", "en"] as const) {
      const t = copyFor(lang).overview;
      const text = t.structureCaveat(t.structureMissing.heading, 4);
      expect(text).toContain("4");
      expect(text).toContain(".docx");
      expect(text).toContain("#");
    }
  });

  it("agrees with itself on number: one criterion is singular", () => {
    const t = copyFor("pt-BR").overview;
    expect(t.structureCaveat(t.structureMissing.list, 1)).toContain("1 critério não pôde ser avaliado");
    expect(t.structureCaveat(t.structureMissing.list, 4)).toContain("4 critérios não puderam ser avaliados");
  });

  it("says only what is actually missing — never claims headings are absent when they exist", () => {
    const t = copyFor("pt-BR").overview;
    expect(t.structureCaveat(t.structureMissing.list, 1)).toContain("Este documento não tem listas");
    expect(t.structureCaveat(t.structureMissing.list, 1)).not.toContain("não tem títulos");

    const both = [t.structureMissing.heading, t.structureMissing.list].join(t.structureMissingJoin);
    expect(t.structureCaveat(both, 4)).toContain("Este documento não tem títulos nem listas");
  });
});
