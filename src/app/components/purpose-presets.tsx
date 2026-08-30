"use client";

import type { Config } from "@/lucid";
import { criterionLabelFor, knobLabel, KNOBS } from "../lib/profile";
import {
  PROFILE_IDS,
  PROFILE_VERSION,
  profileConfig,
  profileDifferences,
  profileHash,
  adjustmentsOver,
  type ProfileId,
} from "../lib/profiles";
import { useCopy } from "../i18n/use-copy";
import type { UiLang } from "../i18n/types";
import { Button } from "./ui/button";

interface Props {
  config: Config;
  selected: ProfileId;
  onSelect: (id: ProfileId) => void;
}

export function PurposePresets({ config, selected, onSelect }: Props) {
  const { c, lang } = useCopy();
  const p = c.presets;
  const deviations = adjustmentsOver(config, selected).length;
  const matches = deviations === 0;
  const differences = profileDifferences(selected);

  return (
    <div className="border-t border-rule-1 px-4 py-5">
      <h3 className="text-[13.5px] font-semibold text-ink-0">{p.label}</h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{p.lead}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PROFILE_IDS.map((id) => (
          <Button
            key={id}
            variant={id === selected ? "primary" : "outline"}
            shape="pill"
            aria-pressed={id === selected}
            onClick={() => onSelect(id)}
            className="px-3 py-1.5 text-[12px]"
          >
            {p.names[id]}
          </Button>
        ))}
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-1">{p.purposes[selected]}</p>

      <p className="mt-2 text-[12px] text-ink-2">
        {matches ? p.current(p.names[selected]) : p.adjustedOn(p.names[selected], deviations)}
        {" · "}
        <span className="tabular-nums text-ink-3">
          {p.stamp(p.names[selected], PROFILE_VERSION, profileHash(selected))}
        </span>
      </p>

      <div className="mt-3">
        <span className="u-sublabel text-ink-3">
          {differences.length === 0 ? p.noChanges : p.changes(differences.length)}
        </span>
        {differences.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {differences.map((d) => (
              <li key={`${d.section}.${d.field}`} className="flex items-baseline justify-between gap-3 text-[11.5px]">
                <span className="min-w-0 truncate text-ink-2">{labelFor(d.section, d.field, lang)}</span>
                <span className="shrink-0 tabular-nums text-ink-3">
                  {String(d.base)} → {String(d.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{p.limits[selected]}</p>
      <p className="mt-2 text-[11.5px] italic leading-relaxed text-ink-3">{p.caveat}</p>
    </div>
  );
}

function labelFor(section: string, field: string, lang: UiLang): string {
  const knob = KNOBS.find((k) => k.section === section && k.field === field);
  return knob === undefined ? criterionLabelFor(section, lang) : knobLabel(knob, lang);
}

export const presetConfigFor = profileConfig;
