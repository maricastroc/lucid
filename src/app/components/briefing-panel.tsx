"use client";

import { useState } from "react";
import type { BriefingCheck, ReaderBriefing } from "@/lucid";
import { CheckIcon, CloseIcon } from "./icons";

interface Props {
  briefing: ReaderBriefing;
  check: BriefingCheck;
  onChange: (briefing: ReaderBriefing) => void;
}

const QUESTIONS = [
  {
    key: "audience" as const,
    label: "Quem é o leitor?",
    hint: "Descreva quem vai ler de verdade — não o cargo que assina.",
    placeholder: "Ex.: cidadão sem formação jurídica que pede o benefício pela primeira vez",
  },
  {
    key: "purpose" as const,
    label: "O que ele precisa fazer depois de ler?",
    hint: "A ação ou decisão concreta que o texto tem que viabilizar.",
    placeholder: "Ex.: saber se tem direito e reunir os documentos no prazo",
  },
  {
    key: "priorKnowledge" as const,
    label: "O que ele já sabe?",
    hint: "O que se pode pressupor — e, por consequência, o que precisa ser explicado.",
    placeholder: "Ex.: sabe que existe um benefício; não conhece o vocabulário do processo",
  },
];

function Field({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3.5 block">
      <span className="block text-[12.5px] font-medium text-ink-1">{label}</span>
      <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{hint}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] leading-relaxed text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
      />
    </label>
  );
}

export function BriefingPanel({ briefing, check, onChange }: Props) {
  const [open, setOpen] = useState(check.declared);
  const [draft, setDraft] = useState("");

  const set = (key: keyof ReaderBriefing, value: string) => onChange({ ...briefing, [key]: value });

  const addExpression = () => {
    const trimmed = draft.trim();
    if (trimmed === "") return;
    if (!briefing.mustFind.includes(trimmed)) onChange({ ...briefing, mustFind: [...briefing.mustFind, trimmed] });
    setDraft("");
  };

  const removeExpression = (expression: string) =>
    onChange({ ...briefing, mustFind: briefing.mustFind.filter((item) => item !== expression) });

  return (
    <section className="border-t border-rule-1 px-6 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="u-label text-ink-3">Princípio 1 · Relevante</span>
        <span className="text-[11.5px] text-ink-3">ABNT NBR ISO 24495-1 · 5.1</span>
      </div>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-1">
        {check.declared ? "Briefing do leitor declarado por você." : "Briefing do leitor não declarado."}
      </p>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        A norma pede que você modele o leitor <em>antes</em> de escrever: quem lê, o que precisa fazer, o que entra e o
        que sai. <strong className="font-medium text-ink-2">Nenhuma regra automática decide o que é relevante para o
        seu leitor</strong> — por isso o Lucid não pontua este princípio e não o dá por cumprido. Ele pergunta, registra
        a sua resposta e confere só o que é literalmente conferível.
      </p>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
      >
        {open ? "Fechar briefing" : check.declared ? "Rever briefing" : "Declarar o briefing do leitor"}
      </button>

      {open && (
        <div className="mt-1">
          {QUESTIONS.map((question) => (
            <Field
              key={question.key}
              label={question.label}
              hint={question.hint}
              placeholder={question.placeholder}
              value={briefing[question.key]}
              onChange={(value) => set(question.key, value)}
            />
          ))}

          <div className="mt-4">
            <span className="block text-[12.5px] font-medium text-ink-1">
              O que o leitor precisa encontrar no texto?
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">
              Uma expressão por item. A ferramenta procura cada uma <strong className="font-medium">literalmente</strong>{" "}
              e diz onde está — ela não julga se o assunto foi coberto.
            </span>
            <div className="mt-1.5 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExpression();
                  }
                }}
                placeholder="Ex.: prazo de recurso"
                className="min-w-0 flex-1 rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={addExpression}
                className="shrink-0 rounded-lg border border-rule-2 px-3 py-2 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {check.coverage.length > 0 && (
        <div className="mt-4">
          <span className="u-label text-ink-3">Presença literal</span>
          <ul className="mt-2 flex flex-col gap-1.5">
            {check.coverage.map((item) => {
              const found = item.occurrences.length > 0;
              return (
                <li key={item.expression} className="flex items-start justify-between gap-2 text-[12.5px]">
                  <span className="flex min-w-0 items-start gap-1.5">
                    {found ? (
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-safe" aria-hidden />
                    ) : (
                      <CloseIcon className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
                    )}
                    <span className="min-w-0 break-words text-ink-1">
                      “{item.expression}”
                      <span className="text-ink-3">
                        {found
                          ? ` — aparece ${item.occurrences.length}×`
                          : " — não aparece com essas palavras"}
                      </span>
                    </span>
                  </span>
                  {open && (
                    <button
                      type="button"
                      onClick={() => removeExpression(item.expression)}
                      aria-label={`Remover “${item.expression}”`}
                      className="shrink-0 text-[11.5px] text-ink-3 transition-colors duration-150 hover:text-ink-0"
                    >
                      remover
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
            Busca literal, sensível a acento. Encontrar não prova que o leitor vai entender; não encontrar não prova que
            o assunto está ausente — pode estar dito com outras palavras. Esta lista é a sua, não um critério da norma:
            ela não entra no placar.
          </p>
        </div>
      )}
    </section>
  );
}
