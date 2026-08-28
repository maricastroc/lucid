"use client";

import { AuditPanel, type AuditPanelProps } from "./audit-panel";
import { PanelHeader } from "./panel-header";
import { useCopy } from "../i18n/use-copy";

export interface RailProps extends Omit<AuditPanelProps, "probeExcerpt" | "onClearProbeExcerpt"> {
  probeExcerpt: string;
  onClearProbeExcerpt: () => void;
}

export function AuditRail({ probeExcerpt, onClearProbeExcerpt, ...panel }: RailProps) {
  const { c } = useCopy();
  return (
    <aside
      aria-label={c.note.panelLabel}
      className="hidden w-99 shrink-0 flex-col border-l border-rule-1 bg-surface lg:flex xl:w-110"
    >
      <PanelHeader
        diagnostic={panel.diagnostic}
        findings={panel.findings}
        ledger={panel.ledger}
        blocks={panel.blocks}
        briefing={panel.briefing}
        briefingCheck={panel.briefingCheck}
        config={panel.config}
      />
      <AuditPanel {...panel} probeExcerpt={probeExcerpt} onClearProbeExcerpt={onClearProbeExcerpt} />
    </aside>
  );
}
