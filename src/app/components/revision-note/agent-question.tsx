"use client";

import { useState } from "react";
import type { Finding } from "@/lucid";
import type { AgentDeclaration } from "@/report/rewrite";
import { passiveScaffold } from "@/locales/pt-BR";
import { useCopy } from "../../i18n/use-copy";
import { Checkbox } from "../ui/checkbox";

export function asksForAgent(finding: Finding, source: string): boolean {
  return (
    finding.criterion === "passive_voice" &&
    finding.meta?.hasAgent !== true &&
    passiveScaffold(finding, source) === null
  );
}

export function AgentQuestion({
  finding,
  declaration,
  onDeclare,
}: {
  finding: Finding;
  declaration: AgentDeclaration | null;
  onDeclare: (d: AgentDeclaration | null) => void;
}) {
  const { c } = useCopy();
  const g = c.guidance;
  const [raw, setRaw] = useState(declaration?.agent ?? "");
  const keep = declaration !== null && declaration.agent === null;

  const emit = (nextRaw: string, nextKeep: boolean) => {
    if (nextKeep) {
      onDeclare({ span: finding.span, agent: null });
      return;
    }
    const agent = nextRaw.trim();
    onDeclare(agent.length > 0 ? { span: finding.span, agent } : null);
  };

  return (
    <div className="mt-3.5">
      <label className="u-sublabel block text-ink-3" htmlFor="agent-declaration">
        {g.agentQuestion}
      </label>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{g.agentQuestionHint}</p>
      <input
        id="agent-declaration"
        value={keep ? "" : raw}
        disabled={keep}
        onChange={(e) => {
          setRaw(e.target.value);
          emit(e.target.value, false);
        }}
        placeholder={g.agentPlaceholder}
        className="mt-1.5 w-full rounded-lg border border-rule-2 bg-sheet px-3 py-2 font-serif text-[14px] text-ink-0 shadow-(--shadow-card) outline-none transition-colors focus:border-human-line disabled:opacity-50"
      />
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
        <Checkbox checked={keep} onCheckedChange={(c) => emit(raw, c === true)} />
        {g.agentKeepImpersonal}
      </label>
      {declaration && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
          {keep ? g.agentRecordedKeep : g.agentRecorded(declaration.agent ?? "")}
        </p>
      )}
    </div>
  );
}
