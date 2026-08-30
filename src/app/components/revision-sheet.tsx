"use client";

import { useState } from "react";
import { AuditPanel, type AuditPanelProps } from "./audit-panel";
import { PanelHeader } from "./panel-header";
import { useCopy } from "../i18n/use-copy";

export interface RevisionSheetProps extends Omit<AuditPanelProps, "settingsOpen" | "onCloseSettings"> {
  onDismiss: () => void;
}

export function RevisionSheet({ onDismiss, ...panel }: RevisionSheetProps) {
  const { c } = useCopy();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div
      className="fixed inset-0 z-40 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={c.documentView.sheetLabel}
    >
      <button
        type="button"
        aria-label={c.documentView.sheetClose}
        onClick={onDismiss}
        className="absolute inset-0 bg-ink-0/25 backdrop-blur-[2px]"
      />
      <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[20px] border-t border-rule-2 bg-surface shadow-(--shadow-pop)">
        <button
          type="button"
          aria-label={c.documentView.sheetCollapse}
          onClick={onDismiss}
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-rule-3"
        />
        <PanelHeader
          settingsOpen={settingsOpen}
          onOpenSettings={() => setSettingsOpen((open) => !open)}
          diagnostic={panel.diagnostic}
          findings={panel.findings}
          ledger={panel.ledger}
          originalText={panel.originalText}
          originalFindings={panel.originalFindings}
          profileId={panel.settings.profileId}
          blocks={panel.blocks}
          briefing={panel.settings.briefing}
          briefingCheck={panel.settings.briefingCheck}
          onBriefingChange={panel.settings.onBriefingChange}
          config={panel.settings.config}
        />
        <AuditPanel {...panel} settingsOpen={settingsOpen} onCloseSettings={() => setSettingsOpen(false)} />
      </div>
    </div>
  );
}
