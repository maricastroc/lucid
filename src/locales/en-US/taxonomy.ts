import type { CriterionTaxonomyEntry } from "@/lucid/core/types";
import type { EnCriterionId } from "./criteria";

const ISO = "ISO 24495-1" as const;

function iso(section: string, principleGroup: CriterionTaxonomyEntry["principleGroup"]): CriterionTaxonomyEntry {
  return { source: "iso-24495-1", principleGroup, normativeReference: { standard: ISO, section } };
}

export const EN_CRITERION_TAXONOMY: Record<EnCriterionId, CriterionTaxonomyEntry> = {
  passive_voice: iso("5.3.3", "understandable"),
  hidden_verb: iso("5.3.3", "understandable"),
  reader_in_third_person: iso("5.3.3", "understandable"),
  ambiguous_shall: { source: "editorial", principleGroup: "understandable" },
  undefined_acronym: iso("5.3.2", "understandable"),
  prose_enumeration: iso("5.2.3", "findable"),
  long_sentence: iso("5.3.4", "understandable"),
  paragraph_length: iso("5.2.2", "findable"),
  long_heading: iso("5.2.4", "findable"),
  heading_level_skip: iso("5.2.4", "findable"),
  single_item_list: { source: "structural-heuristic", principleGroup: "findable" },
  organization_vocabulary: { source: "organizational", principleGroup: "understandable" },
};
