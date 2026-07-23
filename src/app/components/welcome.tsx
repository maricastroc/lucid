"use client";

import { useRef } from "react";
import { ArrowRightIcon, CheckIcon, CloseIcon, PenNibIcon } from "./icons";

interface Props {
  onWrite: () => void;
  onOpenDocx: (file: File) => void;
  onLoadExample: () => void;
  importing: boolean;
}

const VERBS = ["Analisa", "Detecta", "Explica", "Pergunta", "Verifica"] as const;

export function Welcome({ onWrite, onOpenDocx, onLoadExample, importing }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-desk" aria-label="Apresentação do Lucid">
      <div className="mx-auto flex w-full max-w-4xl flex-col px-5 py-10 sm:px-8 sm:py-16">
        <div className="fade-in overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
          <div className="px-6 py-9 sm:px-14 sm:py-14">
            {/* Sobrelinha */}
            <div className="u-label flex items-center gap-2 text-ink-3">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Auditor de Linguagem Simples
              <span className="hidden text-ink-dim sm:inline" aria-hidden>
                ·
              </span>
              <span className="hidden font-normal tracking-normal normal-case text-ink-3 sm:inline">
                ABNT NBR ISO 24495-1
              </span>
            </div>

            {/* Título — a tese */}
            <h1 className="mt-5 font-serif text-[30px] leading-[1.12] tracking-[-0.012em] text-ink-0 sm:text-[40px]">
              Lucid audita a clareza do seu texto.
              <br />
              <span className="text-ink-2">Não reescreve por você.</span>
            </h1>

            {/* Subtítulo — o que faz + distinção */}
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-1">
              Ele confronta cada trecho com os princípios de Linguagem Simples da norma ABNT: mostra o que
              trava o leitor, cita o critério que disparou e explica o porquê.{" "}
              <span className="font-medium text-ink-0">A palavra final é sempre sua.</span>
            </p>

            {/* Cadeia de verbos — o pipeline */}
            <div className="mt-8">
              <div className="u-sublabel text-ink-3">O que ele faz</div>
              <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
                {VERBS.map((verb, i) => (
                  <span key={verb} className="inline-flex items-center gap-1.5">
                    <span className="rounded-full border border-rule-2 bg-surface px-3 py-1 text-[13px] font-medium text-ink-0">
                      {verb}
                    </span>
                    {i < VERBS.length - 1 && (
                      <ArrowRightIcon className="size-3.5 text-ink-dim" aria-hidden />
                    )}
                  </span>
                ))}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-[13px] text-ink-2">
                <span className="grid size-4.5 place-items-center rounded-full border border-human-line bg-human-weak">
                  <CloseIcon className="size-2.5 text-human" />
                </span>
                O que ele <span className="font-medium text-ink-1">não</span> faz: escrever o texto no seu
                lugar.
              </div>
            </div>

            {/* Ações de entrada */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInput}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onOpenDocx(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={onWrite}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-accent-ink shadow-(--shadow-card) transition-colors duration-150 hover:bg-accent-strong"
              >
                <PenNibIcon className="size-4" />
                Escrever ou colar texto
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={importing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rule-2 px-5 py-2.5 text-[13.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 disabled:opacity-60"
              >
                {importing ? "Abrindo…" : "Abrir .docx"}
              </button>
              <button
                type="button"
                onClick={onLoadExample}
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13.5px] font-medium text-accent transition-colors duration-150 hover:bg-accent-weak sm:ml-1"
              >
                Carregar exemplo
                <ArrowRightIcon className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Anatomia de uma anotação — mostra a forma real da saída */}
          <div className="border-t border-rule-1 bg-surface/40 px-6 py-8 sm:px-14">
            <div className="u-sublabel text-ink-3">Cada trecho vira uma anotação assim</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <AnatomyCard title="O critério que disparou" body="Voz passiva, jargão, frase longa, nominalização — cada um ligado a um princípio da norma." />
              <AnatomyCard title="Por que trava o leitor" body="A justificativa em português claro, e o trecho exato marcado no documento." />
              <AnatomyCard title="O que fazer com isso" body="Uma decisão honesta sobre quem resolve." >
                <div className="mt-3 flex flex-col gap-1.5">
                  <Outcome kind="safe" label="Troca direta indicada" />
                  <Outcome kind="human" label="Decisão sua" />
                </div>
              </AnatomyCard>
            </div>
          </div>

          {/* Rodapé de confiança */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule-1 px-6 py-4 text-[11.5px] text-ink-3 sm:px-14">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Análise 100% determinística
            </span>
            <span aria-hidden>·</span>
            <span>Mesmo texto, mesmo resultado</span>
            <span aria-hidden>·</span>
            <span>Sem nuvem, sem reescrita automática</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnatomyCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-rule-1 bg-sheet px-4 py-3.5">
      <div className="text-[13px] font-semibold text-ink-0">{title}</div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
      {children}
    </div>
  );
}

function Outcome({ kind, label }: { kind: "safe" | "human"; label: string }) {
  if (kind === "safe") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-safe-line bg-safe-weak px-2 py-0.5 text-[11px] font-medium text-safe">
        <CheckIcon className="size-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-human-line bg-human-weak px-2 py-0.5 text-[11px] font-medium text-human">
      <PenNibIcon className="size-3" />
      {label}
    </span>
  );
}
