"use client";

/**
 * SONDA DE COMPREENSÃO — o painel da Camada 2, opt-in e SEMPRE honesto.
 *
 * Regra inegociável (I5 / CLAUDE.md): a sonda NUNCA emite check verde. O melhor caso é "neutro"
 * = ausência de uma falha de piso, jamais prova de compreensão. Um `flag` mostra ONDE o leitor de
 * piso travou. É teste NEGATIVO, não selo. Camada 2 (LLM) → não determinística, por isso vive
 * num painel à parte, com o caveat sempre visível.
 */
import { useState } from "react";
import type { OperacaoLeitura, ProbeResult, ProbeSignal } from "@/lucid/probe/types";

interface ProbeResponse {
  signal: ProbeSignal;
  result: ProbeResult;
  probeId: string;
}

const OPERACAO_LABEL: Record<OperacaoLeitura, string> = {
  resolver_referente_a_distancia: "resolver a quem um pronome se refere, à distância",
  integrar_entre_frases: "juntar informação de mais de uma frase",
  decodificar_termo_tecnico: "decodificar um termo técnico",
  inferir_agente_omitido: "inferir um agente que o texto não diz",
  segurar_sujeito_longo: "segurar um sujeito longo antes do verbo",
  desfazer_negacao_aninhada: "desfazer uma negação aninhada",
};

type Status = "idle" | "loading" | "done" | "error";

export function ProbePanel({ text }: { text: string }) {
  const [pergunta, setPergunta] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<ProbeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = pergunta.trim() !== "" && text.trim() !== "" && status !== "loading";

  async function run() {
    if (!canRun) return;
    setStatus("loading");
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, pergunta }),
      });
      const json = (await res.json().catch(() => null)) as ProbeResponse | { error?: string } | null;
      if (!res.ok || json === null || !("signal" in json)) {
        setError((json && "error" in json && json.error) || `falha (HTTP ${res.status})`);
        setStatus("error");
        return;
      }
      setData(json);
      setStatus("done");
    } catch (cause) {
      setError(String(cause));
      setStatus("error");
    }
  }

  return (
    <section className="border-t border-rule-1 px-6 py-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Sonda de compreensão</h3>
        <span className="text-[10.5px] uppercase tracking-[0.1em] text-ink-3">Camada 2 · opt-in</span>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
        Um leitor sintético de piso lê <em>só</em> o texto acima e tenta responder à pergunta. É um teste{" "}
        <strong className="text-ink-2">negativo</strong>: pode achar uma falha, nunca aprovar.
      </p>

      <label className="mt-3 block">
        <span className="text-[12px] text-ink-2">O que o leitor veio saber?</span>
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          rows={2}
          placeholder="Ex.: quando o prazo começa a contar?"
          className="mt-1 w-full resize-none rounded-lg border border-rule-1 bg-surface-2 px-3 py-2 text-[13px] text-ink-1 placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={run}
        disabled={!canRun}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-[12.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "loading" ? "Testando o piso…" : "Testar o piso de compreensão"}
      </button>

      {status === "error" && <p className="mt-3 text-[12px]" style={{ color: "var(--sev-error)" }}>{error}</p>}

      {status === "done" && data && <ProbeResultView data={data} />}

      <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
        Camada 2 usa um modelo de linguagem: <strong className="text-ink-2">não é determinística</strong> como o
        restante da auditoria. Passar no piso é a ausência de uma falha, <strong className="text-ink-2">nunca prova de
        clareza</strong> — para isso, só teste com leitores reais (Princípio 4 da norma).
      </p>
    </section>
  );
}

function ProbeResultView({ data }: { data: ProbeResponse }) {
  const { signal, result } = data;
  const operacoes = signal.operacoes;

  if (signal.tipo === "flag") {
    return (
      <div className="mt-3 rounded-lg border px-3 py-3" style={{ borderColor: "var(--sev-warn)" }}>
        <p className="text-[12.5px] font-medium" style={{ color: "var(--sev-warn)" }}>
          O leitor de piso travou.
        </p>
        <p className="mt-1 text-[12px] text-ink-2">{signal.motivo}.</p>

        {result.ondeTravou.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {result.ondeTravou.map((t, i) => (
              <li key={i} className="text-[12px] text-ink-2">
                <span className="text-ink-3">trecho:</span> “{t.frase}” — {t.motivo}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-[12px] text-ink-3">
          Resposta que ele conseguiu extrair: <span className="text-ink-2">“{result.respostaExtraida}”</span>
        </p>

        <Operacoes operacoes={operacoes} />
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-rule-1 bg-surface-2 px-3 py-3">
      <p className="text-[12.5px] text-ink-2">Sem violação de piso detectada.</p>
      <p className="mt-1 text-[12px] text-ink-3">{signal.nota}</p>
      <Operacoes operacoes={operacoes} />
    </div>
  );
}

function Operacoes({ operacoes }: { operacoes: readonly OperacaoLeitura[] }) {
  if (operacoes.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-3">Carga de leitura</p>
      <ul className="mt-1.5 space-y-1">
        {operacoes.map((op) => (
          <li key={op} className="text-[12px] text-ink-2">
            · {OPERACAO_LABEL[op]}
          </li>
        ))}
      </ul>
    </div>
  );
}
