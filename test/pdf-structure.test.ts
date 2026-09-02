import { describe, expect, it } from "vitest";
import { classify, HEADING_RULES, recoverStructure } from "@/importers/pdf/structure";
import { normalizeListItem, type RawBlock } from "@/lucid";

const shape = (lines = 1, height = 10) => ({ height, left: 0, lines, page: 1, top: 0 });
const ctx = { bodyHeight: 10 };
const at = (text: string, lines = 1, height = 10) => classify(text, shape(lines, height), ctx);

const itemsOf = (blocks: readonly RawBlock[]) =>
  blocks
    .filter((b) => b.kind === "list")
    .flatMap((l) => (l.kind === "list" ? l.items.map((i) => normalizeListItem(i, l.ordered)) : []));

describe("a articulação que a LC 95/1998 define", () => {
  it("cada regra nomeia o dispositivo que a sustenta", () => {
    for (const rule of HEADING_RULES) expect(rule.reference).toMatch(/LC 95\/1998, art\. \d+/u);
  });

  it("reconhece a hierarquia da lei, com o nível que ela estabelece", () => {
    expect(at("TÍTULO II")).toMatchObject({ kind: "heading", level: 1 });
    expect(at("CAPÍTULO IV")).toMatchObject({ kind: "heading", level: 2 });
    expect(at("Seção III")).toMatchObject({ kind: "heading", level: 3 });
    expect(at("SUBSEÇÃO ÚNICA")).toMatchObject({ kind: "heading", level: 4 });
    expect(at("ANEXO XVII – Declaração")).toMatchObject({ kind: "heading", level: 1 });
  });

  it("não confunde a MENÇÃO ao dispositivo com o dispositivo", () => {
    const mention =
      "Anexo IV deste Edital, podendo o interessado contestar as razões de eventual indeferimento no prazo legal.";

    expect(classify(mention, shape(3), ctx).kind).toBe("paragraph");
  });
});

describe("numeração decimal: título de seção x provisão numerada", () => {
  it("linha curta, em caixa alta e sem ponto final é título", () => {
    expect(at("1. DO OBJETO E JUSTIFICATIVA")).toMatchObject({ kind: "heading", level: 2 });
    expect(at("14. SANÇÕES ADMINISTRATIVAS")).toMatchObject({ kind: "heading", level: 2 });
  });

  it("provisão numerada é item, no nível da profundidade da numeração", () => {
    expect(at("1.1. Constitui o objeto do presente Edital o chamamento público.")).toMatchObject({
      kind: "item",
      level: 1,
      ordered: true,
    });
    expect(at("2.1.1.1. Gestão / Unidade: 68100001 - Sediv.")).toMatchObject({ kind: "item", level: 3 });
  });

  it("frase longa que começa com número continua parágrafo, não vira título", () => {
    const long =
      "3. O proponente deverá apresentar toda a documentação exigida nos anexos deste Edital, sob pena de " +
      "desclassificação sumária do certame.";

    expect(classify(long, shape(2), ctx).kind).toBe("item");
  });
});

describe("inciso, alínea e marcador", () => {
  it("inciso em romano e alínea em letra viram item nos seus níveis", () => {
    expect(at("II - da habilitação jurídica;")).toMatchObject({ kind: "item", level: 1 });
    expect(at("a) certidão negativa de débitos;")).toMatchObject({ kind: "item", level: 2 });
  });

  it("marcador vira item não ordenado, sem o marcador no texto", () => {
    expect(at("• Documento de identidade")).toEqual({
      kind: "item",
      level: 0,
      ordered: false,
      text: "Documento de identidade",
    });
  });
});

describe("os blocos que saem", () => {
  it("agrupa itens seguidos numa lista e fecha ao encontrar título ou parágrafo", () => {
    const { blocks, headings, items } = recoverStructure(
      [
        "1. DO OBJETO",
        "1.1. Primeira provisão.",
        "1.2. Segunda provisão.",
        "Parágrafo comum que encerra a lista.",
        "2. DOS RECURSOS",
      ],
      [shape(), shape(), shape(), shape(2), shape()],
      10,
    );

    expect(blocks.map((b) => b.kind)).toEqual(["heading", "list", "paragraph", "heading"]);
    expect(headings).toBe(2);
    expect(items).toBe(2);
    expect(itemsOf(blocks)).toHaveLength(2);
  });

  it("declara de onde veio cada inferência", () => {
    const { references } = recoverStructure(["ANEXO I", "1. DAS DISPOSIÇÕES"], [shape(), shape()], 10);

    expect(references).toContain("LC 95/1998, art. 11");
    expect(references).toContain("numeração decimal do documento");
  });

  it("documento sem nenhuma marca continua só parágrafos", () => {
    const { blocks, headings, items } = recoverStructure(
      ["O primeiro parágrafo do texto.", "O segundo parágrafo do texto."],
      [shape(2), shape(2)],
      10,
    );

    expect(blocks.every((b) => b.kind === "paragraph")).toBe(true);
    expect(headings + items).toBe(0);
  });
});

describe("the document's own name", () => {
  const opening = (text: string, at = 0) => classify(text, shape(), { bodyHeight: 10, opening: at === 0 });

  it("is read as a heading when it opens the document", () => {
    const result = opening("EDITAL DE CHAMAMENTO PÚBLICO Nº 0001/2026");

    expect(result.kind).toBe("heading");
    expect(result.kind === "heading" && result.level).toBe(1);
  });

  it("says the evidence it was read from, like every other heading here", () => {
    const result = opening("OFÍCIO Nº 005843/2025/SEPLAG/SEXEC-GES");

    expect(result.kind === "heading" && result.reference).toBe("abertura do documento");
  });

  it("is only ever the first block: the same line further down stays a paragraph", () => {
    expect(opening("EDITAL DE CHAMAMENTO PÚBLICO Nº 0001/2026", 3).kind).toBe("paragraph");
  });

  it("refuses a lone word, which names nothing", () => {
    expect(opening("VAMOS").kind).toBe("paragraph");
    expect(opening("O QUE É").kind).toBe("paragraph");
  });

  it("refuses a sentence, however short: a title does not end in a full stop", () => {
    expect(opening("ESTE EDITAL FOI PUBLICADO HOJE.").kind).toBe("paragraph");
  });

  it("refuses running text that merely starts the page", () => {
    expect(opening("O Secretário da Diversidade, no uso de suas atribuições legais, torna público").kind).toBe(
      "paragraph",
    );
  });
});
