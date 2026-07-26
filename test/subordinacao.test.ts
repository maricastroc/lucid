import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "../src/lucid";

function subordinationFindings(text: string): Finding[] {
  return analyze(text).findings.filter((f) => f.criterion === "subordinacao_densa");
}

describe("subordinacao_densa — triggers on density, not on a lone connective", () => {
  it("3 subordinators in the same sentence → 1 finding (passage) per sentence, warning + requiresHuman", () => {
    const text =
      "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou, ainda que o gestor recuse.";
    const [f, ...rest] = subordinationFindings(text);
    expect(rest).toHaveLength(0);
    expect(f).toBeDefined();
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.span.text).toBe(text);
    expect(f.meta?.clauses).toBe(3);
  });

  it("2 subordinators (below the threshold of 3) → does not trigger", () => {
    const text = "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou.";
    expect(subordinationFindings(text)).toHaveLength(0);
  });
});

describe("subordinacao_densa — phrasal connectives count as one clause each", () => {
  it("multi-word connectives (para que / desde que / uma vez que) count", () => {
    const text =
      "Para que o pedido avance, desde que haja verba, uma vez que o setor aprove, o processo segue.";
    const found = subordinationFindings(text);
    expect(found).toHaveLength(1);
    expect(found[0].meta?.clauses).toBe(3);
  });

  it("a connective with a grave accent (à medida que) is recognized", () => {
    const text =
      "À medida que os prazos correm, para que o setor aja, desde que haja verba, o pedido avança.";
    const found = subordinationFindings(text);
    expect(found).toHaveLength(1);
    expect(found[0].meta?.clauses).toBe(3);
  });
});

describe("subordinacao_densa — precision: polysemous words do NOT count", () => {
  it("relative 'que', 'se' and 'caso' (the noun) do not inflate the count", () => {
    const text =
      "O documento que foi assinado, o caso que analisamos e o recurso que segue, se possível, vão em anexo.";
    expect(subordinationFindings(text)).toHaveLength(0);
  });
});

describe("subordinacao_densa — switchable off and deterministic", () => {
  it("same input → same output (byte for byte in span/among)", () => {
    const text =
      "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou, ainda que o gestor recuse.";
    expect(subordinationFindings(text)).toEqual(subordinationFindings(text));
  });
});
