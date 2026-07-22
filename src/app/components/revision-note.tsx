"use client";

import { useState } from "react";
import {
  applyPassiveWithAgent,
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
import { generateRewrite, REWRITE_MODELS, type RewriteModel } from "../lib/rewrite";
import { ArrowDownIcon, CheckIcon, PenNibIcon } from "./icons";

export interface RevisionNoteProps {
  finding: Finding;
  source: string;
  onApply: (f: Finding) => void;
  onSplit: (point: SplitPoint) => void;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onPassiveActive: (target: Span, replacement: string) => void;
}

export function RevisionNote({
  finding,
  source,
  onApply,
  onSplit,
  onApplyRewrite,
  onPassiveActive,
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

  // O ALVO: o parágrafo que contém o finding, OU a frase quando o texto é um bloco contínuo
  // (sem linhas em branco) — nunca o documento inteiro. A geração recebe o texto de contexto.
  const { span: target, unit } = rewriteTargetAt(source, finding.span.start);
  const unitLabel = unit === "sentence" ? "esta frase" : "este parágrafo";

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Julgada só pelo peso da região (region_improved) + provas de corrupção — NÃO pelo
      // critério de um finding isolado (sem `criterion` → sem target_resolved).
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
          Camada opcional — o diagnóstico acima é <span className="text-ink-1">determinístico e não depende disto</span>.
          A IA propõe; a <span className="text-ink-1">engine verifica</span>. Nunca aplica sozinha, e passar nas provas é
          ausência de falha, <span className="text-ink-1">não aprovação</span>.
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

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-rule-1 bg-sheet">
      {/* proposta */}
      <div className="border-b border-rule-1 px-3.5 py-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Proposta · gerada</p>
          <span className="font-mono text-[10px] text-ink-3" title="modelo + versão do prompt">
            {proposal.proposerId}
          </span>
        </div>
        <p className="font-serif text-[15px] leading-snug text-ink-0">{proposal.proposed}</p>
      </div>

      {/* PROVA */}
      <div className="px-3.5 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Prova · determinística
        </p>
        <ul className="flex flex-col gap-1.5">
          {verification.proofs.map((p) => (
            <CheckLine key={p.check} ok={p.passed} kind="proof" detail={p.detail} />
          ))}
        </ul>
      </div>

      {/* SINAL */}
      {verification.signals.length > 0 && (
        <div className="border-t border-rule-1 px-3.5 py-3">
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

      {/* métricas + ação */}
      <div className="border-t border-rule-1 px-3.5 py-3">
        <div className="flex items-center gap-3 text-[11.5px] text-ink-2">
          <span>
            Flesch-PT <span className="tabular-nums text-ink-1">{dFlesch >= 0 ? `+${dFlesch.toFixed(1)}` : dFlesch.toFixed(1)}</span>
          </span>
          <span className="text-ink-3">·</span>
          <span>
            palavras <span className="tabular-nums text-ink-1">{dWords >= 0 ? `+${dWords}` : dWords}</span>
          </span>
        </div>

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
              ? "Uma prova falhou — a ferramenta não aplica sozinha e não atesta. Se você entende o motivo acima e ainda quer, aplique como rascunho e reanalise."
              : "Nenhuma falha de piso detectada. Isso não é um selo de qualidade — reveja antes de usar."}
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckLine({ ok, kind, detail }: { ok: boolean; kind: "proof" | "signal"; detail: string }) {
  // Prova: ✓ verde / ✗ vermelho. Sinal: ✓ neutro / ⚠ atenção (nunca "aprovado").
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
  if (finding.criterion === "long_sentence")
    return <LongSentenceGuide finding={finding} source={source} onSplit={onSplit} />;
  if (finding.criterion === "passive_voice")
    return <PassiveGuide finding={finding} source={source} onPassiveActive={onPassiveActive} />;
  if (finding.criterion === "nominalization") return <NominalizationGuide finding={finding} />;
  return <JargonGuide />;
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

/**
 * Voz passiva → ação estrutural do Tier 2 (ADR-032). Renderiza conforme a CLASSE devolvida pela
 * engine (`passiveToActive`): A (rascunho pronto), B (pede só o agente), C (mantém o andaime
 * read-only). NENHUMA lógica linguística aqui — a UI só chama a engine e mostra o resultado.
 */
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

  // unsupported → mantém o andaime read-only (com agente) ou a pergunta (sem agente).
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
