import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EMPTY_BRIEFING, type Config, type RawBlock, type ReaderBriefing } from "@/lucid";
import type { ImportNotes } from "@/app/hooks/use-document-source";
import type { Baseline } from "@/app/lib/baseline";
import type { LedgerEntry } from "@/app/lib/ledger";
import type { ProfileId } from "@/app/lib/profiles";
import { EMPTY_MARKS, type ReviewMarks } from "@/app/lib/review-marks";
import { writeWorkspace } from "@/app/lib/workspace";
import { Studio } from "@/app/studio";
import { analysisLocale, type AnalysisLocaleId } from "@/app/locale/active";

export interface MountOptions {
  text?: string;
  briefing?: ReaderBriefing;
  originalText?: string | null;
  blocks?: readonly RawBlock[] | null;
  reviewMarks?: ReviewMarks;
  guidedStep?: string | null;
  importNotes?: ImportNotes | null;
  config?: Config;
  localeId?: AnalysisLocaleId;
  ledger?: readonly LedgerEntry[];
  profileId?: ProfileId;
  baseline?: Baseline | null;
}

export function mountStudio({
  text,
  briefing = EMPTY_BRIEFING,
  originalText = text ?? "",
  blocks = null,
  reviewMarks = EMPTY_MARKS,
  guidedStep = null,
  importNotes = null,
  config,
  localeId = "pt-BR",
  ledger = [],
  profileId = "base",
  baseline = null,
}: MountOptions = {}) {
  if (text !== undefined) {
    writeWorkspace({
      localeId,
      text,
      originalText,
      profileId,
      blocks,
      ledger,
      mode: "audit",
      briefing,
      config: config ?? analysisLocale(localeId).defaultConfig,
      reviewMarks,
      guidedStep,
      importNotes,
      baseline,
    });
  }

  return { user: userEvent.setup(), ...render(<Studio />) };
}
