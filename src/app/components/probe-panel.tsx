"use client";

import { useEffect, useRef, useState } from "react";
import type { OperacaoLeitura, ProbeResult, ProbeSignal } from "@/lucid/probe/types";
import { useCopy } from "../i18n/use-copy";
import { excerptState, PROBE_MAX_EXCERPT } from "../lib/probe-excerpt";
import { SendNotice } from "./send-notice";
import type { UiCopy } from "../i18n/copy";
import { Button } from "./ui/button";

interface ProbeResponse {
  signal: ProbeSignal;
  result: ProbeResult;
  probeId: string;
}

type Status = "idle" | "loading" | "done" | "error";

export function ProbePanel({
  excerpt: rawExcerpt,
  onClearExcerpt,
  suggestedQuestion,
}: {
  excerpt: string;
  onClearExcerpt: () => void;
  suggestedQuestion: string;
}) {
  const { c } = useCopy();
  const t = c.probe;
  const [pergunta, setPergunta] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<ProbeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const excerpt = excerptState(rawExcerpt);
  const canRun = pergunta.trim() !== "" && excerpt.sendable && status !== "loading";
  const stale = data !== null && resultText !== null && resultText !== excerpt.text;

  useEffect(() => () => abortRef.current?.abort(), []);

  async function run() {
    if (!canRun) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: excerpt.text, pergunta }),
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => null)) as ProbeResponse | { error?: string } | null;
      if (!res.ok || json === null || !("signal" in json)) {
        setError((json && "error" in json && json.error) || t.httpFailure(res.status));
        setStatus("error");
        return;
      }
      setData(json);
      setResultText(excerpt.text);
      setStatus("done");
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(String(cause));
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  return (
    <div className="px-4 pb-5">
      <p className="text-[12px] leading-relaxed text-ink-3">{t.lead}</p>

      <ExcerptBox excerpt={excerpt} onClear={onClearExcerpt} />

      {suggestedQuestion.trim() !== "" && pergunta.trim() === "" && (
        <button
          type="button"
          onClick={() => setPergunta(suggestedQuestion.trim())}
          className="mt-3 block w-full rounded-lg border border-dashed border-rule-2 px-3 py-2 text-left text-[12px] leading-relaxed text-ink-2 transition-colors duration-150 hover:bg-surface-2"
        >
          {t.useBriefingPurpose} <span className="text-ink-1">“{suggestedQuestion.trim()}”</span>
        </button>
      )}

      <label className="mt-3 block">
        <span className="text-[12px] text-ink-2">{t.questionLabel}</span>
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          rows={2}
          placeholder={t.questionPlaceholder}
          className="mt-1.5 w-full resize-none rounded-lg border border-rule-2 bg-sheet px-3 py-2 text-[13px] text-ink-0 shadow-(--shadow-card) transition-colors placeholder:text-ink-3 focus:border-accent-line focus:outline-none"
        />
      </label>

      <SendNotice text={excerpt.text} />

      <Button variant="outline" size="lg" onClick={run} disabled={!canRun} className="mt-2 bg-sheet">
        {status === "loading" ? t.running : t.run}
      </Button>

      {status === "error" && (
        <p className="mt-3 text-[12px]" style={{ color: "var(--sev-error)" }}>
          {error}
        </p>
      )}

      {status === "done" && data && (
        <>
          {stale && (
            <p className="mt-3 text-[12px] font-medium" style={{ color: "var(--sev-warn)" }}>
              {t.staleWarning}
            </p>
          )}
          <ProbeResultView data={data} />
        </>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-ink-3">{t.caveat}</p>
    </div>
  );
}

function ExcerptBox({ excerpt, onClear }: { excerpt: ReturnType<typeof excerptState>; onClear: () => void }) {
  const { c } = useCopy();
  const t = c.probe;

  if (excerpt.empty) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-rule-2 px-3 py-2.5 text-[12px] leading-relaxed text-ink-3">
        {t.selectPrompt}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="u-sublabel text-ink-3">{t.excerptLabel}</span>
        <Button variant="ghost" size="xs" onClick={onClear}>
          {t.clearExcerpt}
        </Button>
      </div>
      <blockquote className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-rule-2 bg-sheet px-3 py-2.5">
        <span className="whitespace-pre-wrap font-serif text-[13.5px] leading-snug text-ink-1">{excerpt.text}</span>
      </blockquote>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-2">{t.onlyThisExcerpt}</p>
      {excerpt.tooLong && (
        <p role="alert" className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: "var(--sev-warn)" }}>
          {t.excerptTooLong(excerpt.chars, PROBE_MAX_EXCERPT)}
        </p>
      )}
    </div>
  );
}

function ProbeResultView({ data }: { data: ProbeResponse }) {
  const { c } = useCopy();
  const t = c.probe;
  const { signal, result } = data;
  const operacoes = signal.operacoes;

  if (signal.tipo === "flag") {
    return (
      <div
        className="mt-3 rounded-lg border px-3 py-3"
        style={{
          borderColor: "color-mix(in srgb, var(--sev-warn) 42%, transparent)",
          background: "color-mix(in srgb, var(--sev-warn) 6%, transparent)",
        }}
      >
        <p className="text-[12.5px] font-medium" style={{ color: "var(--sev-warn)" }}>
          {t.stuck}
          <span className="u-sublabel ml-1.5 font-normal text-ink-3">{c.common.engineOutputSuffix}</span>
        </p>
        <p className="mt-1 text-[12px] text-ink-2" lang="pt-BR">
          {signal.motivo}.
        </p>

        {result.ondeTravou.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {result.ondeTravou.map((stop, i) => (
              <li key={i} className="text-[12px] text-ink-2" lang="pt-BR">
                <span className="text-ink-3">{t.excerpt}</span> “{stop.frase}” — {stop.motivo}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-[12px] text-ink-3">
          {t.extracted}{" "}
          <span className="text-ink-2" lang="pt-BR">
            “{result.respostaExtraida}”
          </span>
        </p>

        <Operacoes operacoes={operacoes} />
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-rule-1 bg-surface-2 px-3 py-3">
      <p className="text-[12.5px] text-ink-2">
        {t.noFloorViolation}
        <span className="u-sublabel ml-1.5 text-ink-3">{c.common.engineOutputSuffix}</span>
      </p>
      <p className="mt-1 text-[12px] text-ink-3" lang="pt-BR">
        {signal.nota}
      </p>

      <p className="mt-2 text-[12px] text-ink-3">
        {t.extracted}{" "}
        <span className="text-ink-2" lang="pt-BR">
          “{result.respostaExtraida}”
        </span>
      </p>

      <Operacoes operacoes={operacoes} />
    </div>
  );
}

function Operacoes({ operacoes }: { operacoes: readonly OperacaoLeitura[] }) {
  const { c } = useCopy();
  if (operacoes.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="u-sublabel text-ink-3">{c.probe.loadLabel}</p>
      <ul className="mt-1.5 space-y-1">
        {operacoes.map((op) => (
          <li key={op} className="text-[12px] text-ink-2">
            · {operationLabel(c, op)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function operationLabel(c: UiCopy, op: OperacaoLeitura): string {
  return c.probe.operations[op];
}
