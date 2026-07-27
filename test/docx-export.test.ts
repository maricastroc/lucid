import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { blocksToDocx } from "../src/exporters/docx";
import { crc32, zip } from "../src/exporters/zip";
import { htmlToRawBlocks } from "../src/importers/docx";

const BLOCKS: RawBlock[] = [
  { kind: "heading", level: 1, text: "Prazos e documentos" },
  { kind: "paragraph", text: "O interessado deve entregar os documentos até 30/04/2025." },
  { kind: "heading", level: 2, text: "Quem pode pedir" },
  { kind: "list", ordered: false, items: ["Servidor efetivo", "Servidor cedido"] },
  { kind: "list", ordered: true, items: ["Preencher o formulário", "Anexar o comprovante"] },
];

function writeTemp(bytes: Uint8Array): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lucid-docx-")), "documento.docx");
  fs.writeFileSync(file, bytes);
  return file;
}

async function reimport(bytes: Uint8Array): Promise<RawBlock[]> {
  const mammoth = (await import("mammoth")).default;
  const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
  return htmlToRawBlocks(html);
}

describe("zip — a minimal STORE archive", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("produces an archive the system unzip accepts", () => {
    const bytes = zip([{ name: "a.txt", data: new TextEncoder().encode("olá") }]);
    const file = writeTemp(bytes);
    expect(() => execFileSync("unzip", ["-t", file], { stdio: "pipe" })).not.toThrow();
  });

  it("is deterministic — same entries produce byte-identical bytes", () => {
    const entry = [{ name: "a.txt", data: new TextEncoder().encode("mesmo conteúdo") }];
    expect(Array.from(zip(entry))).toEqual(Array.from(zip(entry)));
  });
});

describe("blocksToDocx — the exported file is a valid .docx", () => {
  it("passes the integrity check of the system unzip", () => {
    const file = writeTemp(blocksToDocx(BLOCKS));
    const out = execFileSync("unzip", ["-t", file], { encoding: "utf8" });
    expect(out).toContain("No errors detected");
  });

  it("carries every part Word requires", () => {
    const file = writeTemp(blocksToDocx(BLOCKS));
    const listing = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" });
    expect(listing.trim().split("\n").sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "word/_rels/document.xml.rels",
      "word/document.xml",
      "word/numbering.xml",
      "word/styles.xml",
    ]);
  });

  it("is deterministic — the same document exports byte-identically", () => {
    expect(Array.from(blocksToDocx(BLOCKS))).toEqual(Array.from(blocksToDocx(BLOCKS)));
  });
});

describe("blocksToDocx — round trip through the project's own importer", () => {
  it("survives export and re-import with the structure intact", async () => {
    expect(await reimport(blocksToDocx(BLOCKS))).toEqual(BLOCKS);
  });

  it("preserves headings at every level", async () => {
    const headings: RawBlock[] = [1, 2, 3, 4, 5, 6].map((level) => ({
      kind: "heading",
      level,
      text: `Título nível ${level}`,
    }));
    expect(await reimport(blocksToDocx(headings))).toEqual(headings);
  });

  it("keeps ordered and unordered lists apart", async () => {
    const lists: RawBlock[] = [
      { kind: "list", ordered: true, items: ["Primeiro", "Segundo"] },
      { kind: "paragraph", text: "Entre as listas." },
      { kind: "list", ordered: false, items: ["Um item", "Outro item"] },
    ];
    expect(await reimport(blocksToDocx(lists))).toEqual(lists);
  });

  it("escapes XML metacharacters instead of corrupting the file", async () => {
    const tricky: RawBlock[] = [
      { kind: "paragraph", text: 'O prazo & a "condição" <urgente> não se aplicam.' },
    ];
    expect(await reimport(blocksToDocx(tricky))).toEqual(tricky);
  });

  it("keeps accents and punctuation of PT-BR intact", async () => {
    const accented: RawBlock[] = [
      { kind: "paragraph", text: "A decisão foi comunicada ao interessado — «sem prejuízo» de recurso." },
    ];
    expect(await reimport(blocksToDocx(accented))).toEqual(accented);
  });

  it("exports an empty document without breaking the package", async () => {
    expect(await reimport(blocksToDocx([]))).toEqual([]);
  });
});
