import { describe, expect, it } from "vitest";
import { analyzeDocument, buildStructuredDocument } from "../src/lucid";
import { htmlToRawBlocks } from "../src/importers/docx";
import { ptDocumentServices } from "../src/locales/pt-BR";

describe("htmlToRawBlocks — HTML semântico do mammoth → blocos neutros", () => {
  it("títulos com nível, parágrafos e listas ordenada/não-ordenada, em ordem", () => {
    const html =
      "<h1>Título</h1><p>Um parágrafo.</p><h2>Sub</h2><ul><li>item a</li><li>item b</li></ul><ol><li>primeiro</li></ol>";
    expect(htmlToRawBlocks(html)).toEqual([
      { kind: "heading", level: 1, text: "Título" },
      { kind: "paragraph", text: "Um parágrafo." },
      { kind: "heading", level: 2, text: "Sub" },
      { kind: "list", ordered: false, items: ["item a", "item b"] },
      { kind: "list", ordered: true, items: ["primeiro"] },
    ]);
  });

  it("remove tags inline e decodifica entidades", () => {
    expect(htmlToRawBlocks("<p>Texto <strong>forte</strong> &amp; <em>ênfase</em></p>")).toEqual([
      { kind: "paragraph", text: "Texto forte & ênfase" },
    ]);
  });

  it("ignora blocos e itens vazios", () => {
    expect(htmlToRawBlocks("<p></p><p>   </p><ul><li></li></ul>")).toEqual([]);
  });

  it("lista com sub-lista aninhada: nenhum item irmão desaparece, e nada fica colado sem espaço", () => {
    const html = "<ul><li>Item 1</li><li>Item 2<ul><li>Sub A</li><li>Sub B</li></ul></li><li>Item 3</li></ul>";
    expect(htmlToRawBlocks(html)).toEqual([
      { kind: "list", ordered: false, items: ["Item 1", "Item 2 Sub A Sub B", "Item 3"] },
    ]);
  });

  it("lista ordenada com sub-lista aninhada, seguida de outro bloco: o bloco seguinte continua sendo lido", () => {
    const html =
      "<h1>Título</h1><ol><li>Primeiro passo</li><li>Segundo passo<ol><li>Sub-passo A</li></ol></li><li>Terceiro passo</li></ol><p>Depois.</p>";
    expect(htmlToRawBlocks(html)).toEqual([
      { kind: "heading", level: 1, text: "Título" },
      { kind: "list", ordered: true, items: ["Primeiro passo", "Segundo passo Sub-passo A", "Terceiro passo"] },
      { kind: "paragraph", text: "Depois." },
    ]);
  });

  it("aninhamento de múltiplos níveis: o irmão depois do aninhamento profundo não some", () => {
    const html = "<ul><li>A<ul><li>B<ul><li>C</li></ul></li><li>D</li></ul></li><li>E</li></ul>";
    expect(htmlToRawBlocks(html)).toEqual([{ kind: "list", ordered: false, items: ["A B C D", "E"] }]);
  });
});

describe("buildStructuredDocument — blocos → Document canônico", () => {
  it("blocks tipados, offsets consistentes e frases isoladas por bloco", () => {
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
    if (list.kind !== "list") throw new Error("esperava list");
    expect(list.ordered).toBe(false);
    expect(list.items.map((i) => i.text)).toEqual(["item um", "item dois"]);
    for (const item of list.items) expect(doc.source.slice(item.start, item.end)).toBe(item.text);
  });

  it("os detectores rodam sobre o Document estruturado (analyzeDocument), cegos à origem", () => {
    const blocks = htmlToRawBlocks("<h1>Aviso</h1><p>O interessado deverá apresentar os documentos.</p>");
    const d = analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices));
    expect(d.findings.some((f) => f.criterion === "leitor_terceira_pessoa")).toBe(true);
  });

  it("documento vazio → sem blocos, sem frases, source vazio", () => {
    const doc = buildStructuredDocument([], ptDocumentServices);
    expect(doc.blocks).toHaveLength(0);
    expect(doc.sentences).toHaveLength(0);
    expect(doc.source).toBe("");
  });
});
