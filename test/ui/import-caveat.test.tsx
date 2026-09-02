import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel } from "./support/panels";
import { auditReady } from "./support/points";

const FLATTENED = "Categoria Qtd Motivo\n\nLei/Decreto/Normativo 3 Fidelidade, exceções e referências cruzadas";

const docxNotes = (tablesFlattened: number) =>
  ({
    format: "docx",
    tablesPreserved: 0,
    tablesFlattened,
    textBoxesInlined: 0,
    headingStylesRecovered: [],
    headingStylesInferred: [],
    unrecognisedParagraphStyles: [],
  }) as const;

describe("the import caveat lasts as long as what it explains", () => {
  it("still says the table was flattened after the session is reopened", async () => {
    mountStudio({
      text: FLATTENED,
      blocks: [
        { kind: "paragraph", text: "Categoria Qtd Motivo" },
        { kind: "paragraph", text: "Lei/Decreto/Normativo 3 Fidelidade, exceções e referências cruzadas" },
      ],
      importNotes: docxNotes(1),
    });
    await auditReady();

    expect(auditPanel().getByText(/tabela achatada/i)).toBeInTheDocument();
  });

  it("says nothing when the import kept every table", async () => {
    mountStudio({
      text: FLATTENED,
      blocks: [
        { kind: "paragraph", text: "Categoria Qtd Motivo" },
        { kind: "paragraph", text: "Lei/Decreto/Normativo 3 Fidelidade, exceções e referências cruzadas" },
      ],
      importNotes: docxNotes(0),
    });
    await auditReady();

    expect(auditPanel().queryByText(/tabela achatada/i)).not.toBeInTheDocument();
  });

  it("drops the caveat when another document takes the place of the imported one", async () => {
    const { user } = mountStudio({
      text: FLATTENED,
      blocks: [
        { kind: "paragraph", text: "Categoria Qtd Motivo" },
        { kind: "paragraph", text: "Lei/Decreto/Normativo 3 Fidelidade, exceções e referências cruzadas" },
      ],
      importNotes: docxNotes(1),
    });
    await auditReady();
    expect(auditPanel().getByText(/tabela achatada/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /voltar ao início/i }));
    await user.click(screen.getByRole("button", { name: /descartar e voltar/i }));

    expect(screen.queryByText(/tabela achatada/i)).not.toBeInTheDocument();
  });
});
