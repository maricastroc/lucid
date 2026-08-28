"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReaderBriefing } from "@/lucid";
import { useCopy } from "../i18n/use-copy";
import type { UiCopy } from "../i18n/copy";
import { REPORT_RECORD_FIELDS, type ReportRecordField } from "../lib/briefing-surfaces";

const COPY_KEYS: Record<ReportRecordField, { label: keyof UiCopy["briefing"]; hint: keyof UiCopy["briefing"]; placeholder: keyof UiCopy["briefing"] }> = {
  audience: { label: "audienceLabel", hint: "audienceHint", placeholder: "audiencePlaceholder" },
  purpose: { label: "purposeLabel", hint: "purposeHint", placeholder: "purposePlaceholder" },
  priorKnowledge: { label: "priorLabel", hint: "priorHint", placeholder: "priorPlaceholder" },
};

export function readerQuestions(c: UiCopy) {
  return REPORT_RECORD_FIELDS.map((key) => {
    const keys = COPY_KEYS[key];
    return {
      key,
      label: c.briefing[keys.label] as string,
      hint: c.briefing[keys.hint] as string,
      placeholder: c.briefing[keys.placeholder] as string,
    };
  });
}

export function ReportRecordDialog({
  open,
  onOpenChange,
  briefing,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  briefing: ReaderBriefing;
  onChange: (briefing: ReaderBriefing) => void;
}) {
  const { c } = useCopy();
  const r = c.reportRecord;

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fade-in fixed inset-0 z-50 bg-ink-0/25 backdrop-blur-[2px]" />
        <RadixDialog.Content className="rise fixed left-1/2 top-1/2 z-50 flex max-h-[min(42rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-pop) outline-none">
          <div className="shrink-0 px-6 pt-6">
            <div className="flex items-baseline justify-between gap-3">
              <RadixDialog.Title className="font-serif text-[19px] leading-snug tracking-[-0.008em] text-ink-0">
                {r.title}
              </RadixDialog.Title>
              <span className="shrink-0 rounded-[3px] bg-surface-3 px-1.5 py-px text-[10px] tracking-wide text-ink-3">
                {r.optionalTag}
              </span>
            </div>
            <RadixDialog.Description className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">
              {r.lead}
            </RadixDialog.Description>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            {readerQuestions(c).map((question) => (
              <label key={question.key} className="mt-4 block">
                <span className="block text-[12.5px] font-medium text-ink-1">{question.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{question.hint}</span>
                <textarea
                  value={briefing[question.key]}
                  onChange={(e) => onChange({ ...briefing, [question.key]: e.target.value })}
                  rows={2}
                  placeholder={question.placeholder}
                  className="mt-1.5 w-full resize-y rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] leading-relaxed text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
                />
              </label>
            ))}
            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">{r.caveat}</p>
            <p className="mt-3 text-[11px] text-ink-dim" title={r.isoTitle}>
              {r.isoNote}
            </p>
          </div>

          <div className="shrink-0 px-6 pb-6 pt-5">
            <RadixDialog.Close asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-rule-2 px-4 py-2 text-[13px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0"
              >
                {r.done}
              </button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
