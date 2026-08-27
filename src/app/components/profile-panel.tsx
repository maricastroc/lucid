"use client";

import { useState } from "react";
import { configDeviations, DEFAULT_CONFIG, type Config } from "@/lucid";
import {
  criterionLabelFor,
  describeDeviation,
  knobLabel,
  KNOBS,
  readEnabled,
  readNumber,
  TOGGLEABLE_SECTIONS,
  withEnabled,
  withNumber,
} from "../lib/profile";
import { useCopy } from "../i18n/use-copy";
import { Checkbox } from "./ui/checkbox";
import { Stepper } from "./ui/stepper";

interface Props {
  config: Config;
  onChange: (config: Config) => void;
}

export function ProfilePanel({ config, onChange }: Props) {
  const { c, lang } = useCopy();
  const p = c.profile;
  const deviations = configDeviations(config);
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-rule-1 px-6 py-5">
      <span className="u-label text-ink-3">{p.label}</span>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-1">
        {deviations.length === 0 ? p.defaults : p.adjustments(deviations.length)}
      </p>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{p.rationale}</p>

      {deviations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {deviations.map((deviation) => (
            <li key={`${deviation.section}.${deviation.field}`} className="text-[12.5px] text-ink-1">
              <span className="text-ink-3">·</span> {describeDeviation(deviation, lang)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
        >
          {open ? p.closeAdjust : p.openAdjust}
        </button>
        {deviations.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_CONFIG)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            {p.resetDefaults}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          <span className="u-label text-ink-3">{p.thresholdsLabel}</span>
          <div className="mt-2 flex flex-col gap-2">
            {KNOBS.map((knob) => (
              <div key={`${knob.section}.${knob.field}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-[12.5px] text-ink-1">{knobLabel(knob, lang)}</span>
                <Stepper
                  label={knobLabel(knob, lang)}
                  min={knob.min}
                  max={knob.max}
                  value={readNumber(config, knob.section, knob.field)}
                  onChange={(next) => onChange(withNumber(config, knob.section, knob.field, next))}
                />
              </div>
            ))}
          </div>

          <span className="u-label mt-5 block text-ink-3">{p.policyLabel}</span>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{p.policyNote}</p>
          <div className="mt-2 flex flex-col divide-y divide-rule-1">
            {TOGGLEABLE_SECTIONS.map((section) => (
              <label
                key={section}
                htmlFor={`criterio-${section}`}
                className="flex cursor-pointer items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 text-[12.5px] text-ink-1">{criterionLabelFor(section, lang)}</span>
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
    </section>
  );
}
