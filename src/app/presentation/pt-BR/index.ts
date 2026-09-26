import { CRITERION_IDS, type CriterionId } from "@/locales/pt-BR";
import type { CriterionMeta, LocalePresentation } from "../types";
import { TEXT_UI_EN } from "./meta.en";
import { META_UI_PT } from "./meta.pt";
import { NARRATIVE_UI_EN } from "./narrative.en";
import { NARRATIVE_UI_PT } from "./narrative.pt";

const META_UI_EN = Object.fromEntries(
  CRITERION_IDS.map((id) => [id, { ...META_UI_PT[id], ...TEXT_UI_EN[id] }]),
) as Record<CriterionId, CriterionMeta>;

export const PT_PRESENTATION: LocalePresentation<CriterionId> = {
  localeId: "pt-BR",
  ids: CRITERION_IDS,
  meta: { "pt-BR": META_UI_PT, en: META_UI_EN },
  narrative: { "pt-BR": NARRATIVE_UI_PT, en: NARRATIVE_UI_EN },
  humanLead: {
    "pt-BR": {
      long_sentence:
        "Leia a frase. Se ela carrega mais de uma ideia, escolha onde separar e como reescrever; se carrega " +
        "uma só, marque como revisado.",
    },
    en: {
      long_sentence:
        "Read the sentence. If it carries more than one idea, choose where to split it and how to rewrite it; " +
        "if it carries only one, mark it as reviewed.",
    },
  },
  curated: new Set<CriterionId>([
    "jargon",
    "nominalization",
    "nominalizacao_encadeada",
    "redundancia",
    "perifrase_inflada",
    "dupla_negacao",
    "adverbios_vagos",
    "adverbio_mente_denso",
    "mais_que_perfeito_sintetico",
    "subordinacao_densa",
    "leitor_terceira_pessoa",
  ]),
  thresholdNotes: { "pt-BR": {}, en: {} },
};
