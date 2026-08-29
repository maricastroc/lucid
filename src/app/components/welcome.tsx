"use client";

import { useRef } from "react";
import { useCopy } from "../i18n/use-copy";
import { ArrowRightIcon, CheckIcon, CloseIcon, PenNibIcon } from "./icons";

interface Props {
  onWrite: () => void;
  onOpenDocx: (file: File) => void;
  onLoadExample: () => void;
  importing: boolean;
}

export function Welcome({ onWrite, onOpenDocx, onLoadExample, importing }: Props) {
  const { c } = useCopy();
  const w = c.welcome;
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-desk" aria-label={w.regionLabel}>
      <div className="mx-auto flex w-full max-w-4xl flex-col px-5 py-10 sm:px-8 sm:py-16">
        <div className="fade-in overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
          <div className="px-6 py-9 sm:px-14 sm:py-14">
            <div className="u-label flex items-center gap-2 text-ink-3">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {w.kicker}
              <span className="hidden text-ink-dim sm:inline" aria-hidden>
                ·
              </span>
              <span className="hidden font-normal tracking-normal normal-case text-ink-3 sm:inline">
                ABNT NBR ISO 24495-1
              </span>
            </div>

            <h1 className="mt-5 font-serif text-[30px] leading-[1.12] tracking-[-0.012em] text-ink-0 sm:text-[40px]">
              {w.titleLead}
              <br />
              <span className="text-ink-2">{w.titleTrail}</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-1">
              {w.lead} <span className="font-medium text-ink-0">{w.leadStrong}</span>
            </p>

            <div className="mt-8">
              <div className="u-sublabel text-ink-3">{w.doesLabel}</div>
              <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                {w.verbs.map((verb, i) => (
                  <span key={verb} className="inline-flex items-center gap-1.5">
                    <span className="rounded-full border border-rule-2 bg-surface px-3 py-1 text-[13px] font-medium text-ink-0">
                      {verb}
                    </span>
                    {i < w.verbs.length - 1 && <ArrowRightIcon className="size-3.5 text-ink-dim" aria-hidden />}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
                <span className="grid size-4.5 shrink-0 place-items-center rounded-full border border-human-line bg-human-weak">
                  <CloseIcon className="size-2.5 text-human" />
                </span>
                <span>
                  {w.doesNotBefore}
                  <span className="font-medium text-ink-1">{w.doesNotStrong}</span>
                  {w.doesNotAfter}
                </span>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInput}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onOpenDocx(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={onWrite}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-accent-ink shadow-(--shadow-card) transition-colors duration-150 hover:bg-accent-strong"
              >
                <PenNibIcon className="size-4" />
                {w.write}
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={importing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rule-2 px-5 py-2.5 text-[13.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 disabled:opacity-60"
              >
                {importing ? c.masthead.opening : c.masthead.openDocx}
              </button>
              <button
                type="button"
                onClick={onLoadExample}
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13.5px] font-medium text-accent transition-colors duration-150 hover:bg-accent-weak sm:ml-1"
              >
                {w.loadExample}
                <ArrowRightIcon className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="border-t border-rule-1 bg-surface/40 px-6 py-8 sm:px-14">
            <div className="u-sublabel text-ink-3">{w.anatomyLabel}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <AnatomyCard title={w.cardCriterion.title} body={w.cardCriterion.body} />
              <AnatomyCard title={w.cardWhy.title} body={w.cardWhy.body} />
              <AnatomyCard title={w.cardWhat.title} body={w.cardWhat.body}>
                <div className="mt-3 flex flex-col gap-1.5">
                  <Outcome kind="safe" label={w.outcomeSafe} />
                  <Outcome kind="human" label={w.outcomeHuman} />
                </div>
              </AnatomyCard>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule-1 px-6 py-4 text-[11.5px] text-ink-3 sm:px-14">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {w.footerDeterministic}
            </span>
            <span aria-hidden>·</span>
            <span>{w.footerSameInput}</span>
            <span aria-hidden>·</span>
            <span>{w.footerNoCloud}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnatomyCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-rule-1 bg-sheet px-4 py-3.5">
      <div className="text-[13px] font-semibold text-ink-0">{title}</div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
      {children}
    </div>
  );
}

function Outcome({ kind, label }: { kind: "safe" | "human"; label: string }) {
  if (kind === "safe") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-safe-line bg-safe-weak px-2 py-0.5 text-[11px] font-medium text-safe">
        <CheckIcon className="size-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-human-line bg-human-weak px-2 py-0.5 text-[11px] font-medium text-human">
      <PenNibIcon className="size-3" />
      {label}
    </span>
  );
}
