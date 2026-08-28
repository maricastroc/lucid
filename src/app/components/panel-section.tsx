"use client";

import type { ReactNode } from "react";
import { sectionBodyId, sectionDomId, sectionHeadingId, type PanelSectionId } from "../lib/panel-sections";
import { ChevronDownIcon } from "./icons";

interface Props {
  id: PanelSectionId;
  title: string;
  summary?: string;
  collapsible: boolean;
  open: boolean;
  onToggle: (id: PanelSectionId) => void;
  children: ReactNode;
}

export function PanelSection({ id, title, summary, collapsible, open, onToggle, children }: Props) {
  const headingId = sectionHeadingId(id);
  const bodyId = sectionBodyId(id);

  if (!collapsible) {
    return (
      <section id={sectionDomId(id)} aria-labelledby={headingId} className="border-t border-rule-1 first:border-t-0">
        <div className="px-4 pb-3 pt-5">
          <h2 id={headingId} tabIndex={-1} className="u-label text-ink-3">
            {title}
          </h2>
        </div>
        {children}
      </section>
    );
  }

  return (
    <section id={sectionDomId(id)} aria-labelledby={headingId} className="border-t border-rule-1">
      <h2 id={headingId} tabIndex={-1}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => onToggle(id)}
          className="focus-inset row-hit flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-surface-2"
        >
          <ChevronDownIcon
            className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
          />
          <span className="u-label shrink-0 text-ink-2">{title}</span>
          {!open && summary !== undefined && (
            <span className="min-w-0 flex-1 truncate text-right text-[11.5px] text-ink-3">{summary}</span>
          )}
        </button>
      </h2>
      {open && <div id={bodyId}>{children}</div>}
    </section>
  );
}
