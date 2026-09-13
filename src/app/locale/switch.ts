import type { OrgTerm } from "@/lucid";
import type { UiCopy } from "../i18n/copy";
import type { LedgerEntry } from "../lib/ledger";
import type { ProfileId } from "../lib/profiles";
import type { ReviewMarks } from "../lib/review-marks";

export interface LocaleBoundWork {
  readonly ledger: readonly LedgerEntry[];
  readonly marks: ReviewMarks;
  readonly hasBaseline: boolean;
  readonly vocabulary: readonly OrgTerm[];
  readonly profileId: ProfileId;
  readonly adjustments: number;
}

export interface LocaleSwitchDiscard {
  readonly changes: number;
  readonly reviewed: number;
  readonly baseline: boolean;
  readonly vocabulary: number;
  readonly profile: ProfileId | null;
  readonly adjustments: number;
}

export function localeSwitchDiscard(work: LocaleBoundWork): LocaleSwitchDiscard {
  return {
    changes: work.ledger.length,
    reviewed: Object.keys(work.marks).length,
    baseline: work.hasBaseline,
    vocabulary: work.vocabulary.length,
    profile: work.profileId === "base" ? null : work.profileId,
    adjustments: work.adjustments,
  };
}

export function discardsWork(discard: LocaleSwitchDiscard): boolean {
  return (
    discard.changes > 0 ||
    discard.reviewed > 0 ||
    discard.baseline ||
    discard.vocabulary > 0 ||
    discard.profile !== null ||
    discard.adjustments > 0
  );
}

export function localeSwitchItems(discard: LocaleSwitchDiscard, copy: UiCopy): readonly string[] {
  const a = copy.analysisLocale.switchDialog;
  const items: string[] = [];
  if (discard.changes > 0) items.push(a.changes(discard.changes));
  if (discard.reviewed > 0) items.push(a.reviewed(discard.reviewed));
  if (discard.baseline) items.push(a.baseline);
  if (discard.vocabulary > 0) items.push(a.vocabulary(discard.vocabulary));
  if (discard.profile !== null) items.push(a.profile(copy.presets.names[discard.profile]));
  if (discard.adjustments > 0) items.push(a.adjustments(discard.adjustments));
  return items;
}
