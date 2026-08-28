import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

async function replaceFirstSentence(user: Awaited<ReturnType<typeof mountStudio>>["user"]): Promise<void> {
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
  await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
  const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
  await user.clear(editor);
  await user.type(editor, PLAIN_FIRST_SENTENCE);
  await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));
  await auditPanel().findByText(/nenhuma falha encontrada/i);
  await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));
}

describe("flow 6 · re-auditing after a change", () => {
  it("drops the points the edit resolved, from the list and from the document", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    expect(auditPanel().getByRole("button", { name: /^Pontos/ })).toHaveTextContent("2");
    await replaceFirstSentence(user);

    expect(auditPanel().getByRole("button", { name: /^Pontos/ })).not.toHaveTextContent("2");
    expect(auditPanel().queryByRole("button", { name: /^Voz passiva/ })).not.toBeInTheDocument();
    expect(documentRegion().queryByRole("button", { name: /^Voz passiva:/ })).not.toBeInTheDocument();
    expect(auditPanel().getByText(/nenhuma anotação disparada/i)).toBeInTheDocument();
  });

  it("returns to the list instead of leaving a note open on a point that no longer exists", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await replaceFirstSentence(user);

    expect(auditPanel().queryByRole("button", { name: /voltar à lista/i })).not.toBeInTheDocument();
  });

  it("keeps the change in the trail, so the re-audit is not silent about what moved", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await replaceFirstSentence(user);

    expect(auditPanel().getByText(/edição do autor/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/registro do que foi feito nesta sessão/i)).toBeInTheDocument();
  });
});
