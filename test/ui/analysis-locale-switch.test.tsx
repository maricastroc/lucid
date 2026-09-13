import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { EMPTY_BRIEFING } from "@/lucid";
import { analysisLocale } from "@/app/locale/active";
import { withVocabularyTerms } from "@/app/locale/vocabulary";
import { buildBaseline } from "@/app/lib/baseline";
import { findingId } from "@/app/lib/criteria";
import { profileConfig } from "@/app/lib/profiles";
import { EN_DEFAULT_CONFIG } from "@/locales/en-US";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, openSettings } from "./support/panels";
import { auditReady } from "./support/points";

const TEXT = "As contas foram aprovadas pelo conselho. O documento supracitado consta do processo.";
const PT = analysisLocale("pt-BR");

function workspace(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem("lucid-workspace") as string) as Record<string, unknown>;
}

async function chooseAnalysisLocale(user: UserEvent, name: RegExp): Promise<void> {
  await user.click(auditPanel().getByRole("combobox", { name: /idioma da análise/i }));
  await user.click(await screen.findByRole("option", { name }));
}

function workedOnWorkspace() {
  const diagnostic = PT.analyze(TEXT);
  const finding = diagnostic.findings[0];
  const normativo = profileConfig("normativo", PT) as unknown as { sentenceLength: Record<string, number> };
  const adjusted = {
    ...normativo,
    sentenceLength: { ...normativo.sentenceLength, warnAbove: normativo.sentenceLength.warnAbove + 3 },
  } as unknown as typeof PT.defaultConfig;
  const config = withVocabularyTerms(adjusted, PT, [{ term: "conselho", plain: "junta", reason: "termo da casa" }]);
  const marks = { [findingId(finding)]: { kind: "seen" as const } };
  const baseline = buildBaseline({
    title: "Versão 1",
    savedAt: "01/09/2026",
    text: TEXT,
    blocks: null,
    diagnostic,
    findings: diagnostic.findings,
    profileId: "normativo",
    config,
    marks,
    vocabulary: [],
  });
  return {
    text: TEXT,
    config,
    profileId: "normativo" as const,
    reviewMarks: marks,
    ledger: [{ source: "manual" as const, label: "edição", burdenBefore: 3, burdenAfter: 2 }],
    baseline,
  };
}

describe("switching the analysis language", () => {
  it("switches at once when nothing bound to the current engine would be lost", async () => {
    const { user } = mountStudio({ text: TEXT });
    await auditReady();
    await openSettings(user);
    await chooseAnalysisLocale(user, /inglês \(eua\)/i);

    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(workspace().localeId).toBe("en-US"));
    expect(workspace().text).toBe(TEXT);
  });

  it("asks first, naming exactly what would be discarded", async () => {
    const { user } = mountStudio(workedOnWorkspace());
    await auditReady();
    await openSettings(user);
    await chooseAnalysisLocale(user, /inglês \(eua\)/i);

    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText(/trocar o idioma da análise para inglês \(eua\)\?/i)).toBeInTheDocument();
    expect(dialog.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "1 alteração registrada",
      "1 ponto revisado ou ignorado",
      "a linha de base anexada",
      "1 termo do vocabulário da organização",
      "o perfil editorial “Normativo ou contratual”",
      "1 ajuste de limite",
    ]);
    expect(dialog.getByRole("button", { name: /^cancelar$/i })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: /trocar idioma e reanalisar/i })).toBeInTheDocument();
  });

  it("changes nothing while the question is open, and cancelling keeps everything", async () => {
    const { user } = mountStudio(workedOnWorkspace());
    await auditReady();
    const before = localStorage.getItem("lucid-workspace");
    await openSettings(user);
    await chooseAnalysisLocale(user, /inglês \(eua\)/i);
    await screen.findByRole("alertdialog");

    expect(localStorage.getItem("lucid-workspace")).toBe(before);
    expect(screen.getByRole("combobox", { name: /idioma da análise/i, hidden: true })).toHaveTextContent(
      /português \(brasil\)/i,
    );

    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /^cancelar$/i }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(localStorage.getItem("lucid-workspace")).toBe(before);
    expect(workspace().localeId).toBe("pt-BR");
  });

  it("confirming discards exactly the declared set, keeps the document and re-analyses under the new engine", async () => {
    const worked = workedOnWorkspace();
    const { user } = mountStudio({ ...worked, briefing: emptyBriefingWith("conselho") });
    await auditReady();
    await openSettings(user);
    await chooseAnalysisLocale(user, /inglês \(eua\)/i);
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /trocar idioma e reanalisar/i }),
    );

    await waitFor(() => expect(workspace().localeId).toBe("en-US"));
    const after = workspace();
    expect(after.ledger).toEqual([]);
    expect(after.reviewMarks).toEqual({});
    expect(after.baseline).toBeNull();
    expect(after.profileId).toBe("base");
    expect(after.config).toEqual(JSON.parse(JSON.stringify(EN_DEFAULT_CONFIG)));

    expect(after.text).toBe(TEXT);
    expect(after.originalText).toBe(TEXT);
    expect(after.briefing).toEqual(emptyBriefingWith("conselho"));
    expect(auditPanel().getByRole("combobox", { name: /idioma da análise/i })).toHaveTextContent(/inglês \(eua\)/i);
    expect(auditPanel().queryByText(/mesóclise|gerundismo|voz passiva sintética/i)).toBeNull();
  });
});

function emptyBriefingWith(expression: string) {
  return { ...EMPTY_BRIEFING, mustFind: [expression] };
}
