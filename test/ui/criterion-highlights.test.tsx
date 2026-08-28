import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

describe("flow 3 · hiding and restoring a criterion's highlights", () => {
  it("takes the criterion's marks out of the document and says so", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    expect(documentRegion().getByRole("button", { name: /^Voz passiva:/ })).toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /Ocultar os realces de “Voz passiva”/ }));

    expect(documentRegion().queryByRole("button", { name: /^Voz passiva:/ })).not.toBeInTheDocument();
    expect(auditPanel().getByText(/realces ocultos no documento/)).toBeInTheDocument();
  });

  it("keeps the point in the audit — hiding is a view preference, not a dismissal", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    const before = auditPanel().getByRole("button", { name: /^Pontos/ }).textContent;
    await user.click(auditPanel().getByRole("button", { name: /Ocultar os realces de “Voz passiva”/ }));

    expect(auditPanel().getByRole("button", { name: /^Voz passiva/ })).toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: /^Pontos/ })).toHaveTextContent(before ?? "");
  });

  it("restores the highlights from the same control", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await user.click(auditPanel().getByRole("button", { name: /Ocultar os realces de “Voz passiva”/ }));
    await user.click(auditPanel().getByRole("button", { name: /Mostrar os realces de “Voz passiva”/ }));

    expect(documentRegion().getByRole("button", { name: /^Voz passiva:/ })).toBeInTheDocument();
    expect(auditPanel().queryByText(/realces ocultos no documento/)).not.toBeInTheDocument();
  });
});
