import { isCriterionId, type CriterionId } from "@/locales/pt-BR/criteria";
import { isEnCriterionId, type EnCriterionId } from "@/locales/en-US/criteria";

export type UiCriterionId = CriterionId | EnCriterionId;

export function isUiCriterionId(value: string): value is UiCriterionId {
  return isCriterionId(value) || isEnCriterionId(value);
}
