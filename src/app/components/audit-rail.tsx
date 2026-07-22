"use client";

import type { Diagnostic, Finding, Span, SplitPoint } from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import { AuditOverview } from "./audit-overview";
import { RevisionList, type Bucket } from "./revision-list";
import { RevisionNote } from "./revision-note";
import { ProbePanel } from "./probe-panel";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";

export interface RailProps {
  diagnostic: Diagnostic;
  text: string;
  findings: readonly Finding[];
  selectedFinding: Finding | null;
  selectedId: string | null;
  index: number;
  total: number;
  safeCount: number;
  humanCount: number;
  activeCriteria: ReadonlySet<string>;
  bucket: Bucket;
  onToggleCriterion: (criterion: string) => void;
  onBucket: (b: Bucket) => void;
  onSelect: (finding: Finding) => void;
  onApplyAllSafe: () => void;
  onApply: (finding: Finding) => void;
  onSplit: (point: SplitPoint) => void;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onPassiveActive: (target: Span, replacement: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function AuditRail(props: RailProps) {
  return (
    <aside
      aria-label="Auditoria"
      className="hidden w-99 shrink-0 flex-col border-l border-rule-1 bg-surface lg:flex xl:w-110"
    >
      {props.selectedFinding ? (
        <>
          <NoteNav index={props.index} total={props.total} onPrev={props.onPrev} onNext={props.onNext} onClose={props.onClose} />
          <div key={props.selectedId ?? "note"} className="min-h-0 flex-1 overflow-y-auto">
            <RevisionNote
              finding={props.selectedFinding}
              source={props.diagnostic.text}
              onApply={props.onApply}
              onSplit={props.onSplit}
              onApplyRewrite={props.onApplyRewrite}
              onPassiveActive={props.onPassiveActive}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-12 shrink-0 items-center border-b border-rule-1 px-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Auditoria</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AuditOverview
              diagnostic={props.diagnostic}
              findings={props.findings}
              safeCount={props.safeCount}
              humanCount={props.humanCount}
              activeCriteria={props.activeCriteria}
              onToggleCriterion={props.onToggleCriterion}
              onApplyAllSafe={props.onApplyAllSafe}
            />
            <RevisionList
              findings={props.findings}
              selectedId={props.selectedId}
              bucket={props.bucket}
              safeCount={props.safeCount}
              humanCount={props.humanCount}
              onBucket={props.onBucket}
              onSelect={props.onSelect}
            />
            <ProbePanel text={props.text} />
          </div>
        </>
      )}
      <RailFooter diagnostic={props.diagnostic} />
    </aside>
  );
}

export function NoteNav({
  index,
  total,
  onPrev,
  onNext,
  onClose,
}: {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-rule-1 px-3">
      <div className="flex items-center gap-0.5">
        <IconBtn label="Anterior (k)" onClick={onPrev}>
          <ChevronLeftIcon className="size-4" />
        </IconBtn>
        <span className="min-w-14 text-center text-[12px] tabular-nums text-ink-2">
          {index} <span className="text-ink-3">de</span> {total}
        </span>
        <IconBtn label="Próximo (j)" onClick={onNext}>
          <ChevronRightIcon className="size-4" />
        </IconBtn>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
      >
        <CloseIcon className="size-3.5" />
        Fechar
      </button>
    </div>
  );
}

export function RailFooter({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-rule-1 px-6 py-3 text-[11px] text-ink-3">
      <span className="inline-flex items-center gap-1.5 text-ink-2">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden />
        Análise determinística
      </span>
      <span aria-hidden>·</span>
      <span
        className="truncate"
        title={`config ${diagnostic.meta.configHash} · lucid ${diagnostic.meta.lucidVersion}`}
      >
        {diagnostic.meta.standardVersion}
      </span>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
    >
      {children}
    </button>
  );
}
