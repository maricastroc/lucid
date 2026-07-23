import { describe, expect, it } from "vitest";
import { CRITERION_IDS } from "../src/lucid";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { CRITERION_META, CRITERION_ORDER } from "../src/app/lib/criteria";

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("registro de critérios (ADR-029)", () => {
  it("CRITERION_IDS não tem duplicatas", () => {
    expect(sorted(CRITERION_IDS)).toEqual(sorted([...new Set(CRITERION_IDS)]));
  });

  it("PASSES e CRITERION_IDS descrevem EXATAMENTE o mesmo conjunto", () => {
    const dosPasses = sorted(PASSES.map((p) => p.criterion));

    expect(dosPasses).toEqual(sorted([...new Set(dosPasses)]));
    expect(dosPasses).toEqual(sorted(CRITERION_IDS));
  });

  it("CRITERION_META cobre exatamente os CRITERION_IDS (completude da apresentação)", () => {
    expect(sorted(Object.keys(CRITERION_META))).toEqual(sorted(CRITERION_IDS));
  });

  it("CRITERION_ORDER é uma permutação de CRITERION_IDS (todo critério é ordenado, sem sobra)", () => {
    expect(sorted(CRITERION_ORDER)).toEqual(sorted(CRITERION_IDS));
  });
});
