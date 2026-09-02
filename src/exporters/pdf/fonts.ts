import type { jsPDF } from "jspdf";
import { FONT_NAME, type FontFamily, type FontWeight } from "../page-theme";

export type FontLoader = (file: string) => Promise<Uint8Array>;

interface Face {
  readonly family: FontFamily;
  readonly weight: FontWeight;
  readonly file: string;
}

const FACES: readonly Face[] = [
  { family: "serif", weight: "regular", file: "SourceSerif4-Regular.ttf" },
  { family: "serif", weight: "bold", file: "SourceSerif4-SemiBold.ttf" },
];

const TRUETYPE = 0x00010000;
const TRUE = 0x74727565;

export function isTrueType(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const tag = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0);
  return tag === TRUETYPE || tag === TRUE;
}

export const fetchFont: FontLoader = async (file) => {
  const response = await fetch(`/fonts/${file}`);
  if (!response.ok) throw new Error(file);
  return new Uint8Array(await response.arrayBuffer());
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

export async function embedFonts(doc: jsPDF, load: FontLoader): Promise<Record<FontFamily, string>> {
  const names: Record<FontFamily, string> = { serif: FONT_NAME.serif.pdf, sans: FONT_NAME.sans.pdf };

  const loaded = await Promise.all(
    FACES.map(async (face) => {
      try {
        const bytes = await load(face.file);
        return isTrueType(bytes) ? { face, bytes } : null;
      } catch {
        return null;
      }
    }),
  );

  const byFamily = new Map<FontFamily, number>();
  for (const entry of loaded) {
    if (entry === null) continue;
    byFamily.set(entry.face.family, (byFamily.get(entry.face.family) ?? 0) + 1);
  }

  for (const entry of loaded) {
    if (entry === null || byFamily.get(entry.face.family) !== 2) continue;
    const alias = entry.face.family === "serif" ? "LucidSerif" : "LucidSans";
    doc.addFileToVFS(entry.face.file, toBase64(entry.bytes));
    doc.addFont(entry.face.file, alias, entry.face.weight === "bold" ? "bold" : "normal");
    names[entry.face.family] = alias;
  }

  return names;
}
