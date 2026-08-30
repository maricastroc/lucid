"use client";

import type { ReviewMarkKind } from "../../lib/review-marks";
import { useCopy } from "../../i18n/use-copy";
import { CheckIcon, CloseIcon } from "../icons";

export function DecisionNote({
  kind,
  note,
  onNote,
}: {
  kind: ReviewMarkKind;
  note: string;
  onNote: (text: string) => void;
}) {
  const { c } = useCopy();
  const d = c.decision;

  return (
    <section aria-labelledby="decisao-registrada" className="border-b border-rule-1 bg-surface-2/60 px-4 pb-3.5 pt-3">
      <div className="flex items-center gap-2">
        <h3 id="decisao-registrada" className="u-label text-ink-3">
          {d.label}
        </h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            kind === "seen" ? "bg-safe-weak text-safe" : "bg-surface-3 text-ink-2"
          }`}
        >
          {kind === "seen" ? <CheckIcon className="size-3" /> : <CloseIcon className="size-3" />}
          {d.kinds[kind]}
        </span>
      </div>

      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        rows={2}
        placeholder={d.placeholder}
        aria-label={d.fieldLabel}
        className="mt-2 w-full resize-y rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[12.5px] leading-relaxed text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
      />

      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">{d.caveat}</p>
    </section>
  );
}
