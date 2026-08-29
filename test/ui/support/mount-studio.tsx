import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_CONFIG, EMPTY_BRIEFING, type RawBlock, type ReaderBriefing } from "@/lucid";
import { EMPTY_MARKS } from "@/app/lib/review-marks";
import { writeWorkspace } from "@/app/lib/workspace";
import { Studio } from "@/app/studio";

export interface MountOptions {
  text?: string;
  briefing?: ReaderBriefing;
  originalText?: string | null;
  blocks?: readonly RawBlock[] | null;
}

export function mountStudio({
  text,
  briefing = EMPTY_BRIEFING,
  originalText = text ?? "",
  blocks = null,
}: MountOptions = {}) {
  if (text !== undefined) {
    writeWorkspace({
      text,
      originalText,
      blocks,
      ledger: [],
      mode: "audit",
      briefing,
      config: DEFAULT_CONFIG,
      reviewMarks: EMPTY_MARKS,
    });
  }

  return { user: userEvent.setup(), ...render(<Studio />) };
}
