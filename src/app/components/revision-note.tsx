"use client";

import { useRef, useState } from "react";
import { type Finding, type Span } from "@/lucid";
import type { AgentDeclaration, RewriteProposal, VerifiedRewrite } from "@/report/rewrite";
import { isSafe, metaFor, principleGroupLabel, provenanceLabel, severityInkVar, severityLabel } from "../lib/criteria";
import { buildConfidence, detectedProse, detectionHeadline } from "../lib/narrative";
import { rewriteTargetAt } from "../lib/paragraphs";
import { isManualEditDirty, manualEditReplacement } from "../lib/text-edit";
import { generateRewrite, REWRITE_MODELS, verifyManualEdit } from "../lib/rewrite";
import { SendNotice } from "./send-notice";
import { useCopy } from "../i18n/use-copy";
import { ArrowDownIcon, CheckIcon, ChevronDownIcon, PenNibIcon, WandIcon } from "./icons";
import { Guidance } from "./revision-note-guidance";

export const APPLY_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg border border-human-line bg-human-weak px-3.5 py-2 text-[13px] font-semibold text-human transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--human)_14%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-human-weak";

export interface RevisionNoteProps {
  finding: Finding;
  source: string;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onManualEdit: (target: Span, replacement: string) => void;
}

export function RevisionNote({ finding, source, onApplyRewrite, onManualEdit }: RevisionNoteProps) {
  const { c, lang } = useCopy();
  const meta = metaFor(finding.criterion, lang);
  const ink = severityInkVar(finding.severity);
  const safe = isSafe(finding);
  const group = principleGroupLabel(finding.principleGroup, lang);

  const [declaration, setDeclaration] = useState<AgentDeclaration | null>(null);

  return (
    <div className="note-in flex flex-col px-4 py-6">
      <div className="flex items-center gap-2 text-[11.5px]">
        <span className="u-label text-ink-3">{meta.kind}</span>
        <span className="text-ink-3">·</span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span className="size-1.75 rounded-full" style={{ background: ink }} aria-hidden />
          {severityLabel(finding.severity, lang)}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[23px] leading-[1.2] text-ink-0">{detectionHeadline(finding, lang)}</h3>

      <p className="mt-2 text-[12.5px] text-ink-2">
        <span className="text-ink-1">{group}</span> · {meta.principleName}
        <span className="ml-2 rounded-[5px] border border-rule-1 bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
          {provenanceLabel(finding, lang)}
        </span>
      </p>

      <Block label={c.note.excerpt}>
        <Excerpt finding={finding} ink={ink} channelClass={meta.channel === "inline" ? `mark ${meta.markStyleClass}` : "passage"} />
      </Block>

      <Block label={c.note.whatWeFound}>
        <Prose>{detectedProse(finding, lang)}</Prose>
      </Block>

      <div className="mt-7">
        {safe ? (
          <SafeEquivalent finding={finding} />
        ) : (
          <HumanDecision
            finding={finding}
            source={source}
            declaration={declaration}
            onDeclare={setDeclaration}
            onApplyRewrite={onApplyRewrite}
          />
        )}
      </div>

      <ManualEdit finding={finding} source={source} declaration={declaration} onManualEdit={onManualEdit} />

      <Disclosure label={c.note.understandCriterion}>
        <Prose>{meta.why}</Prose>
        <EngineJustification finding={finding} />
      </Disclosure>
    </div>
  );
}

function Excerpt({ finding, ink, channelClass }: { finding: Finding; ink: string; channelClass: string }) {
  const { c } = useCopy();
  const [full, setFull] = useState(false);
  const text = finding.span.text.replace(/\s+/g, " ").trim();
  const long = text.length > 260;

  return (
    <>
      <blockquote className="border-l-2 pl-4" style={{ borderColor: ink }}>
        <span className={`font-serif text-[17px] leading-snug text-ink-0 ${long && !full ? "line-clamp-4" : "block"}`}>
          <span className={channelClass} style={{ "--mark-ink": ink } as React.CSSProperties}>
            {text}
          </span>
        </span>
      </blockquote>
      {long && (
        <button
          type="button"
          aria-expanded={full}
          onClick={() => setFull(!full)}
          className="mt-1.5 rounded-md text-[11.5px] text-accent transition-colors duration-150 hover:underline"
        >
          {full ? c.note.excerptLess : c.note.excerptMore}
        </button>
      )}
    </>
  );
}

function Disclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-5 border-t border-rule-1 pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-inset row-hit flex w-full items-center gap-2 rounded-md py-1 text-left"
      >
        <ChevronDownIcon
          className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
        <span className="u-sublabel text-ink-3">{label}</span>
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function ManualEdit({
  finding,
  source,
  declaration,
  onManualEdit,
}: {
  finding: Finding;
  source: string;
  declaration: AgentDeclaration | null;
  onManualEdit: (target: Span, replacement: string) => void;
}) {
  const { c, lang } = useCopy();
  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? c.note.manualUnitSentence : c.note.manualUnitParagraph;
  const original = target.text;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(original);
  const [verified, setVerified] = useState<{ result: VerifiedRewrite; forDeclaration: AgentDeclaration | null } | null>(
    null,
  );
  const [checking, setChecking] = useState(false);
  const result = verified !== null && verified.forDeclaration === declaration ? verified.result : null;
  const setResult = (r: VerifiedRewrite | null) =>
    setVerified(r === null ? null : { result: r, forDeclaration: declaration });

  const dirty = isManualEditDirty(original, draft);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(original);
          setResult(null);
          setOpen(true);
        }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-rule-2 px-3.5 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
      >
        <PenNibIcon className="size-3.5" />
        {c.note.manualOpen}
      </button>
    );
  }

  const check = async () => {
    setChecking(true);
    try {
      setResult(
        await verifyManualEdit(source, target, draft, finding.criterion, declaration ? [declaration] : undefined, lang),
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-rule-1 bg-sheet">
      <div className="flex items-center justify-between border-b border-rule-1 px-3.5 py-2.5">
        <span className="u-sublabel text-ink-3">
          {c.note.manualTitle} · {unitLabel}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2"
        >
          {c.common.close}
        </button>
      </div>
      <div className="px-3.5 py-3">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setResult(null);
          }}
          spellCheck={false}
          aria-label={c.note.manualEditAria(unitLabel)}
          className="block max-h-[46vh] min-h-28 w-full resize-y rounded-lg border border-rule-2 bg-surface-2/40 px-3 py-2.5 font-serif text-[14.5px] leading-snug text-ink-0 outline-none transition-colors focus:border-human-line"
          style={{ caretColor: "var(--accent)" }}
        />
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            disabled={!dirty || checking}
            onClick={check}
            className={APPLY_BUTTON_CLASS}
          >
            {checking ? c.note.manualVerifying : c.note.manualVerify}
          </button>
          <button
            type="button"
            disabled={draft === original}
            onClick={() => {
              setDraft(original);
              setResult(null);
            }}
            className="rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {c.common.restore}
          </button>
        </div>

        {result !== null && (
          <RewriteResult
            result={result}
            currentOriginal={target.text}
            onApplyRewrite={() => onManualEdit(target, manualEditReplacement(draft))}
          />
        )}

        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.note.manualNote}</p>
      </div>
    </div>
  );
}

function SafeEquivalent({ finding }: { finding: Finding }) {
  const { c, lang } = useCopy();
  const [copied, setCopied] = useState(false);
  const before = finding.span.text.replace(/\s+/g, " ").trim();
  const after = finding.suggestion!;
  const rationale = buildConfidence(finding, lang).rationale;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(after);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-safe-line bg-safe-weak">
      <div className="flex items-center gap-2 px-3 pt-3.5 text-[12.5px] font-semibold text-safe">
        <CheckIcon className="size-4" />
        {c.note.safeHeader}
      </div>

      <div className="px-3 py-3">
        <div className="rounded-lg border border-rule-1 bg-sheet shadow-(--shadow-card)">
          <DiffRow label={c.note.safeTerm}>
            <span className="font-serif text-[15.5px] text-ink-2 line-through decoration-ink-3">{before}</span>
          </DiffRow>
          <div className="flex items-center gap-2 border-t border-rule-1 px-3.5 py-1">
            <ArrowDownIcon className="size-3.5 text-safe" />
            <span className="u-sublabel text-ink-3">{c.note.safeEquivalent}</span>
          </div>
          <DiffRow label={c.note.safePlain} tone="safe">
            <span className="font-serif text-[15.5px] font-medium text-ink-0">{after}</span>
          </DiffRow>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2"
          >
            {copied ? c.common.copied : c.common.copy}
          </button>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-ink-2">{rationale}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.note.safeNote}</p>
      </div>
    </div>
  );
}

function DiffRow({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "safe";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2.5">
      <span className={`u-sublabel w-12 shrink-0 ${tone === "safe" ? "text-safe" : "text-ink-3"}`}>
        {label}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function HumanDecision({
  finding,
  source,
  declaration,
  onDeclare,
  onApplyRewrite,
}: {
  finding: Finding;
  source: string;
  declaration: AgentDeclaration | null;
  onDeclare: (d: AgentDeclaration | null) => void;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
}) {
  const { c, lang } = useCopy();
  const rationale = buildConfidence(finding, lang).rationale;
  return (
    <div className="overflow-hidden rounded-xl border border-human-line border-l-[3px] border-l-human bg-human-weak">
      <div className="flex items-center gap-2 px-3 pt-3.5 text-[12.5px] font-semibold text-human">
        <PenNibIcon className="size-4" />
        {c.note.humanHeader}
      </div>
      <div className="px-3 py-3">
        <p className="text-[12.5px] leading-relaxed text-ink-1">
          {c.note.humanLead}
          <span className="text-ink-0">{c.note.humanLeadStrong}</span>.
        </p>
        <Disclosure label={c.note.howToProceed}>
          <p className="text-[12px] leading-relaxed text-ink-2">{rationale}</p>
          <div className="mt-3">
            <Guidance finding={finding} source={source} declaration={declaration} onDeclare={onDeclare} />
          </div>
        </Disclosure>

        <GeneratedRewrite finding={finding} source={source} declaration={declaration} onApplyRewrite={onApplyRewrite} />
      </div>
    </div>
  );
}

function GeneratedRewrite({
  finding,
  source,
  declaration,
  onApplyRewrite,
}: {
  finding: Finding;
  source: string;
  declaration: AgentDeclaration | null;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
}) {
  const { c } = useCopy();
  const choice = REWRITE_MODELS[0];
  const [directed, setDirected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifiedRewrite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [prevDeclaration, setPrevDeclaration] = useState<AgentDeclaration | null>(declaration);
  if (declaration !== prevDeclaration) {
    setPrevDeclaration(declaration);
    if (declaration) setDirected(true);
    setResult(null);
  }

  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? c.note.manualUnitSentence : c.note.manualUnitParagraph;

  const run = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        await generateRewrite(source, target, choice, {
          criterion: finding.criterion,
          directed,
          declarations: declaration ? [declaration] : undefined,
          signal: controller.signal,
        }),
      );
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : c.note.aiFailedGeneric);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const cancel = () => abortRef.current?.abort();

  const hasProposal = result !== null && result.proposal.proposed !== result.proposal.original;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-rule-2 bg-sheet shadow-(--shadow-card)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-inset row-hit flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <ChevronDownIcon
          className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
        <WandIcon className="size-4 shrink-0 text-accent" />
        <span className="u-sublabel text-ink-1">{c.note.aiTitle}</span>
      </button>
      {open && (
        <div className="border-t border-rule-1 px-3 pt-3 pb-3.5">
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-1">
            {c.note.aiTarget(unitLabel)}
          </p>

          {choice.providerId !== "stub" && <SendNotice text={source} />}

          {loading && (
            <div className="mt-3.5">
              <div className="progress-track" aria-hidden>
                <div className="progress-sweep" />
              </div>
              <p role="status" className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
                {c.note.aiRunning}
              </p>
            </div>
          )}

          <div className="mt-3.5 flex items-center justify-end gap-2">
            {loading && (
              <button
                type="button"
                onClick={cancel}
                className="inline-flex h-9 shrink-0 items-center rounded-lg border border-rule-2 px-3.5 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2"
              >
                {c.common.cancel}
              </button>
            )}
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-accent-ink shadow-(--shadow-card) transition-colors duration-150 hover:bg-accent-strong disabled:opacity-60"
            >
              {c.note.aiRun}
            </button>
          </div>

          {error !== null && (
            <p className="mt-3 rounded-lg border border-human-line bg-human-weak px-3 py-2.5 text-[12px] leading-relaxed text-ink-1">
              {c.note.aiFailed(error)}
            </p>
          )}

          {result !== null &&
            (hasProposal ? (
              <RewriteResult
                result={result}
                currentOriginal={target.text}
                onApplyRewrite={() => onApplyRewrite(target, result.proposal)}
              />
            ) : (
              <p className="mt-3 rounded-lg border border-rule-1 bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
                {c.note.aiNoProposal}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

function RewriteResult({
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
                ? { background: "var(--human-weak)", color: "var(--human)", boxShadow: "inset 0 0 0 1px var(--human-line)" }
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
  const tone = ok ? (kind === "proof" ? "text-safe" : "text-ink-3") : kind === "proof" ? "text-sev-error" : "text-human";
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

function EngineJustification({ finding }: { finding: Finding }) {
  const { c, lang } = useCopy();
  if (lang === "pt-BR") return <Prose className="mt-2 text-ink-2">{finding.justification}</Prose>;
  return (
    <div className="mt-3 rounded-lg border border-rule-1 bg-surface-2/50 px-3 py-2.5">
      <p className="u-sublabel text-ink-3" title={c.note.engineOutputHint}>
        {c.note.engineOutput}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2" lang="pt-BR">
        {finding.justification}
      </p>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="u-sublabel mb-2 text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[13.5px] leading-relaxed text-ink-1 ${className ?? ""}`}>{children}</p>;
}
