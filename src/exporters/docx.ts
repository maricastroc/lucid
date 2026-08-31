import { resolveTableGrid, type RawBlock, type RawTableCell, type RawTableRow } from "@/lucid";
import { zip, type ZipEntry } from "./zip";

const BULLET_NUM_ID = 1;
const DECIMAL_NUM_ID = 2;
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function run(text: string): string {
  return `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraph(text: string, properties = ""): string {
  return `<w:p>${properties}${run(text)}</w:p>`;
}

const TABLE_WIDTH_TWIPS = 9360;

const TABLE_PROPERTIES =
  '<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>' +
  ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((edge) => `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`)
    .join("") +
  "</w:tblBorders></w:tblPr>";

function cellXml(cell: RawTableCell | null, colSpan: number, rowSpan: number, width: number): string {
  const properties = [
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    colSpan > 1 ? `<w:gridSpan w:val="${colSpan}"/>` : "",
    rowSpan > 1 ? `<w:vMerge w:val="${cell === null ? "continue" : "restart"}"/>` : "",
  ].join("");

  const emphasis = cell?.header === true ? "<w:pPr><w:rPr><w:b/></w:rPr></w:pPr>" : "";
  const paragraphs = cell === null || cell.blocks.length === 0 ? [""] : cell.blocks;
  const body = paragraphs.map((text) => paragraph(text, emphasis)).join("");
  return `<w:tc><w:tcPr>${properties}</w:tcPr>${body}</w:tc>`;
}

function tableToXml(rows: readonly RawTableRow[]): string {
  const grid = resolveTableGrid(rows);
  if (grid.columns === 0) return "";

  const column = Math.floor(TABLE_WIDTH_TWIPS / grid.columns);
  const gridXml = `<w:tblGrid>${Array.from({ length: grid.columns }, () => `<w:gridCol w:w="${column}"/>`).join("")}</w:tblGrid>`;

  const body = grid.rows
    .map((slots) => {
      const cells = slots.map((slot) => cellXml(slot.cell, slot.colSpan, slot.rowSpan, column * slot.colSpan)).join("");
      const declared = slots.filter((slot) => slot.cell !== null);
      const isHeaderRow = declared.length > 0 && declared.every((slot) => slot.cell?.header === true);
      const properties = isHeaderRow ? "<w:trPr><w:tblHeader/></w:trPr>" : "";
      return `<w:tr>${properties}${cells}</w:tr>`;
    })
    .join("");

  return `<w:tbl>${TABLE_PROPERTIES}${gridXml}${body}</w:tbl><w:p/>`;
}

function blockToXml(block: RawBlock): string {
  if (block.kind === "heading") {
    const level = Math.min(Math.max(Math.trunc(block.level), 1), 6);
    return paragraph(block.text, `<w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>`);
  }
  if (block.kind === "list") {
    const numId = block.ordered ? DECIMAL_NUM_ID : BULLET_NUM_ID;
    return block.items
      .map((item) =>
        paragraph(
          item,
          `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>`,
        ),
      )
      .join("");
  }
  if (block.kind === "table") return tableToXml(block.rows);
  return paragraph(block.text);
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style>${HEADING_LEVELS.map(
  (level) =>
    `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>`,
).join("")}</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum><w:num w:numId="${BULLET_NUM_ID}"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="${DECIMAL_NUM_ID}"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;

function documentXml(blocks: readonly RawBlock[]): string {
  const body = blocks.map(blockToXml).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`;
}

export function blocksToDocx(blocks: readonly RawBlock[]): Uint8Array {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(ROOT_RELS) },
    { name: "word/document.xml", data: encoder.encode(documentXml(blocks)) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(DOCUMENT_RELS) },
    { name: "word/styles.xml", data: encoder.encode(STYLES) },
    { name: "word/numbering.xml", data: encoder.encode(NUMBERING) },
  ];
  return zip(entries);
}
