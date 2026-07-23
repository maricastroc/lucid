"use client";

import { useState } from "react";
import { type Finding, type Span, type SplitPoint } from "@/lucid";
import type { RewriteProposal, VerifiedRewrite } from "@/report/rewrite";
import { isSafe, metaFor, principleGroupOf, SEVERITY_LABEL, severityInkVar } from "../lib/criteria";
import { buildConfidence, detectedProse, detectionHeadline } from "../lib/narrative";
import { rewriteTargetAt } from "../lib/paragraphs";
import { isManualEditDirty, manualEditReplacement } from "../lib/text-edit";
import { generateRewrite, REWRITE_MODELS, verifyManualEdit, type RewriteModel } from "../lib/rewrite";
import { ArrowDownIcon, CheckIcon, PenNibIcon } from "./icons";
import { APPLY_BUTTON_CLASS, Guidance } from "./revision-note-guidance";
import { Checkbox } from "./ui/checkbox";
import { Select } from "./ui/select";

export interface RevisionNoteProps {
  finding: Finding;
  source: string;
  onApply: (f: Finding) => void;
  onSplit: (point: SplitPoint) => void;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onPassiveActive: (target: Span, replacement: string) => void;
  onManualEdit: (target: Span, replacement: string) => void;
}

export function RevisionNote({
  finding,
  source,
  onApply,
  onSplit,
  onApplyRewrite,
  onPassiveActive,
  onManualEdit,
}: RevisionNoteProps) {
  const meta = metaFor(finding.criterion);
  const ink = severityInkVar(finding.severity);
  const safe = isSafe(finding);
  const group = principleGroupOf(finding.principle);

  return (
    <div className="note-in flex flex-col px-6 py-6">
      <div className="flex items-center gap-2 text-[11.5px]">
        <span className="u-label text-ink-3">{meta.kind}</span>
        <span className="text-ink-3">·</span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span className="size-1.75 rounded-full" style={{ background: ink }} aria-hidden />
          {SEVERITY_LABEL[finding.severity]}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[23px] leading-[1.2] text-ink-0">{detectionHeadline(finding)}</h3>

      <p className="mt-2 text-[12.5px] text-ink-2">
        <span className="text-ink-1">{group}</span> · {meta.principleName}
        <span className="ml-2 rounded-[5px] border border-rule-1 bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
          ABNT {finding.principle}
        </span>
      </p>

      {/* trecho */}
      <Block label="Trecho">
        <blockquote className="border-l-2 pl-4" style={{ borderColor: ink }}>
          <span className="font-serif text-[17px] leading-snug text-ink-0">
            <span
              className={meta.channel === "inline" ? `mark ${meta.markStyleClass}` : "passage"}
              style={{ "--mark-ink": ink } as React.CSSProperties}
            >
              {finding.span.text.replace(/\s+/g, " ").trim()}
            </span>
          </span>
        </blockquote>
      </Block>

      <Block label="O que encontramos">
        <Prose>{detectedProse(finding)}</Prose>
      </Block>

      <Block label="Por que afeta a clareza">
        <Prose>{meta.why}</Prose>
        <Prose className="mt-2 text-ink-2">{finding.justification}</Prose>
      </Block>

      {/* ação — o coração da identidade */}
      <div className="mt-7">
        {safe ? (
          <SafeResolution finding={finding} onApply={() => onApply(finding)} />
        ) : (
          <HumanDecision
            finding={finding}
            source={source}
            onSplit={onSplit}
            onApplyRewrite={onApplyRewrite}
            onPassiveActive={onPassiveActive}
          />
        )}
      </div>

      {/* terceira via, universal: o autor reescreve à mão. Nem máquina, nem LLM — a engine só re-mede. */}
      <ManualEdit finding={finding} source={source} onManualEdit={onManualEdit} />
    </div>
  );
}

/**
 * Edição À MÃO (ou COLAGEM) do autor — uma das TRÊS fontes de candidato, ao lado da ação mecânica e
 * da LLM. Abre a UNIDADE-alvo (a frase ou o parágrafo do finding, o mesmo trecho que a LLM
 * reescreveria e que fica destacado no documento) num campo editável. A decisão do ADR-000 (Etapa 2):
 * a versão do autor passa pelo MESMO verificador determinístico que julga a IA — nenhuma fonte é
 * privilegiada. O autor escreve/cola → `verifyManualEdit` (offline, sem LLM) → o MESMO veredito
 * (`RewriteResult`) → aplicar vira rascunho (`onManualEdit` = `replaceSpan`) e a engine re-audita.
 */
function ManualEdit({
  finding,
  source,
  onManualEdit,
}: {
  finding: Finding;
  source: string;
  onManualEdit: (target: Span, replacement: string) => void;
}) {
  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? "esta frase" : "este parágrafo";
  const original = target.text;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(original);
  const [result, setResult] = useState<VerifiedRewrite | null>(null);
  const [checking, setChecking] = useState(false);

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
        Editar ou colar minha versão
      </button>
    );
  }

  const check = async () => {
    setChecking(true);
    try {
      setResult(await verifyManualEdit(source, target, draft));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-rule-1 bg-sheet">
      <div className="flex items-center justify-between border-b border-rule-1 px-3.5 py-2.5">
        <span className="u-sublabel text-ink-3">
          Sua versão · {unitLabel}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2 py-1 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2"
        >
          Fechar
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
          aria-label={`Editar ${unitLabel}`}
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
            {checking ? "Verificando…" : "Verificar minha versão"}
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
            Restaurar
          </button>
        </div>

        {result !== null && (
          <RewriteResult result={result} onApplyRewrite={() => onManualEdit(target, manualEditReplacement(draft))} />
        )}

        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
          Você escreve ou cola; a engine julga a sua versão com as mesmas provas da IA — nenhuma fonte é privilegiada.
          Aplicar vira um rascunho e a engine re-audita.
        </p>
      </div>
    </div>
  );
}

function SafeResolution({ finding, onApply }: { finding: Finding; onApply: () => void }) {
  const [copied, setCopied] = useState(false);
  const before = finding.span.text.replace(/\s+/g, " ").trim();
  const after = finding.suggestion!;
  const rationale = buildConfidence(finding).rationale;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(after);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-safe-line bg-safe-weak">
      <div className="flex items-center gap-2 px-4 pt-3.5 text-[12.5px] font-semibold text-safe">
        <CheckIcon className="size-4" />
        Pode aplicar com segurança
      </div>

      <div className="px-4 py-3">
        <div className="rounded-lg border border-rule-1 bg-sheet shadow-(--shadow-card)">
          <DiffRow label="Antes">
            <span className="font-serif text-[15.5px] text-ink-2 line-through decoration-ink-3">{before}</span>
          </DiffRow>
          <div className="flex items-center gap-2 border-t border-rule-1 px-3.5 py-1">
            <ArrowDownIcon className="size-3.5 text-safe" />
            <span className="u-sublabel text-ink-3">substituição direta</span>
          </div>
          <DiffRow label="Depois" tone="safe">
            <span className="font-serif text-[15.5px] font-medium text-ink-0">{after}</span>
          </DiffRow>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 rounded-lg bg-safe-strong px-3.5 py-2 text-[13px] font-semibold text-on-safe shadow-(--shadow-card) transition-colors duration-150 hover:bg-safe"
          >
            <CheckIcon className="size-4" />
            Aplicar
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-ink-2">{rationale}</p>
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
  onSplit,
  onApplyRewrite,
  onPassiveActive,
}: {
  finding: Finding;
  source: string;
  onSplit: (point: SplitPoint) => void;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onPassiveActive: (target: Span, replacement: string) => void;
}) {
  const rationale = buildConfidence(finding).rationale;
  return (
    <div className="overflow-hidden rounded-xl border border-human-line bg-human-weak">
      <div className="flex items-center gap-2 px-4 pt-3.5 text-[12.5px] font-semibold text-human">
        <PenNibIcon className="size-4" />
        Exige decisão humana
      </div>
      <div className="px-4 py-3">
        <p className="text-[12.5px] leading-relaxed text-ink-1">
          A ferramenta identificou a construção, mas não existe reescrita segura sem conhecer a intenção do autor —
          então ela prefere <span className="text-ink-0">apontar a inventar</span>.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{rationale}</p>

        <div className="mt-4 border-t border-human-line pt-4">
          <p className="u-sublabel mb-2.5 text-ink-3">
            Como seguir
          </p>
          <Guidance finding={finding} source={source} onSplit={onSplit} onPassiveActive={onPassiveActive} />
        </div>

        <GeneratedRewrite finding={finding} source={source} onApplyRewrite={onApplyRewrite} />
      </div>
    </div>
  );
}

/* ==================================================== Tier 3 · reescrita gerada e verificada */

function GeneratedRewrite({
  finding,
  source,
  onApplyRewrite,
}: {
  finding: Finding;
  source: string;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
}) {
  const [choice, setChoice] = useState<RewriteModel>(REWRITE_MODELS[0]);
  const [directed, setDirected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifiedRewrite | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? "esta frase" : "este parágrafo";

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await generateRewrite(source, target, choice, { directed }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao gerar a reescrita");
    } finally {
      setLoading(false);
    }
  };

  const hasProposal = result !== null && result.proposal.proposed !== result.proposal.original;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-dashed border-rule-3 bg-surface-2">
      <div className="flex items-center gap-2 border-b border-rule-1 px-4 py-2.5">
        <span className="u-sublabel text-ink-2">Reescrita por IA</span>
        <span className="u-sublabel rounded-[5px] border border-rule-1 bg-surface-3 px-1.5 py-0.5 font-medium text-ink-3">
          experimental
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[12px] leading-relaxed text-ink-2">
          Uma das formas de propor uma nova versão — a IA reescreve; você também pode{" "}
          <span className="text-ink-1">editar ou colar a sua</span>. A engine julga qualquer uma delas do mesmo jeito.
          Opcional: o <span className="text-ink-1">diagnóstico acima não depende disto</span>.
        </p>
        <p className="mt-2 rounded-lg border border-human-line bg-human-weak px-3 py-2 text-[12px] leading-relaxed text-ink-1">
          A IA vai reescrever <span className="font-semibold text-ink-0">{unitLabel}</span> (destacada no documento).
        </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Select
          ariaLabel="Modelo gerador"
          value={`${choice.providerId}:${choice.model}`}
          onValueChange={(next) => {
            const found = REWRITE_MODELS.find((m) => `${m.providerId}:${m.model}` === next);
            if (found) setChoice(found);
          }}
          options={REWRITE_MODELS.map((m) => ({ value: `${m.providerId}:${m.model}`, label: m.label }))}
        />
        <label
          className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2"
          title="Passa os achados da engine no trecho como briefing à IA (ex.: 'prefira a voz ativa'), em vez do pedido genérico de reescrita."
        >
          <Checkbox checked={directed} onCheckedChange={setDirected} />
          Dirigida pelos achados da engine
        </label>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink shadow-(--shadow-card) transition-colors duration-150 hover:bg-accent-strong disabled:opacity-60"
        >
          {loading ? "Gerando e verificando…" : "Gerar e verificar"}
        </button>
      </div>

      {error !== null && (
        <p className="mt-3 rounded-lg border border-human-line bg-human-weak px-3 py-2.5 text-[12px] leading-relaxed text-ink-1">
          Não deu para gerar: {error}
        </p>
      )}

      {result !== null &&
        (hasProposal ? (
          <RewriteResult result={result} onApplyRewrite={() => onApplyRewrite(target, result.proposal)} />
        ) : (
          <p className="mt-3 rounded-lg border border-rule-1 bg-sheet px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
            O modelo não devolveu uma reescrita diferente do trecho — nada a propor. O verificador não fabrica uma; a
            decisão continua sua.
          </p>
        ))}
      </div>
    </div>
  );
}

function RewriteResult({ result, onApplyRewrite }: { result: VerifiedRewrite; onApplyRewrite: () => void }) {
  const { proposal, verification } = result;
  const blocked = verification.hasBlockingFailure;
  const dFlesch = verification.metrics.fleschPtAfter - verification.metrics.fleschPtBefore;
  const dWords = verification.metrics.wordsAfter - verification.metrics.wordsBefore;
  const passed = verification.proofs.filter((p) => p.passed).length;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-card)">
      {/* VEREDITO — protagonista. A engine julgou; é isto que o produto entrega, não a prosa. */}
      <div
        className="px-4 py-3.5"
        style={{
          borderBottom: "1px solid var(--rule-1)",
          background: blocked ? "var(--human-weak)" : "var(--safe-weak)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="u-sublabel" style={{ color: blocked ? "var(--human)" : "var(--safe)" }}>
            A engine verificou
          </span>
          <span className="tabular-nums text-[11px] text-ink-3">
            {passed}/{verification.proofs.length} provas
          </span>
        </div>
        <p className="mt-1.5 font-serif text-[19px] leading-tight text-ink-0">
          {blocked ? "Uma prova falhou — a ferramenta não atesta este trecho." : "Nenhuma falha de piso neste trecho."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-2">
          <span>
            Flesch-PT <span className="tabular-nums text-ink-1">{fmtDelta(dFlesch, 1)}</span>
          </span>
          <span className="text-ink-3">·</span>
          <span>
            palavras <span className="tabular-nums text-ink-1">{fmtDelta(dWords, 0)}</span>
          </span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-3">medição, não aprovação</span>
        </div>
      </div>

      {/* PROVA — a substância do veredito, logo abaixo do headline */}
      <div className="px-4 py-3">
        <p className="u-sublabel mb-2 text-ink-3">Prova · determinística</p>
        <ul className="flex flex-col gap-1.5">
          {verification.proofs.map((p) => (
            <CheckLine key={p.check} ok={p.passed} kind="proof" detail={p.detail} />
          ))}
        </ul>
      </div>

      {/* SINAL */}
      {verification.signals.length > 0 && (
        <div className="border-t border-rule-1 px-4 py-3">
          <p className="u-sublabel mb-2 text-ink-3">
            Sinal · heurístico (não é prova)
          </p>
          <ul className="flex flex-col gap-1.5">
            {verification.signals.map((s) => (
              <CheckLine key={s.check} ok={!s.flagged} kind="signal" detail={s.detail} />
            ))}
          </ul>
        </div>
      )}

      {/* O ESPÉCIME avaliado — a proposta da IA, calma, junto da ação que a aplica */}
      <div className="border-t border-rule-1 px-4 py-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="u-sublabel text-ink-3">Trecho avaliado</p>
          <span className="font-mono text-[10px] text-ink-3" title="modelo + versão do prompt">
            {proposal.proposerId}
          </span>
        </div>
        <p className="font-serif text-[14.5px] leading-snug text-ink-1">{proposal.proposed}</p>

        <div className="mt-3">
          {/* O veto NUNCA autoaplica e NUNCA vira selo verde — mas não bloqueia o autor. Com
              prova falhada, a ação vira um override deliberado (é só um rascunho, que a engine
              re-audita). A decisão é do autor. */}
          <button
            type="button"
            onClick={onApplyRewrite}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-opacity duration-150 hover:opacity-90"
            style={
              blocked
                ? { background: "var(--human-weak)", color: "var(--human)", boxShadow: "inset 0 0 0 1px var(--human-line)" }
                : { background: "var(--accent)", color: "var(--accent-ink)" }
            }
          >
            {blocked ? "Usar mesmo assim como rascunho" : "Usar como rascunho"}
          </button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            {blocked
              ? "Se você entende o motivo acima e ainda quer, aplique como rascunho — a engine re-audita."
              : "Reveja antes de usar — a decisão de aplicar é sua."}
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
      <span className="text-ink-2">{detail}</span>
    </li>
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
