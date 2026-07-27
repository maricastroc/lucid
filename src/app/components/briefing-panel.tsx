"use client";

import { useState } from "react";
import type { BriefingCheck, ReaderBriefing } from "@/lucid";
import { useCopy } from "../i18n/use-copy";
import type { UiCopy } from "../i18n/copy";
import { CheckIcon, CloseIcon } from "./icons";

interface Props {
  briefing: ReaderBriefing;
  check: BriefingCheck;
  onChange: (briefing: ReaderBriefing) => void;
}

function questionsFor(c: UiCopy) {
  const b = c.briefing;
  return [
    { key: "audience" as const, label: b.audienceLabel, hint: b.audienceHint, placeholder: b.audiencePlaceholder },
    { key: "purpose" as const, label: b.purposeLabel, hint: b.purposeHint, placeholder: b.purposePlaceholder },
    { key: "priorKnowledge" as const, label: b.priorLabel, hint: b.priorHint, placeholder: b.priorPlaceholder },
  ];
}

function Field({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3.5 block">
      <span className="block text-[12.5px] font-medium text-ink-1">{label}</span>
      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{hint}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] leading-relaxed text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
      />
    </label>
  );
}

export function BriefingPanel({ briefing, check, onChange }: Props) {
  const { c } = useCopy();
  const b = c.briefing;
  const [open, setOpen] = useState(check.declared);
  const [draft, setDraft] = useState("");

  const set = (key: keyof ReaderBriefing, value: string) => onChange({ ...briefing, [key]: value });

  const addExpression = () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    if (!briefing.mustFind.includes(trimmed)) onChange({ ...briefing, mustFind: [...briefing.mustFind, trimmed] });
    setDraft("");
  };

  const removeExpression = (expression: string) =>
    onChange({ ...briefing, mustFind: briefing.mustFind.filter((item) => item !== expression) });

  return (
    <section className="border-t border-rule-1 px-6 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="u-label text-ink-3">{b.label}</span>
        <span className="text-[11.5px] text-ink-3">ABNT NBR ISO 24495-1 · 5.1</span>
      </div>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-1">
        {check.declared ? b.declared : b.notDeclared}
      </p>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        {b.rationaleBefore}
        <em>{b.rationaleEmphasis}</em>
        {b.rationaleMiddle}
        <strong className="font-medium text-ink-2">{b.rationaleStrong}</strong>
        {b.rationaleAfter}
      </p>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
      >
        {open ? b.closeBriefing : check.declared ? b.openReview : b.openDeclare}
      </button>

      {open && (
        <div className="mt-1">
          {questionsFor(c).map((question) => (
            <Field
              key={question.key}
              label={question.label}
              hint={question.hint}
              placeholder={question.placeholder}
              value={briefing[question.key]}
              onChange={(value) => set(question.key, value)}
            />
          ))}

          <div className="mt-4">
            <span className="block text-[12.5px] font-medium text-ink-1">{b.mustFindLabel}</span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">
              {b.mustFindHintBefore}
              <strong className="font-medium">{b.mustFindHintStrong}</strong>
              {b.mustFindHintAfter}
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExpression();
                  }
                }}
                placeholder={b.mustFindPlaceholder}
                className="min-w-0 flex-1 rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={addExpression}
                className="shrink-0 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
              >
                {c.common.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {check.coverage.length > 0 && (
        <div className="mt-4">
          <span className="u-label text-ink-3">{b.presenceLabel}</span>
          <ul className="mt-2 flex flex-col gap-1.5">
            {check.coverage.map((item) => {
              const found = item.occurrences.length > 0;
              return (
                <li key={item.expression} className="flex items-start justify-between gap-2 text-[12.5px]">
                  <span className="flex min-w-0 items-start gap-1.5">
                    {found ? (
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-safe" aria-hidden />
                    ) : (
                      <CloseIcon className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
                    )}
                    <span className="min-w-0 break-words text-ink-1">
                      “{item.expression}”
                      <span className="text-ink-3">
                        {found ? b.occurrences(item.occurrences.length) : b.notFound}
                      </span>
                    </span>
                  </span>
                  {open && (
                    <button
                      type="button"
                      onClick={() => removeExpression(item.expression)}
                      aria-label={b.removeNamed(item.expression)}
                      className="shrink-0 text-[11.5px] text-ink-3 transition-colors duration-150 hover:text-ink-0"
                    >
                      {c.common.remove}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">{b.literalCaveat}</p>
        </div>
      )}
    </section>
  );
}
