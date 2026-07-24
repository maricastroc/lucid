import type { CriterionTaxonomyEntry } from "@/lucid/core/types";
import type { CriterionId } from "./criteria";

/**
 * Taxonomia dos critérios (ADR-056) — FONTE ÚNICA da proveniência.
 *
 * Cada critério declara:
 * - `source`: de onde vem sua autoridade (norma ISO, extensão editorial PT-BR, ou
 *   heurística estrutural);
 * - `principleGroup`: a dimensão de Linguagem Simples à qual ele contribui;
 * - `normativeReference`: presente SÓ quando `source === "iso-24495-1"` — a união
 *   discriminada de `CriterionTaxonomyEntry` torna impossível um critério editorial
 *   ou heurístico carregar uma seção ISO (invariante de honestidade).
 *
 * O analyzer carimba estes campos em cada finding a partir daqui; os passes não
 * declaram mais sua própria autoridade normativa.
 *
 * Régua para `source: "iso-24495-1"`: o critério operacionaliza uma diretriz que a
 * norma ENUNCIA (mesmo em nível de princípio). NÃO significa "a ISO nomeia este
 * dispositivo". Fenômenos de registro/uso do português sem diretriz na norma são
 * `editorial-pt-br`; higiene estrutural sem diretriz direta é `structural-heuristic`.
 *
 * Seções ISO: 5.1 Relevante · 5.2 Localizável · 5.3.2 palavras familiares ·
 * 5.3.3 frases claras · 5.3.4 frases concisas · 5.4 Usável.
 */
const ABNT = "ABNT NBR ISO 24495-1" as const;
function iso(section: string, principleGroup: CriterionTaxonomyEntry["principleGroup"]): CriterionTaxonomyEntry {
  return { source: "iso-24495-1", principleGroup, normativeReference: { standard: ABNT, section } };
}

export const CRITERION_TAXONOMY: Record<CriterionId, CriterionTaxonomyEntry> = {
  long_sentence: iso("5.3.4", "understandable"),
  passive_voice: iso("5.3.3", "understandable"),
  passiva_sintetica: iso("5.3.3", "understandable"),
  nominalization: iso("5.3.3", "understandable"),
  nominalizacao_encadeada: iso("5.3.3", "understandable"),
  jargon: iso("5.3.2", "understandable"),
  sigla_sem_expansao: iso("5.3.2", "understandable"),
  redundancia: iso("5.3.4", "understandable"),
  perifrase_inflada: iso("5.3.4", "understandable"),
  dupla_negacao: iso("5.3.3", "understandable"),
  subordinacao_densa: iso("5.3.4", "understandable"),
  leitor_terceira_pessoa: iso("5.3.3", "understandable"),
  paragraph_length: iso("5.2", "findable"),
  prose_enumeration: iso("5.2", "findable"),
  long_heading: iso("5.2", "findable"),
  salto_de_nivel_titulo: iso("5.2", "findable"),

  mais_que_perfeito_sintetico: { source: "editorial-pt-br", principleGroup: "understandable" },
  gerundismo: { source: "editorial-pt-br", principleGroup: "understandable" },
  mesoclise: { source: "editorial-pt-br", principleGroup: "understandable" },
  adverbio_mente_denso: { source: "editorial-pt-br", principleGroup: "understandable" },
  adverbios_vagos: { source: "editorial-pt-br", principleGroup: "understandable" },
  single_item_list: { source: "structural-heuristic", principleGroup: "findable" },
  heading_body_mismatch: { source: "structural-heuristic", principleGroup: "findable" },
};
