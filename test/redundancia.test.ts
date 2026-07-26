import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";

describe("redundanciaPass — M3: false positives on legitimate usage removed from the curated lexicon", () => {
  it.each([
    "O programa vai criar novos empregos na região.",
    "Vamos manter o mesmo ritmo de trabalho.",
  ])("'%s' does not trigger redundancia", (text) => {
    const findings = analyze(text).findings.filter((f) => f.criterion === "redundancia");
    expect(findings).toHaveLength(0);
  });

  it("a genuine pleonasm is still detected (no regression from dropping the weak entries)", () => {
    const findings = analyze("A sentença ficou nula e sem efeito.").findings.filter(
      (f) => f.criterion === "redundancia",
    );
    expect(findings).toHaveLength(1);
  });
});
