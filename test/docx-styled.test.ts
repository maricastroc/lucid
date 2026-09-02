import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { blocksToDocx } from "../src/exporters/docx";
import { halfPoints, twips } from "../src/exporters/docx-style";
import { A4, FONT_NAME } from "../src/exporters/page-theme";
import { htmlToRawBlocks } from "../src/importers/html-blocks";

function partOf(bytes: Uint8Array, name: string): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lucid-docx-")), "d.docx");
  fs.writeFileSync(file, bytes);
  return execFileSync("unzip", ["-p", file, name], { encoding: "utf8" });
}

const LABELLED: RawBlock = {
  kind: "list",
  ordered: true,
  items: [
    { blocks: ["Gestão / Unidade"], level: 3, ordered: true, marker: "2.1.1.1." },
    { blocks: ["O proponente poderá inscrever-se"], level: 1, ordered: true, marker: "2.2." },
  ],
};

const PLAIN: RawBlock = {
  kind: "list",
  ordered: true,
  items: [
    { blocks: ["Primeiro"], level: 0, ordered: true },
    { blocks: ["Segundo"], level: 1, ordered: true },
  ],
};

const TABLE: RawBlock = {
  kind: "table",
  rows: [
    {
      cells: [
        { blocks: ["Categoria"], header: true },
        { blocks: ["Vagas"], header: true },
      ],
    },
    { cells: [{ blocks: ["Cultura"] }, { blocks: ["4"] }] },
  ],
};

describe("the .docx carries the same page as the PDF", () => {
  it("sets the paper and the margins the layout engine uses", () => {
    const document = partOf(blocksToDocx([{ kind: "paragraph", text: "olá" }]), "word/document.xml");

    expect(document).toContain(`<w:pgSz w:w="${twips(A4.width)}" w:h="${twips(A4.height)}"/>`);
    expect(document).toContain(`w:top="${twips(A4.margin.top)}"`);
    expect(document).toContain(`w:left="${twips(A4.margin.left)}"`);
  });

  it("declares the body font and size from the shared theme, not a Word default", () => {
    const styles = partOf(blocksToDocx([{ kind: "paragraph", text: "olá" }]), "word/styles.xml");

    expect(styles).toContain(`w:ascii="${FONT_NAME.serif.word}"`);
    expect(styles).toContain(`<w:sz w:val="${halfPoints(A4.body.size)}"/>`);
  });

  it("gives each heading level its own size, instead of one bold for all six", () => {
    const styles = partOf(blocksToDocx([{ kind: "paragraph", text: "olá" }]), "word/styles.xml");
    const sizes = A4.headings.map((style) => halfPoints(style.size));

    for (const size of new Set(sizes)) expect(styles).toContain(`<w:sz w:val="${size}"/>`);
    expect(new Set(sizes).size).toBeGreaterThan(1);
  });

  it("asks Word to keep a heading with the text it introduces", () => {
    const styles = partOf(blocksToDocx([{ kind: "paragraph", text: "olá" }]), "word/styles.xml");

    expect(styles).toContain("<w:keepNext/>");
  });
});

describe("the list label the document already wrote", () => {
  it("goes in as text, never as numbering Word would count again", () => {
    const document = partOf(blocksToDocx([LABELLED]), "word/document.xml");

    expect(document).toContain("2.1.1.1.");
    expect(document).not.toContain("<w:numPr>");
  });

  it("indents the deeper item further than the shallower one", () => {
    const document = partOf(blocksToDocx([LABELLED]), "word/document.xml");
    const indents = [...document.matchAll(/<w:ind w:left="(\d+)"/gu)].map((m) => Number(m[1]));

    expect(indents).toHaveLength(2);
    expect(indents[0]).toBeGreaterThan(indents[1]);
  });

  it("still asks Word to number the item that arrived with no label", () => {
    const document = partOf(blocksToDocx([PLAIN]), "word/document.xml");

    expect(document).toContain('<w:ilvl w:val="0"/>');
    expect(document).toContain('<w:ilvl w:val="1"/>');
  });

  it("indents the generated numbering by the same step the PDF uses", () => {
    const numbering = partOf(blocksToDocx([PLAIN]), "word/numbering.xml");

    expect(numbering).toContain(
      `<w:ind w:left="${twips(A4.indentPerLevel)}" w:hanging="${twips(A4.indentPerLevel)}"/>`,
    );
  });
});

describe("the table looks like a table", () => {
  it("shades the header cell and repeats the row across pages", () => {
    const document = partOf(blocksToDocx([TABLE]), "word/document.xml");

    expect(document).toContain(A4.headerFill.replace("#", "").toUpperCase());
    expect(document).toContain("<w:tblHeader/>");
  });

  it("gives the cell the padding the drawn page gives it", () => {
    const document = partOf(blocksToDocx([TABLE]), "word/document.xml");

    expect(document).toContain(`<w:left w:w="${twips(A4.cellPadding.x)}" w:type="dxa"/>`);
  });

  it("draws the borders in the page rule colour, not in plain black", () => {
    const document = partOf(blocksToDocx([TABLE]), "word/document.xml");

    expect(document).toContain(`w:color="${A4.rule.replace("#", "").toUpperCase()}"`);
    expect(document).not.toContain('w:color="auto"/></w:tblBorders>');
  });
});

describe("the styled .docx still says what it said before", () => {
  const BLOCKS: RawBlock[] = [
    { kind: "heading", level: 1, text: "Prazos e documentos" },
    { kind: "paragraph", text: "O interessado deve entregar os documentos." },
    LABELLED,
    PLAIN,
    TABLE,
  ];

  const reimport = async (blocks: readonly RawBlock[]) => {
    const mammoth = (await import("mammoth")).default;
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(blocksToDocx(blocks)) });
    return htmlToRawBlocks(html);
  };

  it("comes back through the project's own importer with its heading, lists and table", async () => {
    const back = await reimport(BLOCKS);
    const kinds = back.map((block) => block.kind);

    expect(kinds).toContain("heading");
    expect(kinds).toContain("list");
    expect(kinds).toContain("table");
  });

  it("brings the label back inside the item text, which is where it now lives", async () => {
    const back = await reimport([LABELLED]);
    const text = JSON.stringify(back);

    expect(text).toContain("2.1.1.1.");
    expect(text).toContain("Gestão / Unidade");
  });

  it("keeps the generated list nested, not flattened to one level", async () => {
    const back = await reimport([PLAIN]);
    const levels = back
      .filter((block) => block.kind === "list")
      .flatMap((block) => (block.kind === "list" ? block.items : []))
      .map((item) => (typeof item === "string" ? 0 : item.level));

    expect(new Set(levels).size).toBeGreaterThan(1);
  });
});
