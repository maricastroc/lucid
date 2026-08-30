"use client";

import { useRef } from "react";
import type { Baseline, BaselineComparison, BaselineRefusal } from "../../lib/baseline";
import { configDiffers, profileMatches } from "../../lib/baseline";
import { metaFor, severityInkVar } from "../../lib/criteria";
import type { Config } from "@/lucid";
import { useCopy } from "../../i18n/use-copy";
import { CloseIcon, HistoryIcon } from "../icons";
import { Button } from "../ui/button";

export interface BaselineSurface {
  attached: Baseline | null;
  comparison: BaselineComparison | null;
  refusal: BaselineRefusal | null;
  onAttach: (file: File) => void;
  onDetach: () => void;
  onAdoptProfile: () => void;
  onDismissRefusal: () => void;
}

export function BaselinePanel({ surface, config }: { surface: BaselineSurface; config: Config }) {
  const { c } = useCopy();
  const b = c.baseline;
  const fileInput = useRef<HTMLInputElement>(null);

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept=".json,application/json"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) surface.onAttach(file);
        e.target.value = "";
      }}
    />
  );

  const refusal =
    surface.refusal === null ? null : (
      <div
        role="alert"
        className="mt-2.5 flex items-start gap-2 rounded-lg border border-sev-warning/40 bg-sev-warning/10 px-3 py-2.5"
      >
        <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-ink-1">{b.refusal[surface.refusal]}</p>
        <Button variant="ghost" size="xs" shape="soft" onClick={surface.onDismissRefusal} className="shrink-0">
          {c.common.close}
        </Button>
      </div>
    );

  if (surface.attached === null || surface.comparison === null) {
    return (
      <section aria-labelledby="ponto-de-partida" className="rounded-xl border border-dashed border-rule-2 px-3.5 py-3">
        <h3 id="ponto-de-partida" className="u-label flex items-center gap-1.5 text-ink-3">
          <HistoryIcon className="size-3.5" />
          {b.label}
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{b.emptyLead}</p>
        {picker}
        <Button variant="outline" size="lg" onClick={() => fileInput.current?.click()} className="mt-2.5">
          {b.attachAction}
        </Button>
        {refusal}
      </section>
    );
  }

  const { attached, comparison } = surface;
  const drift = comparison.rebasedCount - comparison.historicalCount;

  return (
    <section
      aria-labelledby="ponto-de-partida"
      className="rounded-xl border border-accent-line bg-accent-weak px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="ponto-de-partida" className="u-label flex items-center gap-1.5 text-ink-2">
            <HistoryIcon className="size-3.5 text-accent" />
            {b.label}
          </h3>
          <p className="mt-1.5 truncate text-[13px] font-semibold text-ink-0">{attached.title}</p>
          <p className="text-[11px] text-ink-2">
            {b.savedAt(attached.savedAt)}
            <span aria-hidden className="text-ink-dim">
              {" · "}
            </span>
            <span className="font-mono text-[10.5px]">{attached.source.textHash}</span>
          </p>
        </div>
        <Button variant="ghost" size="xs" shape="soft" onClick={surface.onDetach} className="shrink-0">
          <CloseIcon className="size-3" />
          {b.detach}
        </Button>
      </div>

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-1">{b.sameRuler}</p>

      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] tabular-nums text-ink-2">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-ink-3">{b.historical(comparison.historicalCount)}</dt>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dd className="font-semibold text-ink-0">{b.rebased(comparison.rebasedCount)}</dd>
        </div>
      </dl>
      {drift !== 0 && (
        <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: "var(--sev-warn)" }}>
          {b.engineDrift(drift)}
        </p>
      )}

      {comparison.divergence.length > 0 && (
        <div className="mt-2.5 border-t border-accent-line/50 pt-2.5">
          <p className="u-sublabel text-ink-3">{b.divergenceLabel}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
            {comparison.divergence.map((field) => b.divergenceFields[field]).join(" · ")}
          </p>
          {configDiffers(comparison) && !profileMatches(attached, config) && (
            <>
              <Button variant="outline" size="sm" onClick={surface.onAdoptProfile} className="mt-2">
                {b.adoptProfile}
              </Button>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">{b.adoptProfileHint}</p>
            </>
          )}
        </div>
      )}

      {picker}
      {refusal}
    </section>
  );
}

export function StillTherePanel({ comparison }: { comparison: BaselineComparison }) {
  const { c, lang } = useCopy();
  const b = c.baseline;

  return (
    <section aria-labelledby="continua-la" className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="continua-la" className="u-label text-ink-3">
          {b.stillThereLabel}
        </h3>
        <span className="shrink-0 text-[11.5px] tabular-nums text-ink-2">
          {b.stillThereCount(comparison.stillThereCount)}
        </span>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{b.stillThereLead}</p>

      {comparison.stillThere.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-3">{b.stillThereNone}</p>
      ) : (
        <ul aria-label={b.stillThereLabel} className="mt-3 flex flex-col gap-2">
          {comparison.stillThere.map((point) => (
            <li
              key={`${point.criterion}:${point.excerpt}`}
              className="rounded-lg border border-rule-1 bg-surface-2/60 px-2.5 py-2"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="size-1.5 shrink-0 -translate-y-px rounded-full"
                  style={{ background: severityInkVar(point.severity) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-2">
                  {metaFor(point.criterion, lang).label}
                </span>
                {point.count > 1 && (
                  <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{b.occurrences(point.count)}</span>
                )}
              </div>
              <p className="mt-1 font-serif text-[12.5px] leading-snug text-ink-0">
                {point.excerpt.replace(/\s+/g, " ").trim()}
              </p>
              {point.decision !== null && (
                <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
                  <span className="u-sublabel text-ink-3">{b.alreadyDecided[point.decision.kind]}</span>{" "}
                  {point.decision.note ?? b.noReason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">{b.caveat}</p>
    </section>
  );
}
