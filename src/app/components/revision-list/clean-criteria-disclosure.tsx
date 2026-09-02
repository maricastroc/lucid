"use client";

import { useState } from "react";
import { coverageOf, metaFor } from "../../lib/criteria";
import { useCopy } from "../../i18n/use-copy";
import { CriterionMark } from "../badges";
import { ChevronDownIcon } from "../icons";

export function CleanCriteriaDisclosure({
  criteria,
  declaredTerms,
}: {
  criteria: readonly string[];
  declaredTerms: number;
}) {
  const { c, lang } = useCopy();
  const [coverageOpen, setCoverageOpen] = useState(false);
  if (criteria.length === 0) return null;

  return (
    <div className="px-3 pb-4">
      <button
        type="button"
        aria-expanded={coverageOpen}
        onClick={() => setCoverageOpen((v) => !v)}
        className="row-hit flex w-full items-center gap-2.5 rounded-lg border-t border-dashed border-rule-2 px-3 pb-2 pt-3.5 text-left text-ink-3 hover:text-ink-2"
      >
        <ChevronDownIcon
          className={`size-3.5 shrink-0 transition-transform duration-150 ${coverageOpen ? "" : "-rotate-90"}`}
        />
        <span className="min-w-0 flex-1 text-[12px]">{c.revisionList.cleanCriteria(criteria.length)}</span>
        <span className="u-sublabel">{c.revisionList.coverage}</span>
      </button>

      {coverageOpen && (
        <div className="mt-1 flex flex-col gap-0.5">
          {criteria.map((criterion) => {
            const meta = metaFor(criterion, lang);
            return (
              <div key={criterion} className="px-3 py-1.5">
                <div className="flex items-center gap-2.5">
                  <CriterionMark criterion={criterion} className="opacity-45" />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3">{meta.label}</span>
                  <span className="tabular-nums text-[12px] text-ink-dim">0</span>
                </div>
                <span className="mt-0.5 block pl-6.5 text-[11px] leading-relaxed text-ink-dim">
                  {criterion === "vocabulario_da_organizacao"
                    ? c.revisionList.zeroDeclared(declaredTerms)
                    : coverageOf(criterion) === "curated"
                      ? c.revisionList.zeroCurated
                      : c.revisionList.zeroProductive}
                </span>
              </div>
            );
          })}
          <p className="px-3 pt-1.5 text-[11px] italic leading-relaxed text-ink-3">{c.revisionList.absenceCaveat}</p>
        </div>
      )}
    </div>
  );
}
