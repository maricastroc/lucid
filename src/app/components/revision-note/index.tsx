"use client";

import { useState } from "react";
import type { Finding, Span } from "@/lucid";
import type { AgentDeclaration, RewriteProposal } from "@/report/rewrite";
import {
  isSafe,
  metaFor,
  principleGroupLabel,
  provenanceLabel,
  severityInkVar,
  severityLabel,
} from "../../lib/criteria";
import { detectedProse, detectionHeadline } from "../../lib/narrative";
import { matchLeadingCase } from "../../lib/text-edit";
import { useCopy } from "../../i18n/use-copy";
import { CuratedEquivalent } from "./curated-equivalent";
import { HumanDecision } from "./human-decision";
import { ManualEditForm } from "./manual-edit-form";
import { Disclosure } from "./note-disclosure";

export interface RevisionNoteProps {
  finding: Finding;
  source: string;
  allFindings: readonly Finding[];
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onManualEdit: (target: Span, replacement: string) => void;
  onApplyCuratedSwap: (target: Span, replacement: string) => void;
}

export function RevisionNote({
  finding,
  source,
  allFindings,
  onApplyRewrite,
  onManualEdit,
  onApplyCuratedSwap,
}: RevisionNoteProps) {
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
        <Excerpt
          finding={finding}
          ink={ink}
          channelClass={meta.channel === "inline" ? `mark ${meta.markStyleClass}` : "passage"}
        />
      </Block>

      <Block label={c.note.whatWeFound}>
        <Prose>{detectedProse(finding, lang)}</Prose>
      </Block>

      <div className="mt-7">
        {safe ? (
          <CuratedEquivalent
            finding={finding}
            onApply={() => onApplyCuratedSwap(finding.span, matchLeadingCase(finding.span.text, finding.suggestion!))}
          />
        ) : (
          <HumanDecision
            finding={finding}
            source={source}
            allFindings={allFindings}
            declaration={declaration}
            onDeclare={setDeclaration}
            onApplyRewrite={onApplyRewrite}
          />
        )}
      </div>

      <ManualEditForm finding={finding} source={source} declaration={declaration} onManualEdit={onManualEdit} />

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
