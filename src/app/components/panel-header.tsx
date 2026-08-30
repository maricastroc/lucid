"use client";

import { ExportMenu, type ExportMenuProps } from "./export-menu";
import { SlidersIcon } from "./icons";
import { Button } from "./ui/button";
import { useCopy } from "../i18n/use-copy";

export interface PanelHeaderProps extends ExportMenuProps {
  settingsOpen: boolean;
  onOpenSettings: () => void;
}

export function PanelHeader({ settingsOpen, onOpenSettings, ...exportProps }: PanelHeaderProps) {
  const { c } = useCopy();
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-rule-1 px-4 sm:px-5">
      <span className="u-label text-ink-3">{c.note.panelLabel}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          shape="soft"
          aria-pressed={settingsOpen}
          aria-label={c.panel.settingsOpen}
          onClick={onOpenSettings}
          className={settingsOpen ? "bg-surface-2 text-ink-0" : ""}
        >
          <SlidersIcon className="size-3.5" />
          <span className="hidden sm:inline">{c.panel.settingsOpen}</span>
        </Button>
        <ExportMenu {...exportProps} />
      </div>
    </div>
  );
}
