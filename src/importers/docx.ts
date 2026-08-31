import JSZip from "jszip";
import mammoth from "mammoth";
import type { Document } from "@/lucid";
import { buildStructuredDocument } from "@/lucid/core/document/structured";
import { htmlToRawBlocks } from "./html-blocks";
import type { DocumentBuildServices } from "@/lucid/core/document/model";

export type DocxRefusalKind = "unreadable" | "tracked_changes" | "no_readable_content";

export interface DocxNotes {
  readonly tablesPreserved: number;
  readonly tablesFlattened: number;
  readonly textBoxesInlined: number;
  readonly headingStylesRecovered: readonly string[];
  readonly unrecognisedParagraphStyles: readonly string[];
}

export interface DocxImport {
  readonly doc: Document;
  readonly notes: DocxNotes;
}

export type DocxResult =
  { readonly ok: true; readonly value: DocxImport } | { readonly ok: false; readonly refusal: DocxRefusalKind };

const RE_TRACKED_CHANGE = /<w:(?:ins|del)(?=[\s/>])/;
const RE_TABLE = /<w:tbl(?=[\s/>])/g;
const RE_TEXT_BOX = /<w:txbxContent(?=[\s/>])/g;
const RE_PARAGRAPH_STYLE_REF = /<w:pStyle\s+w:val="([^"]*)"/g;
const RE_STYLE = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
const RE_UNRECOGNISED_PARAGRAPH_STYLE = /^Unrecognised paragraph style: '(.*)' \(Style ID: /;

const MAX_HEADING_LEVEL = 6;

function countOf(source: string, re: RegExp): number {
  return source.match(re)?.length ?? 0;
}

function referencedStyleIds(documentXml: string): Set<string> {
  const ids = new Set<string>();
  const re = new RegExp(RE_PARAGRAPH_STYLE_REF.source, "g");
  for (let m = re.exec(documentXml); m !== null; m = re.exec(documentXml)) ids.add(m[1]);
  return ids;
}

interface OutlineStyle {
  readonly name: string;
  readonly level: number;
}

function outlineStyles(stylesXml: string): Map<string, OutlineStyle> {
  const found = new Map<string, OutlineStyle>();
  const re = new RegExp(RE_STYLE.source, "g");
  for (let m = re.exec(stylesXml); m !== null; m = re.exec(stylesXml)) {
    const [, attributes, inner] = m;
    if (!/w:type="paragraph"/.test(attributes)) continue;
    const id = /w:styleId="([^"]*)"/.exec(attributes)?.[1];
    const name = /<w:name\s+w:val="([^"]*)"/.exec(inner)?.[1];
    const outline = /<w:outlineLvl\s+w:val="(\d+)"/.exec(inner)?.[1];
    if (id === undefined || name === undefined || outline === undefined) continue;
    found.set(id, { name, level: Number(outline) + 1 });
  }
  return found;
}

export function headingStyleMap(stylesXml: string, documentXml: string): { entries: string[]; names: string[] } {
  const used = referencedStyleIds(documentXml);
  const levelByName = new Map<string, number>();

  for (const [id, style] of outlineStyles(stylesXml)) {
    if (!used.has(id)) continue;
    if (style.level < 1 || style.level > MAX_HEADING_LEVEL) continue;
    if (style.name.includes("'")) continue;
    levelByName.set(style.name, style.level);
  }

  const names = [...levelByName.keys()].sort();
  return {
    entries: names.map((name) => `p[style-name='${name}'] => h${levelByName.get(name)}:fresh`),
    names,
  };
}

function unrecognisedParagraphStyles(messages: readonly { message: string }[]): string[] {
  const names = new Set<string>();
  for (const { message } of messages) {
    const name = RE_UNRECOGNISED_PARAGRAPH_STYLE.exec(message)?.[1];
    if (name !== undefined) names.add(name);
  }
  return [...names].sort();
}

function zipSource(bytes: ArrayBuffer | Uint8Array): { arrayBuffer: ArrayBuffer; buffer: Uint8Array } {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const arrayBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  return { arrayBuffer, buffer: view };
}

export async function importDocx(
  bytes: ArrayBuffer | Uint8Array,
  services: DocumentBuildServices,
): Promise<DocxResult> {
  const source = zipSource(bytes);

  let documentXml: string;
  let stylesXml: string;
  try {
    const archive = await JSZip.loadAsync(source.buffer);
    documentXml = (await archive.file("word/document.xml")?.async("string")) ?? "";
    stylesXml = (await archive.file("word/styles.xml")?.async("string")) ?? "";
  } catch {
    return { ok: false, refusal: "unreadable" };
  }

  if (documentXml === "") return { ok: false, refusal: "unreadable" };
  if (RE_TRACKED_CHANGE.test(documentXml)) return { ok: false, refusal: "tracked_changes" };

  const map = headingStyleMap(stylesXml, documentXml);

  let html: string;
  let messages: readonly { message: string }[];
  try {
    const converted = await mammoth.convertToHtml(source, map.entries.length > 0 ? { styleMap: map.entries } : {});
    html = converted.value;
    messages = converted.messages;
  } catch {
    return { ok: false, refusal: "unreadable" };
  }

  const blocks = htmlToRawBlocks(html);
  if (blocks.length === 0) return { ok: false, refusal: "no_readable_content" };

  const tablesPreserved = blocks.filter((block) => block.kind === "table").length;
  const tablesInFile = countOf(documentXml, RE_TABLE);

  return {
    ok: true,
    value: {
      doc: buildStructuredDocument(blocks, services),
      notes: {
        tablesPreserved,
        tablesFlattened: Math.max(0, tablesInFile - tablesPreserved),
        textBoxesInlined: countOf(documentXml, RE_TEXT_BOX),
        headingStylesRecovered: map.names,
        unrecognisedParagraphStyles: unrecognisedParagraphStyles(messages),
      },
    },
  };
}
