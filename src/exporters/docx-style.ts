import { A4, FONT_NAME, type PageTheme, type TypeStyle } from "./page-theme";

export const halfPoints = (points: number): number => Math.round(points * 2);
export const twips = (points: number): number => Math.round(points * 20);
export const hex = (color: string): string => color.replace("#", "").toUpperCase();

export const lineMultiple = (style: TypeStyle): number => Math.round((style.leading / style.size) * 240);

const HEADING_IDS = [1, 2, 3, 4, 5, 6] as const;

function runProperties(style: TypeStyle): string {
  const font = FONT_NAME[style.family].word;
  return (
    `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>` +
    (style.weight === "bold" ? "<w:b/>" : "") +
    `<w:sz w:val="${halfPoints(style.size)}"/><w:szCs w:val="${halfPoints(style.size)}"/>` +
    `<w:color w:val="${hex(style.color)}"/></w:rPr>`
  );
}

function paragraphProperties(style: TypeStyle, extra = ""): string {
  return (
    `<w:pPr>${extra}<w:widowControl/>` +
    `<w:spacing w:before="${twips(style.spaceBefore)}" w:after="${twips(style.spaceAfter)}" ` +
    `w:line="${lineMultiple(style)}" w:lineRule="auto"/></w:pPr>`
  );
}

function styleXml(id: string, name: string, style: TypeStyle, extra = "", next = "Normal"): string {
  return (
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>` +
    `<w:basedOn w:val="Normal"/><w:next w:val="${next}"/><w:qFormat/>` +
    `${paragraphProperties(style, extra)}${runProperties(style)}</w:style>`
  );
}

export function stylesXml(theme: PageTheme = A4): string {
  const body = theme.body;

  const defaults =
    `<w:docDefaults><w:rPrDefault>${runProperties(body)}</w:rPrDefault>` +
    `<w:pPrDefault>${paragraphProperties(body)}</w:pPrDefault></w:docDefaults>`;

  const normal =
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>` +
    `${paragraphProperties(body)}${runProperties(body)}</w:style>`;

  const item: TypeStyle = { ...body, spaceAfter: body.spaceAfter * 0.55 };
  const list =
    `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/>` +
    `<w:basedOn w:val="Normal"/><w:next w:val="ListParagraph"/><w:qFormat/>` +
    `${paragraphProperties(item, "<w:contextualSpacing/>")}${runProperties(item)}</w:style>`;

  const headings = HEADING_IDS.map((level) =>
    styleXml(
      `Heading${level}`,
      `heading ${level}`,
      theme.headings[level - 1],
      `<w:keepNext/><w:keepLines/><w:outlineLvl w:val="${level - 1}"/>`,
    ),
  ).join("");

  const cells =
    styleXml("LucidCell", "Lucid Célula", theme.tableCell, "", "LucidCell") +
    styleXml("LucidCellHeader", "Lucid Célula de cabeçalho", theme.tableHeader, "", "LucidCell");

  const footer = styleXml("LucidFooter", "Lucid Rodapé", theme.footer, '<w:jc w:val="right"/>', "LucidFooter");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `${defaults}${normal}${list}${headings}${cells}${footer}</w:styles>`
  );
}

export function sectionXml(theme: PageTheme = A4): string {
  return (
    `<w:sectPr><w:footerReference w:type="default" r:id="rId3"/>` +
    `<w:pgSz w:w="${twips(theme.width)}" w:h="${twips(theme.height)}"/>` +
    `<w:pgMar w:top="${twips(theme.margin.top)}" w:right="${twips(theme.margin.right)}" ` +
    `w:bottom="${twips(theme.margin.bottom)}" w:left="${twips(theme.margin.left)}" ` +
    `w:header="0" w:footer="${twips(theme.margin.bottom / 2)}" w:gutter="0"/></w:sectPr>`
  );
}

export function footerXml(): string {
  const field = (instruction: string): string =>
    `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve"> ${instruction} </w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r>` +
    `<w:r><w:fldChar w:fldCharType="end"/></w:r>`;

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:p><w:pPr><w:pStyle w:val="LucidFooter"/></w:pPr>` +
    `${field("PAGE")}<w:r><w:t xml:space="preserve"> / </w:t></w:r>${field("NUMPAGES")}` +
    `</w:p></w:ftr>`
  );
}

export function tableProperties(theme: PageTheme = A4, width: number): string {
  const edges = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((edge) => `<w:${edge} w:val="single" w:sz="4" w:space="0" w:color="${hex(theme.rule)}"/>`)
    .join("");
  return (
    `<w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/>` +
    `<w:tblBorders>${edges}</w:tblBorders>` +
    `<w:tblCellMar>` +
    `<w:top w:w="${twips(theme.cellPadding.y)}" w:type="dxa"/>` +
    `<w:left w:w="${twips(theme.cellPadding.x)}" w:type="dxa"/>` +
    `<w:bottom w:w="${twips(theme.cellPadding.y)}" w:type="dxa"/>` +
    `<w:right w:w="${twips(theme.cellPadding.x)}" w:type="dxa"/>` +
    `</w:tblCellMar></w:tblPr>`
  );
}

export const headerShading = (theme: PageTheme = A4): string =>
  `<w:shd w:val="clear" w:color="auto" w:fill="${hex(theme.headerFill)}"/>`;
