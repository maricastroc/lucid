"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_UI_LANG, isUiLang, type UiLang } from "./types";

const STORAGE_KEY = "lucid-lang";
const CHANGE_EVENT = "lucid-lang-change";

export function readLang(): UiLang {
  const attr = document.documentElement.getAttribute("data-lang");
  return isUiLang(attr) ? attr : DEFAULT_UI_LANG;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function setLang(next: UiLang): void {
  document.documentElement.setAttribute("data-lang", next);
  document.documentElement.setAttribute("lang", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    //
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useUiLang(): { lang: UiLang; toggle: () => void } {
  const lang = useSyncExternalStore<UiLang>(subscribe, readLang, () => DEFAULT_UI_LANG);
  const toggle = useCallback(() => setLang(readLang() === "pt-BR" ? "en" : "pt-BR"), []);
  return { lang, toggle };
}
