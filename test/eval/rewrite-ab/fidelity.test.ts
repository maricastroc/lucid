import { describe, expect, it } from "vitest";
import { fidelityOf, legalRefs, markerCounts, normRelations, values } from "./fidelity";

const PREAMBULO =
  "Fica instituído o programa, com fundamento na Lei Federal nº 13.019/2014, na Lei Complementar " +
  "nº 119/2012, alterada pela Lei Complementar nº 178/2018, e no Decreto Estadual nº 32.810/2018.";

describe("legal references", () => {
  it("reads type, qualifier and number as one address", () => {
    expect(legalRefs("nos termos da Lei Complementar nº 119/2012")).toEqual(["lei complementar 119/2012"]);
  });

  it("does not confuse a Lei with a Lei Complementar of the same number", () => {
    expect(legalRefs("Lei nº 119/2012")).not.toEqual(legalRefs("Lei Complementar nº 119/2012"));
  });

  it("counts articles, paragraphs and incisos", () => {
    expect(legalRefs("o art. 12, § 2º, inciso III, da Lei nº 8.666/1993")).toEqual([
      "art:12",
      "inc:iii",
      "lei 8666/1993",
      "§:2",
    ]);
  });

  it("normalises the thousands dot so 8.666 and 8666 are the same law", () => {
    expect(legalRefs("Lei nº 8.666/1993")).toEqual(legalRefs("Lei 8666/1993"));
  });
});

describe("relations between norms", () => {
  it("binds the two norms an 'alterada pela' joins", () => {
    expect(normRelations(PREAMBULO).map((r) => r.key)).toContain(
      "lei complementar 119/2012 -[alteracao]-> lei complementar 178/2018",
    );
  });

  it("a rewrite that keeps both laws but drops the relation is caught", () => {
    const broken =
      "O programa segue estas normas: a Lei Federal nº 13.019/2014; a Lei Complementar nº 119/2012; " +
      "a Lei Complementar nº 178/2018; o Decreto Estadual nº 32.810/2018.";
    const report = fidelityOf(PREAMBULO, broken);
    expect(report.legalRefsLost).toEqual([]);
    expect(report.relationsLost).toContain("lei complementar 119/2012 -[alteracao]-> lei complementar 178/2018");
  });

  it("a rewrite that keeps the relation inside one item loses nothing", () => {
    const kept =
      "O programa segue estas normas: a Lei Federal nº 13.019/2014; a Lei Complementar nº 119/2012, " +
      "alterada pela Lei Complementar nº 178/2018; o Decreto Estadual nº 32.810/2018.";
    expect(fidelityOf(PREAMBULO, kept).relationsLost).toEqual([]);
  });

  it("does not invent a pair across an unrelated stretch of text", () => {
    const far = `Lei nº 1/2000. ${"palavra ".repeat(40)} alterada pela ${"palavra ".repeat(40)} Lei nº 2/2000.`;
    expect(normRelations(far)).toEqual([]);
  });
});

describe("obligation, condition and exception markers", () => {
  it("separates obligation from permission", () => {
    expect(markerCounts("O órgão deverá publicar o edital.").obrigacao).toBe(1);
    expect(markerCounts("O órgão poderá publicar o edital.").permissao).toBe(1);
  });

  it("flags an exception that disappeared", () => {
    const before = "O prazo é de 30 dias, salvo nos casos de força maior.";
    const after = "O prazo é de 30 dias.";
    expect(fidelityOf(before, after).markerFamiliesLost).toContain("excecao");
  });

  it("does not flag a family that survived in other words", () => {
    const before = "O interessado deverá apresentar os documentos.";
    const after = "Você tem de apresentar os documentos.";
    expect(fidelityOf(before, after).markerFamiliesLost).not.toContain("obrigacao");
  });
});

describe("values", () => {
  it("keeps money, percentage and period comparable across formatting", () => {
    expect(values("R$ 1.500,00, 15% em 30 dias")).toEqual(["15%", "30 dias", "R$1500,00"]);
  });

  it("flags a deadline that vanished", () => {
    expect(fidelityOf("pagar em 30 dias", "pagar no prazo").valuesLost).toEqual(["30 dias"]);
  });
});
