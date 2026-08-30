import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion, openChanges } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

const openJargon = async (user: Awaited<ReturnType<typeof mountStudio>>["user"]) =>
  openPoint(user, "Jargão", "supracitados");

describe("applying an equivalent the engine already signed", () => {
  it("offers the swap by name, so the author reads what they are accepting", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openJargon(user);

    expect(auditPanel().getByRole("button", { name: /trocar por «citados acima»/i })).toBeInTheDocument();
  });

  it("puts the equivalent in the document and leaves the rest of the sentence alone", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openJargon(user);

    await user.click(auditPanel().getByRole("button", { name: /trocar por «citados acima»/i }));

    const article = documentRegion().getByRole("article");
    expect(article).toHaveTextContent(/dos 3 documentos citados acima/i);
    expect(article).not.toHaveTextContent(/supracitados/i);
    expect(article).toHaveTextContent(/foi indeferido pela comissão/i);
  });

  it("records it in the trail as a glossary swap, not as free typing", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openJargon(user);

    await user.click(auditPanel().getByRole("button", { name: /trocar por «citados acima»/i }));
    await openChanges(user);

    expect(auditPanel().getByText(/troca direta do glossário/i)).toBeInTheDocument();
    expect(auditPanel().queryByText(/^edição do autor$/i)).not.toBeInTheDocument();
  });

  it("re-audits: the point it resolved leaves the document, the others stay", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    expect(documentRegion().getByRole("button", { name: /^Jargão:/ })).toBeInTheDocument();

    await openJargon(user);
    await user.click(auditPanel().getByRole("button", { name: /trocar por «citados acima»/i }));

    expect(documentRegion().queryByRole("button", { name: /^Jargão:/ })).not.toBeInTheDocument();
    expect(documentRegion().getByRole("button", { name: /^Voz passiva:/ })).toBeInTheDocument();
  });

  it("can be undone like any other change", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openJargon(user);
    await user.click(auditPanel().getByRole("button", { name: /trocar por «citados acima»/i }));

    await user.click(screen.getByRole("button", { name: /^desfazer$/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/supracitados/i);
  });

  it("offers no way to apply every swap at once — one occurrence at a time is the rule", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openJargon(user);

    const applyButtons = auditPanel().getAllByRole("button", { name: /trocar por/i });
    expect(applyButtons).toHaveLength(1);
    expect(auditPanel().queryByRole("button", { name: /todas|all/i })).not.toBeInTheDocument();
  });
});

describe("the case the sentence already required", () => {
  it("keeps the capital when the replaced term opened the sentence", async () => {
    const { user } = mountStudio({ text: "Outrossim, o prazo para recorrer é de dez dias." });
    await auditReady();
    await openPoint(user, "Jargão", "Outrossim");

    await user.click(auditPanel().getByRole("button", { name: /trocar por «além disso»/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/^Além disso, o prazo/);
  });

  it("leaves a mid-sentence term in lower case", async () => {
    const { user } = mountStudio({ text: "O prazo, outrossim, é de dez dias e ninguém contesta." });
    await auditReady();
    await openPoint(user, "Jargão", "outrossim");

    await user.click(auditPanel().getByRole("button", { name: /trocar por «além disso»/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/prazo, além disso, é/);
  });
});
