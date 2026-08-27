import { zip, type ZipEntry } from "../../src/exporters/zip";

const encoder = new TextEncoder();
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

function contentTypeOf(part: string): string {
  if (part.includes("styles")) return "styles";
  if (part.includes("numbering")) return "numbering";
  return "settings";
}

export function buildDocx(parts: Record<string, string>): Uint8Array {
  const extra = Object.keys(parts).filter((name) => name !== "word/document.xml");

  const types =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    extra
      .map(
        (name) =>
          `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${contentTypeOf(name)}+xml"/>`,
      )
      .join("") +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const docRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    extra
      .map(
        (name, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${contentTypeOf(name)}" Target="${name.replace("word/", "")}"/>`,
      )
      .join("") +
    `</Relationships>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: encoder.encode(types) },
    { name: "_rels/.rels", data: encoder.encode(rootRels) },
    { name: "word/_rels/document.xml.rels", data: encoder.encode(docRels) },
    ...Object.entries(parts).map(([name, xml]) => ({ name, data: encoder.encode(xml) })),
  ];

  return zip(entries);
}

export function documentXml(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${inner}<w:sectPr/></w:body></w:document>`;
}

export function stylesXml(definitions: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    `${definitions}</w:styles>`
  );
}

export function outlineStyle(id: string, name: string, outlineLevel: number): string {
  return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:pPr><w:outlineLvl w:val="${outlineLevel}"/></w:pPr></w:style>`;
}

export function styled(styleId: string, text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
}

export function para(text: string): string {
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
}
