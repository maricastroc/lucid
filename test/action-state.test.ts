import { describe, expect, it } from "vitest";
import type { Finding } from "../src/lucid";
import { isSafe, requiresHumanThroughout } from "../src/app/lib/criteria";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    criterion: "jargon",
    category: "lexical",
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.2" },
    span: { start: 0, end: 12, text: "supracitadas" },
    severity: "warning",
    requiresHuman: true,
    justification: "",
    ...over,
  } as Finding;
}

const swap = finding({ requiresHuman: false, suggestion: "citadas acima" });
const explicitAgent = finding({ criterion: "passive_voice", requiresHuman: false });
const judgement = finding({ criterion: "passive_voice" });

describe("action state — the row badge marks the exception", () => {
  it("only a curated equivalent counts as a direct swap", () => {
    expect(isSafe(swap)).toBe(true);
    expect(isSafe(judgement)).toBe(false);
  });

  it("a finding the engine does not need a human for is still not a swap without an equivalent", () => {
    expect(isSafe(explicitAgent)).toBe(false);
  });
});

describe("requiresHumanThroughout — the claim the panel makes once per criterion", () => {
  it("holds when every occurrence carries requiresHuman", () => {
    expect(requiresHumanThroughout([judgement, judgement])).toBe(true);
  });

  it("does not hold for an occurrence the engine cleared, equivalent or not", () => {
    expect(requiresHumanThroughout([judgement, explicitAgent])).toBe(false);
    expect(requiresHumanThroughout([judgement, swap])).toBe(false);
  });

  it("claims nothing about an empty set", () => {
    expect(requiresHumanThroughout([])).toBe(false);
  });
});
