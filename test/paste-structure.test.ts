import { describe, expect, it } from "vitest";
import { buildDocument, buildStructuredDocument, ptDocumentServices } from "@/lucid";
import { htmlToRawBlocks } from "@/importers/html-blocks";
import { gdocsExcerpt, GDOCS_HTML, GDOCS_PLAIN } from "./fixtures/gdocs-clipboard";

const words = (text: string): string => text.replace(/\s+/g, " ").trim();
const blocksOf = (html: string) => htmlToRawBlocks(html);
const sourceOf = (html: string): string => buildStructuredDocument(blocksOf(html), ptDocumentServices).source;

describe("a real Google Docs paste — the structure the clipboard already carried", () => {
  it("reads the document as the blocks it is, not as the ones a newline rule can guess", () => {
    const declared = blocksOf(GDOCS_HTML);

    const guessed = buildDocument(GDOCS_PLAIN).blocks;

    expect(declared.length).toBe(185);
    expect(declared.filter((block) => block.kind === "table")).not.toHaveLength(0);
    expect(guessed.length).toBe(85);
  });

  it("does not glue several paragraphs into one long one", () => {
    const longest = buildDocument(GDOCS_PLAIN).blocks.reduce(
      (most, block) =>
        block.kind === "list" || block.kind === "table" ? most : Math.max(most, block.sentences.length),
      0,
    );

    expect(longest).toBe(19);
    for (const block of blocksOf(GDOCS_HTML)) {
      if (block.kind === "paragraph") expect(block.text).not.toContain("\n");
    }
  });

  it("keeps lists as lists, in one piece", () => {
    const lists = blocksOf(GDOCS_HTML).filter((b) => b.kind === "list");
    expect(lists.length).toBe(5);
    for (const list of lists) if (list.kind === "list") expect(list.items.length).toBeGreaterThan(0);

    expect(buildDocument(GDOCS_PLAIN).blocks.filter((b) => b.kind === "list").length).toBe(30);
  });

  it("says exactly the same words as the text that was pasted, in the same order", () => {
    expect(words(sourceOf(GDOCS_HTML))).toBe(words(GDOCS_PLAIN));
  });

  it("adds nothing and drops nothing: the word counts match", () => {
    expect(words(sourceOf(GDOCS_HTML)).split(" ")).toHaveLength(words(GDOCS_PLAIN).split(" ").length);
  });

  it("is deterministic", () => {
    expect(sourceOf(GDOCS_HTML)).toBe(sourceOf(GDOCS_HTML));
  });

  it("the excerpt used by the DOM tests carries the same shapes", () => {
    const { html, plain } = gdocsExcerpt();
    const blocks = blocksOf(html);
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph", "paragraph", "list", "paragraph", "list"]);
    expect(words(sourceOf(html))).toBe(words(plain));
  });
});

describe("inline markup inside a block is not a word boundary", () => {
  it("does not split a word where a link or a span closes", () => {
    expect(htmlToRawBlocks('<p>Veja o <a href="x">site</a>.</p>')).toEqual([
      { kind: "paragraph", text: "Veja o site." },
    ]);
    expect(htmlToRawBlocks("<p><span>Comuni</span><span>que</span> o fato.</p>")).toEqual([
      { kind: "paragraph", text: "Comunique o fato." },
    ]);
  });

  it("still separates the text of two blocks that sit side by side", () => {
    expect(htmlToRawBlocks("<p>Primeiro.</p><p>Segundo.</p>")).toEqual([
      { kind: "paragraph", text: "Primeiro." },
      { kind: "paragraph", text: "Segundo." },
    ]);
  });

  it("treats a line break inside a block as a space, the way it reads", () => {
    expect(htmlToRawBlocks("<p>Uma linha<br>outra linha</p>")).toEqual([
      { kind: "paragraph", text: "Uma linha outra linha" },
    ]);
  });

  it("keeps the paragraphs of one list item apart, instead of running them together", () => {
    expect(htmlToRawBlocks("<ul><li><p>Um</p><p>Dois</p></li></ul>")).toEqual([
      { kind: "list", ordered: false, items: [{ blocks: ["Um", "Dois"], level: 0, ordered: false }] },
    ]);
  });
});
