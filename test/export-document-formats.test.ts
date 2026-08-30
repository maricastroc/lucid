import { describe, expect, it } from "vitest";
import { buildDocument, toRawBlocks, type RawBlock } from "@/lucid";
import { documentToHtml, documentToMarkdown } from "@/app/lib/export-document";

const BLOCKS: RawBlock[] = [
  { kind: "heading", level: 1, text: "Concessão do benefício" },
  { kind: "paragraph", text: "O pedido foi indeferido pela comissão." },
  { kind: "heading", level: 2, text: "Como recorrer" },
  { kind: "list", ordered: false, items: ["Reúna os documentos", "Preencha o formulário"] },
  { kind: "list", ordered: true, items: ["Primeiro passo", "Segundo passo"] },
];

describe("the revised document leaves as Markdown", () => {
  it("comes back through the project's own importer as the same blocks", () => {
    const markdown = documentToMarkdown(BLOCKS);

    expect(toRawBlocks(buildDocument(markdown).blocks)).toEqual(BLOCKS);
  });

  it("writes the heading level it was given, not a flattened one", () => {
    const markdown = documentToMarkdown(BLOCKS);

    expect(markdown).toContain("# Concessão do benefício");
    expect(markdown).toContain("## Como recorrer");
  });

  it("numbers an ordered list and bullets an unordered one", () => {
    const markdown = documentToMarkdown(BLOCKS);

    expect(markdown).toContain("- Reúna os documentos");
    expect(markdown).toContain("1. Primeiro passo");
    expect(markdown).toContain("2. Segundo passo");
  });

  it("gives back nothing for a document with no blocks, instead of a lone newline", () => {
    expect(documentToMarkdown([])).toBe("");
  });

  it("carries no audit stamp: the delivered text is the text, not a certificate", () => {
    const markdown = documentToMarkdown(BLOCKS);

    expect(markdown).not.toMatch(/lucid|configHash|auditoria|ISO 24495/i);
  });

  it("known limitation: a paragraph that opens with a list marker returns as a list", () => {
    const markdown = documentToMarkdown([{ kind: "paragraph", text: "- não é uma lista, é um travessão" }]);

    expect(toRawBlocks(buildDocument(markdown).blocks)[0].kind).toBe("list");
  });
});

describe("the revised document leaves as a printable page", () => {
  it("maps each block kind onto the tag the print stylesheet already knows", () => {
    const html = documentToHtml(BLOCKS);

    expect(html).toContain("<h1>Concessão do benefício</h1>");
    expect(html).toContain("<h2>Como recorrer</h2>");
    expect(html).toContain("<p>O pedido foi indeferido pela comissão.</p>");
    expect(html).toContain("<ul><li>Reúna os documentos</li><li>Preencha o formulário</li></ul>");
    expect(html).toContain("<ol><li>Primeiro passo</li><li>Segundo passo</li></ol>");
  });

  it("escapes the document instead of letting it write markup into the page", () => {
    const html = documentToHtml([{ kind: "paragraph", text: '<script>alert("x")</script> & assim por diante' }]);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("clamps a heading level the print stylesheet has no rule for", () => {
    const html = documentToHtml([{ kind: "heading", level: 9, text: "Fundo do poço" }]);

    expect(html).toContain("<h6>Fundo do poço</h6>");
  });

  it("carries no audit stamp either", () => {
    expect(documentToHtml(BLOCKS)).not.toMatch(/lucid|configHash|ISO 24495/i);
  });
});
