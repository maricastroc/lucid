import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

const ENTRY_TEXT = "O pedido foi indeferido pela comissão por falta dos 3 documentos supracitados.";

const entryBlock = () => within(auditPanel().getByRole("region", { name: /texto de entrada/i }));
const showEntryText = () => entryBlock().getByRole("button", { name: /ver o texto de entrada/i });

/** One sentence, long enough that the trail has to fold the passage it replaced. */
const LONG_PASSIVE =
  "O pedido de reconsideração que o interessado apresentou foi indeferido pela comissão por falta " +
  "dos 3 documentos supracitados no edital. O prazo para recorrer é de dez dias.";

async function applyManualEdit(user: Awaited<ReturnType<typeof mountStudio>>["user"]): Promise<void> {
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
  await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
  const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
  await user.clear(editor);
  await user.type(editor, PLAIN_FIRST_SENTENCE);
  await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));
  await auditPanel().findByText(/nenhuma falha encontrada/i);
  await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));
}

describe("the record of a document · the text as it came in", () => {
  it("keeps the entry text out of sight until it is asked for", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: ENTRY_TEXT });
    await auditReady();

    expect(entryBlock().queryByText(ENTRY_TEXT)).not.toBeInTheDocument();
    await user.click(showEntryText());
    expect(entryBlock().getByText(ENTRY_TEXT)).toBeInTheDocument();

    await user.click(entryBlock().getByRole("button", { name: /ocultar o texto de entrada/i }));
    expect(entryBlock().queryByText(ENTRY_TEXT)).not.toBeInTheDocument();
  });

  it("offers no way to put the entry text back — it is a record, not a restore", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: ENTRY_TEXT });
    await auditReady();
    await user.click(showEntryText());

    expect(entryBlock().queryByRole("button", { name: /restaurar|reverter|voltar ao original/i })).toBeNull();
    expect(entryBlock().getByText(/não restaura nem aplica nada/i)).toBeInTheDocument();
  });

  it("survives a change to the document: the entry text is the text that came in, not the current one", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: ENTRY_TEXT });
    await auditReady();
    await applyManualEdit(user);

    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);
    await user.click(showEntryText());
    expect(entryBlock().getByText(ENTRY_TEXT)).toBeInTheDocument();
  });

  it("says the entry text was never recorded, instead of pretending the delta is checkable", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: null });
    await auditReady();

    expect(auditPanel().queryByText(/não registrado para este documento/i)).not.toBeInTheDocument();

    await applyManualEdit(user);
    expect(entryBlock().getByText(/não registrado para este documento/i)).toBeInTheDocument();
    expect(entryBlock().queryByRole("button", { name: /ver o texto de entrada/i })).toBeNull();
  });

  it("says a document written here has no entry text to compare against", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: "" });
    await auditReady();
    await applyManualEdit(user);

    expect(entryBlock().getByText(/foi escrito aqui/i)).toBeInTheDocument();
  });

  it("shows nothing at all for a document with no entry text and no registered change", async () => {
    mountStudio({ text: PASSIVE_AND_JARGON, originalText: "" });
    await auditReady();

    expect(auditPanel().queryByRole("region", { name: /texto de entrada/i })).toBeNull();
    expect(auditPanel().queryByText(/alterações registradas/i)).not.toBeInTheDocument();
  });
});

describe("the record of a document · what the trail shows and what it admits", () => {
  it("shows what each registered change replaced, and with what", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyManualEdit(user);

    const trail = within(auditPanel().getByRole("list", { name: /alterações registradas/i }));
    expect(trail.getByText(/o pedido foi indeferido pela comissão/i)).toBeInTheDocument();
    expect(trail.getByText(/a comissão negou o pedido/i)).toBeInTheDocument();
  });

  it("folds a long passage and unfolds it on request, instead of growing the card", async () => {
    const { user } = mountStudio({ text: LONG_PASSIVE });
    await auditReady();
    await applyManualEdit(user);

    const trail = within(auditPanel().getByRole("list", { name: /alterações registradas/i }));
    expect(trail.getByText(/…$/)).toBeInTheDocument();

    await user.click(trail.getByRole("button", { name: /ver trecho completo/i }));
    expect(trail.queryByText(/…$/)).not.toBeInTheDocument();

    await user.click(trail.getByRole("button", { name: /recolher trecho/i }));
    expect(trail.getByText(/…$/)).toBeInTheDocument();
  });

  it("does not draw a fall for a change that left the weight where it was", async () => {
    const { user } = mountStudio({ text: "O pedido foi analisado em sede de procedimento administrativo." });
    await auditReady();
    await openPoint(user, "Jargão", "em sede de");
    await user.click(auditPanel().getByRole("button", { name: /^trocar por/i }));

    const trail = within(await auditPanel().findByRole("list", { name: /alterações registradas/i }));
    const weight = trail.getByText(/→/);
    const [before, after] = weight.textContent!.split("→");
    expect(after.replace(/[↓↑=]/g, "").trim()).toBe(before.trim());
    expect(weight).toHaveTextContent("=");
    expect(weight).not.toHaveTextContent("↓");
  });

  it("says out loud that it holds only the registered changes", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyManualEdit(user);

    expect(auditPanel().getByText(/sem entrar aqui nem no relatório exportado/i)).toBeInTheDocument();
  });
});

describe("the record of a document · a different document takes its place", () => {
  it("restarts the record when the example is loaded over the current document", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: ENTRY_TEXT });
    await auditReady();
    await applyManualEdit(user);
    expect(auditPanel().getByRole("list", { name: /alterações registradas/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /início|lucid/i }));
    await user.click(await screen.findByRole("button", { name: /descartar|sair sem salvar|apagar/i }));
    await user.click(await screen.findByRole("button", { name: /carregar exemplo/i }));
    await auditReady();

    expect(auditPanel().queryByRole("list", { name: /alterações registradas/i })).toBeNull();
    await user.click(showEntryText());

    expect(entryBlock().queryByText(ENTRY_TEXT)).not.toBeInTheDocument();
  });
});

describe("the record of a document · pasting a document in", () => {
  const draft = () => documentRegion().getByRole("textbox", { name: /texto do documento/i });
  const PASTED = "A comissão indeferiu o pedido porque faltaram os 3 documentos citados acima.";

  it("takes a paste into the empty draft as the document coming in", async () => {
    const { user } = mountStudio();
    await user.click(screen.getByRole("button", { name: /escrever ou colar texto/i }));
    await user.click(draft());
    await user.paste(PASTED);
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();

    await user.click(showEntryText());
    expect(entryBlock().getByText(PASTED)).toBeInTheDocument();
  });

  it("restarts the record when a paste replaces the whole draft", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: ENTRY_TEXT });
    await auditReady();
    await applyManualEdit(user);
    expect(auditPanel().getByRole("list", { name: /alterações registradas/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    await user.click(draft());
    await user.keyboard("{Control>}a{/Control}");
    await user.paste(PASTED);
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();

    expect(auditPanel().queryByRole("list", { name: /alterações registradas/i })).toBeNull();
    await user.click(showEntryText());
    expect(entryBlock().getByText(PASTED)).toBeInTheDocument();
    expect(entryBlock().queryByText(ENTRY_TEXT)).not.toBeInTheDocument();
  });

  it("leaves the entry text alone when the author types instead of pasting", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, originalText: ENTRY_TEXT });
    await auditReady();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    await user.type(draft(), " Texto acrescentado.");
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();

    await user.click(showEntryText());
    expect(entryBlock().getByText(ENTRY_TEXT)).toBeInTheDocument();
  });
});
