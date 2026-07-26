"use client";

import { AuditPanel, AuditPanelFooter, type AuditPanelProps } from "./audit-panel";

export interface RevisionSheetProps extends Omit<AuditPanelProps, "header" | "probe"> {
  onDismiss: () => void;
}

/**
 * Mobile surface of the audit: a sheet over the document, since there is no room for a column.
 *
 * It shows the same content as the rail, minus the comprehension probe. That absence was an
 * accident until now — the probe was added to the rail while this tree was a separate copy —
 * and it stays only because turning it on is a visible change nobody asked for. It is one
 * `probe={…}` away, and no longer something a future section can repeat by omission.
 */
export function RevisionSheet({ onDismiss, ...panel }: RevisionSheetProps) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Revisões">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onDismiss}
        className="absolute inset-0 bg-ink-0/25 backdrop-blur-[2px]"
      />
      <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[20px] border-t border-rule-2 bg-surface shadow-(--shadow-pop)">
        <button
          type="button"
          aria-label="Recolher"
          onClick={onDismiss}
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-rule-3"
        />
        <AuditPanel {...panel} probe={null} />
        <AuditPanelFooter diagnostic={panel.diagnostic} />
      </div>
    </div>
  );
}
