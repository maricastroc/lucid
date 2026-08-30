"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "../hooks/use-theme";
import { useUiLang } from "../i18n/lang";
import { useCopy } from "../i18n/use-copy";
import { MoonIcon, SunIcon } from "./icons";
import { IconButton } from "./ui/button";

export function Masthead({ onGoHome }: { onGoHome: () => void }) {
  const { theme, toggle } = useTheme();
  const { c } = useCopy();

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
        <Link
          href="/avaliacao"
          className="hidden items-center rounded-full border border-rule-2 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 sm:inline-flex"
        >
          {c.masthead.evaluation}
        </Link>

        <LanguageToggle />

        <IconButton
          label={theme === "light" ? c.masthead.darkTheme : c.masthead.lightTheme}
          variant="outline"
          size="lg"
          shape="pill"
          onClick={toggle}
        >
          {theme === "light" ? <MoonIcon className="size-4.25" /> : <SunIcon className="size-4.25" />}
        </IconButton>
      </div>
    </header>
  );
}

function LanguageToggle() {
  const { lang, toggle } = useUiLang();
  const { c } = useCopy();
  const target = lang === "pt-BR" ? "en" : "pt-BR";

  return (
    <IconButton
      label={c.language.switchTo[target]}
      variant="outline"
      size="lg"
      shape="pill"
      onClick={toggle}
      className="u-label"
    >
      {c.language.short[target]}
    </IconButton>
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
