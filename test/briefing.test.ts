import { describe, expect, it } from "vitest";
import { checkBriefing, EMPTY_BRIEFING, isBriefingDeclared, type ReaderBriefing } from "@/lucid";

function briefing(overrides: Partial<ReaderBriefing>): ReaderBriefing {
  return { ...EMPTY_BRIEFING, ...overrides };
}

describe("isBriefingDeclared — an empty briefing is 'not declared', never 'compliant'", () => {
  it("is false when nothing was answered", () => {
    expect(isBriefingDeclared(EMPTY_BRIEFING)).toBe(false);
    expect(isBriefingDeclared(briefing({ audience: "   ", mustFind: ["  "] }))).toBe(false);
  });

  it("is true as soon as any question is answered", () => {
    expect(isBriefingDeclared(briefing({ audience: "Servidor da secretaria" }))).toBe(true);
    expect(isBriefingDeclared(briefing({ mustFind: ["prazo"] }))).toBe(true);
  });
});

describe("checkBriefing — literal presence, and nothing more", () => {
  const text = "O prazo de recurso é de dez dias. O pedido vai à Secretaria de Finanças.";

  it("finds a declared expression and points at where it is", () => {
    const check = checkBriefing(text, briefing({ mustFind: ["prazo de recurso"] }));
    expect(check.coverage).toHaveLength(1);
    expect(check.coverage[0].occurrences).toHaveLength(1);
    const span = check.coverage[0].occurrences[0];
    expect(text.slice(span.start, span.end)).toBe("prazo de recurso");
    expect(check.missing).toEqual([]);
  });

  it("reports what it did not find without claiming the subject is absent", () => {
    const check = checkBriefing(text, briefing({ mustFind: ["valor da taxa"] }));
    expect(check.coverage[0].occurrences).toEqual([]);
    expect(check.missing).toEqual(["valor da taxa"]);
  });

  it("ignores case differences", () => {
    const check = checkBriefing(text, briefing({ mustFind: ["SECRETARIA DE FINANÇAS"] }));
    expect(check.coverage[0].occurrences).toHaveLength(1);
  });

  it("matches across a line break, because the reader does not see it", () => {
    const wrapped = "O prazo de\nrecurso é de dez dias.";
    const check = checkBriefing(wrapped, briefing({ mustFind: ["prazo de recurso"] }));
    expect(check.coverage[0].occurrences).toHaveLength(1);
    const span = check.coverage[0].occurrences[0];
    expect(wrapped.slice(span.start, span.end)).toBe("prazo de\nrecurso");
  });

  it("does not match inside a bigger word", () => {
    const check = checkBriefing("O prazoso não existe. Prazo, sim.", briefing({ mustFind: ["prazo"] }));
    expect(check.coverage[0].occurrences).toHaveLength(1);
  });

  it("keeps accents apart — matching is literal, not a spell checker (A12a)", () => {
    const check = checkBriefing("A decisão foi publicada.", briefing({ mustFind: ["decisao"] }));
    expect(check.coverage[0].occurrences).toEqual([]);
  });

  it("returns every occurrence, not just the first", () => {
    const check = checkBriefing("Prazo aqui. Outro prazo ali. E prazo acolá.", briefing({ mustFind: ["prazo"] }));
    expect(check.coverage[0].occurrences).toHaveLength(3);
  });

  it("skips blank entries instead of matching everything", () => {
    const check = checkBriefing(text, briefing({ mustFind: ["  ", "prazo"] }));
    expect(check.coverage).toHaveLength(1);
    expect(check.coverage[0].expression).toBe("prazo");
  });

  it("survives punctuation right next to the expression", () => {
    const check = checkBriefing("Informe o prazo, por favor.", briefing({ mustFind: ["prazo"] }));
    expect(check.coverage[0].occurrences).toHaveLength(1);
  });

  it("reports which questions were answered without scoring them", () => {
    const check = checkBriefing(text, briefing({ audience: "Cidadão", purpose: "Saber o prazo" }));
    expect(check.answered).toEqual({ audience: true, purpose: true, priorKnowledge: false });
    expect(check.declared).toBe(true);
  });

  it("says 'not declared' for an empty briefing and finds nothing to report", () => {
    const check = checkBriefing(text, EMPTY_BRIEFING);
    expect(check.declared).toBe(false);
    expect(check.coverage).toEqual([]);
    expect(check.missing).toEqual([]);
  });
});

describe("checkBriefing — spans reconstruct, like every other span in the engine (I3)", () => {
  it("every occurrence slices back to its own text", () => {
    const text = "O   prazo\tde  recurso vence hoje. O prazo de recurso é fatal.";
    const check = checkBriefing(text, briefing({ mustFind: ["prazo de recurso"] }));
    for (const span of check.coverage[0].occurrences) {
      expect(text.slice(span.start, span.end)).toBe(span.text);
    }
    expect(check.coverage[0].occurrences).toHaveLength(2);
  });

  it("keeps offsets right when the text has characters outside the BMP", () => {
    const text = "Veja 🇧🇷 o prazo de recurso agora.";
    const check = checkBriefing(text, briefing({ mustFind: ["prazo de recurso"] }));
    const span = check.coverage[0].occurrences[0];
    expect(text.slice(span.start, span.end)).toBe("prazo de recurso");
  });
});

describe("checkBriefing — determinism", () => {
  it("produces byte-identical output for the same input", () => {
    const input = briefing({ audience: "Cidadão", mustFind: ["prazo", "taxa"] });
    const text = "O prazo é de dez dias e a taxa é de R$ 50,00.";
    expect(JSON.stringify(checkBriefing(text, input))).toBe(JSON.stringify(checkBriefing(text, input)));
  });
});
