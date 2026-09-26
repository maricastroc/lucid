"use client";

import { useState } from "react";
import type { VerifiedRewrite } from "@/report/rewrite";
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
  const blocked = verification.hasBlockingFailure;

  const stale = proposal.original !== currentOriginal;
  const { readabilityBefore, readabilityAfter } = verification.metrics;
  const dFlesch = readabilityBefore === null || readabilityAfter === null ? null : readabilityAfter - readabilityBefore;
  const dWords = verification.metrics.wordsAfter - verification.metrics.wordsBefore;
  const passed = verification.proofs.filter((p) => p.passed).length;
  const failed = verification.proofs.filter((p) => !p.passed);
  const flagged = verification.signals.filter((s) => s.flagged);
  const proofIssues = failed.length > 0 || verification.notices.length > 0;
  const suffix = engineOutputSuffix(lang, locale.id);
  const [showChecks, setShowChecks] = useState(false);

  return (
    <div className="-mx-3 mt-3.5 border-t border-rule-1">
      <div
        className="px-3 py-3.5"
        style={{
          borderBottom: "1px solid var(--rule-1)",
          background: blocked ? "var(--human-weak)" : "var(--safe-weak)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="u-sublabel" style={{ color: blocked ? "var(--human)" : "var(--safe)" }}>
            {c.note.verdictLabel}
          </span>
          <span className="tabular-nums text-[11px] text-ink-3">
            {c.note.verdictProofs(passed, verification.proofs.length)}
          </span>
        </div>
        <p className="mt-1.5 font-serif text-[19px] leading-tight text-ink-0">
          {blocked ? c.note.verdictBlocked : c.note.verdictClear}
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

      {(proofIssues || flagged.length > 0) && (
        <div className="flex flex-col gap-3 border-b border-rule-1 px-3 py-3">
          {proofIssues && (
            <CheckGroup label={`${c.note.proofLabel}${suffix}`}>
              {failed.map((p) => (
                <CheckLine key={p.check} ok={false} kind="proof" detail={p.detail} />
              ))}
              {verification.notices.map((n) => (
                <CheckLine key={n.check} ok={false} kind="notice" detail={n.detail} />
              ))}
            </CheckGroup>
          )}
          {flagged.length > 0 && (
            <CheckGroup label={`${c.note.signalLabel}${suffix}`}>
              {flagged.map((s) => (
                <CheckLine key={s.check} ok={false} kind="signal" detail={s.detail} />
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

        <div className="mt-3">
          <Button variant={blocked ? "tonal-human" : "primary"} size="lg" disabled={stale} onClick={onApplyRewrite}>
            {stale ? c.note.applyStale : blocked ? c.note.applyBlocked : c.note.apply}
          </Button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            {stale ? c.note.applyStaleNote : blocked ? c.note.applyBlockedNote : c.note.applyNote}
          </p>
        </div>
      </div>

      <div className="border-t border-rule-1 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={showChecks}
          onClick={() => setShowChecks(!showChecks)}
          className="rounded-md text-[11.5px] text-accent transition-colors duration-150 hover:underline"
        >
          {showChecks ? c.note.checksHide : c.note.checksShow(verification.proofs.length, verification.signals.length)}
        </button>
        {showChecks && (
          <div className="mt-3 flex flex-col gap-3 pb-0.5">
            <CheckGroup label={`${c.note.proofLabel}${suffix}`}>
              {verification.proofs.map((p) => (
                <CheckLine key={p.check} ok={p.passed} kind="proof" detail={p.detail} />
              ))}
            </CheckGroup>
            {verification.signals.length > 0 && (
              <CheckGroup label={`${c.note.signalLabel}${suffix}`}>
                {verification.signals.map((s) => (
                  <CheckLine key={s.check} ok={!s.flagged} kind="signal" detail={s.detail} />
                ))}
              </CheckGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDelta(n: number, digits: number): string {
  const s = digits > 0 ? n.toFixed(digits) : String(Math.round(n));
  return n >= 0 ? `+${s}` : s;
}

function CheckGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="u-sublabel mb-2 text-ink-3">{label}</p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function CheckLine({ ok, kind, detail }: { ok: boolean; kind: "proof" | "signal" | "notice"; detail: string }) {
  const mark = ok ? (kind === "proof" ? "✓" : "○") : kind === "proof" ? "✗" : "⚠";
  const tone = ok
    ? kind === "proof"
      ? "text-safe"
      : "text-ink-3"
    : kind === "proof"
      ? "text-sev-error"
      : "text-human";
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
