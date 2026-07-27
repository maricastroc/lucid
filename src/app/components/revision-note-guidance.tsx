"use client";

import { useState, type ReactNode } from "react";
import { isCriterionId, passiveScaffold, type Finding, type SplitPoint } from "@/lucid";
import type { AgentDeclaration } from "@/report/rewrite";
import { Checkbox } from "./ui/checkbox";
import { longSentenceGuidance } from "../lib/narrative";
import { useCopy } from "../i18n/use-copy";
import type { UiCopy } from "../i18n/copy";

export interface GuidanceProps {
  finding: Finding;
  source: string;
  declaration?: AgentDeclaration | null;
  onDeclare?: (d: AgentDeclaration | null) => void;
}

export function Guidance({ finding, source, declaration, onDeclare }: GuidanceProps) {
  const { c } = useCopy();
  const g = c.guidance;
  const criterion = finding.criterion;
  if (!isCriterionId(criterion)) return <GuideText>{g.generic}</GuideText>;
  switch (criterion) {
    case "long_sentence":
      return <LongSentenceGuide finding={finding} source={source} />;
    case "passive_voice":
      return <PassiveGuide finding={finding} source={source} declaration={declaration} onDeclare={onDeclare} />;
    case "passiva_sintetica":
      return <GuideText>{g.passivaSintetica}</GuideText>;
    case "nominalization":
      return <NominalizationGuide finding={finding} />;
    case "nominalizacao_encadeada":
      return <GuideText>{g.nominalizacaoEncadeada}</GuideText>;
    case "jargon":
      return <GuideText>{g.jargon}</GuideText>;
    case "sigla_sem_expansao":
      return <GuideText>{g.siglaSemExpansao}</GuideText>;
    case "subordinacao_densa":
      return <SubordinacaoGuide finding={finding} />;
    case "leitor_terceira_pessoa":
      return <LeitorGuide finding={finding} />;
    case "redundancia":
      return <GuideText>{g.redundancia}</GuideText>;
    case "perifrase_inflada":
      return <GuideText>{g.perifraseInflada}</GuideText>;
    case "dupla_negacao":
      return <GuideText>{g.duplaNegacao}</GuideText>;
    case "mais_que_perfeito_sintetico":
      return <GuideText>{g.maisQuePerfeito}</GuideText>;
    case "gerundismo":
      return <GuideText>{g.gerundismo}</GuideText>;
    case "adverbio_mente_denso":
      return <GuideText>{g.adverbioMenteDenso}</GuideText>;
    case "adverbios_vagos":
      return <GuideText>{g.adverbiosVagos}</GuideText>;
    case "mesoclise":
      return <GuideText>{g.mesoclise}</GuideText>;
    case "paragraph_length":
      return <GuideText>{g.paragraphLength}</GuideText>;
    case "prose_enumeration":
      return <GuideText>{g.proseEnumeration}</GuideText>;
    case "salto_de_nivel_titulo":
      return <GuideText>{g.saltoDeNivelTitulo}</GuideText>;
    case "long_heading":
      return <GuideText>{g.longHeading}</GuideText>;
    case "single_item_list":
      return <GuideText>{g.singleItemList}</GuideText>;
    case "heading_body_mismatch":
      return <GuideText>{g.headingBodyMismatch}</GuideText>;
    default:
      return assertNever(criterion);
  }
}

function assertNever(value: never): never {
  throw new Error(`criterion with no guidance entry: ${String(value)}`);
}

function GuideText({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] leading-relaxed text-ink-1">{children}</p>;
}

function LeitorGuide({ finding }: { finding: Finding }) {
  const { c } = useCopy();
  const g = c.guidance;
  const noun = typeof finding.meta?.readerNoun === "string" ? finding.meta.readerNoun : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {noun ? g.readerNamed(noun) : g.readerUnnamed}
      <span className="text-ink-0">{g.readerBodyStrong}</span>
      {g.readerBody}
    </p>
  );
}

function SubordinacaoGuide({ finding }: { finding: Finding }) {
  const { c } = useCopy();
  const g = c.guidance;
  const clauses = typeof finding.meta?.clauses === "number" ? finding.meta.clauses : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {clauses != null && (
        <>
          <span className="font-medium text-ink-0">{g.subordinationCount(clauses)}</span>
          {g.subordinationTrapped}
        </>
      )}
      {g.subordinationBody}
    </p>
  );
}

function boundaryLabel(point: SplitPoint, c: UiCopy): string {
  switch (point.kind) {
    case "semicolon":
      return c.guidance.boundarySemicolon;
    case "dash":
      return c.guidance.boundaryDash;
    case "comma_conjunction":
      return c.guidance.boundaryCommaConjunction(point.marker);
  }
}

function LongSentenceGuide({ finding, source }: { finding: Finding; source: string }) {
  const { c } = useCopy();
  const t = c.guidance;
  const guide = longSentenceGuidance(finding, source);
  const hasCuts = guide.candidates.length > 0;
  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        {t.longSentenceLead}
        <span className="text-ink-0">{t.longSentenceLeadStrong}</span>
        {hasCuts ? (
          <>
            {t.longSentenceWithCuts}
            <span className="text-ink-0">{t.longSentenceWithCutsStrong}</span>
            {t.longSentenceWithCutsTail}
          </>
        ) : (
          <>{t.longSentenceNoCuts}</>
        )}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={t.statWords} value={guide.words != null ? String(guide.words) : "—"} />
        <Stat label={t.statOver} value={guide.over != null ? `+${guide.over}` : "—"} />
        <Stat
          label={t.statTarget}
          value={guide.targetSentences != null ? t.statTargetValue(guide.targetSentences) : "—"}
        />
      </div>

      {hasCuts && (
        <div className="mt-4">
          <p className="u-sublabel mb-2 text-ink-3">
            {t.cutsAvailable(guide.candidates.length)} · {t.cutsInformationNotAction}
          </p>
          <ul className="flex flex-col gap-2">
            {guide.candidates.map((point, i) => (
              <li
                key={point.offset}
                className="overflow-hidden rounded-lg border border-rule-1 bg-sheet shadow-(--shadow-card)"
              >
                <p className="px-3 pt-2 pb-1.5 font-serif text-[13px] leading-snug text-ink-1">…{point.before}</p>
                <div className="flex items-center gap-2 px-3">
                  <span className="h-px flex-1 bg-human-line" aria-hidden />
                  <span className="u-sublabel whitespace-nowrap text-human">
                    {t.cutLabel(i + 1, boundaryLabel(point, c))}
                  </span>
                  <span className="h-px flex-1 bg-human-line" aria-hidden />
                </div>
                <p className="px-3 pt-1.5 pb-2 font-serif text-[13px] leading-snug text-ink-1">{point.after}…</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{t.cutsNote}</p>
        </div>
      )}
    </div>
  );
}

function PassiveGuide({
  finding,
  source,
  declaration,
  onDeclare,
}: {
  finding: Finding;
  source: string;
  declaration?: AgentDeclaration | null;
  onDeclare?: (d: AgentDeclaration | null) => void;
}) {
  const { c } = useCopy();
  const g = c.guidance;
  const scaffold = passiveScaffold(finding, source);

  if (!scaffold) {
    if (finding.meta?.hasAgent === true) {
      return <GuideText>{g.passiveWithAgent}</GuideText>;
    }
    return (
      <div>
        <p className="text-[12.5px] leading-relaxed text-ink-1">
          <span className="font-medium text-ink-0">{g.passiveNoAgentLead}</span>
          {g.passiveNoAgentBody}
          <span className="text-ink-0">{g.passiveNoAgentStrong}</span>
          {g.passiveNoAgentRequirement}
        </p>
        {onDeclare && <PassiveElicitation finding={finding} declaration={declaration ?? null} onDeclare={onDeclare} />}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        {g.scaffoldLead}
        <span className="text-ink-0">{g.scaffoldLeadStrong}</span>
        {g.scaffoldLeadTail}
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <RoleRow label={g.scaffoldAgent} hint={g.scaffoldAgentHint} value={scaffold.agent} />
        <RoleRow
          label={g.scaffoldAction}
          hint={g.scaffoldActionHint}
          value={scaffold.action.participle}
          note={scaffold.action.baseVerb ? `→ ${scaffold.action.baseVerb}` : g.scaffoldPickVerb}
        />
        <RoleRow
          label={g.scaffoldObject}
          hint={g.scaffoldObjectHint}
          value={scaffold.object}
          placeholder={g.scaffoldObjectPlaceholder}
        />
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{g.scaffoldNote}</p>
    </div>
  );
}

function PassiveElicitation({
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
    <div className="mt-3">
      <label className="u-sublabel block text-ink-3" htmlFor="agent-declaration">
        {g.agentQuestion}
      </label>
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

function RoleRow({
  label,
  hint,
  value,
  note,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string | null;
  note?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 rounded-lg border border-rule-1 bg-sheet px-3 py-2">
      <span className="u-sublabel w-16 shrink-0 text-human">{label}</span>
      <span className="min-w-0 flex-1">
        {value ? (
          <span className="font-serif text-[14px] text-ink-0">{value}</span>
        ) : (
          <span className="text-[12.5px] italic text-ink-3">— {placeholder}</span>
        )}
        {note && value && <span className="ml-1.5 font-sans text-[11.5px] text-ink-2">{note}</span>}
      </span>
      <span className="shrink-0 text-[10.5px] text-ink-3">{hint}</span>
    </div>
  );
}

function NominalizationGuide({ finding }: { finding: Finding }) {
  const { c } = useCopy();
  const g = c.guidance;
  const base = typeof finding.meta?.baseVerb === "string" ? finding.meta.baseVerb : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {base && (
        <>
          <span className="font-medium text-ink-0">{g.nominalizationBaseVerb(base)}</span>{" "}
        </>
      )}
      {g.nominalizationBody}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-rule-1 bg-sheet px-2 py-2 text-center shadow-(--shadow-card)">
      <div className="text-[15px] tabular-nums text-ink-0">{value}</div>
      <div className="u-sublabel mt-0.5 font-medium text-ink-3">{label}</div>
    </div>
  );
}
