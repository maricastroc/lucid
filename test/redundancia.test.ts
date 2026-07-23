import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";

describe("redundanciaPass — M3: falsos positivos em uso legítimo removidos do léxico curado", () => {
  it.each([
    "O programa vai criar novos empregos na região.",
    "Vamos manter o mesmo ritmo de trabalho.",
  ])("'%s' não dispara redundancia", (text) => {
    const findings = analyze(text).findings.filter((f) => f.criterion === "redundancia");
    expect(findings).toHaveLength(0);
  });

  it("pleonasmo genuíno continua detectado (não regrediu ao remover as entradas fracas)", () => {
    const findings = analyze("A sentença ficou nula e sem efeito.").findings.filter(
      (f) => f.criterion === "redundancia",
    );
    expect(findings).toHaveLength(1);
  });
});
