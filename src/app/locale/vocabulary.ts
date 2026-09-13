import { configSections, type Config, type OrgTerm } from "@/lucid";
import type { AnalysisLocale } from "./active";

export function vocabularyTerms(config: Config, locale: AnalysisLocale): readonly OrgTerm[] {
  const section = locale.vocabularySection;
  if (section === null) return [];
  const terms = configSections(config)[section]?.terms;
  return Array.isArray(terms) ? (terms as readonly OrgTerm[]) : [];
}

export function withVocabularyTerms(config: Config, locale: AnalysisLocale, terms: readonly OrgTerm[]): Config {
  const section = locale.vocabularySection;
  if (section === null) return config;
  const current = configSections(config)[section] ?? {};
  return { ...config, [section]: { ...current, terms } } as Config;
}

export function termKey(term: string, locale: AnalysisLocale): string {
  return term.toLocaleLowerCase(locale.id);
}
