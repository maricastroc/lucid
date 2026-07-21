"use client";

/**
 * MASTHEAD — o cabeçalho editorial. Marca + descritor, o alternador entre REVISAR (ler o
 * documento com as anotações) e ESCREVER (redigir), e o tema. Sem chrome de "IDE": a
 * instrumentação técnica vive, discreta, no rodapé do trilho.
 */
import type { Mode } from "./document-view";
import { useTheme } from "../hooks/use-theme";
import { MoonIcon, SunIcon } from "./icons";

interface Props {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
}

export function Masthead({ mode, onChangeMode }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-rule-1 bg-desk px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Logo />
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">Lucid</span>
          <span className="hidden h-3 w-px bg-rule-2 sm:block" aria-hidden />
          <span className="hidden text-[12.5px] text-ink-2 sm:block">Revisão de linguagem simples</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Modo de trabalho"
          className="flex items-center rounded-full border border-rule-2 bg-surface p-0.5"
        >
          {(
            [
              ["audit", "Revisar"],
              ["edit", "Escrever"],
            ] as const
          ).map(([m, labelText]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => onChangeMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ${
                mode === m
                  ? "bg-sheet text-ink-0 shadow-[0_1px_2px_rgb(34_32_27_/_0.08)]"
                  : "text-ink-2 hover:text-ink-0"
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
          className="grid size-9 place-items-center rounded-full border border-rule-2 text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0"
        >
          {theme === "light" ? <MoonIcon className="size-[17px]" /> : <SunIcon className="size-[17px]" />}
        </button>
      </div>
    </header>
  );
}

/** Monograma: uma página com uma marca de revisão embaixo — o gesto do produto. */
function Logo() {
  return (
    <span
      className="grid size-8 place-items-center rounded-[9px] bg-accent text-accent-ink shadow-[0_1px_2px_rgb(34_32_27_/_0.14)]"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h7l4 4v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" opacity="0.55" />
        <path d="M8.5 15.5c1.2-1 2.4-1 3.6 0s2.4 1 3.6 0" />
      </svg>
    </span>
  );
}
