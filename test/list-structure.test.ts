import { describe, expect, it } from "vitest";
import { htmlToRawBlocks } from "@/importers/html-blocks";
import { ptDocumentServices } from "../src/locales/pt-BR";
import { buildDocument, buildStructuredDocument, normalizeListItem, toRawBlocks, type RawBlock } from "@/lucid";

const itemsOf = (blocks: readonly RawBlock[]) =>
  blocks
    .filter((b) => b.kind === "list")
    .flatMap((l) => (l.kind === "list" ? l.items.map((i) => normalizeListItem(i, l.ordered)) : []));

const cycle = (blocks: readonly RawBlock[]) => toRawBlocks(buildStructuredDocument(blocks, ptDocumentServices).blocks);

describe("a sublista vira item próprio, um nível abaixo", () => {
  it("não absorve os filhos no texto do pai", () => {
    const html = "<ul><li>Pai<ul><li>Filho A</li><li>Filho B</li></ul></li><li>Irmão</li></ul>";

    expect(itemsOf(htmlToRawBlocks(html))).toEqual([
      { blocks: ["Pai"], level: 0, ordered: false },
      { blocks: ["Filho A"], level: 1, ordered: false },
      { blocks: ["Filho B"], level: 1, ordered: false },
      { blocks: ["Irmão"], level: 0, ordered: false },
    ]);
  });

  it("guarda o marcador de cada nível: numerada dentro de marcadores", () => {
    const html = "<ul><li>Documentos<ol><li>Primeiro</li><li>Segundo</li></ol></li></ul>";
    const items = itemsOf(htmlToRawBlocks(html));

    expect(items.map((i) => [i.level, i.ordered])).toEqual([
      [0, false],
      [1, true],
      [1, true],
    ]);
  });

  it("chega a quatro níveis sem perder nenhum degrau nem a ordem de leitura", () => {
    const html = "<ul><li>A<ul><li>B<ul><li>C<ul><li>D</li></ul></li></ul></li><li>E</li></ul></li><li>F</li></ul>";
    const items = itemsOf(htmlToRawBlocks(html));

    expect(items.map((i) => `${i.blocks[0]}@${i.level}`)).toEqual(["A@0", "B@1", "C@2", "D@3", "E@1", "F@0"]);
  });

  it("um <li> que só embrulha uma sublista não vira item vazio", () => {
    const items = itemsOf(htmlToRawBlocks("<ul><li><ul><li>Só o filho</li></ul></li></ul>"));

    expect(items).toEqual([{ blocks: ["Só o filho"], level: 1, ordered: false }]);
  });
});

describe("vários parágrafos dentro de um item", () => {
  it("não são concatenados na importação", () => {
    const items = itemsOf(htmlToRawBlocks("<ul><li><p>Primeiro</p><p>Segundo</p></li></ul>"));

    expect(items).toEqual([{ blocks: ["Primeiro", "Segundo"], level: 0, ordered: false }]);
  });

  it("continuam separados depois do ciclo completo, com offsets próprios", () => {
    const raw = htmlToRawBlocks("<ul><li><p>Primeiro</p><p>Segundo</p></li></ul>");
    const doc = buildStructuredDocument(raw, ptDocumentServices);
    const list = doc.blocks[0];

    expect(list.kind).toBe("list");
    if (list.kind !== "list") return;
    expect(list.items).toHaveLength(1);
    expect(list.items[0].blocks.map((p) => p.text)).toEqual(["Primeiro", "Segundo"]);
    expect(list.items[0].blocks[0].end).toBeLessThan(list.items[0].blocks[1].start);
  });

  it("sobrevivem ao ciclo de blocos crus sem virar um parágrafo só", () => {
    const raw = htmlToRawBlocks("<ul><li><p>Um</p><p>Dois</p></li><li>Três</li></ul>");

    expect(itemsOf(cycle(raw))).toEqual([
      { blocks: ["Um", "Dois"], level: 0, ordered: false },
      { blocks: ["Três"], level: 0, ordered: false },
    ]);
  });
});

describe("o nível sobrevive ao ciclo inteiro", () => {
  const RAW: RawBlock[] = [
    {
      kind: "list",
      ordered: false,
      items: [
        { blocks: ["Raiz"], level: 0, ordered: false },
        { blocks: ["Filho", "Segundo parágrafo do filho"], level: 1, ordered: true },
        { blocks: ["Neto"], level: 2, ordered: true },
        { blocks: ["Outra raiz"], level: 0, ordered: false },
      ],
    },
  ];

  it("volta idêntico depois de reconstruir o documento", () => {
    expect(cycle(RAW)).toEqual(RAW);
  });

  it("o markdown exportado devolve os mesmos níveis quando reimportado", async () => {
    const { documentToMarkdown } = await import("@/app/lib/export-document");
    const soUmParagrafo: RawBlock[] = [
      {
        kind: "list",
        ordered: false,
        items: [
          { blocks: ["Raiz"], level: 0, ordered: false },
          { blocks: ["Filho"], level: 1, ordered: true },
          { blocks: ["Neto"], level: 2, ordered: true },
          { blocks: ["Outra raiz"], level: 0, ordered: false },
        ],
      },
    ];
    const markdown = documentToMarkdown(soUmParagrafo);

    expect(markdown).toContain("- Raiz");
    expect(markdown).toContain("  1. Filho");
    expect(markdown).toContain("    1. Neto");
    expect(itemsOf(toRawBlocks(buildDocument(markdown).blocks))).toEqual(itemsOf(soUmParagrafo));
  });

  it("limitação declarada: no markdown, o parágrafo de continuação vira item na volta", () => {
    const markdown = "- Raiz\n  1. Filho\n    Segundo parágrafo do filho\n    1. Neto";
    const items = itemsOf(toRawBlocks(buildDocument(markdown).blocks));

    expect(items.map((i) => i.blocks[0])).not.toContain("Segundo parágrafo do filho");
  });
});

describe("o .docx carrega o que o markdown não carrega", () => {
  it("exporta e reimporta níveis, marcadores e o item de dois parágrafos", async () => {
    const { blocksToDocx } = await import("@/exporters/docx");
    const { importDocx } = await import("@/importers/docx");
    const original: RawBlock[] = [
      {
        kind: "list",
        ordered: false,
        items: [
          { blocks: ["Raiz"], level: 0, ordered: false },
          { blocks: ["Filho", "Segundo parágrafo do filho"], level: 1, ordered: true },
          { blocks: ["Neto"], level: 2, ordered: true },
          { blocks: ["Outra raiz"], level: 0, ordered: false },
        ],
      },
    ];

    const back = await importDocx(await blocksToDocx(original), ptDocumentServices);
    expect(back.ok).toBe(true);
    if (!back.ok) return;

    const items = itemsOf(toRawBlocks(back.value.doc.blocks));
    expect(items.map((i) => [i.blocks[0], i.level, i.ordered])).toEqual([
      ["Raiz", 0, false],
      ["Filho", 1, true],
      ["Neto", 2, true],
      ["Outra raiz", 0, false],
    ]);

    expect(items[1].level).toBe(1);
    expect(items[1].ordered).toBe(true);
  }, 60_000);

  it("limitação declarada: o parágrafo de continuação não volta dentro do item", async () => {
    const { blocksToDocx } = await import("@/exporters/docx");
    const { importDocx } = await import("@/importers/docx");
    const original: RawBlock[] = [
      {
        kind: "list",
        ordered: true,
        items: [{ blocks: ["Primeiro parágrafo", "Segundo parágrafo"], level: 0, ordered: true }],
      },
    ];

    const back = await importDocx(await blocksToDocx(original), ptDocumentServices);
    expect(back.ok).toBe(true);
    if (!back.ok) return;

    const kinds = toRawBlocks(back.value.doc.blocks).map((b) => b.kind);
    expect(kinds).toEqual(["list", "paragraph"]);
    expect(itemsOf(toRawBlocks(back.value.doc.blocks))[0].blocks).toEqual(["Primeiro parágrafo"]);
  }, 60_000);
});

describe("workspaces gravados antes dos níveis continuam legíveis", () => {
  it("um item em string vira um item de nível zero com o marcador da lista", () => {
    const legacy = [{ kind: "list", ordered: true, items: ["Antigo A", "Antigo B"] }] as unknown as RawBlock[];

    expect(itemsOf(cycle(legacy))).toEqual([
      { blocks: ["Antigo A"], level: 0, ordered: true },
      { blocks: ["Antigo B"], level: 0, ordered: true },
    ]);
  });
});
