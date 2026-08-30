"use client";

import { useState } from "react";
import { AuditPanel, type AuditPanelProps } from "./audit-panel";
import { PanelHeader } from "./panel-header";
import { useCopy } from "../i18n/use-copy";

export interface RailProps extends Omit<AuditPanelProps, "settingsOpen" | "onCloseSettings"> {
  probeExcerpt: string;
  onClearProbeExcerpt: () => void;
}

export function AuditRail({ probeExcerpt, onClearProbeExcerpt, ...panel }: RailProps) {
  const { c } = useCopy();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <aside
      aria-label={c.note.panelLabel}
      className="hidden shrink-0 flex-col border-l border-rule-1 bg-surface lg:flex lg:w-[35%] lg:min-w-[26rem] lg:max-w-[40rem]"
    >
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
        marks={panel.review.marks}
        rawBlocks={panel.rawBlocks}
        comparison={panel.baseline.comparison}
      />
      <AuditPanel
        {...panel}
        probeExcerpt={probeExcerpt}
        onClearProbeExcerpt={onClearProbeExcerpt}
        settingsOpen={settingsOpen}
        onCloseSettings={() => setSettingsOpen(false)}
      />
    </aside>
  );
}
