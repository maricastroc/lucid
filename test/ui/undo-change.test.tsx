import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

type User = Awaited<ReturnType<typeof mountStudio>>["user"];

async function applyManualEdit(user: User): Promise<void> {
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
  await applyManualEditFromNote(user);
}

async function applyManualEditFromList(user: User): Promise<void> {
  await user.click(auditPanel().getByRole("button", { name: /^\d+“foi indeferido pela comissão/ }));
  await applyManualEditFromNote(user);
}

async function applyManualEditFromNote(user: User): Promise<void> {
  await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
  const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
  await user.clear(editor);
  await user.type(editor, PLAIN_FIRST_SENTENCE);
  await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));
  await auditPanel().findByText(/nenhuma falha encontrada/i);
  await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));
}

describe("undoing a change", () => {
  it("is offered right after a change lands", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyManualEdit(user);

    expect(screen.getByText(/alteração aplicada ao texto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^desfazer$/i })).toBeInTheDocument();
  });

  it("puts the text back and audits it again", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyManualEdit(user);
    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);

    await user.click(screen.getByRole("button", { name: /^desfazer$/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/foi indeferido pela comissão/i);
    expect(documentRegion().getByRole("button", { name: /^Voz passiva:/ })).toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: /^\d+“foi indeferido pela comissão/ })).toBeInTheDocument();
  });

  it("brings the author's marks back with the text", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
    await user.click(auditPanel().getByRole("button", { name: /^marcar como vista$/i }));
    await user.click(auditPanel().getByRole("button", { name: /voltar à lista/i }));

    await applyManualEditFromList(user);
    await user.click(screen.getByRole("button", { name: /^desfazer$/i }));

    expect(auditPanel().getByRole("button", { name: /^Marcar “1\. foi indeferido/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
