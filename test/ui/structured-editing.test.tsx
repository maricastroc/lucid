import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { mountStudio } from "./support/mount-studio";
import { auditReady } from "./support/points";
import { documentRegion } from "./support/panels";

const BLOCKS: readonly RawBlock[] = [
  { kind: "heading", level: 1, text: "Prazos e documentos" },
  { kind: "paragraph", text: "O interessado deve entregar os documentos em sede de procedimento." },
  { kind: "paragraph", text: "O prazo para recorrer é de dez dias supracitados." },
  { kind: "list", ordered: false, items: ["Requerimento assinado", "Comprovante de residência"] },
];

const SOURCE =
  "Prazos e documentos\n\n" +
  "O interessado deve entregar os documentos em sede de procedimento.\n\n" +
  "O prazo para recorrer é de dez dias supracitados.\n\n" +
  "Requerimento assinado\nComprovante de residência";

const draft = () => documentRegion().getByRole("textbox", { name: /texto do documento/i }) as HTMLTextAreaElement;

type User = ReturnType<typeof mountStudio>["user"];

async function openDraft(): Promise<User> {
  const { user } = mountStudio({ text: SOURCE, blocks: BLOCKS });
  await auditReady();
  await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
  return user;
}

async function deleteRange(user: User, from: string): Promise<void> {
  const field = draft();
  const start = field.value.indexOf(from);
  expect(start).toBeGreaterThanOrEqual(0);
  field.focus();
  field.setSelectionRange(start, start + from.length);
  await user.keyboard("{Backspace}");
}

describe("editing an imported document", () => {
  it("deletes a paragraph the author selected with its blank line", async () => {
    const user = await openDraft();
    await deleteRange(user, "O prazo para recorrer é de dez dias supracitados.\n\n");

    expect(draft().value).not.toContain("dez dias supracitados");
    expect(draft().value).toContain("Prazos e documentos");
  });

  it("deletes it too when the selection left the blank line behind", async () => {
    const user = await openDraft();
    await deleteRange(user, "O prazo para recorrer é de dez dias supracitados.");

    expect(draft().value).not.toContain("dez dias supracitados");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the rest of the structure after the deletion", async () => {
    const user = await openDraft();
    await deleteRange(user, "O prazo para recorrer é de dez dias supracitados.\n\n");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));

    const article = documentRegion().getByRole("article");
    expect(article).toHaveTextContent(/prazos e documentos/i);
    expect(article).toHaveTextContent(/requerimento assinado/i);
    expect(article).not.toHaveTextContent(/dez dias supracitados/i);
  });

  it("deletes a heading without promoting the paragraph under it", async () => {
    const user = await openDraft();
    await deleteRange(user, "Prazos e documentos\n\n");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));

    const article = documentRegion().getByRole("article");
    expect(article).not.toHaveTextContent(/prazos e documentos/i);
    expect(article.querySelector("h2, h3, h4, h5, h6")).toBeNull();
  });

  it("deletes one list item and keeps the list", async () => {
    const user = await openDraft();
    await deleteRange(user, "\nComprovante de residência");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));

    const list = documentRegion().getByRole("article").querySelector("ul");
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll("li")).toHaveLength(1);
  });

  it("joins two paragraphs when the author deletes the break between them", async () => {
    const user = await openDraft();
    await deleteRange(user, "procedimento.\n\nO prazo");
    await user.keyboard("procedimento. O prazo");

    expect(draft().value).toContain("procedimento. O prazo para recorrer");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers the empty state once every block is gone", async () => {
    const user = await openDraft();
    const field = draft();
    field.focus();
    field.setSelectionRange(0, field.value.length);
    await user.keyboard("{Backspace}");

    expect(draft().value).toBe("");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    expect(await screen.findByRole("button", { name: /carregar exemplo/i })).toBeInTheDocument();
  });
});

describe("editing an imported document — what it still refuses, and where it says so", () => {
  it("refuses to invent a structure for text typed over the whole document", async () => {
    const user = await openDraft();
    const field = draft();
    field.focus();
    field.setSelectionRange(0, field.value.length);

    await user.keyboard("U");

    const notice = await screen.findByRole("alert");
    expect(notice).toHaveTextContent(/atravessa mais de um bloco/i);
    expect(notice).toHaveTextContent(/continua como estava/i);
  });

  it("puts the refusal next to the text, not at the top of the window", async () => {
    const user = await openDraft();
    const field = draft();
    field.focus();
    field.setSelectionRange(0, field.value.length);
    await user.keyboard("U");

    const notice = await screen.findByRole("alert");

    expect(notice.parentElement).toHaveClass("absolute", "bottom-5");
    const pane = notice.parentElement!.parentElement!;
    expect(pane.querySelector('[aria-label="Documento em revisão"]')).not.toBeNull();
    expect(pane.querySelector('[aria-label="Auditoria"]')).toBeNull();
  });

  it("still offers both ways out of the refusal", async () => {
    const user = await openDraft();
    const field = draft();
    field.focus();
    field.setSelectionRange(0, field.value.length);
    await user.keyboard("U");

    const notice = await screen.findByRole("alert");
    expect(notice.querySelector("button")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /descartar/i }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(draft().value).toContain("Prazos e documentos");
  });
});
