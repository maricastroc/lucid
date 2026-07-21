"use client";

/**
 * Barra de título do "IDE" — mínima. Marca + descritor, e o tema. A instrumentação de
 * engine mora na status bar (rodapé), como num editor de verdade.
 */
import { useTheme } from "../hooks/use-theme";

export function TitleBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-line-2 bg-bg-1 px-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-5 place-items-center rounded-[5px] bg-accent">
          <span className="size-1.5 rounded-[1px] bg-accent-ink" aria-hidden />
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-fg-0">Lucid</span>
        <span className="hidden font-mono text-[11px] text-fg-3 sm:inline">análise estática de linguagem</span>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === "light" ? "Tema escuro" : "Tema claro"}
        className="grid size-7 place-items-center rounded-md border border-line-2 text-fg-1 transition-colors duration-[120ms] hover:bg-bg-3 hover:text-fg-0"
      >
        <span aria-hidden className="text-[12px]">{theme === "light" ? "◑" : "◐"}</span>
      </button>
    </header>
  );
}
