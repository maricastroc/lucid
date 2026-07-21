"use client";

/**
 * O INSPECTOR — o centro da experiência. Dois estados:
 *   • repouso  → visão geral da auditoria (severidade, regras, métricas, engine);
 *   • seleção  → um RELATÓRIO TÉCNICO NARRATIVO do diagnóstico: o que foi detectado, por
 *     que importa, a evidência e como a regra disparou, por que a engine confia (ou não)
 *     em sugerir, e o limite da automação — que vira orientação assistida, nunca um beco.
 * É um relatório, não uma tabela de propriedades.
 */
import { useState } from "react";
import type { Diagnostic, Finding, Severity } from "@/lucid";
import { CATEGORY_LABEL, CRITERION_ORDER, metaFor, severityInkVar, SEVERITY_LABEL } from "../lib/criteria";
import { offsetToLineCol } from "../lib/editor-model";
import {
  buildConfidence,
  detectedProse,
  detectionHeadline,
  longSentenceGuidance,
  type ConfidenceLevel,
} from "../lib/narrative";

interface Props {
  diagnostic: Diagnostic;
  selectedFinding: Finding | null;
  index: number;
  total: number;
  activeCriteria: ReadonlySet<string>;
  onToggleCriterion: (criterion: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onApply: (finding: Finding) => void;
}

export function Inspector(props: Props) {
  return (
    <aside
      aria-label="Inspetor"
      className="flex min-h-0 w-full flex-col overflow-hidden border-t border-line-2 bg-bg-1 lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[420px]"
    >
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line-1 px-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-2">Inspector</span>
        {props.selectedFinding && (
          <span className="font-mono text-[10.5px] tabular-nums text-fg-3">
            {props.index}/{props.total}
          </span>
        )}
      </div>
      {props.selectedFinding ? (
        <Report key={`${props.selectedFinding.criterion}:${props.selectedFinding.span.start}`} {...props} finding={props.selectedFinding} />
      ) : (
        <Overview {...props} />
      )}
    </aside>
  );
}

/* ------------------------------------------------------------ o relatório */

function Report({ diagnostic, finding, onPrev, onNext, onClose, onApply }: Props & { finding: Finding }) {
  const meta = metaFor(finding.criterion);
  const ink = severityInkVar(finding.severity);
  const pos = offsetToLineCol(diagnostic.text, finding.span.start);
  const confidence = buildConfidence(finding);
  const canSuggest = finding.suggestion !== undefined && !finding.requiresHuman;

  return (
    <div className="case-in flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line-1 px-2">
        <span className="flex items-center gap-2 pl-2">
          <span className="size-2 rounded-[2px]" style={{ background: ink }} aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-0">{finding.criterion}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <NavBtn label="Anterior (k)" onClick={onPrev}>‹</NavBtn>
          <NavBtn label="Próximo (j)" onClick={onNext}>›</NavBtn>
          <NavBtn label="Fechar (Esc)" onClick={onClose}>✕</NavBtn>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <p className="font-mono text-[11px] text-accent">
          ABNT {finding.principle} <span className="text-fg-3">·</span> <span className="text-fg-2">{meta.principleName}</span>
        </p>
        <h3 className="mt-1.5 font-serif text-[20px] leading-tight text-fg-0">{detectionHeadline(finding)}</h3>

        <Block label="o que foi detectado">
          <Prose>{detectedProse(finding, pos.line)}</Prose>
        </Block>

        <Block label="evidência">
          <blockquote className="border-l-2 pl-3" style={{ borderColor: ink }}>
            <span className="font-serif text-[16px] leading-snug text-fg-0">
              <span className={meta.channel === "inline" ? `mark ${meta.markStyleClass}` : "passage"} style={{ "--mark-ink": ink } as React.CSSProperties}>
                {finding.span.text.replace(/\s+/g, " ").trim()}
              </span>
            </span>
          </blockquote>
          <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-fg-3">
            {meta.signal} · offsets [{finding.span.start}, {finding.span.end})
          </p>
        </Block>

        <Block label="por que importa">
          <Prose>{meta.why}</Prose>
        </Block>

        <Block label="análise">
          <Prose>{finding.justification}</Prose>
        </Block>

        <Block label="confiança da engine">
          <ConfidenceBadge level={confidence.level} />
          <Prose className="mt-2">{confidence.rationale}</Prose>
        </Block>

        <Block label={canSuggest ? "resolução" : "limite da automação · próximo passo"}>
          {canSuggest ? <SafeResolution suggestion={finding.suggestion!} onApply={() => onApply(finding)} /> : <Guidance finding={finding} />}
        </Block>

        <p className="mt-7 border-t border-line-1 pt-3 font-mono text-[10px] leading-relaxed text-fg-3">
          regra determinística · {finding.criterion} · {CATEGORY_LABEL[finding.category]} · severidade {SEVERITY_LABEL[finding.severity]}
        </p>
      </div>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  if (level === "segura") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-line bg-accent-weak px-2 py-1 font-mono text-[11px] text-accent">
        <span aria-hidden>✓</span> segura para sugerir
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line-2 px-2 py-1 font-mono text-[11px] text-fg-1">
      <span aria-hidden>◐</span> assistida · a decisão é sua
    </span>
  );
}

/* ------------------------------------------------------------- resolução */

function SafeResolution({ suggestion, onApply }: { suggestion: string; onApply: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-line-2 bg-bg-2 px-3 py-2.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[12px] text-accent" aria-hidden>→</span>
          <span className="truncate font-serif text-[15px] text-fg-0">{suggestion}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <Act onClick={copy}>{copied ? "copiado" : "copiar"}</Act>
          <Act onClick={onApply} accent>aplicar</Act>
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-fg-2">
        Substituição 1:1, sem reconjugação e com a regência preservada — por isso pode ser aplicada com segurança.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ orientação */

function Guidance({ finding }: { finding: Finding }) {
  if (finding.criterion === "long_sentence") return <LongSentenceGuide finding={finding} />;
  if (finding.criterion === "passive_voice") return <PassiveGuide finding={finding} />;
  if (finding.criterion === "nominalization") return <NominalizationGuide finding={finding} />;
  return <JargonGuide />;
}

function LongSentenceGuide({ finding }: { finding: Finding }) {
  const g = longSentenceGuidance(finding);
  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-fg-2">
        A ferramenta não reescreve — mas localiza o trabalho e mede o esforço:
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="palavras" value={g.words != null ? String(g.words) : "—"} />
        <Stat label="acima de" value={g.over != null ? `+${g.over}` : "—"} />
        <Stat label="meta" value={g.targetSentences != null ? `~${g.targetSentences} frases` : "—"} />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-fg-2">
        Carga de subordinação: <span className="font-mono text-fg-1">{g.subordination}</span> marcadores (vírgulas e conjunções encadeadas).
      </p>

      {g.candidates.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3">
            pontos de divisão sugeridos · você decide onde cortar
          </p>
          <ul className="flex flex-col gap-1.5">
            {g.candidates.map((c) => (
              <li key={c.offset} className="rounded-md border border-line-1 bg-bg-2 px-2.5 py-1.5 font-serif text-[12.5px] leading-snug">
                <span className="text-fg-2">…{c.before}</span>
                <span className="mx-1 font-mono text-accent" aria-hidden>▸</span>
                <span className="text-fg-1">{c.after}…</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PassiveGuide({ finding }: { finding: Finding }) {
  const hasAgent = finding.meta?.hasAgent === true;
  return (
    <div className="rounded-md border border-line-2 bg-bg-2 px-3 py-2.5">
      <p className="text-[12.5px] leading-relaxed text-fg-1">
        {hasAgent ? (
          <>
            <span className="font-medium text-fg-0">Andaime para a voz ativa.</span> O agente já está no trecho: ele vira o
            sujeito, e o particípio vira o verbo. Monte a frase e confira a concordância — a versão final é sua.
          </>
        ) : (
          <>
            <span className="font-medium text-fg-0">Falta o agente.</span> Para reescrever na ativa, responda:{" "}
            <span className="text-fg-0">quem praticou a ação?</span> Só com essa informação a frase ativa é possível — e a
            resposta é sua, não da ferramenta.
          </>
        )}
      </p>
    </div>
  );
}

function NominalizationGuide({ finding }: { finding: Finding }) {
  const base = typeof finding.meta?.baseVerb === "string" ? finding.meta.baseVerb : null;
  return (
    <div className="rounded-md border border-line-2 bg-bg-2 px-3 py-2.5">
      <p className="text-[12.5px] leading-relaxed text-fg-1">
        {base && (
          <>
            <span className="font-medium text-fg-0">Verbo-base: “{base}”.</span>{" "}
          </>
        )}
        Reescreva com o verbo direto (ex.: “fazer a análise” → “analisar”). A engine não gera a troca automática porque
        exigiria reconjugar o verbo ou ajustar o complemento — passos que só você deve decidir.
      </p>
    </div>
  );
}

function JargonGuide() {
  return (
    <div className="rounded-md border border-line-2 bg-bg-2 px-3 py-2.5">
      <p className="text-[12.5px] leading-relaxed text-fg-1">
        Há um equivalente mais simples no glossário, mas a troca depende do que vem a seguir na frase. Confirme que o
        contexto é um sintagma nominal (não uma oração) antes de substituir.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line-1 bg-bg-2 px-2 py-2 text-center">
      <div className="font-mono text-[14px] tabular-nums text-fg-0">{value}</div>
      <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-fg-3">{label}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- overview */

function Overview({ diagnostic, activeCriteria, onToggleCriterion }: Props) {
  return (
    <div className="rise min-h-0 flex-1 overflow-y-auto">
      <Section label="auditoria">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[26px] leading-none tabular-nums text-fg-0">{diagnostic.findings.length}</span>
          <span className="text-[12px] text-fg-2">diagnósticos</span>
        </div>
        <SeverityBar diagnostic={diagnostic} />
        <p className="mt-3 text-[11px] italic leading-relaxed text-fg-3">
          O placar mede, não aprova. Ausência de diagnósticos não é atestado de clareza.
        </p>
      </Section>

      <Section label="regras" border>
        <ul className="flex flex-col gap-0.5">
          {CRITERION_ORDER.map((criterion) => {
            const score = diagnostic.score.byCriterion.find((c) => c.criterion === criterion);
            const count = score ? score.count.info + score.count.warning + score.count.error : 0;
            const active = activeCriteria.has(criterion);
            return (
              <li key={criterion}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleCriterion(criterion)}
                  className={`kv-row flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-bg-3 ${active ? "opacity-100" : "opacity-40"}`}
                >
                  <MarkSample criterion={criterion} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-0">{criterion}</span>
                  <span className="font-mono text-[10.5px] text-fg-3">{score?.principle}</span>
                  <span className="w-4 text-right font-mono text-[12px] tabular-nums text-fg-1">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section label="métricas" border>
        <dl className="flex flex-col">
          {metricRows(diagnostic).map((r) => (
            <div key={r.label} className="flex items-baseline justify-between border-b border-line-1 py-1.5 last:border-0">
              <dt className="font-mono text-[11.5px] text-fg-2">{r.label}</dt>
              <dd className="flex items-baseline gap-2">
                {r.note && <span className="font-mono text-[10px] text-fg-3">{r.note}</span>}
                <span className="font-mono text-[12px] tabular-nums text-fg-1">{r.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section label="engine" border>
        <dl className="flex flex-col gap-1.5">
          <EngineRow k="mode" v="determinístico" dot />
          <EngineRow k="version" v={`lucid ${diagnostic.meta.lucidVersion}`} />
          <EngineRow k="config" v={diagnostic.meta.configHash} />
          <EngineRow k="offsets" v="utf-16 · nfc" />
          <EngineRow k="standard" v={diagnostic.meta.standardVersion} />
        </dl>
      </Section>
    </div>
  );
}

function SeverityBar({ diagnostic }: { diagnostic: Diagnostic }) {
  const total = diagnostic.findings.length;
  const counts: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const f of diagnostic.findings) counts[f.severity]++;
  const order: Severity[] = ["error", "warning", "info"];
  return (
    <div className="mt-3">
      {total > 0 && (
        <div className="flex h-1 overflow-hidden rounded-full bg-bg-3" role="img" aria-label="Severidade">
          {order.map((s) => (counts[s] > 0 ? <span key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: severityInkVar(s) }} /> : null))}
        </div>
      )}
      <div className="mt-2 flex gap-4 font-mono text-[11px] text-fg-2">
        {order.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-[1px]" style={{ background: severityInkVar(s) }} aria-hidden />
            {SEVERITY_LABEL[s]} {counts[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

function metricRows(diagnostic: Diagnostic) {
  const m = diagnostic.metrics;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return [
    { label: "flesch_pt", value: fmt(m.fleschPt), note: "apoio·5.4" },
    { label: "words", value: fmt(m.words) },
    { label: "sentences", value: fmt(m.sentences) },
    { label: "words/sentence", value: fmt(m.wordsPerSentence) },
    { label: "syllables/word", value: fmt(m.syllablesPerWord) },
  ] as Array<{ label: string; value: string; note?: string }>;
}

function MarkSample({ criterion }: { criterion: string }) {
  const meta = metaFor(criterion);
  if (meta.channel === "passage") {
    return (
      <span aria-hidden className="grid h-4 w-6 place-items-center rounded-[2px]" style={{ background: "color-mix(in srgb, var(--sev-warn) 16%, transparent)" }}>
        <span className="h-3 w-0.5 rounded-full" style={{ background: "var(--sev-warn)" }} />
      </span>
    );
  }
  return <span aria-hidden className={`mark ${meta.markStyleClass} w-6 text-center text-[13px] leading-none text-fg-2`}>abc</span>;
}

function Section({ label, border, children }: { label: string; border?: boolean; children: React.ReactNode }) {
  return (
    <section className={`px-4 py-4 ${border ? "border-t border-line-1" : ""}`}>
      <h2 className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-2">{label}</h2>
      {children}
    </section>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-3">{label}</p>
      {children}
    </div>
  );
}

function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[13px] leading-relaxed text-fg-1 ${className ?? ""}`}>{children}</p>;
}

function EngineRow({ k, v, dot }: { k: string; v: string; dot?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[11px] text-fg-3">{k}</span>
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-fg-1">
        {dot && <span className="size-1.5 rounded-full bg-accent" aria-hidden />}
        {v}
      </span>
    </div>
  );
}

function NavBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid size-6 place-items-center rounded text-[12px] text-fg-2 transition-colors duration-[120ms] hover:bg-bg-3 hover:text-fg-0">
      {children}
    </button>
  );
}

function Act({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[4px] px-2 py-1 font-mono text-[11px] transition-colors duration-[120ms] ${accent ? "text-accent hover:bg-accent-weak" : "text-fg-2 hover:bg-bg-3 hover:text-fg-1"}`}>
      {children}
    </button>
  );
}
