"use client";

import type { Finding } from "@/lucid";
import { metaFor } from "../lib/criteria";
import { revisionBalance } from "../lib/attribution";
import type { LedgerEntry } from "../lib/ledger";
import { useCopy } from "../i18n/use-copy";

const fmt = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export function RevisionBalanceSection({
  before,
  after,
  entries,
}: {
  before: readonly Finding[];
  after: readonly Finding[];
  entries: readonly LedgerEntry[];
}) {
  const { c, lang } = useCopy();
  const total = revisionBalance(before, after);
  const moved = total.byCriterion.filter((row) => row.direction !== "unchanged");

  if (entries.length === 0 && moved.length === 0) return null;

  return (
    <div className="border-t border-rule-1 px-4 py-5">
      <h3 className="u-label text-ink-3">{c.overview.balanceLabel}</h3>

      <p className="mt-2 text-[12px] text-ink-2">
        {c.overview.balanceTotal(fmt(total.weightBefore), fmt(total.weightAfter))} ·{" "}
        {c.overview.balanceCount(total.countBefore, total.countAfter)}
      </p>

      {moved.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-3">{c.overview.balanceNone}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {moved.map((row) => (
            <li key={row.criterion} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="min-w-0 truncate text-ink-1">{metaFor(row.criterion, lang).label}</span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums text-ink-2">
                <span>{c.overview.balanceCount(row.before, row.after)}</span>
                <span className={row.direction === "improved" ? "text-safe" : "text-human"}>
                  {c.overview.balanceDirection[row.direction]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11.5px] italic leading-relaxed text-ink-3">{c.overview.balanceCaveat}</p>
    </div>
  );
}
