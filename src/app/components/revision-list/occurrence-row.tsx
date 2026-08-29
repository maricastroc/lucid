"use client";

import type { Finding } from "@/lucid";
import type { ReviewMark } from "../../lib/review-marks";
import { useCopy } from "../../i18n/use-copy";
import { ActionBadge, SeverityDot } from "../badges";
import { CheckIcon, CloseIcon } from "../icons";
import { excerptOf } from "./occurrence-excerpt";

export function OccurrenceRow({
  finding,
  ordinal,
  context,
  state,
  selected,
  onSelect,
  onMark,
}: {
  finding: Finding;
  ordinal: number;
  context: string;
  state: "pending" | ReviewMark;
  selected: boolean;
  onSelect: () => void;
  onMark: (mark: ReviewMark | null) => void;
}) {
  const { c } = useCopy();
  const excerpt = excerptOf(finding);
  const marked = state !== "pending";
  return (
    <div
      className={`row-hit flex w-full items-center rounded-lg ${
        selected ? "bg-accent-weak shadow-[inset_0_0_0_1px_var(--accent-line)]" : "hover:bg-surface-2"
      }`}
    >
      <button
        data-row
        type="button"
        aria-current={selected}
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left ${marked ? "opacity-55" : ""}`}
      >
        <span className="w-6 shrink-0 text-right tabular-nums text-[11px] text-ink-dim">{ordinal}</span>
        <SeverityDot severity={finding.severity} />
        <span
          className={`min-w-0 flex-1 truncate font-serif text-[13.5px] text-ink-1 ${
            state === "dismissed" ? "line-through decoration-ink-3" : ""
          }`}
        >
          “{excerpt}”{context !== "" && <span className="font-sans text-[11.5px] text-ink-3"> {context}</span>}
        </span>
        <ActionBadge finding={finding} />
      </button>
      <MarkButton
        pressed={state === "seen"}
        label={c.revisionList.markSeenNamed(`${ordinal}. ${excerpt}`)}
        title={state === "seen" ? c.revisionList.unmarkHint : c.revisionList.markSeenHint}
        onClick={() => onMark(state === "seen" ? null : "seen")}
      >
        <CheckIcon className="size-4" />
      </MarkButton>
      <MarkButton
        pressed={state === "dismissed"}
        label={c.revisionList.dismissNamed(`${ordinal}. ${excerpt}`)}
        title={state === "dismissed" ? c.revisionList.unmarkHint : c.revisionList.dismissHint}
        onClick={() => onMark(state === "dismissed" ? null : "dismissed")}
        className="mr-1.5"
      >
        <CloseIcon className="size-4" />
      </MarkButton>
    </div>
  );
}

function MarkButton({
  pressed,
  label,
  title,
  onClick,
  className = "",
  children,
}: {
  pressed: boolean;
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={title}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors duration-150 ${
        pressed ? "bg-surface-3 text-ink-0" : "text-ink-2 hover:bg-surface-3 hover:text-ink-0"
      } ${className}`}
    >
      {children}
    </button>
  );
}
