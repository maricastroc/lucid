import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readWorkspace } from "@/app/lib/workspace";
import { gdocsExcerpt } from "../fixtures/gdocs-clipboard";
import { mountStudio } from "./support/mount-studio";
import { pasteInto } from "./support/paste";
import { documentRegion } from "./support/panels";
import { auditReady } from "./support/points";

const { html: GDOCS_HTML, plain: GDOCS_PLAIN } = gdocsExcerpt();

const draft = () => documentRegion().getByRole("textbox", { name: /texto do documento/i }) as HTMLTextAreaElement;
const article = () => documentRegion().getByRole("article");

type User = ReturnType<typeof mountStudio>["user"];

async function pasteIntoEmptyDraft(flavours: { html?: string; plain: string }): Promise<User> {
  const { user } = mountStudio();
  await user.click(screen.getByRole("button", { name: /escrever ou colar texto/i }));
  pasteInto(draft(), flavours);
  await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
  await auditReady();
  return user;
}

describe("pasting from Google Docs — the structure comes in with the text", () => {
  it("keeps the title and the paragraphs apart instead of running them together", async () => {
    await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });

    const paragraphs = article().querySelectorAll("[data-start]");
    expect(paragraphs.length).toBe(6);
    expect(paragraphs[0].textContent).toContain("EDITAL CEARÁ DA CIDADANIA");
    expect(paragraphs[0].textContent).not.toContain("A Secretaria da Cultura");
  });

  it("keeps the lists as lists", async () => {
    await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });

    const lists = article().querySelectorAll("ul, ol");
    expect(lists.length).toBe(2);
    expect(lists[0].querySelectorAll("li").length).toBe(12);
  });

  it("changes no word of what was pasted", async () => {
    await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });

    const words = (text: string) => text.replace(/\s+/g, " ").trim();
    const onScreen = [...article().querySelectorAll("[data-start]")]
      .map((block) => {
        const copy = block.cloneNode(true) as HTMLElement;
        copy.querySelectorAll(".u-sublabel").forEach((label) => label.remove());
        copy.querySelectorAll("li").forEach((item) => item.after(" "));
        return words(copy.textContent ?? "");
      })
      .join(" ");

    expect(onScreen).toBe(words(GDOCS_PLAIN));
  });

  it("audits exactly the blocks it displays", async () => {
    await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });

    const shown = [...article().querySelectorAll("[data-start]")].map((el) => Number(el.getAttribute("data-start")));
    const stored = readWorkspace()!;
    expect(stored.blocks).not.toBeNull();
    expect(shown.length).toBe(stored.blocks!.length);
    expect(shown).toEqual([...shown].sort((a, b) => a - b));
  });

  it("persists the blocks, so a reload does not fall back to guessing", async () => {
    await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });
    const kinds = readWorkspace()!.blocks!.map((b) => b.kind);
    expect(kinds).toEqual(["paragraph", "paragraph", "paragraph", "list", "paragraph", "list"]);
  });

  it("records the pasted text as the document's entry text", async () => {
    await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });
    expect(readWorkspace()!.originalText).toContain("EDITAL CEARÁ DA CIDADANIA");
  });
});

describe("pasting from Google Docs — editing afterwards still works", () => {
  it("applies an edit and undoes it", async () => {
    const user = await pasteIntoEmptyDraft({ html: GDOCS_HTML, plain: GDOCS_PLAIN });

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    const field = draft();
    const alvo = "A Secretaria da Cultura do Estado do Ceará";
    const at = field.value.indexOf(alvo);
    expect(at).toBeGreaterThanOrEqual(0);
    field.focus();
    field.setSelectionRange(at, at + "A Secretaria".length);
    await user.keyboard("A Pasta");

    expect(draft().value).toContain("A Pasta da Cultura");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    expect(article().querySelectorAll("ul, ol").length).toBe(2);
  });
});

describe("pasting a document over itself", () => {
  it("still brings the structure in, even though the text does not change", async () => {
    const user = await pasteIntoEmptyDraft({ plain: GDOCS_PLAIN });
    expect(readWorkspace()!.blocks).toBeNull();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    pasteInto(draft(), { html: GDOCS_HTML, plain: GDOCS_PLAIN });
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();

    expect(readWorkspace()!.blocks).not.toBeNull();
    expect(article().querySelectorAll("ul, ol").length).toBe(2);
  });
});

describe("pasting without structure — nothing changes", () => {
  it("falls back to the plain text when the clipboard carries no html", async () => {
    await pasteIntoEmptyDraft({ plain: GDOCS_PLAIN });
    expect(readWorkspace()!.blocks).toBeNull();
  });

  it("falls back when the html says something other than what was pasted", async () => {
    await pasteIntoEmptyDraft({ html: "<p>Um texto que não é o que foi colado.</p>", plain: GDOCS_PLAIN });
    expect(readWorkspace()!.blocks).toBeNull();
  });

  it("refuses a structure that would swallow the line breaks the author can see", async () => {
    const oneBlock = `<p>${GDOCS_PLAIN.split("\n")
      .filter((l) => l.trim())
      .join(" ")}</p>`;
    await pasteIntoEmptyDraft({ html: oneBlock, plain: GDOCS_PLAIN });

    expect(readWorkspace()!.blocks).toBeNull();
    expect(readWorkspace()!.text).toContain("\n");
  });

  it("accepts a structure that splits a pasted line into several units", async () => {
    const plain = "Título\nUm parágrafo. Outro parágrafo.";
    await pasteIntoEmptyDraft({ html: "<p>Título</p><p>Um parágrafo.</p><p>Outro parágrafo.</p>", plain });
    expect(readWorkspace()!.blocks!.map((b) => b.kind)).toEqual(["paragraph", "paragraph", "paragraph"]);
  });

  it("falls back when the html has no blocks at all", async () => {
    await pasteIntoEmptyDraft({ html: "<div><span>sem blocos</span></div>", plain: GDOCS_PLAIN });
    expect(readWorkspace()!.blocks).toBeNull();
  });
});
