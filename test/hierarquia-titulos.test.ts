import { describe, expect, it } from "vitest";
import { analyze, analyzeDocument, buildStructuredDocument, type Finding, type RawBlock } from "../src/lucid";
import { ptDocumentServices } from "../src/locales/pt-BR";

const H = (level: number, text: string): RawBlock => ({ kind: "heading", level, text });
const P = (text: string): RawBlock => ({ kind: "paragraph", text });

function levelJumps(blocks: RawBlock[]): Finding[] {
  return analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices)).findings.filter(
    (f) => f.criterion === "salto_de_nivel_titulo",
  );
}

describe("salto_de_nivel_titulo", () => {
  it("h1 → h3 skips level 2 → marks the h3 (warning, requiresHuman, no suggestion)", () => {
    const found = levelJumps([H(1, "Introdução"), P("Um texto qualquer."), H(3, "Detalhe técnico")]);
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("Detalhe técnico");
    expect(found[0].severity).toBe("warning");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta).toMatchObject({ level: 3, prevLevel: 1 });
  });

  it("h1 → h2 → h3 (one step at a time) → no finding", () => {
    expect(levelJumps([H(1, "A"), H(2, "B"), H(3, "C")])).toHaveLength(0);
  });

  it("going back up (h3 → h1) closes sections, it is not a jump → no finding", () => {
    expect(levelJumps([H(1, "A"), H(2, "B"), H(3, "C"), H(1, "D")])).toHaveLength(0);
  });

  it("each descending jump is marked once", () => {
    const found = levelJumps([H(1, "A"), H(3, "B"), H(1, "C"), H(4, "D")]);
    expect(found.map((f) => f.span.text)).toEqual(["B", "D"]);
  });

  it("plain text (no headings) never triggers", () => {
    const found = analyze("Um parágrafo aqui.\n\nOutro parágrafo ali.").findings.filter(
      (f) => f.criterion === "salto_de_nivel_titulo",
    );
    expect(found).toHaveLength(0);
  });
});
