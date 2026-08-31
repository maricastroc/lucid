import { describe, expect, it } from "vitest";
import { ptDocumentServices } from "../src/lucid";
import { importDocx, type DocxResult } from "../src/importers/docx";
import { buildDocx, documentXml, outlineStyle, para, styled, stylesXml } from "./support/docx";

async function importOf(parts: Record<string, string>): Promise<DocxResult> {
  return importDocx(buildDocx(parts), ptDocumentServices);
}

function value(result: DocxResult) {
  if (!result.ok) throw new Error(`expected an import, got refusal "${result.refusal}"`);
  return result.value;
}

describe("import refuses what the file itself leaves ambiguous", () => {
  it("refuses a file whose tracked changes were never resolved", async () => {
    const result = await importOf({
      "word/document.xml": documentXml(
        `<w:p><w:r><w:t xml:space="preserve">O prazo é de </w:t></w:r>` +
          `<w:del w:id="1" w:author="a"><w:r><w:delText>30</w:delText></w:r></w:del>` +
          `<w:ins w:id="2" w:author="b"><w:r><w:t>60</w:t></w:r></w:ins>` +
          `<w:r><w:t xml:space="preserve"> dias.</w:t></w:r></w:p>`,
      ),
    });

    expect(result).toEqual({ ok: false, refusal: "tracked_changes" });
  });

  it("refuses an insertion alone — one unresolved revision is enough", async () => {
    const result = await importOf({
      "word/document.xml": documentXml(
        `<w:p><w:ins w:id="1" w:author="a"><w:r><w:t>Parágrafo inserido.</w:t></w:r></w:ins></w:p>`,
      ),
    });

    expect(result).toEqual({ ok: false, refusal: "tracked_changes" });
  });

  it("does not mistake table border properties for a revision", async () => {
    const result = await importOf({
      "word/document.xml": documentXml(
        `<w:tbl><w:tblPr><w:tblBorders><w:insideH w:val="single"/><w:insideV w:val="single"/></w:tblBorders></w:tblPr>` +
          `<w:tr><w:tc>${para("Prazo")}</w:tc></w:tr></w:tbl>`,
      ),
    });

    expect(result.ok).toBe(true);
  });

  it("refuses a file with nothing readable — an empty document is not a clean one", async () => {
    const result = await importOf({
      "word/document.xml": documentXml(`<w:p/><w:p><w:r><w:t>   </w:t></w:r></w:p>`),
    });

    expect(result).toEqual({ ok: false, refusal: "no_readable_content" });
  });

  it("refuses bytes that are not a readable package", async () => {
    const result = await importDocx(new TextEncoder().encode("isto não é um docx"), ptDocumentServices);
    expect(result).toEqual({ ok: false, refusal: "unreadable" });
  });

  it("does not refuse over an unknown paragraph style that is not a heading", async () => {
    const result = await importOf({
      "word/document.xml": documentXml(styled("Recuo", "Parágrafo recuado comum.")),
      "word/styles.xml": stylesXml(
        `<w:style w:type="paragraph" w:styleId="Recuo"><w:name w:val="Recuo Especial"/></w:style>`,
      ),
    });

    expect(result.ok).toBe(true);
    expect(value(result).notes.unrecognisedParagraphStyles).toEqual(["Recuo Especial"]);
  });
});

describe("import rebuilds headings from the outline level the file declares", () => {
  const PT_BR = {
    "word/document.xml": documentXml(
      styled("Ttulo1", "Do procedimento") +
        styled("Ttulo3", "Quem pode pedir") +
        para("O documento supracitado foi juntado aos autos."),
    ),
    "word/styles.xml": stylesXml(outlineStyle("Ttulo1", "Título 1", 0) + outlineStyle("Ttulo3", "Título 3", 2)),
  };

  it("recovers headings a localized Word file would otherwise lose", async () => {
    const { doc, notes } = value(await importOf(PT_BR));

    expect(doc.blocks.map((block) => (block.kind === "heading" ? `h${block.level}` : block.kind))).toEqual([
      "h1",
      "h3",
      "paragraph",
    ]);
    expect(notes.headingStylesRecovered).toEqual(["Título 1", "Título 3"]);
    expect(notes.unrecognisedParagraphStyles).toEqual([]);
  });

  it("reads the level from the file, never from the style name", async () => {
    const { doc } = value(
      await importOf({
        "word/document.xml": documentXml(styled("Estranho", "Um título com nome que não parece título")),
        "word/styles.xml": stylesXml(outlineStyle("Estranho", "Chapéu da seção", 1)),
      }),
    );

    expect(doc.blocks[0]?.kind).toBe("heading");
    expect(doc.blocks[0]?.kind === "heading" && doc.blocks[0].level).toBe(2);
  });

  it("ignores a declared style the document never uses", async () => {
    const { notes } = value(
      await importOf({
        "word/document.xml": documentXml(para("Só um parágrafo.")),
        "word/styles.xml": stylesXml(outlineStyle("Ttulo1", "Título 1", 0)),
      }),
    );

    expect(notes.headingStylesRecovered).toEqual([]);
  });

  it("leaves outline levels beyond h6 as paragraphs instead of inventing a level", async () => {
    const { doc, notes } = value(
      await importOf({
        "word/document.xml": documentXml(styled("Ttulo7", "Subitem profundo") + para("Corpo.")),
        "word/styles.xml": stylesXml(outlineStyle("Ttulo7", "Título 7", 6)),
      }),
    );

    expect(doc.blocks.every((block) => block.kind === "paragraph")).toBe(true);
    expect(notes.headingStylesRecovered).toEqual([]);
  });
});

describe("import declares what it kept and what it could not", () => {
  it("brings a .docx table in as a grid, not as loose paragraphs", async () => {
    const { doc, notes } = value(
      await importOf({
        "word/document.xml": documentXml(
          para("Antes da tabela.") +
            `<w:tbl><w:tr><w:tc>${para("Prazo")}</w:tc><w:tc>${para("30 dias")}</w:tc></w:tr></w:tbl>` +
            para("Depois da tabela."),
        ),
      }),
    );

    expect(notes.tablesPreserved).toBe(1);
    expect(notes.tablesFlattened).toBe(0);
    expect(doc.blocks.map((block) => block.kind)).toEqual(["paragraph", "table", "paragraph"]);

    const table = doc.blocks[1];
    if (table.kind !== "table") throw new Error("expected a table");
    expect(table.rows[0].cells.map((cell) => cell.text)).toEqual(["Prazo", "30 dias"]);
  });

  it("counts a table it could not recover instead of claiming it kept one", async () => {
    const nested = `<w:tbl><w:tr><w:tc>${para("Externa")}<w:tbl><w:tr><w:tc>${para("Interna")}</w:tc></w:tr></w:tbl></w:tc></w:tr></w:tbl>`;
    const { notes } = value(await importOf({ "word/document.xml": documentXml(nested) }));

    expect(notes.tablesPreserved).toBe(1);
    expect(notes.tablesFlattened).toBe(1);
  });

  it("counts the text boxes whose content joined the reading order", async () => {
    const { notes } = value(
      await importOf({
        "word/document.xml": documentXml(
          para("Parágrafo normal.") +
            `<w:p><w:r><w:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml"><v:textbox><w:txbxContent>${para("Aviso na caixa.")}</w:txbxContent></v:textbox></v:shape></w:pict></w:r></w:p>`,
        ),
      }),
    );

    expect(notes.textBoxesInlined).toBe(1);
  });

  it("reports nothing flattened when nothing was", async () => {
    const { notes } = value(await importOf({ "word/document.xml": documentXml(para("Texto simples.")) }));
    expect(notes).toEqual({
      tablesPreserved: 0,
      tablesFlattened: 0,
      textBoxesInlined: 0,
      headingStylesRecovered: [],
      unrecognisedParagraphStyles: [],
    });
  });
});

describe("what the import deliberately does not rebuild", () => {
  it("keeps the list but drops Word's generated label — no criterion reads it", async () => {
    const { doc } = value(
      await importOf({
        "word/document.xml": documentXml(
          `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr></w:pPr><w:r><w:t>O auxílio será concedido ao servidor.</w:t></w:r></w:p>` +
            `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr></w:pPr><w:r><w:t>O pedido será feito em 30 dias.</w:t></w:r></w:p>`,
        ),
        "word/numbering.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="Art. %1º"/></w:lvl></w:abstractNum><w:num w:numId="7"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
      }),
    );

    const list = doc.blocks.find((block) => block.kind === "list");
    expect(list).toBeDefined();
    expect(list?.text).not.toContain("Art.");
  });
});
