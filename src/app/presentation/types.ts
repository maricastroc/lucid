import type { UiLang } from "../i18n/types";
import type { UiCriterionId } from "../locale/criteria";
import type { CriterionNarrative } from "../lib/narrative-types";

export type Channel = "inline" | "passage";

export interface CriterionMeta {
  label: string;
  ruleId: UiCriterionId;
  kind: string;
  principleName: string;
  channel: Channel;
  markStyleClass: string;
  signal: string;
  why: string;
}

export type CriterionText = Pick<CriterionMeta, "label" | "kind" | "principleName" | "signal" | "why">;

export type ByUiLang<T> = Readonly<Record<UiLang, T>>;

export interface SwapCopy {
  readonly source: string;
  readonly applyNote: string;
}

export interface LocalePresentation<Id extends string = string> {
  readonly localeId: string;
  readonly ids: readonly Id[];
  readonly meta: ByUiLang<Readonly<Record<Id, CriterionMeta>>>;
  readonly narrative: ByUiLang<Readonly<Record<Id, CriterionNarrative>>>;
  readonly humanLead: ByUiLang<Readonly<Partial<Record<Id, string>>>>;
  readonly curated: ReadonlySet<Id>;
  readonly thresholdNotes: ByUiLang<Readonly<Record<string, string>>>;
  readonly swap?: ByUiLang<Readonly<Partial<Record<Id, SwapCopy>>>>;
}
