"use client";

import { useState } from "react";
import type { Finding, Span } from "@/lucid";
import type { AgentDeclaration, RewriteProposal } from "@/report/rewrite";
import { rewriteTargetAt } from "../../lib/paragraphs";
import { REWRITE_MODELS } from "../../lib/rewrite";
import { useCopy } from "../../i18n/use-copy";
import { ChevronDownIcon, WandIcon } from "../icons";
import { SendNotice } from "../send-notice";
import { RewriteProposalCard } from "./rewrite-proposal-card";
import { useRewriteDraft } from "./use-rewrite-draft";

export function AiRewritePanel({
  finding,
  source,
  declaration,
  onApplyRewrite,
}: {
  finding: Finding;
  source: string;
  declaration: AgentDeclaration | null;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
}) {
  const { c } = useCopy();
  const choice = REWRITE_MODELS[0];
  const [open, setOpen] = useState(false);

  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? c.note.manualUnitSentence : c.note.manualUnitParagraph;

  const { draft, run, cancel } = useRewriteDraft({
    source,
    target,
    criterion: finding.criterion,
    choice,
    declaration,
    failureMessage: c.note.aiFailedGeneric,
  });

  const loading = draft.status === "running";
  const error = draft.status === "failed" ? draft.message : null;
  const result = draft.status === "proposed" ? draft.result : null;
  const hasProposal = result !== null && result.proposal.proposed !== result.proposal.original;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-rule-2 bg-sheet shadow-(--shadow-card)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-inset row-hit flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <ChevronDownIcon
          className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
        <WandIcon className="size-4 shrink-0 text-accent" />
        <span className="u-sublabel text-ink-1">{c.note.aiTitle}</span>
      </button>
      {open && (
        <div className="border-t border-rule-1 px-3 pt-3 pb-3.5">
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-1">
            {c.note.aiTarget(unitLabel)}
          </p>

          {choice.providerId !== "stub" && <SendNotice text={source} />}

          {loading && (
            <div className="mt-3.5">
              <div className="progress-track" aria-hidden>
                <div className="progress-sweep" />
              </div>
              <p role="status" className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
                {c.note.aiRunning}
              </p>
            </div>
          )}

          <div className="mt-3.5 flex items-center justify-end gap-2">
            {loading && (
              <button
                type="button"
                onClick={cancel}
                className="inline-flex h-9 shrink-0 items-center rounded-lg border border-rule-2 px-3.5 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2"
              >
                {c.common.cancel}
              </button>
            )}
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-accent-ink shadow-(--shadow-card) transition-colors duration-150 hover:bg-accent-strong disabled:opacity-60"
            >
              {c.note.aiRun}
            </button>
          </div>

          {error !== null && (
            <p className="mt-3 rounded-lg border border-human-line bg-human-weak px-3 py-2.5 text-[12px] leading-relaxed text-ink-1">
              {c.note.aiFailed(error)}
            </p>
          )}

          {result !== null &&
            (hasProposal ? (
              <RewriteProposalCard
                result={result}
                currentOriginal={target.text}
                onApplyRewrite={() => onApplyRewrite(target, result.proposal)}
              />
            ) : (
              <p className="mt-3 rounded-lg border border-rule-1 bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
                {c.note.aiNoProposal}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
