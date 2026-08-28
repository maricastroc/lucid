"use client";

import { ExportMenu, type ExportMenuProps } from "./export-menu";
import { useCopy } from "../i18n/use-copy";

export function PanelHeader(props: ExportMenuProps) {
  const { c } = useCopy();
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-rule-1 px-4 sm:px-5">
      <span className="u-label text-ink-3">{c.note.panelLabel}</span>
      <ExportMenu {...props} />
    </div>
  );
}
