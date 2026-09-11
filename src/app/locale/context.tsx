"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AnalysisLocale } from "./active";

const AnalysisLocaleContext = createContext<AnalysisLocale | null>(null);

export function AnalysisLocaleProvider({ locale, children }: { locale: AnalysisLocale; children: ReactNode }) {
  return <AnalysisLocaleContext.Provider value={locale}>{children}</AnalysisLocaleContext.Provider>;
}

export function useAnalysisLocale(): AnalysisLocale {
  const locale = useContext(AnalysisLocaleContext);
  if (locale === null) {
    throw new Error(
      "useAnalysisLocale() fora de <AnalysisLocaleProvider>. O locale de análise não tem default: " +
        "quem analisa precisa dizer sob qual motor está analisando.",
    );
  }
  return locale;
}
