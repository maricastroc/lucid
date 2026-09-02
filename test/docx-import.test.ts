import { describe, expect, it } from "vitest";
import { analyzeDocument, buildStructuredDocument } from "../src/lucid";
import { htmlToRawBlocks } from "../src/importers/html-blocks";
import { ptDocumentServices } from "../src/locales/pt-BR";

describe("htmlToRawBlocks — mammoth's semantic HTML → neutral blocks", () => {
  it("headings with a level, paragraphs and ordered/unordered lists, in order", () => {
    const html =
      "<h1>Título</h1><p>Um parágrafo.</p><h2>Sub</h2><ul><li>item a</li><li>item b</li></ul><ol><li>primeiro</li></ol>";
    expect(htmlToRawBlocks(html)).toEqual([
      { kind: "heading", level: 1, text: "Título" },
      { kind: "paragraph", text: "Um parágrafo." },
      { kind: "heading", level: 2, text: "Sub" },
      {
        kind: "list",
        ordered: false,
        items: [
          { blocks: ["item a"], level: 0, ordered: false },
          { blocks: ["item b"], level: 0, ordered: false },
        ],
      },
      { kind: "list", ordered: true, items: [{ blocks: ["primeiro"], level: 0, ordered: true }] },
    ]);
  });

  it("strips inline tags and decodes entities", () => {
    expect(htmlToRawBlocks("<p>Texto <strong>forte</strong> &amp; <em>ênfase</em></p>")).toEqual([
      { kind: "paragraph", text: "Texto forte & ênfase" },
    ]);
  });

  it("ignores empty blocks and items", () => {
    expect(htmlToRawBlocks("<p></p><p>   </p><ul><li></li></ul>")).toEqual([]);
  });

  it("a nested sub-list becomes items of its own, one level down, in reading order", () => {
    const html = "<ul><li>Item 1</li><li>Item 2<ul><li>Sub A</li><li>Sub B</li></ul></li><li>Item 3</li></ul>";
    expect(htmlToRawBlocks(html)).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [
          { blocks: ["Item 1"], level: 0, ordered: false },
          { blocks: ["Item 2"], level: 0, ordered: false },
          { blocks: ["Sub A"], level: 1, ordered: false },
          { blocks: ["Sub B"], level: 1, ordered: false },
          { blocks: ["Item 3"], level: 0, ordered: false },
        ],
      },
    ]);
  });

  it("an ordered list with a nested sub-list, followed by another block: the next block is still read", () => {
    const html =
      "<h1>Título</h1><ol><li>Primeiro passo</li><li>Segundo passo<ol><li>Sub-passo A</li></ol></li><li>Terceiro passo</li></ol><p>Depois.</p>";
    expect(htmlToRawBlocks(html)).toEqual([
      { kind: "heading", level: 1, text: "Título" },
      {
        kind: "list",
        ordered: true,
        items: [
          { blocks: ["Primeiro passo"], level: 0, ordered: true },
          { blocks: ["Segundo passo"], level: 0, ordered: true },
          { blocks: ["Sub-passo A"], level: 1, ordered: true },
          { blocks: ["Terceiro passo"], level: 0, ordered: true },
        ],
      },
      { kind: "paragraph", text: "Depois." },
    ]);
  });

  it("multi-level nesting keeps every level, and the sibling after the deep nesting", () => {
    const html = "<ul><li>A<ul><li>B<ul><li>C</li></ul></li><li>D</li></ul></li><li>E</li></ul>";
    expect(htmlToRawBlocks(html)).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [
          { blocks: ["A"], level: 0, ordered: false },
          { blocks: ["B"], level: 1, ordered: false },
          { blocks: ["C"], level: 2, ordered: false },
          { blocks: ["D"], level: 1, ordered: false },
          { blocks: ["E"], level: 0, ordered: false },
        ],
      },
    ]);
  });
});

describe("buildStructuredDocument — blocks → canonical Document", () => {
  it("typed blocks, consistent offsets and sentences isolated per block", () => {
    const blocks = htmlToRawBlocks(
      "<h1>Introdução</h1><p>Primeira frase. Segunda frase aqui.</p><ul><li>item um</li><li>item dois</li></ul>",
    );
    const doc = buildStructuredDocument(blocks, ptDocumentServices);

    expect(doc.blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "list"]);
    for (const b of doc.blocks) expect(doc.source.slice(b.start, b.end)).toBe(b.text);

    const heading = doc.blocks[0];
    expect(heading.kind === "heading" && heading.level).toBe(1);

    const para = doc.blocks[1];
    expect(para.kind === "paragraph" && para.sentences.length).toBe(2);

    const list = doc.blocks[2];
    if (list.kind !== "list") throw new Error("expected a list block");
    expect(list.ordered).toBe(false);
    expect(list.items.map((i) => i.text)).toEqual(["item um", "item dois"]);
    for (const item of list.items) expect(doc.source.slice(item.start, item.end)).toBe(item.text);
  });

  it("the detectors run over the structured Document (analyzeDocument), blind to its origin", () => {
    const blocks = htmlToRawBlocks("<h1>Aviso</h1><p>O interessado deverá apresentar os documentos.</p>");
    const d = analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices));
    expect(d.findings.some((f) => f.criterion === "leitor_terceira_pessoa")).toBe(true);
  });

  it("an empty document → no blocks, no sentences, empty source", () => {
    const doc = buildStructuredDocument([], ptDocumentServices);
    expect(doc.blocks).toHaveLength(0);
    expect(doc.sentences).toHaveLength(0);
    expect(doc.source).toBe("");
  });
});
