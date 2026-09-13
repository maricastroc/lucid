import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { mountStudio } from "./support/mount-studio";
import { within } from "@testing-library/react";
import { auditPanel, openSettings } from "./support/panels";

const TEXT = "As contas foram aprovadas pelo conselho. O documento supracitado consta do processo.";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-lang");
  document.documentElement.removeAttribute("lang");
});

describe("interface language and analysis language are different axes", () => {
  it("the interface starts in Portuguese and says which engine is auditing", async () => {
    const { user } = mountStudio({ text: TEXT });
    await openSettings(user);

    expect(auditPanel().getByRole("heading", { name: /idioma da análise/i })).toBeInTheDocument();
    expect(auditPanel().getAllByText(/português \(brasil\)/i)[0]).toBeInTheDocument();
  });

  it("switching the interface to English does NOT change the engine that analysed the text", async () => {
    const { user } = mountStudio({ text: TEXT });

    const before = auditPanel().getAllByRole("listitem").length;

    await user.click(screen.getByRole("button", { name: /switch the interface to english/i }));
    expect(document.documentElement.getAttribute("data-lang")).toBe("en");

    const englishPanel = () => within(screen.getByRole("complementary", { name: /^audit$/i }));
    await user.click(englishPanel().getByRole("button", { name: /configure the analysis/i }));

    expect(englishPanel().getByRole("heading", { name: /analysis language/i })).toBeInTheDocument();
    expect(englishPanel().getAllByText(/portuguese \(brazil\)/i)[0]).toBeInTheDocument();

    await user.click(englishPanel().getByRole("button", { name: /apply and go back/i }));
    expect(englishPanel().getAllByRole("listitem").length).toBe(before);
  });

  it("the analysis language is never derived from the interface language", async () => {
    const { user } = mountStudio({ text: TEXT });
    await user.click(screen.getByRole("button", { name: /switch the interface to english/i }));

    const raw = localStorage.getItem("lucid-workspace");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).localeId).toBe("pt-BR");
    expect(localStorage.getItem("lucid-lang")).toBe("en");
  });
});
