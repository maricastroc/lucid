"use client";

import type { Finding, Span } from "@/lucid";
import type { AgentDeclaration } from "@/report/rewrite";
import { rewriteTargetAt } from "../../lib/paragraphs";
import { manualEditReplacement } from "../../lib/text-edit";
import { useCopy } from "../../i18n/use-copy";
import { PenNibIcon } from "../icons";
import { RewriteProposalCard } from "./rewrite-proposal-card";
import { useManualEditDraft } from "./use-manual-edit-draft";

export const APPLY_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg border border-human-line bg-human-weak px-3.5 py-2 text-[13px] font-semibold text-human transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--human)_14%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-human-weak";

export function ManualEditForm({
  finding,
  source,
  declaration,
  onManualEdit,
}: {
  finding: Finding;
  source: string;
  declaration: AgentDeclaration | null;
  onManualEdit: (target: Span, replacement: string) => void;
}) {
  const { c, lang } = useCopy();
  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? c.note.manualUnitSentence : c.note.manualUnitParagraph;
  const original = target.text;
  const edit = useManualEditDraft({ source, target, criterion: finding.criterion, declaration, lang });
  const { draft: editorDraft, verification: result, dirty } = edit;
  const draft = editorDraft.status === "closed" ? original : editorDraft.text;
  const checking = editorDraft.status === "checking";

  if (editorDraft.status === "closed") {
    return (
      <button
        type="button"
        onClick={edit.open}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-rule-2 px-3.5 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
      >
        <PenNibIcon className="size-3.5" />
        {c.note.manualOpen}
      </button>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-rule-1 bg-sheet">
      <div className="flex items-center justify-between border-b border-rule-1 px-3.5 py-2.5">
        <span className="u-sublabel text-ink-3">
          {c.note.manualTitle} · {unitLabel}
        </span>
        <button
          type="button"
          onClick={edit.close}
          className="rounded-md px-2 py-1 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2"
        >
          {c.common.close}
        </button>
      </div>
      <div className="px-3.5 py-3">
        <textarea
          value={draft}
          onChange={(e) => edit.edit(e.target.value)}
          spellCheck={false}
          aria-label={c.note.manualEditAria(unitLabel)}
          className="block max-h-[46vh] min-h-28 w-full resize-y rounded-lg border border-rule-2 bg-surface-2/40 px-3 py-2.5 font-serif text-[14.5px] leading-snug text-ink-0 outline-none transition-colors focus:border-human-line"
          style={{ caretColor: "var(--accent)" }}
        />
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            disabled={!dirty || checking}
            onClick={edit.check}
            className={APPLY_BUTTON_CLASS}
          >
            {checking ? c.note.manualVerifying : c.note.manualVerify}
          </button>
          <button
            type="button"
            disabled={draft === original}
            onClick={edit.restore}
            className="rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {c.common.restore}
          </button>
        </div>

        {result !== null && (
          <RewriteProposalCard
            result={result}
            currentOriginal={target.text}
            onApplyRewrite={() => onManualEdit(target, manualEditReplacement(draft))}
          />
        )}

        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.note.manualNote}</p>
      </div>
    </div>
  );
}
