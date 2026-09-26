import type { Proof, ProofOutcome, VerificationSignal } from "./types";

export type CheckKind = "guarantee" | "effect" | "signal" | "probabilistic";

export interface CheckSpec<K extends CheckKind = CheckKind> {
  readonly kind: K;
  readonly proves: string;
  readonly limit: string;
  readonly adr: string;
}

export interface ProofCheckSpec extends CheckSpec<"guarantee" | "effect"> {
  readonly outcomes: readonly ProofOutcome[];
}

export const PROOF_CHECKS: { readonly [C in Proof["check"]]: ProofCheckSpec } = {
  numbers_kept: {
    kind: "guarantee",
    proves:
      "Toda sequência de algarismos do trecho original aparece na proposta com a mesma grafia, pelo menos tantas vezes quanto no original.",
    limit:
      "Não confirma a que cada número se refere. Números escritos por extenso ficam de fora. Não se aplica quando o trecho original não tem algarismos.",
    adr: "ADR-109",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  numbers_added: {
    kind: "guarantee",
    proves:
      "Toda sequência de algarismos da proposta aparece no trecho original com a mesma grafia, no máximo tantas vezes quanto no original.",
    limit:
      "Um número acrescentado pode estar correto: o Lucid mostra que ele não tem correspondência literal no original, não que está errado. Não se aplica quando a proposta não tem algarismos.",
    adr: "ADR-109",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  dates_kept: {
    kind: "guarantee",
    proves:
      "Toda data escrita só com algarismos (dia, mês e ano separados por barra, hífen ou ponto) do trecho original aparece na proposta com a mesma grafia.",
    limit:
      "Datas por extenso ficam de fora; delas, só os algarismos entram na verificação de números, e o mês não é conferido. Não se aplica quando o trecho original não tem data em algarismos.",
    adr: "ADR-109",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  dates_added: {
    kind: "guarantee",
    proves: "Toda data escrita só com algarismos da proposta aparece no trecho original com a mesma grafia.",
    limit:
      "Uma data acrescentada pode estar correta: o Lucid mostra que ela não tem correspondência literal no original. Não se aplica quando a proposta não tem data em algarismos.",
    adr: "ADR-109",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  no_invented_first_person: {
    kind: "guarantee",
    proves:
      "Quando nem o documento nem o agente declarado usam formas de 1ª pessoa da lista fechada do Lucid (pronomes, possessivos e verbos no plural), a proposta também não usa.",
    limit:
      "Formas de 1ª pessoa fora da lista ficam de fora. Não se aplica quando o documento ou o agente declarado já usam alguma forma da lista.",
    adr: "ADR-021",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  declared_agent_present: {
    kind: "guarantee",
    proves: "O texto do agente que o autor declarou aparece na proposta.",
    limit: "Não confirma que o agente é o sujeito da ação a que foi atribuído.",
    adr: "ADR-055",
    outcomes: ["confirmed", "not_confirmed"],
  },
  target_resolved: {
    kind: "effect",
    proves: "O detector do critério em foco não aponta mais o trecho, fora das exceções pedidas pelo autor.",
    limit: "Mede os detectores do Lucid, não a clareza do texto.",
    adr: "ADR-014",
    outcomes: ["confirmed", "not_confirmed"],
  },
  directed_findings_resolved: {
    kind: "effect",
    proves: "Os detectores dos critérios pedidos à IA não apontam mais o trecho.",
    limit: "Mede os detectores do Lucid, não a clareza do texto.",
    adr: "ADR-048",
    outcomes: ["confirmed", "not_confirmed"],
  },
  region_improved: {
    kind: "effect",
    proves: "O peso ponderado dos achados no trecho não aumentou.",
    limit: "Um achado novo pode ser compensado por outro resolvido.",
    adr: "ADR-016",
    outcomes: ["confirmed", "not_confirmed"],
  },
  no_new_findings: {
    kind: "effect",
    proves: "O peso ponderado dos achados no documento inteiro não aumentou.",
    limit: "Um achado novo pode ser compensado por outro resolvido.",
    adr: "ADR-014",
    outcomes: ["confirmed", "not_confirmed"],
  },
  no_new_jargon: {
    kind: "effect",
    proves: "Nenhum termo do glossário de jargão aparece no trecho reescrito sem ter aparecido no original.",
    limit: "Só vale para termos do glossário.",
    adr: "ADR-014",
    outcomes: ["confirmed", "not_confirmed"],
  },
};

export const SIGNAL_CHECKS: { readonly [C in VerificationSignal["check"]]: CheckSpec<"signal"> } = {
  entities_preserved: {
    kind: "signal",
    proves:
      "Lista palavras com inicial maiúscula fora do início de frase que estão no original e não estão na proposta.",
    limit: "Maiúscula não é o mesmo que nome próprio; paráfrase e expansão de sigla também disparam.",
    adr: "ADR-014",
  },
  possible_invented_agent: {
    kind: "signal",
    proves: "Lista substantivos de agente da lista do Lucid usados como sujeito na proposta e ausentes do documento.",
    limit: "Depende de uma lista fixa de substantivos.",
    adr: "ADR-053",
  },
  possible_invented_obligation: {
    kind: "signal",
    proves:
      "Aponta um marcador de dever na proposta quando o trecho original não tem nenhum marcador de dever da lista do Lucid.",
    limit: "Marcador não é o mesmo que obrigação: o futuro e a descrição também aparecem assim.",
    adr: "ADR-093",
  },
  possible_category_narrowed: {
    kind: "signal",
    proves: "Lista categorias jurídicas da lista do Lucid que estão no original e não estão na proposta.",
    limit: "Depende de uma lista fixa de categorias.",
    adr: "ADR-105",
  },
};

export interface NotVerifiedDimension {
  readonly id: string;
  readonly what: string;
}

export const NOT_VERIFIED: readonly NotVerifiedDimension[] = [
  { id: "deontic_force", what: "obrigações, permissões e proibições" },
  { id: "conditions", what: "condições e exceções" },
  { id: "scope", what: "quem é abrangido, incluindo categorias, singular e plural" },
  { id: "agency", what: "quem faz o quê, além do agente declarado pelo autor" },
  { id: "additions", what: "informações acrescentadas que não sejam números ou datas em algarismos" },
  { id: "omissions", what: "o que foi omitido fora dos números e datas em algarismos" },
  { id: "written_numbers", what: "números escritos por extenso" },
  { id: "written_dates", what: "datas escritas por extenso, inclusive o mês" },
  { id: "binding", what: "a que cada número se refere" },
  { id: "relations", what: "relações entre normas" },
  { id: "ambiguity", what: "ambiguidade introduzida" },
  { id: "clarity", what: "se o texto ficou mais claro para quem lê" },
];

export const OVERCLAIM_VOCABULARY = /invent|sentido|significado|\bfiel\b|fidelidade|aprova|atest|garant/iu;

export function checkKind(check: Proof["check"] | VerificationSignal["check"]): CheckKind {
  return check in PROOF_CHECKS
    ? PROOF_CHECKS[check as Proof["check"]].kind
    : SIGNAL_CHECKS[check as VerificationSignal["check"]].kind;
}
