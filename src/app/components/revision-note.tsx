"use client";

/**
 * A NOTA — o painel editorial dedicado que substitui a visão geral quando um diagnóstico
 * é selecionado. Conta a história do caso: o que encontramos, o trecho, por que afeta a
 * clareza — e então a parte central da identidade do Lucid: a diferença nítida entre
 *   · PODE APLICAR COM SEGURANÇA → um pequeno diff antes/depois e um botão de ação;
 *   · EXIGE DECISÃO HUMANA → a ferramenta explica por que não inventa e oferece
 *     orientação assistida, sem nunca resolver no lugar do autor.
 * Toda a copy vem de `lib/narrative` — derivada do Finding real, nada inventado.
 */
import { useState } from "react";
import { passiveScaffold, type Finding, type SplitPoint } from "@/lucid";
import { isSafe, metaFor, principleGroupOf, SEVERITY_LABEL, severityInkVar } from "../lib/criteria";
import {
  buildConfidence,
  detectedProse,
  detectionHeadline,
  longSentenceGuidance,
} from "../lib/narrative";
import { ArrowDownIcon, CheckIcon, PenNibIcon } from "./icons";

export interface RevisionNoteProps {
  finding: Finding;
  /** texto normalizado do diagnóstico — base dos offsets dos pontos de divisão. */
  source: string;
  onApply: (f: Finding) => void;
  onSplit: (point: SplitPoint) => void;
}

export function RevisionNote({ finding, source, onApply, onSplit }: RevisionNoteProps) {
  const meta = metaFor(finding.criterion);
  const ink = severityInkVar(finding.severity);
  const safe = isSafe(finding);
  const group = principleGroupOf(finding.principle);

  return (
    <div className="note-in flex flex-col px-6 py-6">
      {/* eyebrow */}
      <div className="flex items-center gap-2 text-[11.5px]">
        <span className="font-medium uppercase tracking-[0.12em] text-ink-3">{meta.kind}</span>
        <span className="text-ink-3">·</span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span className="size-[7px] rounded-full" style={{ background: ink }} aria-hidden />
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
          <HumanDecision finding={finding} source={source} onSplit={onSplit} />
        )}
      </div>
    </div>
  );
}

/* ============================================================ segura */

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

      {/* diff antes/depois */}
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

/* ============================================================ humana */

function HumanDecision({
  finding,
  source,
  onSplit,
}: {
  finding: Finding;
  source: string;
  onSplit: (point: SplitPoint) => void;
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
          <Guidance finding={finding} source={source} onSplit={onSplit} />
        </div>
      </div>
    </div>
  );
}

function Guidance({
  finding,
  source,
  onSplit,
}: {
  finding: Finding;
  source: string;
  onSplit: (point: SplitPoint) => void;
}) {
  if (finding.criterion === "long_sentence")
    return <LongSentenceGuide finding={finding} source={source} onSplit={onSplit} />;
  if (finding.criterion === "passive_voice") return <PassiveGuide finding={finding} source={source} />;
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
                  <span className="shrink-0 text-[10.5px] font-sans uppercase tracking-[0.1em] text-human opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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

function PassiveGuide({ finding, source }: { finding: Finding; source: string }) {
  const scaffold = passiveScaffold(finding, source);

  if (!scaffold) {
    // Sem agente no texto: nenhum papel a montar — só a pergunta que o autor precisa responder.
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
        Estrutura identificada · confira. A ferramenta não vira a frase: isso exige reordenar e reconjugar — decisão sua.
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

/* ============================================================ átomos */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-rule-1 bg-sheet px-2 py-2 text-center">
      <div className="text-[15px] tabular-nums text-ink-0">{value}</div>
      <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.1em] text-ink-3">{label}</div>
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
