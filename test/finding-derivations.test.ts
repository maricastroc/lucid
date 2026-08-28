import { describe, expect, it } from "vitest";
import { analyze, CRITERION_IDS } from "../src/lucid";
import { CRITERION_ORDER } from "../src/app/lib/criteria";
import { cleanCriteria, hiddenHighlightCount, occurrenceCount, type FindingGroup } from "../src/app/lib/finding-query";

const WITH_FINDINGS = "O pedido foi indeferido pela comissão por falta dos documentos supracitados.";
const WITHOUT_FINDINGS = "Você tem dez dias para recorrer.";

const group = (criterion: string): FindingGroup =>
  ({ criterion, items: [], filteredOut: 0, maxSeverity: "warning" }) as unknown as FindingGroup;

describe("occurrenceCount — what the audit found for one criterion", () => {
  it("counts every severity of that criterion", () => {
    const diagnostic = analyze(WITH_FINDINGS);
    const passives = diagnostic.findings.filter((f) => f.criterion === "passive_voice").length;
    expect(occurrenceCount(diagnostic, "passive_voice")).toBe(passives);
  });

  it("answers zero for a criterion that found nothing, and for one that does not exist", () => {
    const diagnostic = analyze(WITHOUT_FINDINGS);
    expect(occurrenceCount(diagnostic, "passive_voice")).toBe(0);
    expect(occurrenceCount(diagnostic, "criterio_inexistente")).toBe(0);
  });
});

describe("cleanCriteria — the criteria that ran and found nothing", () => {
  it("on a clean text, every criterion is silent", () => {
    expect(cleanCriteria(analyze(WITHOUT_FINDINGS))).toHaveLength(CRITERION_IDS.length);
  });

  it("leaves out exactly the criteria that did find something", () => {
    const diagnostic = analyze(WITH_FINDINGS);
    const fired = new Set(diagnostic.findings.map((f) => f.criterion));
    const clean = cleanCriteria(diagnostic);

    expect(fired.size).toBeGreaterThan(0);
    for (const criterion of fired) expect(clean).not.toContain(criterion);
    expect(clean).toHaveLength(CRITERION_IDS.length - fired.size);
  });

  it("keeps the order the index uses, not the order the engine reports", () => {
    const clean = cleanCriteria(analyze(WITH_FINDINGS));
    const positions = clean.map((criterion) => (CRITERION_ORDER as readonly string[]).indexOf(criterion));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("an empty document still lists every criterion — nothing ran, nothing found", () => {
    expect(cleanCriteria(analyze(""))).toHaveLength(CRITERION_IDS.length);
  });
});

describe("hiddenHighlightCount — how many groups on screen are hidden in the document", () => {
  const groups = [group("passive_voice"), group("jargon"), group("long_sentence")];

  it("counts only the hidden ones that are actually on screen", () => {
    expect(hiddenHighlightCount(groups, new Set(["jargon", "long_sentence"]))).toBe(2);
  });

  it("ignores a hidden criterion with no group on screen", () => {
    expect(hiddenHighlightCount(groups, new Set(["mesoclise"]))).toBe(0);
  });

  it("is zero when nothing is hidden, and when there is nothing on screen", () => {
    expect(hiddenHighlightCount(groups, new Set())).toBe(0);
    expect(hiddenHighlightCount([], new Set(["jargon"]))).toBe(0);
  });
});
