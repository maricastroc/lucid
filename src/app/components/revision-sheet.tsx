"use client";

import { AuditPanel, AuditPanelFooter, type AuditPanelProps } from "./audit-panel";
import { useCopy } from "../i18n/use-copy";

export interface RevisionSheetProps extends Omit<AuditPanelProps, "header" | "probe"> {
  onDismiss: () => void;
}

export function RevisionSheet({ onDismiss, ...panel }: RevisionSheetProps) {
  const { c } = useCopy();
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={c.documentView.sheetLabel}>
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
        <AuditPanel {...panel} probe={null} />
        <AuditPanelFooter diagnostic={panel.diagnostic} />
      </div>
    </div>
  );
}
