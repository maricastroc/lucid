import { describe, expect, it } from "vitest";
import { analyze, analyzeDocument, buildStructuredDocument, type Finding, type RawBlock } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { ptDocumentServices } from "../src/locales/pt-BR";

const H = (text: string, level = 1): RawBlock => ({ kind: "heading", level, text });
const P = (text: string): RawBlock => ({ kind: "paragraph", text });
const L = (ordered: boolean, ...items: string[]): RawBlock => ({ kind: "list", ordered, items });

function findingsFor(blocks: RawBlock[], criterion: string, config = DEFAULT_CONFIG): Finding[] {
  return analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices), config).findings.filter(
    (f) => f.criterion === criterion,
  );
}

describe("long_heading", () => {
  it("a heading above the word limit → marks (reason=length, warning, requiresHuman, no suggestion)", () => {
    const long =
      "Como solicitar o benefício por incapacidade permanente junto ao instituto nacional do seguro social responsável";
    const found = findingsFor([H(long), P("Um parágrafo.")], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe(long);
    expect(found[0].normativeReference?.section).toBe("5.2.4");
    expect(found[0].category).toBe("structural");
    expect(found[0].severity).toBe("warning");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta).toMatchObject({ reason: "length" });
  });

  it("a short heading ending with a full stop → marks (reason=sentence)", () => {
    const found = findingsFor([H("Regras gerais do procedimento.")], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ reason: "sentence" });
  });

  it("a heading with two sentences → marks (reason=sentence)", () => {
    const found = findingsFor([H("Você tem direitos. Conheça-os aqui")], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ reason: "sentence", sentences: 2 });
  });

  it("a short heading with no full stop → no finding", () => {
    expect(findingsFor([H("Prazos e documentos")], "long_heading")).toHaveLength(0);
  });

  it("a question heading (ending in “?”) is good plain language → no finding", () => {
    expect(findingsFor([H("O que muda para você?")], "long_heading")).toHaveLength(0);
  });

  it("length takes priority — a long heading gets a single mark", () => {
    const longAndSentence =
      "Este título é deliberadamente longo o suficiente para ultrapassar com folga o limite configurado de palavras.";
    const found = findingsFor([H(longAndSentence)], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ reason: "length" });
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, longHeading: { enabled: false, maxWords: 12 } };
    expect(findingsFor([H("Regras gerais do procedimento.")], "long_heading", config)).toHaveLength(0);
  });

  it("plain text (no headings) never triggers", () => {
    const found = analyze("Uma frase qualquer aqui. E outra ali.").findings.filter(
      (f) => f.criterion === "long_heading",
    );
    expect(found).toHaveLength(0);
  });
});

describe("single_item_list", () => {
  it("a one-item list → marks (info — structural hygiene, requiresHuman, no suggestion)", () => {
    const found = findingsFor([P("Intro."), L(false, "Único item da lista")], "single_item_list");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("Único item da lista");
    expect(found[0].principleGroup).toBe("findable");
    expect(found[0].category).toBe("structural");
    expect(found[0].severity).toBe("info");
    expect(found[0].source).toBe("structural-heuristic");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta).toMatchObject({ ordered: false });
  });

  it("a list with two or more items → no finding", () => {
    expect(findingsFor([L(true, "Primeiro", "Segundo")], "single_item_list")).toHaveLength(0);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, singleItemList: { enabled: false } };
    expect(findingsFor([L(false, "Único")], "single_item_list", config)).toHaveLength(0);
  });

  it("plain text (no lists) never triggers", () => {
    const found = analyze("Primeiro isto. Depois aquilo.").findings.filter((f) => f.criterion === "single_item_list");
    expect(found).toHaveLength(0);
  });
});
