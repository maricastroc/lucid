"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Mode } from "./document-view";
import { useTheme } from "../hooks/use-theme";
import { useUiLang } from "../i18n/lang";
import { useCopy } from "../i18n/use-copy";
import { MoonIcon, SunIcon } from "./icons";

interface Props {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
  onOpenDocument: (file: File) => void;
  onGoHome: () => void;
  importing: boolean;
}

export function Masthead({ mode, onChangeMode, onOpenDocument, onGoHome, importing }: Props) {
  const { theme, toggle } = useTheme();
  const { c } = useCopy();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-rule-1 bg-desk px-4 sm:px-6">
      <button
        type="button"
        onClick={onGoHome}
        aria-label={c.masthead.home}
        className="flex items-center gap-3 rounded-lg transition-opacity duration-150 hover:opacity-80"
      >
        <Logo />
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[19px] font-semibold leading-none tracking-[-0.01em] text-ink-0">Lucid</span>
          <span className="hidden h-3 w-px bg-rule-2 sm:block" aria-hidden />
          <span className="hidden text-[12.5px] text-ink-2 sm:block">{c.masthead.tagline}</span>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onOpenDocument(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={importing}
          className="hidden items-center gap-1.5 rounded-full border border-rule-2 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 disabled:opacity-60 sm:inline-flex"
        >
          {importing ? c.masthead.opening : c.masthead.openDocument}
        </button>
        <Link
          href="/avaliacao"
          className="hidden items-center rounded-full border border-rule-2 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 sm:inline-flex"
        >
          {c.masthead.evaluation}
        </Link>

        <div
          role="tablist"
          aria-label={c.masthead.workMode}
          className="flex items-center rounded-full border border-rule-2 bg-surface p-0.5"
        >
          {(
            [
              ["audit", c.masthead.review],
              ["edit", c.masthead.write],
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

        <LanguageToggle />

        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "light" ? c.masthead.darkTheme : c.masthead.lightTheme}
          className="grid size-9 place-items-center rounded-full border border-rule-2 text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0"
        >
          {theme === "light" ? <MoonIcon className="size-4.25" /> : <SunIcon className="size-4.25" />}
        </button>
      </div>
    </header>
  );
}

function LanguageToggle() {
  const { lang, toggle } = useUiLang();
  const { c } = useCopy();
  const target = lang === "pt-BR" ? "en" : "pt-BR";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={c.language.switchTo[target]}
      title={c.language.switchTo[target]}
      className="u-label grid size-9 place-items-center rounded-full border border-rule-2 text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0"
    >
      {c.language.short[target]}
    </button>
  );
}

function Logo() {
  const { theme } = useTheme();
  return (
    <Image
      src={theme === "light" ? "/icon-light.svg" : "/icon-dark.svg"}
      alt=""
      aria-hidden
      width={32}
      height={32}
      className="size-8 rounded-[9px] shadow-[0_0_0_1px_rgb(31_29_24/0.06),0_1px_2px_rgb(31_29_24/0.14)]"
    />
  );
}
