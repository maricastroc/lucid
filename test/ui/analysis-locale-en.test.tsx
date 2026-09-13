import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { SAMPLE_TEXT_EN } from "@/app/lib/sample";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, openMetrics, openSettings } from "./support/panels";
import { auditReady, openPoint } from "./support/points";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-lang");
  document.documentElement.removeAttribute("lang");
});

describe("Portuguese interface, English document", () => {
  it("shows readability and cohesion as unavailable for the language — never as zero", async () => {
    const { user } = mountStudio({ text: SAMPLE_TEXT_EN, localeId: "en-US" });
    await auditReady();
    await openMetrics(user);

    expect(auditPanel().getAllByText(/indisponível neste idioma/i).length).toBeGreaterThanOrEqual(4);
    expect(auditPanel().getByText(/não declara métrica de leiturabilidade/i)).toBeInTheDocument();
  });

  it("opens an English finding: ISO citation, engine output labelled en-US, no AI rewrite offered", async () => {
    const { user } = mountStudio({ text: SAMPLE_TEXT_EN, localeId: "en-US" });
    await auditReady();
    await openPoint(user, "Comprimento de frase", "We have received");

    expect(auditPanel().getByText("ISO 24495-1 · 5.3.4")).toBeInTheDocument();
    expect(auditPanel().queryByText(/ABNT NBR ISO 24495-1 · 5\.3\.4/)).toBeNull();
    expect(auditPanel().getByText(/reescrita por IA ainda não existe para este idioma/i)).toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /entenda este critério/i }));
    expect(auditPanel().getByText(/saída da engine · en-US/i)).toBeInTheDocument();
    const output = auditPanel().getByText(/^Sentence of \d+ words\./);
    expect(output).toHaveAttribute("lang", "en-US");
    expect(output.textContent).toMatch(/provisional/);
  });

  it("settings show the English catalogue only, with provisional thresholds", async () => {
    const { user } = mountStudio({ text: SAMPLE_TEXT_EN, localeId: "en-US" });
    await auditReady();
    await openSettings(user);

    expect(auditPanel().getByRole("heading", { name: /idioma da análise/i })).toBeInTheDocument();
    expect(auditPanel().getAllByText(/inglês \(eua\)/i)[0]).toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /ajustar limites/i }));
    expect(auditPanel().getAllByText(/^provisório$/i)).toHaveLength(4);
    expect(auditPanel().getByText(/não foram validados para este idioma de análise/i)).toBeInTheDocument();
    const note = auditPanel().getByText(/catálogo experimental/i);
    expect(note).toHaveTextContent(/catálogo experimental/i);
    expect(note).toHaveTextContent(/não há leiturabilidade, coesão nem reescrita por IA/i);
    expect(note).toHaveTextContent(/a CLI analisa apenas pt-BR/i);
    for (const portugueseOnly of [/mesóclise/i, /gerundismo/i, /voz passiva sintética/i, /mais-que-perfeito/i]) {
      expect(auditPanel().queryByText(portugueseOnly)).toBeNull();
    }
  });

  it("the overview lists the experimental status among the limits of the analysis", async () => {
    mountStudio({ text: SAMPLE_TEXT_EN, localeId: "en-US" });
    await auditReady();
    expect(
      auditPanel().getByText(/análise em inglês \(eua\), experimental: sem validação em corpus independente/i),
    ).toBeInTheDocument();
  });

  it("the Portuguese document keeps the Portuguese engine — the default did not move", async () => {
    mountStudio({ text: "As contas foram aprovadas pelo conselho." });
    await auditReady();
    expect(screen.queryByText(/experimental/i)).toBeNull();
    expect(screen.queryByText(/indisponível neste idioma/i)).toBeNull();
    expect(JSON.parse(localStorage.getItem("lucid-workspace") as string).localeId).toBe("pt-BR");
  });
});
