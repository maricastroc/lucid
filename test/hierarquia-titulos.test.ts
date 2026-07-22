/**
 * Salto de nível de título (`salto_de_nivel_titulo`, 5.2). O PRIMEIRO detector que só existe porque
 * um formato estruturado (DOCX) traz `heading` com nível. Marca quando um título desce mais de um
 * nível de uma vez (h1 → h3). Texto puro não tem título → nunca dispara.
 */
import { describe, expect, it } from "vitest";
import { analyze, analyzeDocument, buildStructuredDocument, type Finding, type RawBlock } from "../src/lucid";
import { ptDocumentServices } from "../src/locales/pt-BR";

const H = (level: number, text: string): RawBlock => ({ kind: "heading", level, text });
const P = (text: string): RawBlock => ({ kind: "paragraph", text });

function saltos(blocks: RawBlock[]): Finding[] {
  return analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices)).findings.filter(
    (f) => f.criterion === "salto_de_nivel_titulo",
  );
}

describe("salto_de_nivel_titulo", () => {
  it("h1 → h3 pula o nível 2 → marca o h3 (warning, requiresHuman, sem sugestão)", () => {
    const found = saltos([H(1, "Introdução"), P("Um texto qualquer."), H(3, "Detalhe técnico")]);
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("Detalhe técnico");
    expect(found[0].severity).toBe("warning");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta).toMatchObject({ level: 3, prevLevel: 1 });
  });

  it("h1 → h2 → h3 (um degrau por vez) → não marca", () => {
    expect(saltos([H(1, "A"), H(2, "B"), H(3, "C")])).toHaveLength(0);
  });

  it("subir de volta (h3 → h1) fecha seções, não é salto → não marca", () => {
    expect(saltos([H(1, "A"), H(2, "B"), H(3, "C"), H(1, "D")])).toHaveLength(0);
  });

  it("cada salto descendente é marcado uma vez", () => {
    // h1 → h3 (salta 2) e depois h1 → h4 (salta 2 e 3): dois findings.
    const found = saltos([H(1, "A"), H(3, "B"), H(1, "C"), H(4, "D")]);
    expect(found.map((f) => f.span.text)).toEqual(["B", "D"]);
  });

  it("texto puro (sem títulos) nunca dispara", () => {
    const found = analyze("Um parágrafo aqui.\n\nOutro parágrafo ali.").findings.filter(
      (f) => f.criterion === "salto_de_nivel_titulo",
    );
    expect(found).toHaveLength(0);
  });
});
