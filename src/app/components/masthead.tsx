"use client";

import { useRef } from "react";
import type { Mode } from "./document-view";
import { useTheme } from "../hooks/use-theme";
import { MoonIcon, SunIcon } from "./icons";

interface Props {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
  onOpenDocx: (file: File) => void;
  importing: boolean;
}

export function Masthead({ mode, onChangeMode, onOpenDocx, importing }: Props) {
  const { theme, toggle } = useTheme();
  const fileInput = useRef<HTMLInputElement>(null);

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
          onClick={() => fileInput.current?.click()}
          disabled={importing}
          className="hidden items-center gap-1.5 rounded-full border border-rule-2 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 disabled:opacity-60 sm:inline-flex"
        >
          {importing ? "Abrindo…" : "Abrir .docx"}
        </button>

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
                  ? "bg-sheet text-ink-0 shadow-[0_0_0_1px_rgb(31_29_24/0.05),0_1px_2px_rgb(31_29_24/0.1)]"
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
          {theme === "light" ? <MoonIcon className="size-4.25" /> : <SunIcon className="size-4.25" />}
        </button>
      </div>
    </header>
  );
}

function Logo() {
  const { theme } = useTheme();
  return (
    <img
      src={theme === "light" ? "/icon-light.svg" : "/icon-dark.svg"}
      alt=""
      aria-hidden
      className="size-8 rounded-[9px] shadow-[0_0_0_1px_rgb(31_29_24/0.06),0_1px_2px_rgb(31_29_24/0.14)]"
    />
  );
}
