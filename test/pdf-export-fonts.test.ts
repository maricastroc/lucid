import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { exportPdf, type FontLoader } from "@/exporters/pdf";
import { isTrueType } from "@/exporters/pdf/fonts";

const fromDisk: FontLoader = async (file) =>
  new Uint8Array(fs.readFileSync(path.join(process.cwd(), "public/fonts", file)));

const failing: FontLoader = async () => {
  throw new Error("sem rede");
};

const BLOCKS: RawBlock[] = [
  { kind: "heading", level: 1, text: "Concessão do benefício" },
  { kind: "paragraph", text: "A inscrição não será homologada até a apresentação da certidão." },
];

const asText = (bytes: Uint8Array): string => Buffer.from(bytes).toString("latin1");

describe("the PDF carries the faces Lucid reads in", () => {
  it("embeds the face the document is set in, instead of asking the reader's machine for it", async () => {
    const text = asText(await exportPdf(BLOCKS, { loadFont: fromDisk }));

    expect(text).toMatch(/SourceSerif4|LucidSerif/u);
  });

  it("carries the glyph outlines themselves, not just the font's name", async () => {
    const embedded = asText(await exportPdf(BLOCKS, { loadFont: fromDisk }));
    const bare = asText(await exportPdf(BLOCKS, { loadFont: failing }));

    expect(embedded).toContain("/FontFile2");
    expect(bare).not.toContain("/FontFile2");
    expect(embedded.length).toBeGreaterThan(bare.length * 2);
  });

  it("still produces a readable file when the faces cannot be fetched", async () => {
    const bytes = await exportPdf(BLOCKS, { loadFont: failing });

    expect(bytes.length).toBeGreaterThan(0);
    expect(asText(bytes).startsWith("%PDF")).toBe(true);
  });

  it("falls back to the format's own font rather than drawing nothing", async () => {
    const text = asText(await exportPdf(BLOCKS, { loadFont: failing }));

    expect(text).toMatch(/Times|Helvetica/u);
  });
});

describe("the vendored faces cover the language the documents are written in", () => {
  const NEEDED = "áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇº°ª—–“”…§";

  const codepoints = (buffer: Buffer): Set<number> => {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let cmap = 0;
    for (let i = 0; i < view.getUint16(4); i += 1) {
      const at = 12 + i * 16;
      if (String.fromCharCode(...buffer.subarray(at, at + 4)) === "cmap") cmap = view.getUint32(at + 8);
    }
    let best = 0;
    for (let i = 0; i < view.getUint16(cmap + 2); i += 1) {
      const at = cmap + 4 + i * 8;
      const platform = view.getUint16(at);
      const encoding = view.getUint16(at + 2);
      if ((platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0)
        best = cmap + view.getUint32(at + 4);
    }

    const found = new Set<number>();
    if (view.getUint16(best) !== 4) return found;
    const segX2 = view.getUint16(best + 6);
    const ends = best + 14;
    const starts = ends + segX2 + 2;
    for (let s = 0; s < segX2 / 2; s += 1) {
      const end = view.getUint16(ends + s * 2);
      for (let c = view.getUint16(starts + s * 2); c <= end && c !== 0xffff; c += 1) found.add(c);
    }
    return found;
  };

  const FACES = ["SourceSerif4-Regular.ttf", "SourceSerif4-SemiBold.ttf"];

  it.each(FACES)("%s draws every accent, ordinal and dash Portuguese needs", (file) => {
    const set = codepoints(fs.readFileSync(path.join(process.cwd(), "public/fonts", file)));
    const missing = [...NEEDED].filter((char) => !set.has(char.codePointAt(0) as number));

    expect(missing).toEqual([]);
  });

  it.each(FACES)("%s ships with the licence it is distributed under", () => {
    const text = fs.readFileSync(path.join(process.cwd(), "public/fonts/SourceSerif4-OFL.txt"), "utf8");

    expect(text).toContain("SIL OPEN FONT LICENSE");
  });

  it.each(FACES)("%s is TrueType, which is the only outline the PDF writer can embed", (file) => {
    const bytes = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "public/fonts", file)));

    expect(isTrueType(bytes)).toBe(true);
  });

  it("refuses an OpenType-PS face rather than writing scrambled glyphs", async () => {
    const otto = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0, 0, 0, 0]);

    expect(isTrueType(otto)).toBe(false);

    const text = asText(await exportPdf(BLOCKS, { loadFont: async () => otto }));

    expect(text).not.toContain("/FontFile2");
    expect(text).toMatch(/Times|Helvetica/u);
  });
});
