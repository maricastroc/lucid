"use client";

import { useState } from "react";
import {
  applyPassiveWithAgent,
  isCriterionId,
  passiveScaffold,
  passiveToActive,
  type Finding,
  type Span,
  type SplitPoint,
} from "@/lucid";
import type { RewriteProposal, VerifiedRewrite } from "@/report/rewrite";
import { isSafe, metaFor, principleGroupOf, SEVERITY_LABEL, severityInkVar } from "../lib/criteria";
import {
  buildConfidence,
  detectedProse,
  detectionHeadline,
  longSentenceGuidance,
} from "../lib/narrative";
import { rewriteTargetAt } from "../lib/paragraphs";
import { isManualEditDirty, manualEditReplacement } from "../lib/text-edit";
import { generateRewrite, REWRITE_MODELS, verifyManualEdit, type RewriteModel } from "../lib/rewrite";
import { ArrowDownIcon, CheckIcon, PenNibIcon } from "./icons";

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
        <span className="font-medium uppercase tracking-[0.12em] text-ink-3">{meta.kind}</span>
        <span className="text-ink-3">·</span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span className="size-1.75 rounded-full" style={{ background: ink }} aria-hidden />
          {SEVERITY_LABEL[finding.severity]}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[23px] leading-[1.2] text-ink-0">{detectionHeadline(finding)}</h3>

      <p className="mt-2 text-[12.5px] text-ink-2">
        <span className="text-ink-1">{group}</span> · {meta.principleName}
        <span className="ml-2 rounded-[4px] bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
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
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
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
          className="block max-h-[46vh] min-h-28 w-full resize-y rounded-lg border border-rule-1 bg-surface-2/40 px-3 py-2.5 font-serif text-[14.5px] leading-snug text-ink-0 outline-none transition-colors focus:border-human-line"
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
        <div className="rounded-lg border border-rule-1 bg-sheet">
          <DiffRow label="Antes">
            <span className="font-serif text-[15.5px] text-ink-2 line-through decoration-ink-3">{before}</span>
          </DiffRow>
          <div className="flex items-center gap-2 border-t border-rule-1 px-3.5 py-1">
            <ArrowDownIcon className="size-3.5 text-safe" />
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">substituição direta</span>
          </div>
          <DiffRow label="Depois" tone="safe">
            <span className="font-serif text-[15.5px] font-medium text-ink-0">{after}</span>
          </DiffRow>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-opacity duration-150 hover:opacity-90"
            style={{ background: "var(--safe-strong)", color: "var(--on-safe)" }}
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
      <span
        className={`w-12 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] ${
          tone === "safe" ? "text-safe" : "text-ink-3"
        }`}
      >
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
          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
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
      setResult(await generateRewrite(source, target, choice));
    } catch (e) {
      setError(e instanceof Error ? e.message : "falha ao gerar a reescrita");
    } finally {
      setLoading(false);
    }
  };

  const hasProposal = result !== null && result.proposal.proposed !== result.proposal.original;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-dashed border-rule-3 bg-surface-2/40">
      <div className="flex items-center gap-2 border-b border-rule-1 px-4 py-2.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-2">Reescrita por IA</span>
        <span className="rounded-[4px] bg-surface-2 px-1.5 py-0.5 text-[9.5px] uppercase tracking-widest text-ink-3">
          experimental
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[12px] leading-relaxed text-ink-2">
          Uma das formas de propor uma nova versão — a IA reescreve; você também pode{" "}
          <span className="text-ink-1">editar ou colar a sua</span>. A engine julga qualquer uma delas do mesmo jeito.
          Opcional: o <span className="text-ink-1">diagnóstico acima não depende disto</span>.
        </p>
        <p className="mt-2 rounded-lg bg-human-weak px-3 py-2 text-[12px] leading-relaxed text-ink-1">
          A IA vai reescrever <span className="font-semibold text-ink-0">{unitLabel}</span> (destacada no documento).
        </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="Modelo gerador"
          value={`${choice.providerId}:${choice.model}`}
          onChange={(e) => {
            const next = REWRITE_MODELS.find((m) => `${m.providerId}:${m.model}` === e.target.value);
            if (next) setChoice(next);
          }}
          className="rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[12.5px] text-ink-1"
        >
          {REWRITE_MODELS.map((m) => (
            <option key={`${m.providerId}:${m.model}`} value={`${m.providerId}:${m.model}`}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rule-2 bg-sheet px-3.5 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2 disabled:opacity-60"
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
    <div className="mt-3 overflow-hidden rounded-xl border border-rule-1 bg-sheet">
      {/* VEREDITO — protagonista. A engine julgou; é isto que o produto entrega, não a prosa. */}
      <div
        className="px-4 py-3.5"
        style={{
          borderBottom: "1px solid var(--rule-1)",
          background: blocked ? "var(--human-weak)" : "var(--safe-weak)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: blocked ? "var(--human)" : "var(--safe)" }}
          >
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
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Prova · determinística</p>
        <ul className="flex flex-col gap-1.5">
          {verification.proofs.map((p) => (
            <CheckLine key={p.check} ok={p.passed} kind="proof" detail={p.detail} />
          ))}
        </ul>
      </div>

      {/* SINAL */}
      {verification.signals.length > 0 && (
        <div className="border-t border-rule-1 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Trecho avaliado</p>
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

function Guidance({
  finding,
  source,
  onSplit,
  onPassiveActive,
}: {
  finding: Finding;
  source: string;
  onSplit: (point: SplitPoint) => void;
  onPassiveActive: (target: Span, replacement: string) => void;
}) {
  const c = finding.criterion;
  if (!isCriterionId(c)) return <GenericGuide />;
  switch (c) {
    case "long_sentence":
      return <LongSentenceGuide finding={finding} source={source} onSplit={onSplit} />;
    case "passive_voice":
      return <PassiveGuide finding={finding} source={source} onPassiveActive={onPassiveActive} />;
    case "nominalization":
      return <NominalizationGuide finding={finding} />;
    case "jargon":
      return <JargonGuide />;
    case "subordinacao_densa":
      return <SubordinacaoGuide finding={finding} />;
    case "leitor_terceira_pessoa":
      return <LeitorGuide finding={finding} />;
    case "redundancia":
      return (
        <GuideText>
          Corte o termo que repete o sentido do outro — a forma enxuta está na justificativa acima. Qual dos dois remover é
          decisão sua.
        </GuideText>
      );
    case "perifrase_inflada":
      return (
        <GuideText>
          Troque a locução pela forma enxuta equivalente (na justificativa). Confira só se a regência do que vem depois
          continua certa.
        </GuideText>
      );
    case "dupla_negacao":
      return (
        <GuideText>
          Diga direto o que a dupla negação afirma — a forma direta está na justificativa. Confirme que a nuance que você
          quis dar não se perde.
        </GuideText>
      );
    case "mais_que_perfeito_sintetico":
      return (
        <GuideText>
          Prefira a forma composta, mais clara: “tinha feito” no lugar de “fizera”. A troca pede reconjugar com o
          auxiliar — a frase final é sua.
        </GuideText>
      );
    case "gerundismo":
      return (
        <GuideText>
          Troque o gerúndio encadeado pelo futuro simples ou o presente: “enviaremos” / “enviamos” no lugar de “vamos
          estar enviando”.
        </GuideText>
      );
    case "adverbio_mente_denso":
      return (
        <GuideText>
          Corte ou substitua parte dos advérbios em -mente — o excesso pesa a leitura. Quais tirar depende da ênfase que
          você quer.
        </GuideText>
      );
    case "mesoclise":
      return (
        <GuideText>
          Reescreva sem a mesóclise: “será feito” ou “vai fazer” no lugar de “far-se-á”. Muda a construção, então a frase
          final é sua.
        </GuideText>
      );
    case "paragraph_length":
      return (
        <GuideText>
          Quebre o parágrafo em blocos menores, um grupo de ideias por vez. Onde cortar depende da organização do texto —
          decisão sua.
        </GuideText>
      );
    case "prose_enumeration":
      return (
        <GuideText>
          Transforme os itens embutidos no texto numa lista com marcadores — fica mais fácil localizar cada um. É uma
          decisão de formatação sua.
        </GuideText>
      );
    case "salto_de_nivel_titulo":
      return (
        <GuideText>
          A hierarquia de títulos pulou um nível. Rebaixe este título para o nível logo abaixo do anterior, ou crie o
          título intermediário que falta — assim o sumário e a leitura por estrutura ficam previsíveis.
        </GuideText>
      );
    case "long_heading":
      return (
        <GuideText>
          Encurte o título até virar um rótulo que o leitor use para localizar a seção — e, se ele fechou como frase,
          tire o ponto final e reduza à etiqueta essencial. O corte é seu.
        </GuideText>
      );
    case "single_item_list":
      return (
        <GuideText>
          Uma lista de um item só não separa nada: acrescente os itens que faltam, ou traga o conteúdo de volta para o
          texto corrido. A escolha depende do conteúdo — sua.
        </GuideText>
      );
    case "heading_body_mismatch":
      return (
        <GuideText>
          Releia o título e a seção juntos: ele antecipa o que o leitor vai encontrar aqui? Se não, ajuste o título ou
          confirme que a palavra em comum só mudou de forma (plural/singular) — a ferramenta não decide por você.
        </GuideText>
      );
    default:
      return assertNever(c);
  }
}

/** Exaustividade em compile-time: se `value` não for `never`, falta um `case` — erro de tipo. */
function assertNever(value: never): never {
  throw new Error(`critério sem guia de orientação: ${String(value)}`);
}

/** Parágrafo de orientação padrão — casca compartilhada dos guias só-texto. */
function GuideText({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] leading-relaxed text-ink-1">{children}</p>;
}

/** Fallback impossível (finding sem CriterionId registrado) — nunca some para o autor. */
function GenericGuide() {
  return (
    <GuideText>
      A ferramenta apontou a construção, mas a correção depende de julgamento seu — ela não reescreve por conta própria.
    </GuideText>
  );
}

function LeitorGuide({ finding }: { finding: Finding }) {
  const noun = typeof finding.meta?.readerNoun === "string" ? finding.meta.readerNoun : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      O texto fala {noun ? <>de “<span className="text-ink-0">{noun}</span>” </> : "do leitor "}em terceira pessoa. Para
      aproximar, <span className="text-ink-0">fale com o leitor</span>: troque por “você deve…” ou use o imperativo
      (“apresente…”, “compareça…”). A ferramenta não faz a troca porque mudar a pessoa muda o registro — a escolha é sua.
    </p>
  );
}

function SubordinacaoGuide({ finding }: { finding: Finding }) {
  const clauses = typeof finding.meta?.clauses === "number" ? finding.meta.clauses : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {clauses != null && (
        <>
          <span className="font-medium text-ink-0">{clauses} orações subordinadas</span> presas numa frase só.{" "}
        </>
      )}
      Separe em frases mais curtas, uma ideia por vez — o começo de cada oração subordinada costuma ser o corte natural. A
      ferramenta não reescreve: decidir o que vira frase própria e reconjugar é decisão sua.
    </p>
  );
}

function LongSentenceGuide({
  finding,
  source,
  onSplit,
}: {
  finding: Finding;
  source: string;
  onSplit: (point: SplitPoint) => void;
}) {
  const g = longSentenceGuidance(finding, source);
  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        A ferramenta não reescreve — mas mede o esforço e localiza onde a frase pode se dividir. Escolha um ponto e ela
        insere a quebra, devolvendo um <span className="text-ink-0">rascunho</span> para você revisar e reanalisar.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="palavras" value={g.words != null ? String(g.words) : "—"} />
        <Stat label="acima de" value={g.over != null ? `+${g.over}` : "—"} />
        <Stat label="meta" value={g.targetSentences != null ? `${g.targetSentences} frases` : "—"} />
      </div>

      {g.candidates.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            pontos de divisão possíveis · confira
          </p>
          <ul className="flex flex-col gap-1.5">
            {g.candidates.map((c) => (
              <li key={c.offset}>
                <button
                  type="button"
                  onClick={() => onSplit(c)}
                  className="group flex w-full items-baseline gap-1.5 rounded-lg border border-rule-1 bg-sheet px-3 py-2 text-left font-serif text-[13px] leading-snug transition-colors duration-150 hover:border-human-line hover:bg-human-weak"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-ink-2">…{c.before}</span>
                    <span className="mx-1.5 text-human" aria-hidden>
                      ⁝
                    </span>
                    <span className="text-ink-0">{c.after}…</span>
                  </span>
                  <span className="shrink-0 text-[10.5px] font-sans uppercase tracking-widest text-human opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    dividir
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            Insere ponto final e maiúscula, sem apagar palavra. O resultado é um rascunho — a frase final é sua.
          </p>
        </div>
      )}
    </div>
  );
}

const APPLY_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-lg border border-human-line bg-human-weak px-3.5 py-2 text-[13px] font-semibold text-human transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

function PassiveGuide({
  finding,
  source,
  onPassiveActive,
}: {
  finding: Finding;
  source: string;
  onPassiveActive: (target: Span, replacement: string) => void;
}) {
  const rewrite = passiveToActive(finding, source);

  if (rewrite.kind === "automatic") {
    return (
      <div>
        <p className="text-[12.5px] leading-relaxed text-ink-1">
          O texto já diz quem praticou a ação, então a ferramenta monta a voz ativa de forma segura e devolve um{" "}
          <span className="text-ink-0">rascunho</span> para você revisar.
        </p>
        <div className="mt-3">
          <p className="mb-2 text-[10.5px] uppercase tracking-[0.12em] text-ink-3">voz ativa · rascunho</p>
          <div className="rounded-lg border border-rule-1 bg-sheet px-3 py-2 font-serif text-[14px] leading-snug text-ink-0">
            {rewrite.replacement}
          </div>
          <button
            type="button"
            onClick={() => onPassiveActive(rewrite.target, rewrite.replacement)}
            className={`mt-2.5 ${APPLY_BUTTON_CLASS}`}
          >
            Aplicar
          </button>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
            Reordena e reconjuga deterministicamente, sem inventar informação. O resultado é um rascunho — a frase final é
            sua.
          </p>
        </div>
      </div>
    );
  }

  if (rewrite.kind === "needsAgent") {
    return <PassiveNeedsAgent finding={finding} source={source} onPassiveActive={onPassiveActive} />;
  }

  const scaffold = passiveScaffold(finding, source);
  if (!scaffold) {
    return (
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        <span className="font-medium text-ink-0">Falta o agente.</span> Para escrever na voz ativa, responda:{" "}
        <span className="text-ink-0">quem praticou a ação?</span> Só com essa informação a frase ativa é possível — e a
        resposta é sua, não da ferramenta.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        A ferramenta identifica os papéis no texto para você montar a voz ativa. É um{" "}
        <span className="text-ink-0">andaime, não a frase</span> — confira cada campo; a versão final é sua.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <RoleRow label="Agente" hint="vira o sujeito" value={scaffold.agent} />
        <RoleRow
          label="Ação"
          hint="vira o verbo"
          value={scaffold.action.participle}
          note={scaffold.action.baseVerb ? `→ ${scaffold.action.baseVerb}` : "→ escolha o verbo"}
        />
        <RoleRow label="Objeto" hint="o que sofreu a ação" value={scaffold.object} placeholder="você preenche" />
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        Estrutura identificada · confira. Aqui a ferramenta não vira a frase: a conversão automática exigiria uma inferência
        que ela se recusa a fazer — decisão sua.
      </p>
    </div>
  );
}

/** Classe B: pede SÓ o agente; a engine conjuga e monta o rascunho (com prévia ao vivo). */
function PassiveNeedsAgent({
  finding,
  source,
  onPassiveActive,
}: {
  finding: Finding;
  source: string;
  onPassiveActive: (target: Span, replacement: string) => void;
}) {
  const [agent, setAgent] = useState("");
  const preview = agent.trim() ? applyPassiveWithAgent(finding, source, agent) : null;
  const ready = preview?.kind === "automatic" ? preview : null;

  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-ink-1">
        O texto não diz quem praticou a ação. Informe <span className="text-ink-0">só o agente</span> — a ferramenta conjuga
        e monta o rascunho; você não escreve a frase inteira.
      </p>
      <label className="mt-3 block text-[10.5px] uppercase tracking-[0.12em] text-ink-3">Quem pratica essa ação?</label>
      <input
        value={agent}
        onChange={(e) => setAgent(e.target.value)}
        placeholder="ex.: a comissão"
        className="mt-1.5 w-full rounded-lg border border-rule-1 bg-sheet px-3 py-2 font-serif text-[14px] text-ink-0 outline-none transition-colors focus:border-human-line"
      />
      {ready && (
        <div className="mt-2 rounded-lg border border-rule-1 bg-sheet px-3 py-2 font-serif text-[13.5px] leading-snug text-ink-1">
          {ready.replacement}
        </div>
      )}
      <button
        type="button"
        disabled={!ready}
        onClick={() => ready && onPassiveActive(ready.target, ready.replacement)}
        className={`mt-2.5 ${APPLY_BUTTON_CLASS}`}
      >
        Aplicar
      </button>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        Só o agente vem de você; a conjugação e a montagem são determinísticas. O resultado é um rascunho — a frase final é
        sua.
      </p>
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
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-human">{label}</span>
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
  const base = typeof finding.meta?.baseVerb === "string" ? finding.meta.baseVerb : null;
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      {base && (
        <>
          <span className="font-medium text-ink-0">Verbo-base: “{base}”.</span>{" "}
        </>
      )}
      Reescreva com o verbo direto (ex.: “fazer a análise” → “analisar”). A troca automática exigiria reconjugar o verbo
      ou ajustar o complemento — passos que só você deve decidir.
    </p>
  );
}

function JargonGuide() {
  return (
    <p className="text-[12.5px] leading-relaxed text-ink-1">
      Há um equivalente mais simples no glossário, mas a troca depende do que vem a seguir. Confirme que o contexto é um
      sintagma nominal (não uma oração) antes de substituir.
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-rule-1 bg-sheet px-2 py-2 text-center">
      <div className="text-[15px] tabular-nums text-ink-0">{value}</div>
      <div className="mt-0.5 text-[9.5px] uppercase tracking-widest text-ink-3">{label}</div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[13.5px] leading-relaxed text-ink-1 ${className ?? ""}`}>{children}</p>;
}
