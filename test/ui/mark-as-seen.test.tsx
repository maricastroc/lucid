import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel } from "./support/panels";
import { auditReady, expandCriterion } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

const markButton = () => auditPanel().getByRole("button", { name: /^Marcar “1\. foi indeferido/ });

describe("flow 2 · marking a point as seen", () => {
  it("records the author's mark without touching the score", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await expandCriterion(user, "Voz passiva");

    const before = auditPanel().getByRole("button", { name: /^Pontos/ }).textContent;
    expect(markButton()).toHaveAttribute("aria-pressed", "false");

    await user.click(markButton());

    expect(markButton()).toHaveAttribute("aria-pressed", "true");
    expect(auditPanel().getByRole("button", { name: /^Pontos/ })).toHaveTextContent(before ?? "");
  });

  it("leaves the point in the list — marking is a note to self, not a resolution", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await expandCriterion(user, "Voz passiva");
    await user.click(markButton());

    expect(auditPanel().getByRole("button", { name: /^\d+“foi indeferido/ })).toBeInTheDocument();
    expect(auditPanel().getByTitle(/1 de 1 marcadas/)).toBeInTheDocument();
  });

  it("unmarks on a second click, back to pending", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await expandCriterion(user, "Voz passiva");

    await user.click(markButton());
    await user.click(auditPanel().getByRole("button", { name: /^Marcar “1\. foi indeferido/ }));

    expect(markButton()).toHaveAttribute("aria-pressed", "false");
  });
});
