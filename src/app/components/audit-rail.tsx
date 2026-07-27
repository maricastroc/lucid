"use client";

import { AuditPanel, AuditPanelFooter, type AuditPanelProps } from "./audit-panel";
import { ProbePanel } from "./probe-panel";
import { useCopy } from "../i18n/use-copy";

export interface RailProps extends Omit<AuditPanelProps, "header" | "probe"> {
  text: string;
}

export function AuditRail({ text, ...panel }: RailProps) {
  const { c } = useCopy();
  return (
    <aside
      aria-label={c.note.panelLabel}
      className="hidden w-99 shrink-0 flex-col border-l border-rule-1 bg-surface lg:flex xl:w-110"
    >
      <AuditPanel
        {...panel}
        header={
          <div className="flex h-12 shrink-0 items-center border-b border-rule-1 px-6">
            <span className="u-label text-ink-3">{c.note.panelLabel}</span>
          </div>
        }
        probe={<ProbePanel text={text} suggestedQuestion={panel.briefing.purpose} />}
      />
      <AuditPanelFooter diagnostic={panel.diagnostic} />
    </aside>
  );
}
