import type { UiLang } from "../i18n/types";

export function languageOf(tag: string): string {
  return tag.split("-")[0].toLowerCase();
}

export function speaksSameLanguage(uiLang: UiLang, localeId: string): boolean {
  return languageOf(uiLang) === languageOf(localeId);
}

export function engineOutputSuffix(uiLang: UiLang, localeId: string): string {
  return speaksSameLanguage(uiLang, localeId) ? "" : ` · ${localeId}`;
}
