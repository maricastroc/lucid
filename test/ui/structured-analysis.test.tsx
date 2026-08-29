import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { readWorkspace } from "@/app/lib/workspace";
import { mountStudio } from "./support/mount-studio";
import { documentRegion } from "./support/panels";
import { auditReady } from "./support/points";

const BLOCKS: readonly RawBlock[] = [
  { kind: "heading", level: 1, text: "Prazos e documentos" },
  { kind: "paragraph", text: "O interessado deve entregar os documentos em sede de procedimento." },
  { kind: "list", ordered: false, items: ["Requerimento assinado", "Comprovante de residência"] },
];

const SOURCE =
  "Prazos e documentos\n\n" +
  "O interessado deve entregar os documentos em sede de procedimento.\n\n" +
  "Requerimento assinado\nComprovante de residência";

const article = () => documentRegion().getByRole("article");
const draft = () => documentRegion().getByRole("textbox", { name: /texto do documento/i }) as HTMLTextAreaElement;

const blocksOnScreen = () => [...article().querySelectorAll("[data-start]")];

describe("an imported document is never analysed by the plain-text rule", () => {
  it("keeps its heading and its list through an edit", async () => {
    const { user } = mountStudio({ text: SOURCE, blocks: BLOCKS });
    await auditReady();
    expect(article().querySelector("ul")).not.toBeNull();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    const field = draft();
    const at = field.value.indexOf("em sede de");
    field.focus();
    field.setSelectionRange(at, at + "em sede de".length);
    await user.keyboard("durante");

    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();

    expect(article().querySelector("ul")).not.toBeNull();
    expect(article().querySelectorAll("ul li")).toHaveLength(2);
    expect(article()).toHaveTextContent(/durante procedimento/i);
  });

  it("segments the page into the blocks the workspace holds, not into lines", async () => {
    mountStudio({ text: SOURCE, blocks: BLOCKS });
    await auditReady();

    expect(blocksOnScreen()).toHaveLength(3);
    expect(readWorkspace()!.blocks).toHaveLength(3);
  });

  it("holds the text and its structure as one value, so an edit cannot pair them wrongly", async () => {
    const { user } = mountStudio({ text: SOURCE, blocks: BLOCKS });
    await auditReady();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    const field = draft();
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    await user.keyboard(" e o comprovante.");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();

    const stored = readWorkspace()!;
    expect(stored.blocks).not.toBeNull();
    const offsets = blocksOnScreen().map((el) => Number(el.getAttribute("data-start")));
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(offsets).toHaveLength(stored.blocks!.length);
    expect(stored.text).toContain("e o comprovante.");
  });

  it("falls back to plain text only when the author asks for it", async () => {
    const { user } = mountStudio({ text: SOURCE, blocks: BLOCKS });
    await auditReady();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    const field = draft();
    field.focus();
    field.setSelectionRange(0, field.value.length);
    await user.keyboard("U");

    await user.click(await screen.findByRole("button", { name: /aplicar como texto simples/i }));
    expect(readWorkspace()!.blocks).toBeNull();
  });
});
