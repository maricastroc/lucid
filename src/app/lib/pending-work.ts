import type { ReaderBriefing } from "@/lucid";
import type { UiCopy } from "../i18n/copy";
import type { LedgerEntry } from "./ledger";
import type { ReviewMarks } from "./review-marks";

export interface PendingWork {
  readonly changes: number;
  readonly reviewed: number;
  readonly dismissed: number;
  readonly briefing: boolean;
  readonly editedText: boolean;
}

export interface PendingWorkInput {
  readonly text: string;
  readonly originalText: string | null;
  readonly ledger: readonly LedgerEntry[];
  readonly marks: ReviewMarks;
  readonly briefing: ReaderBriefing;
}

export function briefingAnswered(briefing: ReaderBriefing): boolean {
  return (
    briefing.audience.trim() !== "" ||
    briefing.purpose.trim() !== "" ||
    briefing.priorKnowledge.trim() !== "" ||
    briefing.mustFind.some((expression) => expression.trim() !== "")
  );
}

function textWasEdited(text: string, originalText: string | null): boolean {
  if (text.trim() === "") return false;
  return originalText === null || text !== originalText;
}

export function pendingWork(input: PendingWorkInput): PendingWork | null {
  let reviewed = 0;
  let dismissed = 0;
  for (const mark of Object.values(input.marks)) {
    if (mark.kind === "seen") reviewed += 1;
    else dismissed += 1;
  }

  const work: PendingWork = {
    changes: input.ledger.length,
    reviewed,
    dismissed,
    briefing: briefingAnswered(input.briefing),
    editedText: textWasEdited(input.text, input.originalText),
  };

  const empty =
    work.changes === 0 && work.reviewed === 0 && work.dismissed === 0 && !work.briefing && !work.editedText;

  return empty ? null : work;
}

export function atRiskItems(work: PendingWork, copy: UiCopy["studio"]["replaceDocument"]): readonly string[] {
  const items: string[] = [];
  if (work.editedText) items.push(copy.editedText);
  if (work.changes > 0) items.push(copy.changes(work.changes));
  if (work.reviewed > 0) items.push(copy.reviewed(work.reviewed));
  if (work.dismissed > 0) items.push(copy.dismissed(work.dismissed));
  if (work.briefing) items.push(copy.briefing);
  return items;
}
