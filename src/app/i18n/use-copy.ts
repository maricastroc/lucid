"use client";

import { COPY, type UiCopy } from "./copy";
import { useUiLang } from "./lang";
import type { UiLang } from "./types";

export function useCopy(): { c: UiCopy; lang: UiLang } {
  const { lang } = useUiLang();
  return { c: COPY[lang], lang };
}
