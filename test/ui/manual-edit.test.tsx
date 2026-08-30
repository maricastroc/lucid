import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion, openChanges } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

describe("flow 4 · verifying and applying a manual edit", () => {
  it("verifies the author's own version before offering to apply it", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
    const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
    await user.clear(editor);
    await user.type(editor, PLAIN_FIRST_SENTENCE);
    await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));

    expect(await auditPanel().findByText(/nenhuma falha encontrada/i)).toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: /^usar como rascunho/i })).toBeEnabled();
  });

  it("applies the edit to the document and records it in the trail", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
    const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
    await user.clear(editor);
    await user.type(editor, PLAIN_FIRST_SENTENCE);
    await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));
    await auditPanel().findByText(/nenhuma falha encontrada/i);
    await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);
    expect(documentRegion().getByRole("article")).not.toHaveTextContent(/foi indeferido/i);
    await openChanges(user);
    const trail = within(auditPanel().getByRole("list", { name: /alterações aplicadas/i }));
    expect(trail.getByText(/edição do autor/i)).toBeInTheDocument();
  });

  it("refuses to verify an untouched draft", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));

    expect(auditPanel().getByRole("button", { name: /verificar minha versão/i })).toBeDisabled();
  });
});
