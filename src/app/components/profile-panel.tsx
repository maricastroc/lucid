"use client";

import { useState } from "react";
import { configDeviations, type Config } from "@/lucid";
import type { AnalysisLocale } from "../locale/active";
import {
  criterionLabelFor,
  describeDeviation,
  knobLabel,
  hasProvisionalThresholds,
  knobsFor,
  readEnabled,
  readNumber,
  toggleableSectionsFor,
  withEnabled,
  withNumber,
} from "../lib/profile";
import { useCopy } from "../i18n/use-copy";
import { thresholdNoteFor } from "../presentation/registry";
import { ChevronDownIcon } from "./icons";
import { Checkbox } from "./ui/checkbox";
import { Stepper } from "./ui/stepper";

interface Props {
  config: Config;
  locale: AnalysisLocale;
  onChange: (config: Config) => void;
}

export function ProfilePanel({ config, locale, onChange }: Props) {
  const { c, lang } = useCopy();
  const p = c.profile;
  const deviations = configDeviations(config, locale.defaultConfig);
  const knobs = knobsFor(locale);
  const sections = toggleableSectionsFor(locale);
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-rule-1 px-4 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13.5px] font-semibold text-ink-0">{p.label}</h3>
        <span className="rounded-[3px] bg-human-weak px-1.5 py-px text-[10px] tracking-wide text-human">{p.chip}</span>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{p.lead}</p>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-1">
        {deviations.length === 0 ? p.defaults : p.adjustments(deviations.length)}
      </p>

      {deviations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {deviations.map((deviation) => (
            <li key={`${deviation.section}.${deviation.field}`} className="text-[12.5px] text-ink-1">
              <span className="text-ink-3">·</span> {describeDeviation(deviation, lang, locale)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
        >
          {p.openAdjust}
          <ChevronDownIcon
            className={`size-3.5 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
          />
        </button>
        {deviations.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(locale.defaultConfig)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            {p.resetDefaults}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          <span className="u-label text-ink-3">{p.thresholdsLabel}</span>
          {hasProvisionalThresholds(locale) && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{p.provisionalNote}</p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {knobs.map((knob) => {
              const note = thresholdNoteFor(locale.id, knob.section, knob.field, lang);
              return (
                <div key={`${knob.section}.${knob.field}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[12.5px] text-ink-1">
                      {knobLabel(knob, lang)}
                      {knob.basis?.status === "provisional" && (
                        <span
                          title={knob.basis.basis}
                          className="ml-1.5 rounded-[3px] bg-surface-2 px-1 py-px text-[10px] tracking-wide text-ink-3"
                        >
                          {p.provisionalTag}
                        </span>
                      )}
                    </span>
                    <Stepper
                      label={knobLabel(knob, lang)}
                      min={knob.min}
                      max={knob.max}
                      value={readNumber(config, knob.section, knob.field)}
                      onChange={(next) => onChange(withNumber(config, knob.section, knob.field, next))}
                    />
                  </div>
                  {note !== null && <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{note}</p>}
                </div>
              );
            })}
          </div>

          <span className="u-label mt-5 block text-ink-3">{p.policyLabel}</span>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{p.policyNote}</p>
          <div className="mt-2 flex flex-col divide-y divide-rule-1">
            {sections.map((section) => (
              <label
                key={section}
                htmlFor={`criterio-${section}`}
                className="flex cursor-pointer items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 text-[12.5px] text-ink-1">{criterionLabelFor(section, lang, locale)}</span>
                <Checkbox
                  id={`criterio-${section}`}
                  checked={readEnabled(config, section)}
                  onCheckedChange={(next) => onChange(withEnabled(config, section, next))}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
