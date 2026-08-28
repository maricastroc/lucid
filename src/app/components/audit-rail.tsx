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
      className="hidden shrink-0 flex-col border-l border-rule-1 bg-surface lg:flex lg:w-[35%] lg:min-w-[26rem] lg:max-w-[40rem]"
    >
      <PanelHeader
        diagnostic={panel.diagnostic}
        findings={panel.findings}
        ledger={panel.ledger}
        blocks={panel.blocks}
        briefing={panel.briefing}
        briefingCheck={panel.briefingCheck}
        onBriefingChange={panel.onBriefingChange}
        config={panel.config}
      />
      <AuditPanel {...panel} probeExcerpt={probeExcerpt} onClearProbeExcerpt={onClearProbeExcerpt} />
    </aside>
  );
}
