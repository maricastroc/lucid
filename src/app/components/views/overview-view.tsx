"use client";

import { configDeviations, type Block, type Config, type Diagnostic, type Finding, type Severity } from "@/lucid";
import { severityInkVar } from "../../lib/criteria";
import { disabledCriteria } from "../../lib/profile";
import type { ReviewRoute } from "../../lib/review-route";
import { copyFor } from "../../i18n/copy";
import { useCopy } from "../../i18n/use-copy";
import type { ImportNotes } from "../../hooks/use-document-source";
import { ArrowRightIcon } from "../icons";
import { RouteResume } from "../route/route-resume";
import { CountStrip } from "./count-strip";

function flattenedLabel(notes: ImportNotes, c: ReturnType<typeof copyFor>): string | null {
  const parts: string[] = [];

  if (notes.format === "docx") {
    if (notes.tablesFlattened > 0) parts.push(c.overview.importTables(notes.tablesFlattened));
    if (notes.textBoxesInlined > 0) parts.push(c.overview.importTextBoxes(notes.textBoxesInlined));
  } else {
    if (notes.tablesRecovered > 0) parts.push(c.overview.importPdfTables(notes.tablesRecovered));
    const unread = notes.ruledRegions - notes.tablesRecovered;
    if (unread > 0) parts.push(c.overview.importRuledRegions(unread));
    const furniture = notes.removedHeaders + notes.removedFooters + notes.removedPageNumbers;
    if (furniture > 0) parts.push(c.overview.importFurniture(furniture));
    if (notes.dehyphenated > 0) parts.push(c.overview.importDehyphenated(notes.dehyphenated));
  }

  if (parts.length === 0) return null;

  const last = parts[parts.length - 1];
  return parts.length === 1 ? last : `${parts.slice(0, -1).join(c.overview.importAlso)}${c.overview.importAnd}${last}`;
}

interface Props {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  route: ReviewRoute;
  safeCount: number;
  humanCount: number;
  changeCount: number;
  blocks: readonly Block[] | null;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: ImportNotes | null;
  config: Config;
  onContinue: (criterion: string) => void;
  onOpenReview: () => void;
  onSeeChanges: () => void;
}

export function OverviewView({
  diagnostic,
  findings,
  route,
  safeCount,
  humanCount,
  changeCount,
  silentCriteria,
  missingBlockKinds,
  importNotes,
  config,
  onContinue,
  onOpenReview,
  onSeeChanges,
}: Props) {
  const { c, lang } = useCopy();
  const total = findings.length;
  const sev: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const f of findings) sev[f.severity]++;
  const deviations = configDeviations(config);
  const offCount = disabledCriteria(config, lang).length;
  const declaredStyles =
    importNotes?.format === "docx"
      ? importNotes.headingStylesRecovered.filter((name) => !importNotes.headingStylesInferred.includes(name))
      : [];
  const flattened = importNotes === null ? null : flattenedLabel(importNotes, c);

  return (
    <div className="fade-in flex flex-col gap-5 px-4 py-4">
      {total > 0 && <RouteResume route={route} onContinue={onContinue} onOpenReview={onOpenReview} />}

      <section aria-labelledby="panorama-achados">
        <h3 id="panorama-achados" className="u-label text-ink-3">
          {c.overview.foundLabel}
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-serif text-[40px] leading-none tabular-nums text-ink-0">{total}</span>
          <span className="text-[14px] text-ink-1">{c.counts.noun.found(total)}</span>
        </div>

        {total > 0 && (
          <>
            <div
              className="mt-4 flex h-1.5 gap-1"
              role="img"
              aria-label={c.overview.splitAriaLabel(safeCount, humanCount)}
            >
              {safeCount > 0 && (
                <span
                  className="rounded-full"
                  style={{ width: `${(safeCount / total) * 100}%`, background: "var(--safe)" }}
                />
              )}
              {humanCount > 0 && (
                <span
                  className="rounded-full"
                  style={{ width: `${(humanCount / total) * 100}%`, background: "var(--human)" }}
                />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
              <Legend swatch="var(--safe)" label={c.overview.legendSafe(safeCount)} value={safeCount} />
              <Legend swatch="var(--human)" label={c.overview.legendHuman(humanCount)} value={humanCount} />
            </div>
            {(sev.error > 0 || sev.warning > 0 || sev.info > 0) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
                {(["error", "warning", "info"] as Severity[]).map((s) =>
                  sev[s] > 0 ? (
                    <span key={s} className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: severityInkVar(s) }} aria-hidden />
                      {sev[s]} {c.overview.severityCount(s, sev[s])}
                    </span>
                  ) : null,
                )}
              </div>
            )}

            <CountStrip route={route} className="mt-4 border-t border-rule-1 pt-3.5" />
          </>
        )}
      </section>

      {(changeCount > 0 || route.resolved > 0 || route.introduced > 0) && (
        <section aria-labelledby="panorama-mudou" className="border-t border-rule-1 pt-4">
          <h3 id="panorama-mudou" className="u-label text-ink-3">
            {c.overview.movedLabel}
          </h3>
          <p className="mt-2 text-[12.5px] tabular-nums text-ink-1">
            {c.counts.resolvedSince(route.resolved, route.introduced)}
            {changeCount > 0 && (
              <>
                <span aria-hidden className="text-ink-dim">
                  {" · "}
                </span>
                {changeCount} {c.counts.noun.change(changeCount)}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onSeeChanges}
            className="focus-inset mt-2 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium text-accent transition-colors duration-150 hover:underline"
          >
            {c.overview.seeChanges}
            <ArrowRightIcon className="size-3.5" />
          </button>
        </section>
      )}

      <section
        aria-labelledby="panorama-limites"
        className="rounded-xl border border-rule-1 bg-surface-2/60 px-3.5 py-3"
      >
        <h3 id="panorama-limites" className="u-label text-ink-3">
          {c.overview.limitsLabel}
        </h3>

        <ul className="mt-2 flex flex-col gap-2 text-[11.5px] leading-relaxed">
          {deviations.length > 0 && (
            <li style={{ color: "var(--sev-warn)" }}>
              {c.overview.adjustedProfileBefore}
              <strong className="font-semibold">{c.overview.adjustedProfileStrong}</strong>
              {c.overview.adjustedProfile(deviations.length, offCount)} {c.overview.adjustedProfileAfter}
            </li>
          )}
          {silentCriteria.length > 0 && (
            <li style={{ color: "var(--sev-warn)" }}>
              {c.overview.structureCaveat(
                missingBlockKinds
                  .map((kind) => c.overview.structureMissing[kind] ?? kind)
                  .join(c.overview.structureMissingJoin),
                silentCriteria.length,
              )}
            </li>
          )}
          {importNotes?.format === "docx" && declaredStyles.length > 0 && (
            <li className="text-ink-2">{c.overview.importRecovered(declaredStyles.join(", "))}</li>
          )}
          {importNotes?.format === "pdf" && importNotes.headingsInferred + importNotes.itemsInferred > 0 && (
            <li className="text-ink-2">
              {c.overview.importPdfInferred(
                importNotes.headingsInferred,
                importNotes.itemsInferred,
                importNotes.structureReferences.join("; "),
              )}
            </li>
          )}
          {importNotes?.format === "docx" && importNotes.headingStylesInferred.length > 0 && (
            <li className="text-ink-2">{c.overview.importInferred(importNotes.headingStylesInferred.join(", "))}</li>
          )}
          {flattened !== null && (
            <li className="text-ink-2">
              {importNotes!.format === "pdf"
                ? c.overview.importFromPdf(flattened)
                : c.overview.importFlattened(flattened)}
            </li>
          )}
          {importNotes?.format === "pdf" && importNotes.ruledRegions > 0 && (
            <li className="text-ink-2">{c.overview.importPdfRuled}</li>
          )}
          <li className="text-ink-2">{c.overview.scoreCaveat}</li>
        </ul>

        <p className="mt-3 flex items-center gap-2 border-t border-rule-1 pt-2.5 text-[11px] text-ink-3">
          <span
            className="inline-flex min-w-0 items-center gap-1.5 text-ink-2"
            title={c.panel.provenanceTitle(diagnostic.meta.configHash, diagnostic.meta.lucidVersion)}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="truncate">
              {c.note.footerDeterministic} {diagnostic.meta.standardVersion}
            </span>
          </span>
        </p>
      </section>
    </div>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink-1">
      <span className="size-2.5 rounded-[3px]" style={{ background: swatch }} aria-hidden />
      <span className="tabular-nums text-ink-0">{value}</span>
      <span className="text-ink-2">{label}</span>
    </span>
  );
}
