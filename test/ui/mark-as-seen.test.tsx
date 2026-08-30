import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, browseAllPoints, openOverview } from "./support/panels";
import { auditReady, expandCriterion } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

const markButton = () => auditPanel().getByRole("button", { name: /^Marcar “1\. foi indeferido/ });

describe("flow 2 · marking a point as seen", () => {
  it("records the author's mark without touching what the audit found", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openOverview(user);
    const found = auditPanel().getByText(/pontos? encontrados?/i).previousElementSibling!.textContent;

    await browseAllPoints(user);
    await expandCriterion(user, "Voz passiva");
    expect(markButton()).toHaveAttribute("aria-pressed", "false");
    await user.click(markButton());
    expect(markButton()).toHaveAttribute("aria-pressed", "true");

    await openOverview(user);
    expect(auditPanel().getByText(/pontos? encontrados?/i).previousElementSibling!.textContent).toBe(found);
  });

  it("moves the point from pending to reviewed, and says so with the noun", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openOverview(user);
    expect(auditPanel().getByRole("group", { name: /estado da revisão/i })).toHaveTextContent(/0.*revisados/);

    await browseAllPoints(user);
    await expandCriterion(user, "Voz passiva");
    await user.click(markButton());

    await openOverview(user);
    expect(auditPanel().getByRole("group", { name: /estado da revisão/i })).toHaveTextContent(/1.*revisados?/);
  });

  it("leaves the point in the list — marking is a note to self, not a resolution", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await browseAllPoints(user);
    await expandCriterion(user, "Voz passiva");
    await user.click(markButton());

    expect(auditPanel().getByRole("button", { name: /^\d+“foi indeferido/ })).toBeInTheDocument();
    expect(auditPanel().getByTitle(/1 de 1 revisados/)).toBeInTheDocument();
  });

  it("unmarks on a second click, back to pending", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await browseAllPoints(user);
    await expandCriterion(user, "Voz passiva");

    await user.click(markButton());
    await user.click(auditPanel().getByRole("button", { name: /^Marcar “1\. foi indeferido/ }));

    expect(markButton()).toHaveAttribute("aria-pressed", "false");
  });
});
