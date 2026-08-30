import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, openChanges, openMetrics, openOverview, openReview, openSettings } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

type User = ReturnType<typeof mountStudio>["user"];

const tabs = () => auditPanel().getAllByRole("tab");
const selected = () => tabs().filter((tab) => tab.getAttribute("aria-selected") === "true");

async function applyRegisteredEdit(user: User): Promise<void> {
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
  await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
  const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
  await user.clear(editor);
  await user.type(editor, PLAIN_FIRST_SENTENCE);
  await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));
  await auditPanel().findByText(/nenhuma falha encontrada/i);
  await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));
}

describe("the audit panel has one navigation axis", () => {
  it("offers four destinations and lands on the panorama", async () => {
    mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    expect(tabs().map((tab) => tab.textContent)).toHaveLength(4);
    expect(selected()).toHaveLength(1);
    expect(selected()[0]).toHaveTextContent(/panorama/i);
  });

  it("declares what each destination is for, so none of them has to be guessed", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    for (const [go, purpose] of [
      [openOverview, /o que a auditoria encontrou neste texto/i],
      [openReview, /onde você percorre os pontos/i],
      [openChanges, /histórico verificável do que mudou/i],
      [openMetrics, /medidas descritivas do texto/i],
    ] as const) {
      await go(user);
      expect(auditPanel().getByText(purpose)).toBeInTheDocument();
    }
  });

  it("shows one destination at a time — nothing from another one is left on screen", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    expect(auditPanel().getByText(/o que a auditoria encontrou neste texto/i)).toBeInTheDocument();

    await openMetrics(user);
    expect(auditPanel().queryByText(/o que a auditoria encontrou neste texto/i)).not.toBeInTheDocument();
    expect(selected()).toHaveLength(1);
    expect(selected()[0]).toHaveTextContent(/métricas/i);
  });

  it("walks the strip with the arrow keys and wraps at both ends", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await user.click(auditPanel().getByRole("tab", { name: /^panorama/i }));
    await user.keyboard("{ArrowRight}");
    expect(selected()[0]).toHaveTextContent(/revisão/i);

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(selected()[0]).toHaveTextContent(/métricas/i);
  });

  it("keeps the focus on the strip while the arrows walk it, and leaves the panel reachable", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await user.click(auditPanel().getByRole("tab", { name: /^panorama/i }));
    await user.keyboard("{ArrowRight}");
    expect(auditPanel().getByRole("tab", { name: /^revisão/i })).toHaveFocus();
    expect(auditPanel().getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
  });
});

describe("configuration is a control, not a destination", () => {
  it("never appears in the strip", async () => {
    mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    expect(
      tabs()
        .map((tab) => tab.textContent ?? "")
        .join(" "),
    ).not.toMatch(/ajustes|configurar/i);
  });

  it("takes the panel over and hands it back where the reader was", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openMetrics(user);

    await openSettings(user);
    expect(auditPanel().queryAllByRole("tab")).toHaveLength(0);
    expect(auditPanel().getByText(/personalizar análise/i)).toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /voltar à auditoria/i }));
    expect(selected()[0]).toHaveTextContent(/métricas/i);
  });
});

describe("the counters mean one thing each", () => {
  it("counts what the audit found in the panorama and what is pending in the strip", async () => {
    mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    const found = auditPanel().getByText(/pontos? encontrados?/i).previousElementSibling!.textContent!;
    const badge = auditPanel()
      .getByRole("tab", { name: /^revisão/i })
      .querySelector("[aria-label]")!;
    expect(badge).toHaveTextContent(found);
    expect(badge.getAttribute("aria-label")).toMatch(new RegExp(`^${found} pontos? pendentes?$`, "i"));
  });

  it("never puts a number in the strip without the noun it counts", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyRegisteredEdit(user);

    for (const tab of tabs()) {
      const badge = tab.querySelector("[aria-label]");
      if (badge === null) continue;
      expect(badge.getAttribute("aria-label")).toMatch(/\d+\s+\D+/);
    }
  });

  it("counts the recorded changes only once there is one", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    expect(auditPanel().getByRole("tab", { name: /^alterações$/i })).toBeInTheDocument();

    await applyRegisteredEdit(user);
    expect(auditPanel().getByRole("tab", { name: /alterações.*1 alteração registrada/i })).toBeInTheDocument();
  });
});

describe("the panorama points at the other destinations instead of repeating them", () => {
  it("holds no change history of its own, and offers the way to it", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyRegisteredEdit(user);
    await openOverview(user);

    expect(auditPanel().queryByRole("list", { name: /alterações aplicadas/i })).toBeNull();
    await user.click(auditPanel().getByRole("button", { name: /ver as alterações/i }));
    expect(selected()[0]).toHaveTextContent(/alterações/i);
  });

  it("sends the reader straight to the step that still has work", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(auditPanel().getByRole("button", { name: /^começar a revisão$/i }));

    expect(selected()[0]).toHaveTextContent(/revisão/i);
    expect(auditPanel().getByText(/etapa 1 de \d+/i)).toBeInTheDocument();
  });
});

describe("the document keeps its own controls", () => {
  it("puts the work mode on the document, not among the audit destinations", async () => {
    mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    const modes = screen.getAllByRole("tab", { name: /^(revisar|escrever)$/i });
    expect(modes).toHaveLength(2);
    for (const mode of modes) expect(auditPanel().queryByRole("tab", { name: mode.textContent! })).toBeNull();
  });

  it("offers no work mode before there is a document to work on", async () => {
    mountStudio();
    await screen.findByRole("button", { name: /carregar exemplo/i });
    expect(screen.queryAllByRole("tab", { name: /^(revisar|escrever)$/i })).toHaveLength(0);
  });
});
