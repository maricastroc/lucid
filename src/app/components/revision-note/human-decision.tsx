"use client";

import { isCriterionId, type Finding, type Span } from "@/lucid";
import type { AgentDeclaration, RewriteProposal } from "@/report/rewrite";
import { buildConfidence } from "../../lib/narrative";
import { useCopy } from "../../i18n/use-copy";
import { PenNibIcon } from "../icons";
import { Guidance } from "../revision-note-guidance";
import { AiRewritePanel } from "./ai-rewrite-panel";
import { Disclosure } from "./note-disclosure";

export function HumanDecision({
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
  const humanLead = isCriterionId(finding.criterion) ? c.note.humanLeadByCriterion[finding.criterion] : undefined;
  return (
    <div className="overflow-hidden rounded-xl border border-human-line border-l-[3px] border-l-human bg-human-weak">
      <div className="flex items-center gap-2 px-3 pt-3.5 text-[12.5px] font-semibold text-human">
        <PenNibIcon className="size-4" />
        {c.note.humanHeader}
      </div>
      <div className="px-3 py-3">
        <p className="text-[12.5px] leading-relaxed text-ink-1">
          {humanLead ?? c.note.humanLead}
        </p>
        <Disclosure label={c.note.howToProceed}>
          <p className="text-[12px] leading-relaxed text-ink-2">{rationale}</p>
          <div className="mt-3">
            <Guidance finding={finding} source={source} declaration={declaration} onDeclare={onDeclare} />
          </div>
        </Disclosure>

        <AiRewritePanel finding={finding} source={source} declaration={declaration} onApplyRewrite={onApplyRewrite} />
      </div>
    </div>
  );
}
