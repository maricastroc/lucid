"use client";

import type { VerifiedRewrite } from "@/report/rewrite";
import { useCopy } from "../../i18n/use-copy";

export function RewriteProposalCard({
  result,
  currentOriginal,
  onApplyRewrite,
}: {
  result: VerifiedRewrite;
  currentOriginal: string;
  onApplyRewrite: () => void;
}) {
  const { c } = useCopy();
  const { proposal, verification } = result;
  const blocked = verification.hasBlockingFailure;

  const stale = proposal.original !== currentOriginal;
  const { fleschPtBefore, fleschPtAfter } = verification.metrics;
  const dFlesch = fleschPtBefore === null || fleschPtAfter === null ? null : fleschPtAfter - fleschPtBefore;
  const dWords = verification.metrics.wordsAfter - verification.metrics.wordsBefore;
  const passed = verification.proofs.filter((p) => p.passed).length;

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

      <div className="px-3 py-3">
        <p className="u-sublabel mb-2 text-ink-3">
          {c.note.proofLabel}
          {c.common.engineOutputSuffix}
        </p>
        <ul className="flex flex-col gap-1.5">
          {verification.proofs.map((p) => (
            <CheckLine key={p.check} ok={p.passed} kind="proof" detail={p.detail} />
          ))}
        </ul>
      </div>

      {verification.signals.length > 0 && (
        <div className="border-t border-rule-1 px-3 py-3">
          <p className="u-sublabel mb-2 text-ink-3">
            {c.note.signalLabel}
            {c.common.engineOutputSuffix}
          </p>
          <ul className="flex flex-col gap-1.5">
            {verification.signals.map((s) => (
              <CheckLine key={s.check} ok={!s.flagged} kind="signal" detail={s.detail} />
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-rule-1 px-3 py-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="u-sublabel text-ink-3">{c.note.evaluatedExcerpt}</p>
          <span className="font-mono text-[10px] text-ink-3" title={c.note.proposerTitle}>
            {proposal.proposerId}
          </span>
        </div>
        <p className="font-serif text-[14.5px] leading-snug text-ink-1">{proposal.proposed}</p>

        <div className="mt-3">
          <button
            type="button"
            onClick={onApplyRewrite}
            disabled={stale}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={
              blocked
                ? {
                    background: "var(--human-weak)",
                    color: "var(--human)",
                    boxShadow: "inset 0 0 0 1px var(--human-line)",
                  }
                : { background: "var(--accent)", color: "var(--accent-ink)" }
            }
          >
            {stale ? c.note.applyStale : blocked ? c.note.applyBlocked : c.note.apply}
          </button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            {stale ? c.note.applyStaleNote : blocked ? c.note.applyBlockedNote : c.note.applyNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function fmtDelta(n: number, digits: number): string {
  const s = digits > 0 ? n.toFixed(digits) : String(Math.round(n));
  return n >= 0 ? `+${s}` : s;
}

function CheckLine({ ok, kind, detail }: { ok: boolean; kind: "proof" | "signal"; detail: string }) {
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
