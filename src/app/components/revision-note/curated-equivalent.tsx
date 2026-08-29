"use client";

import { useState } from "react";
import type { Finding } from "@/lucid";
import { buildConfidence } from "../../lib/narrative";
import { matchLeadingCase } from "../../lib/text-edit";
import { useCopy } from "../../i18n/use-copy";
import { ArrowDownIcon, CheckIcon } from "../icons";

export function CuratedEquivalent({ finding, onApply }: { finding: Finding; onApply: () => void }) {
  const { c, lang } = useCopy();
  const [copied, setCopied] = useState(false);
  const before = finding.span.text.replace(/\s+/g, " ").trim();

  const after = matchLeadingCase(before, finding.suggestion!);
  const rationale = buildConfidence(finding, lang).rationale;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(after);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <div className="overflow-hidden rounded-xl border border-safe-line bg-safe-weak">
      <div className="flex items-center gap-2 px-3 pt-3.5 text-[12.5px] font-semibold text-safe">
        <CheckIcon className="size-4" />
        {c.note.safeHeader}
      </div>

      <div className="px-3 py-3">
        <div className="rounded-lg border border-rule-1 bg-sheet shadow-(--shadow-card)">
          <DiffRow label={c.note.safeTerm}>
            <span className="font-serif text-[15.5px] text-ink-2 line-through decoration-ink-3">{before}</span>
          </DiffRow>
          <div className="flex items-center gap-2 border-t border-rule-1 px-3.5 py-1">
            <ArrowDownIcon className="size-3.5 text-safe" />
            <span className="u-sublabel text-ink-3">{c.note.safeEquivalent}</span>
          </div>
          <DiffRow label={c.note.safePlain} tone="safe">
            <span className="font-serif text-[15.5px] font-medium text-ink-0">{after}</span>
          </DiffRow>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 rounded-lg bg-safe px-3.5 py-2 text-[12.5px] font-semibold text-sheet transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {c.note.safeApply(after)}
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2"
          >
            {copied ? c.common.copied : c.common.copy}
          </button>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-ink-2">{c.note.safeApplyNote}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{rationale}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.note.safeNote}</p>
      </div>
    </div>
  );
}

function DiffRow({ label, tone, children }: { label: string; tone?: "safe"; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2.5">
      <span className={`u-sublabel w-12 shrink-0 ${tone === "safe" ? "text-safe" : "text-ink-3"}`}>{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
