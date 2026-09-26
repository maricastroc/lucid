"use client";

import { useState } from "react";
import { needsAuthorDecision, NOT_VERIFIED, PROOF_CHECKS, type Proof, type VerifiedRewrite } from "@/report/rewrite";
import { useCopy } from "../../i18n/use-copy";
import { Button } from "../ui/button";
import { useAnalysisLocale } from "../../locale/context";
import { engineOutputSuffix } from "../../locale/language";

export function RewriteProposalCard({
  result,
  currentOriginal,
  onApplyRewrite,
}: {
  result: VerifiedRewrite;
  currentOriginal: string;
  onApplyRewrite: () => void;
}) {
  const { c, lang } = useCopy();
  const locale = useAnalysisLocale();
  const { proposal, verification } = result;

  const stale = proposal.original !== currentOriginal;
  const { readabilityBefore, readabilityAfter } = verification.metrics;
  const dFlesch = readabilityBefore === null || readabilityAfter === null ? null : readabilityAfter - readabilityBefore;
  const dWords = verification.metrics.wordsAfter - verification.metrics.wordsBefore;

  const proofs = verification.proofs;
  const guarantee = (p: Proof) => PROOF_CHECKS[p.check].kind === "guarantee";
  const notConfirmed = proofs.filter((p) => guarantee(p) && p.outcome === "not_confirmed");
  const additions = proofs.filter((p) => guarantee(p) && p.outcome === "addition");
  const confirmed = proofs.filter((p) => guarantee(p) && p.outcome === "confirmed");
  const notApplicable = proofs.filter((p) => guarantee(p) && p.outcome === "not_applicable");
  const effectMissed = proofs.filter((p) => !guarantee(p) && !p.passed);
  const effectReached = proofs.filter((p) => !guarantee(p) && p.passed);
  const flagged = verification.signals.filter((s) => s.flagged);
  const quiet = verification.signals.filter((s) => !s.flagged);
  const divergent = needsAuthorDecision(verification);
  const effectIssues = effectMissed.length + verification.notices.length > 0;
  const hiddenCount = notApplicable.length + effectReached.length + quiet.length;
  const suffix = engineOutputSuffix(lang, locale.id);
  const [showChecks, setShowChecks] = useState(false);

  return (
    <div className="-mx-3 mt-3.5 border-t border-rule-1">
      <div
        className="px-3 py-3.5"
        style={{
          borderBottom: "1px solid var(--rule-1)",
          background: divergent ? "var(--human-weak)" : undefined,
        }}
      >
        <span className="u-sublabel" style={{ color: divergent ? "var(--human)" : "var(--ink-3)" }}>
          {c.note.verdictLabel}
        </span>
        <p className="mt-1.5 font-serif text-[19px] leading-tight text-ink-0">
          {divergent
            ? c.note.verdictDivergent
            : effectMissed.length > 0
              ? c.note.verdictEffect
              : c.note.verdictNoDivergence}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-2">
          <span>
            Flesch-PT <span className="tabular-nums text-ink-1">{dFlesch === null ? "—" : fmtDelta(dFlesch, 1)}</span>
          </span>
          <span className="text-ink-3">·</span>
          <span>
            {c.note.verdictWords} <span className="tabular-nums text-ink-1">{fmtDelta(dWords, 0)}</span>
          </span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">{c.note.verdictMeasureNotApproval}</span>
        </div>
      </div>

      {(divergent || effectIssues || flagged.length > 0) && (
        <div className="flex flex-col gap-3 border-b border-rule-1 px-3 py-3">
          {notConfirmed.length > 0 && (
            <CheckGroup label={`${c.note.groupNotConfirmed}${suffix}`}>
              {notConfirmed.map((p) => (
                <CheckLine key={p.check} mark="✗" tone="text-human" detail={p.detail} />
              ))}
            </CheckGroup>
          )}
          {additions.length > 0 && (
            <CheckGroup label={`${c.note.groupAddition}${suffix}`}>
              {additions.map((p) => (
                <CheckLine key={p.check} mark="+" tone="text-human" detail={p.detail} />
              ))}
            </CheckGroup>
          )}
          {effectIssues && (
            <CheckGroup label={`${c.note.groupEffect}${suffix}`}>
              {effectMissed.map((p) => (
                <CheckLine key={p.check} mark="•" tone="text-ink-3" detail={p.detail} />
              ))}
              {verification.notices.map((n) => (
                <CheckLine key={n.check} mark="⚠" tone="text-human" detail={n.detail} />
              ))}
            </CheckGroup>
          )}
          {flagged.length > 0 && (
            <CheckGroup label={`${c.note.groupSignals}${suffix}`}>
              {flagged.map((s) => (
                <CheckLine key={s.check} mark="⚠" tone="text-human" detail={s.detail} />
              ))}
            </CheckGroup>
          )}
        </div>
      )}

      <div className="px-3 py-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="u-sublabel text-ink-3">{c.note.evaluatedExcerpt}</p>
          <span className="font-mono text-[10px] text-ink-3" title={c.note.proposerTitle}>
            {proposal.proposerId}
          </span>
        </div>
        <p className="font-serif text-[14.5px] leading-snug text-ink-1">{proposal.proposed}</p>

        <div className="mt-3 flex flex-col gap-3">
          {confirmed.length > 0 && (
            <CheckGroup label={`${c.note.groupConfirmed}${suffix}`}>
              {confirmed.map((p) => (
                <CheckLine key={p.check} mark="✓" tone="text-safe" detail={p.detail} />
              ))}
            </CheckGroup>
          )}
          <div role="group" aria-label={`${c.note.groupNotVerified}${suffix}`}>
            <p className="u-sublabel mb-2 text-ink-3">{`${c.note.groupNotVerified}${suffix}`}</p>
            <p className="text-[12px] leading-relaxed text-ink-2">
              {c.note.notVerifiedLead}: <span lang="pt-BR">{NOT_VERIFIED.map((d) => d.what).join("; ")}</span>.
            </p>
          </div>
        </div>

        <div className="mt-3">
          <Button variant={divergent ? "tonal-human" : "primary"} size="lg" disabled={stale} onClick={onApplyRewrite}>
            {stale ? c.note.applyStale : divergent ? c.note.applyBlocked : c.note.apply}
          </Button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            {stale ? c.note.applyStaleNote : divergent ? c.note.applyBlockedNote : c.note.applyNote}
          </p>
        </div>
      </div>

      {hiddenCount > 0 && (
        <div className="border-t border-rule-1 px-3 py-2.5">
          <button
            type="button"
            aria-expanded={showChecks}
            onClick={() => setShowChecks(!showChecks)}
            className="rounded-md text-[11.5px] text-accent transition-colors duration-150 hover:underline"
          >
            {showChecks ? c.note.checksHide : c.note.checksShow(hiddenCount)}
          </button>
          {showChecks && (
            <div className="mt-3 flex flex-col gap-3 pb-0.5">
              {notApplicable.length > 0 && (
                <CheckGroup label={`${c.note.groupNotApplicable}${suffix}`}>
                  {notApplicable.map((p) => (
                    <CheckLine key={p.check} mark="–" tone="text-ink-3" detail={p.detail} />
                  ))}
                </CheckGroup>
              )}
              {effectReached.length > 0 && (
                <CheckGroup label={`${c.note.groupEffect}${suffix}`}>
                  {effectReached.map((p) => (
                    <CheckLine key={p.check} mark="✓" tone="text-safe" detail={p.detail} />
                  ))}
                </CheckGroup>
              )}
              {quiet.length > 0 && (
                <CheckGroup label={`${c.note.groupSignals}${suffix}`}>
                  {quiet.map((s) => (
                    <CheckLine key={s.check} mark="○" tone="text-ink-3" detail={s.detail} />
                  ))}
                </CheckGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtDelta(n: number, digits: number): string {
  const s = digits > 0 ? n.toFixed(digits) : String(Math.round(n));
  return n >= 0 ? `+${s}` : s;
}

function CheckGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="u-sublabel mb-2 text-ink-3">{label}</p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function CheckLine({ mark, tone, detail }: { mark: string; tone: string; detail: string }) {
  return (
    <li className="flex items-baseline gap-2 text-[12px] leading-relaxed">
      <span className={`shrink-0 font-semibold ${tone}`} aria-hidden>
        {mark}
      </span>
      <span className="text-ink-2" lang="pt-BR">
        {detail}
      </span>
    </li>
  );
}
