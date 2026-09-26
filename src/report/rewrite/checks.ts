import type { Proof, ProofOutcome, RewriteVerification, VerificationSignal } from "./types";

export type CheckKind = "guarantee" | "effect" | "signal" | "probabilistic";

export interface CheckSpec<K extends CheckKind = CheckKind> {
  readonly kind: K;
  readonly proves: string;
  readonly limit: string;
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
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  numbers_added: {
    kind: "guarantee",
    proves:
      "Toda sequência de algarismos da proposta aparece no trecho original com a mesma grafia, no máximo tantas vezes quanto no original.",
    limit:
      "Um número acrescentado pode estar correto: o Lucid mostra que ele não tem correspondência literal no original, não que está errado. Não se aplica quando a proposta não tem algarismos.",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  dates_kept: {
    kind: "guarantee",
    proves:
      "Toda data escrita só com algarismos (dia, mês e ano separados por barra, hífen ou ponto) do trecho original aparece na proposta com a mesma grafia.",
    limit:
      "Datas por extenso ficam de fora; delas, só os algarismos entram na verificação de números, e o mês não é conferido. Não se aplica quando o trecho original não tem data em algarismos.",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  dates_added: {
    kind: "guarantee",
    proves: "Toda data escrita só com algarismos da proposta aparece no trecho original com a mesma grafia.",
    limit:
      "Uma data acrescentada pode estar correta: o Lucid mostra que ela não tem correspondência literal no original. Não se aplica quando a proposta não tem data em algarismos.",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  references_kept: {
    kind: "guarantee",
    proves:
      "Toda referência do trecho original a artigo, parágrafo, inciso, alínea, caput ou norma numerada aparece na proposta, em qualquer grafia reconhecida (art./artigo, §/parágrafo, ordinal em algarismo ou por extenso até décimo, nº com ou sem ponto).",
    limit:
      "Não confirma a que dispositivo a referência se liga nem se ela continua no mesmo papel na frase. Referências anafóricas (“o parágrafo anterior”, “este artigo”) e itens de enumeração não são reconhecidas. Não se aplica quando o trecho original não tem referência.",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  references_added: {
    kind: "guarantee",
    proves:
      "Toda referência da proposta a artigo, parágrafo, inciso, alínea, caput ou norma numerada aparece no trecho original, em qualquer grafia reconhecida.",
    limit:
      "Uma referência acrescentada pode estar correta, como “§ 1º” no lugar de “o parágrafo anterior”: o Lucid mostra que ela não aparece explicitamente no original, não que está errada. Não se aplica quando a proposta não tem referência.",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  label_kept: {
    kind: "guarantee",
    proves:
      "Quando o trecho original começa por rótulo de dispositivo (Art. N, § N, Parágrafo único, inciso em romano seguido de travessão ou alínea com parêntese), a proposta começa pelo mesmo rótulo, com espaço, ordinal e grafia art./artigo normalizados.",
    limit:
      "Não confirma que o conteúdo sob o rótulo continua o mesmo. Não se aplica quando o trecho original não começa por rótulo.",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  values_kept: {
    kind: "guarantee",
    proves:
      "Todo valor em reais, percentual ou prazo em algarismos (dias, meses, anos, horas, semanas, minutos) do trecho original aparece na proposta com o mesmo número e a mesma unidade.",
    limit:
      "Valores e prazos escritos por extenso ficam de fora, e “ponto percentual” não é tratado como percentual. Não confirma a que o valor se refere. Não se aplica quando o trecho original não tem valor desse tipo.",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  values_added: {
    kind: "guarantee",
    proves:
      "Todo valor em reais, percentual ou prazo em algarismos da proposta aparece no trecho original com o mesmo número e a mesma unidade.",
    limit:
      "Um valor acrescentado pode estar correto, como “30 dias” no lugar de “trinta dias”: o Lucid mostra que ele não aparece com essa unidade no original. Não se aplica quando a proposta não tem valor desse tipo.",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  written_dates_kept: {
    kind: "guarantee",
    proves: "Toda data por extenso com dia, mês e ano do trecho original aparece por extenso na proposta.",
    limit:
      "Datas sem dia ou sem ano (“março de 1990”) ficam de fora. Uma data reescrita em algarismos conta como não encontrada por extenso. Não se aplica quando o trecho original não tem data desse tipo.",
    outcomes: ["confirmed", "not_confirmed", "not_applicable"],
  },
  written_dates_added: {
    kind: "guarantee",
    proves: "Toda data por extenso com dia, mês e ano da proposta aparece por extenso no trecho original.",
    limit: "Uma data acrescentada pode estar correta. Não se aplica quando a proposta não tem data desse tipo.",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  markup_added: {
    kind: "guarantee",
    proves:
      "A proposta não contém marcação (**, __, crase, colchetes, # ou > no início de linha) que não esteja no trecho original.",
    limit: "Só vale para essa lista de marcações. Hífen de lista não conta como marcação.",
    outcomes: ["confirmed", "addition"],
  },
  no_invented_first_person: {
    kind: "guarantee",
    proves:
      "Quando nem o documento nem o agente declarado usam formas de 1ª pessoa da lista fechada do Lucid (pronomes, possessivos e verbos no plural), a proposta também não usa.",
    limit:
      "Formas de 1ª pessoa fora da lista ficam de fora. Não se aplica quando o documento ou o agente declarado já usam alguma forma da lista.",
    outcomes: ["confirmed", "addition", "not_applicable"],
  },
  declared_agent_present: {
    kind: "guarantee",
    proves: "O texto do agente que o autor declarou aparece na proposta.",
    limit: "Não confirma que o agente é o sujeito da ação a que foi atribuído.",
    outcomes: ["confirmed", "not_confirmed"],
  },
  target_resolved: {
    kind: "effect",
    proves: "O detector do critério em foco não aponta mais o trecho, fora das exceções pedidas pelo autor.",
    limit: "Mede os detectores do Lucid, não a clareza do texto.",
    outcomes: ["confirmed", "not_confirmed"],
  },
  directed_findings_resolved: {
    kind: "effect",
    proves: "Os detectores dos critérios pedidos à IA não apontam mais o trecho.",
    limit: "Mede os detectores do Lucid, não a clareza do texto.",
    outcomes: ["confirmed", "not_confirmed"],
  },
  region_improved: {
    kind: "effect",
    proves: "O peso ponderado dos achados no trecho não aumentou.",
    limit: "Um achado novo pode ser compensado por outro resolvido.",
    outcomes: ["confirmed", "not_confirmed"],
  },
  no_new_findings: {
    kind: "effect",
    proves: "O peso ponderado dos achados no documento inteiro não aumentou.",
    limit: "Um achado novo pode ser compensado por outro resolvido.",
    outcomes: ["confirmed", "not_confirmed"],
  },
  no_new_jargon: {
    kind: "effect",
    proves: "Nenhum termo do glossário de jargão aparece no trecho reescrito sem ter aparecido no original.",
    limit: "Só vale para termos do glossário.",
    outcomes: ["confirmed", "not_confirmed"],
  },
};

export const SIGNAL_CHECKS: { readonly [C in VerificationSignal["check"]]: CheckSpec<"signal"> } = {
  entities_preserved: {
    kind: "signal",
    proves:
      "Lista palavras com inicial maiúscula fora do início de frase que estão no original e não estão na proposta.",
    limit: "Maiúscula não é o mesmo que nome próprio; paráfrase e expansão de sigla também disparam.",
  },
  possible_invented_agent: {
    kind: "signal",
    proves: "Lista substantivos de agente da lista do Lucid usados como sujeito na proposta e ausentes do documento.",
    limit: "Depende de uma lista fixa de substantivos.",
  },
  possible_invented_obligation: {
    kind: "signal",
    proves:
      "Aponta um marcador de dever na proposta quando o trecho original não tem nenhum marcador de dever da lista do Lucid.",
    limit: "Marcador não é o mesmo que obrigação: o futuro e a descrição também aparecem assim.",
  },
  possible_category_narrowed: {
    kind: "signal",
    proves: "Lista categorias jurídicas da lista do Lucid que estão no original e não estão na proposta.",
    limit: "Depende de uma lista fixa de categorias.",
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
  {
    id: "additions",
    what: "informações acrescentadas que não sejam números, datas, valores com unidade, referências ou marcação",
  },
  { id: "omissions", what: "o que foi omitido fora dos números, datas, valores com unidade, referências e rótulo" },
  { id: "written_numbers", what: "números e valores escritos por extenso" },
  { id: "written_dates", what: "datas por extenso sem dia, mês e ano completos" },
  { id: "binding", what: "a que cada número, valor ou referência se refere" },
  { id: "relations", what: "relações entre normas: o que altera, revoga ou regulamenta o quê" },
  { id: "ambiguity", what: "ambiguidade introduzida" },
  { id: "clarity", what: "se o texto ficou mais claro para quem lê" },
];

export const OVERCLAIM_VOCABULARY = /invent|sentido|significado|\bfiel\b|fidelidade|aprova|atest|garant/iu;

export function checkKind(check: Proof["check"] | VerificationSignal["check"]): CheckKind {
  return check in PROOF_CHECKS
    ? PROOF_CHECKS[check as Proof["check"]].kind
    : SIGNAL_CHECKS[check as VerificationSignal["check"]].kind;
}

export function divergences(verification: Pick<RewriteVerification, "proofs">): Proof[] {
  return verification.proofs.filter(
    (p) => PROOF_CHECKS[p.check].kind === "guarantee" && (p.outcome === "not_confirmed" || p.outcome === "addition"),
  );
}

export function needsAuthorDecision(verification: Pick<RewriteVerification, "proofs">): boolean {
  return divergences(verification).length > 0;
}
