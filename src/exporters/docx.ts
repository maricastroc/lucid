import { normalizeListItem, resolveTableGrid, type RawBlock, type RawTableCell, type RawTableRow } from "@/lucid";
import { A4 } from "./page-theme";
import { footerXml, headerShading, sectionXml, stylesXml, tableProperties, twips } from "./docx-style";
import { columnWidths, placeRows } from "./table-widths";
import { zip, type ZipEntry } from "./zip";

const BULLET_NUM_ID = 1;
const DECIMAL_NUM_ID = 2;

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

const TEXT_WIDTH = twips(A4.width - A4.margin.left - A4.margin.right);

const AVERAGE_CHAR = 5.2;

function cellXml(cell: RawTableCell | null, colSpan: number, rowSpan: number, width: number): string {
  const header = cell?.header === true;
  const properties = [
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
    colSpan > 1 ? `<w:gridSpan w:val="${colSpan}"/>` : "",
    rowSpan > 1 ? `<w:vMerge w:val="${cell === null ? "continue" : "restart"}"/>` : "",
    header ? headerShading() : "",
    '<w:vAlign w:val="top"/>',
  ].join("");

  const style = `<w:pPr><w:pStyle w:val="${header ? "LucidCellHeader" : "LucidCell"}"/></w:pPr>`;
  const paragraphs = cell === null || cell.blocks.length === 0 ? [""] : cell.blocks;
  const body = paragraphs.map((text) => paragraph(text, style)).join("");
  return `<w:tc><w:tcPr>${properties}</w:tcPr>${body}</w:tc>`;
}

function tableToXml(rows: readonly RawTableRow[]): string {
  const grid = resolveTableGrid(rows);
  if (grid.columns === 0) return "";

  const { placed } = placeRows(rows);
  const wide = (text: string, cell: RawTableCell): number => {
    const size = cell.header === true ? A4.tableHeader.size : A4.tableCell.size;
    return twips((text.length * size * AVERAGE_CHAR) / 10 + A4.cellPadding.x * 2);
  };

  const widths = columnWidths(
    placed,
    grid.columns,
    TEXT_WIDTH,
    (cell) => wide(cell.blocks.join(" "), cell),
    (cell) => {
      const words = cell.blocks
        .join(" ")
        .split(/\s+/u)
        .filter((word) => word !== "");
      return words.reduce((at, word) => Math.max(at, wide(word, cell)), 0);
    },
  ).map(Math.round);

  const span = (at: number, count: number): number =>
    widths.slice(at, at + count).reduce((sum, value) => sum + value, 0);

  const gridXml = `<w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>`;

  const body = grid.rows
    .map((slots) => {
      let at = 0;
      const cells = slots
        .map((slot) => {
          const width = span(at, slot.colSpan);
          at += slot.colSpan;
          return cellXml(slot.cell, slot.colSpan, slot.rowSpan, width);
        })
        .join("");
      const declared = slots.filter((slot) => slot.cell !== null);
      const isHeaderRow = declared.length > 0 && declared.every((slot) => slot.cell?.header === true);
      const properties = isHeaderRow ? "<w:trPr><w:tblHeader/></w:trPr>" : "";
      return `<w:tr>${properties}${cells}</w:tr>`;
    })
    .join("");

  return `<w:tbl>${tableProperties(A4, TEXT_WIDTH)}${gridXml}${body}</w:tbl><w:p/>`;
}

const markerWidth = (marker: string): number => Math.max(24, marker.length * 5.4);

function labelledItem(item: { blocks: readonly string[]; level: number; marker: string }): string {
  const indent = twips(item.level * A4.indentPerLevel);
  const hanging = twips(markerWidth(item.marker));
  const body = indent + hanging;
  const properties =
    `<w:pPr><w:pStyle w:val="ListParagraph"/>` +
    `<w:tabs><w:tab w:val="left" w:pos="${body}"/></w:tabs>` +
    `<w:ind w:left="${body}" w:hanging="${hanging}"/></w:pPr>`;
  const continuation = `<w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="${body}"/></w:pPr>`;

  return item.blocks
    .map((text, index) =>
      index === 0
        ? `<w:p>${properties}<w:r><w:t xml:space="preserve">${escapeXml(item.marker)}</w:t></w:r><w:r><w:tab/></w:r>${run(text)}</w:p>`
        : paragraph(text, continuation),
    )
    .join("");
}

function itemXml(item: ReturnType<typeof normalizeListItem>): string {
  if (item.marker !== undefined) return labelledItem({ ...item, marker: item.marker });

  const numId = item.ordered ? DECIMAL_NUM_ID : BULLET_NUM_ID;
  const level = Math.min(5, Math.max(0, item.level));
  const properties =
    `<w:pPr><w:pStyle w:val="ListParagraph"/>` +
    `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>`;

  const continuation = `<w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="${720 * (level + 1)}"/></w:pPr>`;
  return item.blocks.map((text, index) => paragraph(text, index === 0 ? properties : continuation)).join("");
}

function blockToXml(block: RawBlock): string {
  if (block.kind === "heading") {
    const level = Math.min(Math.max(Math.trunc(block.level), 1), 6);
    return paragraph(block.text, `<w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>`);
  }
  if (block.kind === "list") {
    return block.items.map((stored) => itemXml(normalizeListItem(stored, block.ordered))).join("");
  }
  if (block.kind === "table") return tableToXml(block.rows);
  return paragraph(block.text);
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;

const BULLETS = ["\u2022", "o", "\u25aa"];

function levelXml(level: number, format: "bullet" | "decimal"): string {
  const left = twips((level + 1) * A4.indentPerLevel);
  const hanging = twips(A4.indentPerLevel);
  const text = format === "bullet" ? BULLETS[level % BULLETS.length] : `%${level + 1}.`;
  return (
    `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/>` +
    `<w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${left}" w:hanging="${hanging}"/></w:pPr></w:lvl>`
  );
}

const abstractNum = (id: number, format: "bullet" | "decimal"): string =>
  `<w:abstractNum w:abstractNumId="${id}">` +
  Array.from({ length: 6 }, (_, level) => levelXml(level, format)).join("") +
  `</w:abstractNum>`;

const NUMBERING =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
  `${abstractNum(0, "bullet")}${abstractNum(1, "decimal")}` +
  `<w:num w:numId="${BULLET_NUM_ID}"><w:abstractNumId w:val="0"/></w:num>` +
  `<w:num w:numId="${DECIMAL_NUM_ID}"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;

function documentXml(blocks: readonly RawBlock[]): string {
  const body = blocks.map(blockToXml).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sectionXml()}</w:body></w:document>`;
}

export function blocksToDocx(blocks: readonly RawBlock[]): Uint8Array {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(ROOT_RELS) },
    { name: "word/document.xml", data: encoder.encode(documentXml(blocks)) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(DOCUMENT_RELS) },
    { name: "word/styles.xml", data: encoder.encode(stylesXml()) },
    { name: "word/numbering.xml", data: encoder.encode(NUMBERING) },
    { name: "word/footer1.xml", data: encoder.encode(footerXml()) },
  ];
  return zip(entries);
}
