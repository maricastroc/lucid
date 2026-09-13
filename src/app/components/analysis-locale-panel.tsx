"use client";

import { analysisLocale, ANALYSIS_LOCALE_IDS, type AnalysisLocale, type AnalysisLocaleId } from "../locale/active";
import { useCopy } from "../i18n/use-copy";
import { Select } from "./ui/select";

interface Props {
  locale: AnalysisLocale;
  onChange: (id: AnalysisLocaleId) => void;
}

export function AnalysisLocalePanel({ locale, onChange }: Props) {
  const { c } = useCopy();
  const a = c.analysisLocale;
  const many = ANALYSIS_LOCALE_IDS.length > 1;
  const labelOf = (id: AnalysisLocaleId): string => {
    const name = a.name[id] ?? id;
    return analysisLocale(id).experimental ? `${name} · ${a.experimentalTag}` : name;
  };

  return (
    <div className="border-t border-rule-1 px-4 py-5">
      <h3 className="text-[13.5px] font-semibold text-ink-0">{a.label}</h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">{a.lead}</p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 text-[12.5px] text-ink-1">{a.current}</span>
        {many ? (
          <Select
            ariaLabel={a.label}
            value={locale.id}
            onValueChange={(next) => onChange(next as AnalysisLocaleId)}
            options={ANALYSIS_LOCALE_IDS.map((id) => ({ value: id, label: labelOf(id) }))}
          />
        ) : (
          <span className="shrink-0 rounded-[3px] bg-surface-2 px-1.5 py-px text-[11px] tracking-wide text-ink-1">
            {labelOf(locale.id)}
          </span>
        )}
      </div>

      {locale.experimental && (
        <p
          role="note"
          className="mt-3 rounded-lg border border-rule-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2"
        >
          <span className="mr-1.5 rounded-[3px] bg-surface-2 px-1 py-px text-[10px] tracking-wide text-ink-3">
            {a.experimentalTag}
          </span>
          {a.experimentalNote}
        </p>
      )}

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">{many ? a.switchWarning : a.onlyOne}</p>
    </div>
  );
}
