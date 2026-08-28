import { describe, it } from "vitest";
import { analyze } from "../src/lucid";

const A = "O pedido foi indeferido pela comissão por falta dos documentos supracitados. O prazo para recorrer é de dez dias.";
const B = "Você tem dez dias para recorrer. Envie os documentos pelo site.";

describe("probe", () => {
  it("dump", () => {
    for (const [name, t] of [["A", A], ["B", B]] as const) {
      const d = analyze(t);
      console.log(name, "score/findings:", d.findings.length);
      for (const f of d.findings) console.log("   ", f.criterion, JSON.stringify(f.span.text), f.severity, "requiresHuman:", f.requiresHuman, "suggestion:", f.suggestion);
    }
  });
});
