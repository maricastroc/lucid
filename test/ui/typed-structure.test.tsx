import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { documentRegion } from "./support/panels";
import { auditReady } from "./support/points";

const TYPED =
  "O interessado deve entregar os documentos no prazo.\n\n" +
  "# Documentos exigidos\n" +
  "- Requerimento assinado\n" +
  "- Comprovante de residência\n\n" +
  "A análise começa\ndepois da entrega.";

const article = () => documentRegion().getByRole("article");

describe("typed text shows, in review, the structure the analysis ran on", () => {
  it("renders a typed heading and list as a heading and a list, without their markers", async () => {
    mountStudio({ text: TYPED });
    await auditReady();

    expect(documentRegion().getByRole("heading", { name: "Documentos exigidos" })).toBeInTheDocument();
    const items = article().querySelectorAll("ul li");
    expect([...items].map((li) => li.textContent)).toEqual(["Requerimento assinado", "Comprovante de residência"]);
    expect(article()).not.toHaveTextContent("# Documentos");
    expect(article()).not.toHaveTextContent("- Requerimento");
  });

  it("keeps a single line break inside a paragraph visible", async () => {
    mountStudio({ text: TYPED });
    await auditReady();

    const paragraph = [...article().querySelectorAll("p")].find((p) => p.textContent?.includes("A análise começa"));
    expect(paragraph?.textContent).toBe("A análise começa\ndepois da entrega.");
    expect(paragraph).toHaveClass("whitespace-pre-line");
  });

  it("keeps the markers in the draft, where the author writes them", async () => {
    const { user } = mountStudio({ text: TYPED });
    await auditReady();

    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    const field = documentRegion().getByRole("textbox", { name: /texto do documento/i }) as HTMLTextAreaElement;
    expect(field.value).toContain("# Documentos exigidos\n- Requerimento assinado");
    expect(documentRegion().getByText("Títulos com #, listas com - ou 1.")).toBeInTheDocument();
  });

  it("leaves plain prose laid out line by line, as before", async () => {
    mountStudio({ text: "Primeiro parágrafo.\n\nSegundo parágrafo." });
    await auditReady();

    expect(documentRegion().queryByRole("heading")).toBeNull();
    expect(article().querySelector("ul")).toBeNull();
  });
});
