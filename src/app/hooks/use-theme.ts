"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const CHANGE_EVENT = "lucid-theme-change";

/** Lê o tema efetivo do DOM (o script inline do layout já aplicou o valor salvo). */
function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

/**
 * Tema como store externo (DOM + localStorage), lido via `useSyncExternalStore` — sem
 * setState em efeito, sem mismatch de hidratação (snapshot de servidor = "dark", o
 * dark-first do produto). O toggle grava `data-theme` + localStorage e notifica os
 * assinantes; o script inline no layout evita flash na carga.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "dark");

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lucid-theme", next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { theme, toggle };
}
