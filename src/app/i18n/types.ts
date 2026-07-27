export type UiLang = "pt-BR" | "en";

export const UI_LANGS: readonly UiLang[] = ["pt-BR", "en"];

export const DEFAULT_UI_LANG: UiLang = "pt-BR";

export function isUiLang(value: unknown): value is UiLang {
  return value === "pt-BR" || value === "en";
}
