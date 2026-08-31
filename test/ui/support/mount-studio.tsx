import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_CONFIG, EMPTY_BRIEFING, type RawBlock, type ReaderBriefing } from "@/lucid";
import type { ImportNotes } from "@/app/hooks/use-document-source";
import { EMPTY_MARKS, type ReviewMarks } from "@/app/lib/review-marks";
import { writeWorkspace } from "@/app/lib/workspace";
import { Studio } from "@/app/studio";

export interface MountOptions {
  text?: string;
  briefing?: ReaderBriefing;
  originalText?: string | null;
  blocks?: readonly RawBlock[] | null;
  reviewMarks?: ReviewMarks;
  guidedStep?: string | null;
  importNotes?: ImportNotes | null;
}

export function mountStudio({
  text,
  briefing = EMPTY_BRIEFING,
  originalText = text ?? "",
  blocks = null,
  reviewMarks = EMPTY_MARKS,
  guidedStep = null,
  importNotes = null,
}: MountOptions = {}) {
  if (text !== undefined) {
    writeWorkspace({
      text,
      originalText,
      profileId: "base",
      blocks,
      ledger: [],
      mode: "audit",
      briefing,
      config: DEFAULT_CONFIG,
      reviewMarks,
      guidedStep,
      importNotes,
    });
  }

  return { user: userEvent.setup(), ...render(<Studio />) };
}
