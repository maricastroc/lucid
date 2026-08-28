import { describe, expect, it, vi } from "vitest";
import { EMPTY_BRIEFING } from "@/lucid";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady, expandCriterion, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, TERM_TWICE, TWO_PASSIVES } from "./support/documents";

describe("flow 1 · navigating to a point in the document", () => {
  it("opens the note and lights the excerpt the point refers to", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    expect(documentRegion().getByRole("button", { name: /^Voz passiva: “foi indeferido/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(auditPanel().getByRole("button", { name: /voltar à lista/i })).toBeInTheDocument();
  });

  it("walks to the next point of the same criterion, and the document follows", async () => {
    const { user } = mountStudio({ text: TWO_PASSIVES });
    await auditReady();

    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
    expect(documentRegion().getByRole("button", { name: /“foi indeferido pela comissão/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(auditPanel().getByRole("button", { name: /próximo/i }));

    expect(documentRegion().getByRole("button", { name: /“foi negado pelo relator/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(documentRegion().getByRole("button", { name: /“foi indeferido pela comissão/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("returns to the list and drops the selection", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
    await user.click(auditPanel().getByRole("button", { name: /voltar à lista/i }));

    expect(auditPanel().queryByRole("button", { name: /voltar à lista/i })).not.toBeInTheDocument();
    expect(documentRegion().getByRole("button", { name: /^Voz passiva: “foi indeferido/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("flow 1 · stepping through the occurrences of a declared expression", () => {
  const withTerm = () =>
    mountStudio({ text: TERM_TWICE, briefing: { ...EMPTY_BRIEFING, mustFind: ["prazo"] } });

  it("goes to the first occurrence and scrolls the document to it", async () => {
    const scrolled: string[] = [];
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) {
      scrolled.push(this.textContent ?? "");
    });

    const { user } = withTerm();
    await auditReady();
    await expandCriterion(user, "Personalizar análise");
    await user.click(auditPanel().getByRole("button", { name: /^Ver “prazo” no documento/ }));

    expect(auditPanel().getByRole("status")).toHaveTextContent("1 de 2");
    expect(scrolled.at(-1)).toBe("prazo");
    vi.restoreAllMocks();
  });

  it("steps to the next occurrence and scrolls to a different one", async () => {
    const scrolled: Element[] = [];
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) {
      scrolled.push(this);
    });

    const { user } = withTerm();
    await auditReady();
    await expandCriterion(user, "Personalizar análise");
    await user.click(auditPanel().getByRole("button", { name: /^Ver “prazo” no documento/ }));
    await user.click(auditPanel().getByRole("button", { name: /^Próxima ocorrência de “prazo”/ }));

    expect(auditPanel().getByRole("status")).toHaveTextContent("2 de 2");
    expect(scrolled.at(-1)).not.toBe(scrolled.at(0));
    expect(scrolled.at(-1)?.textContent).toBe("prazo");
    vi.restoreAllMocks();
  });

  it("wraps from the last occurrence back to the first", async () => {
    const { user } = withTerm();
    await auditReady();
    await expandCriterion(user, "Personalizar análise");
    await user.click(auditPanel().getByRole("button", { name: /^Ver “prazo” no documento/ }));
    await user.click(auditPanel().getByRole("button", { name: /^Ocorrência anterior de “prazo”/ }));

    expect(auditPanel().getByRole("status")).toHaveTextContent("2 de 2");
  });
});
