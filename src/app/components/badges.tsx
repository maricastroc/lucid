"use client";

import type { Finding, Severity } from "@/lucid";
import { actionStateOf, metaFor, severityInkVar } from "../lib/criteria";
import { CheckIcon, PenNibIcon } from "./icons";

export function ActionBadge({ finding, size = "sm" }: { finding: Finding; size?: "sm" | "md" }) {
  const state = actionStateOf(finding);
  const pad = size === "md" ? "gap-1.5 px-2.5 py-1 text-[12px]" : "gap-1 px-2 py-0.5 text-[11px]";
  const icon = size === "md" ? "size-3.5" : "size-3";

  if (state === "safe") {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full border border-safe-line bg-safe-weak font-medium text-safe ${pad}`}
      >
        <CheckIcon className={icon} />
        {size === "md" ? "Troca direta indicada" : "Troca direta"}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-human-line bg-human-weak font-medium text-human ${pad}`}
    >
      <PenNibIcon className={icon} />
      {size === "md" ? "Exige decisão humana" : "Decisão sua"}
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
  const meta = metaFor(criterion);
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
