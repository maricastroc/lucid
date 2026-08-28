"use client";

import type { Finding, Severity } from "@/lucid";
import { isSafe, metaFor, requiresHumanThroughout, severityInkVar } from "../lib/criteria";
import { useCopy } from "../i18n/use-copy";
import { ArrowRightIcon, PenNibIcon } from "./icons";

export function ActionBadge({ finding }: { finding: Finding }) {
  const { c } = useCopy();
  if (!isSafe(finding) || finding.suggestion === undefined) return null;

  return (
    <span
      title={c.badges.safeLong}
      className="inline-flex max-w-[45%] items-center gap-1 rounded-full border border-safe-line bg-safe-weak px-2 py-0.5 text-[11px] font-medium text-safe"
    >
      <ArrowRightIcon className="size-3 shrink-0" />
      <span className="sr-only">{c.badges.safeShort}: </span>
      <span className="truncate">{finding.suggestion}</span>
    </span>
  );
}

export function HumanScopeNote({ items }: { items: readonly Finding[] }) {
  const { c } = useCopy();
  if (!requiresHumanThroughout(items)) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-[3px] bg-human-weak px-1.5 py-px text-[10px] tracking-wide text-human">
      <PenNibIcon className="size-2.5 shrink-0" />
      {c.badges.humanLong}
    </span>
  );
}

export function SeverityDot({ severity, className = "" }: { severity: Severity; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-1.75 shrink-0 rounded-full ${className}`}
      style={{ background: severityInkVar(severity) }}
    />
  );
}

export function CriterionMark({ criterion, className = "" }: { criterion: string; className?: string }) {
  const { lang } = useCopy();
  const meta = metaFor(criterion, lang);
  if (meta.channel === "passage") {
    return (
      <span
        aria-hidden
        className={`grid h-4 w-7 place-items-center rounded-[3px] ${className}`}
        style={{ background: "var(--mark-passage)" }}
      >
        <span className="text-[11px] font-serif italic text-ink-2">Aa</span>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`mark ${meta.markStyleClass} w-7 text-center font-serif text-[13px] leading-none text-ink-2 ${className}`}
    >
      Aa
    </span>
  );
}
