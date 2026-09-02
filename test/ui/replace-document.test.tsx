import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { analyze } from "@/lucid";
import { EMPTY_MARKS, withMark } from "@/app/lib/review-marks";
import { blocksToDocx } from "../../src/exporters/docx";
import { mountStudio } from "./support/mount-studio";
import { documentRegion } from "./support/panels";
import { auditReady } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

type User = ReturnType<typeof mountStudio>["user"];

const INCOMING = "A comissão indeferiu o pedido porque faltaram os 3 documentos citados acima.";

const reviewedPoint = () => withMark(EMPTY_MARKS, analyze(PASSIVE_AND_JARGON).findings[0], "seen");

// Enquanto o diálogo está aberto ele é modal: o resto do app sai da árvore de acessibilidade.
// `hidden: true` alcança o documento nos dois estados, que é o que estas provas comparam.
const draft = () =>
  screen.getByRole("textbox", { name: /texto do documento/i, hidden: true }) as HTMLTextAreaElement;
const dialog = () => screen.queryByRole("alertdialog", { name: /abrir outro documento/i });

async function pasteOverEverything(user: User): Promise<void> {
  await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
  await user.click(draft());
  await user.keyboard("{Control>}a{/Control}");
  await user.paste(INCOMING);
}

const docxWith = (text: string): File =>
  new File([blocksToDocx([{ kind: "paragraph", text }]) as BlobPart], "novo.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

const openDocumentInput = () =>
  screen
    .getByRole("region", { name: /documento em revisão/i })
    .querySelector<HTMLInputElement>('input[type="file"]')!;

describe("opening another document over an audit under way", () => {
  it("asks first, naming what will not come back", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();

    await pasteOverEverything(user);

    const box = await screen.findByRole("alertdialog", { name: /abrir outro documento/i });
    expect(box).toHaveTextContent("1 ponto revisado");
    expect(draft()).toHaveValue(PASSIVE_AND_JARGON);
  });

  it("does not ask when there is nothing to lose — the audit is recomputed from the text", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await pasteOverEverything(user);

    expect(dialog()).toBeNull();
    expect(draft()).toHaveValue(INCOMING);
  });

  it("keeps the document and the decisions when the author cancels", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();
    await pasteOverEverything(user);

    await user.click(screen.getByRole("button", { name: /cancelar a abertura/i }));

    await waitFor(() => expect(dialog()).toBeNull());
    expect(draft()).toHaveValue(PASSIVE_AND_JARGON);
    expect(screen.getByRole("complementary", { name: /auditoria/i })).toHaveTextContent(/1\s*revisado/i);
  });

  it("replaces the document only after the author says to discard", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();
    await pasteOverEverything(user);

    await user.click(screen.getByRole("button", { name: /descartar e abrir/i }));

    await waitFor(() => expect(draft()).toHaveValue(INCOMING));
    expect(dialog()).toBeNull();
  });

  it("asks the same question when the document arrives as a file", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();

    await user.upload(openDocumentInput(), docxWith(PLAIN_FIRST_SENTENCE));

    const box = await screen.findByRole("alertdialog", { name: /abrir outro documento/i });
    expect(box).toHaveTextContent("1 ponto revisado");
    await user.click(screen.getByRole("button", { name: /cancelar a abertura/i }));
    expect(await documentRegion().findByText(/supracitados/i)).toBeInTheDocument();
  });

  it("opens the file once the author discards what was here", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();
    await user.upload(openDocumentInput(), docxWith(PLAIN_FIRST_SENTENCE));

    await user.click(screen.getByRole("button", { name: /descartar e abrir/i }));

    expect(await documentRegion().findByText(/citados acima/i)).toBeInTheDocument();
  });
});

describe("saving the audit as a starting point before letting it go", () => {
  const captureDownload = () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return "blob:lucid";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    return blobs;
  };

  async function chooseSave(user: User): Promise<void> {
    await user.click(screen.getByRole("button", { name: /salvar ponto de partida/i }));
  }

  it("asks for the title before writing anything, because the title is the only identity", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();
    await pasteOverEverything(user);

    await chooseSave(user);

    expect(await screen.findByRole("dialog", { name: /salvar ponto de partida/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar arquivo/i })).toBeDisabled();
  });

  it("writes the file the product can attach again, and only then opens the other document", async () => {
    const blobs = captureDownload();
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();
    await pasteOverEverything(user);
    await chooseSave(user);

    await user.type(screen.getByRole("textbox", { name: /nome do documento/i }), "Edital 04/2026 — v1");
    await user.click(screen.getByRole("button", { name: /salvar arquivo/i }));

    await waitFor(() => expect(draft()).toHaveValue(INCOMING));
    expect(blobs).toHaveLength(1);
    const saved = JSON.parse(await blobs[0].text());
    expect(saved.title).toBe("Edital 04/2026 — v1");
    expect(saved.source.text).toBe(PASSIVE_AND_JARGON);
    expect(saved.decisions).toHaveLength(1);
  });

  it("goes back to the question when the author drops out of the title, without opening or discarding", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON, reviewMarks: reviewedPoint() });
    await auditReady();
    await pasteOverEverything(user);
    await chooseSave(user);

    await user.keyboard("{Escape}");

    expect(await screen.findByRole("alertdialog", { name: /abrir outro documento/i })).toBeInTheDocument();
    expect(draft()).toHaveValue(PASSIVE_AND_JARGON);
  });
});
