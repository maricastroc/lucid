import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { EMPTY_BRIEFING } from "@/lucid";
import { readWorkspace, writeWorkspace, type WorkspaceSnapshot } from "@/app/lib/workspace";
import { analysisLocale } from "@/app/locale/active";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, openChanges } from "./support/panels";
import { auditReady, openPoint } from "./support/points";

const TEXT = "You must make an application in writing.";
const SOURCE = "Federal Plain Language Guidelines (2011), p. 23";

const workspace = () => JSON.parse(localStorage.getItem("lucid-workspace") as string) as Record<string, unknown>;

describe("an attested swap keeps its source in the trail", () => {
  it("applying the hidden_verb swap records the attested origin, never the glossary", async () => {
    const { user } = mountStudio({ text: TEXT, localeId: "en-US" });
    await auditReady();
    await openPoint(user, "Verbo escondido em substantivo", "make an application");
    await user.click(auditPanel().getByRole("button", { name: /trocar por «apply»/i }));

    await waitFor(() => expect(workspace().text).toBe("You must apply in writing."));
    const [entry] = workspace().ledger as Record<string, unknown>[];
    expect(entry).toMatchObject({
      source: "attested",
      attestedIn: SOURCE,
      before: "make an application",
      after: "apply",
    });

    await openChanges(user);
    expect(auditPanel().getByText(`Troca atestada por fonte · ${SOURCE}`)).toBeInTheDocument();
    expect(auditPanel().queryByText(/troca direta do glossário/i)).toBeNull();
  });

  it("the workspace refuses an attested entry without its source, and keeps one that has it", () => {
    const base: Omit<WorkspaceSnapshot, "ledger"> = {
      localeId: "en-US",
      text: TEXT,
      originalText: TEXT,
      blocks: null,
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: analysisLocale("en-US").defaultConfig,
      profileId: "base",
      reviewMarks: {},
      guidedStep: null,
    };
    const entry = { source: "attested" as const, label: "Troca atestada por fonte", burdenBefore: 1, burdenAfter: 0 };

    writeWorkspace({ ...base, ledger: [entry] });
    expect(readWorkspace()).toBeNull();

    writeWorkspace({ ...base, ledger: [{ ...entry, attestedIn: SOURCE }] });
    expect(readWorkspace()?.ledger[0]).toMatchObject({ source: "attested", attestedIn: SOURCE });
  });
});
