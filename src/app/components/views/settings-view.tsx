"use client";

import type { Config, ReaderBriefing, BriefingCheck } from "@/lucid";
import type { OccurrenceCursor } from "../../lib/occurrence-cursor";
import type { ProfileId } from "../../lib/profiles";
import { useCopy } from "../../i18n/use-copy";
import { BriefingPanel } from "../briefing-panel";
import { ChevronLeftIcon } from "../icons";
import { ProfilePanel } from "../profile-panel";
import { PurposePresets } from "../purpose-presets";
import { Button } from "../ui/button";

interface Props {
  briefing: ReaderBriefing;
  check: BriefingCheck;
  cursor: OccurrenceCursor | null;
  index: number;
  config: Config;
  profileId: ProfileId;
  onBriefingChange: (briefing: ReaderBriefing) => void;
  onConfigChange: (config: Config) => void;
  onProfileChange: (id: ProfileId) => void;
  onSelectOccurrence: (expression: string, index: number) => void;
  onStepOccurrence: (delta: number) => void;
  onClose: () => void;
}

export function SettingsView(props: Props) {
  const { c } = useCopy();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-rule-1 bg-surface-2 px-2.5 py-2">
        <Button variant="link" size="xs" shape="soft" onClick={props.onClose} className="row-hit shrink-0">
          <ChevronLeftIcon className="size-3.5" />
          {c.panel.settingsClose}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="border-b border-rule-1 px-4 pb-3.5 pt-4">
          <h2 tabIndex={-1} className="u-label text-ink-2">
            {c.panel.settingsTitle}
          </h2>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-2">{c.panel.settingsLead}</p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.panel.goToFindingsHint}</p>
        </header>

        <BriefingPanel
          briefing={props.briefing}
          check={props.check}
          cursor={props.cursor}
          index={props.index}
          onChange={props.onBriefingChange}
          onSelectOccurrence={props.onSelectOccurrence}
          onStepOccurrence={props.onStepOccurrence}
        />
        <PurposePresets config={props.config} selected={props.profileId} onSelect={props.onProfileChange} />
        <ProfilePanel config={props.config} onChange={props.onConfigChange} />

        <div className="border-t border-rule-1 px-4 py-4">
          <Button variant="primary" size="lg" onClick={props.onClose} className="text-[12.5px]">
            {c.panel.settingsDone}
          </Button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.panel.settingsRecordPointer}</p>
          <p className="mt-3 text-[11px] text-ink-dim" title={c.panel.settingsIsoTitle}>
            {c.panel.settingsIsoNote}
          </p>
        </div>
      </div>
    </div>
  );
}
