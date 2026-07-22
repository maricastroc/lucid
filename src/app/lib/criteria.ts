/**
 * Metadados de APRESENTAÇÃO dos critérios — puros, de view. A autoridade sobre
 * critério/princípio/severidade é sempre o `Finding` do engine; aqui só traduzimos para
 * a IDENTIDADE EDITORIAL (nome humano, forma da marca) e para a curadoria do que
 * explicar. Nada é inventado: `signal` descreve o mecanismo determinístico real de cada
 * pass (ADR-006/007/008); `why` é glosa curada do princípio da norma.
 *
 * Nomes internos (`long_sentence`, `requiresHuman`, …) NUNCA vazam para o usuário — só
 * `label` e a copy em português aparecem na interface.
 */
import type { Category, CriterionId, Finding, Severity } from "@/lucid";
import { isCriterionId } from "@/lucid";

/**
 * Um critério de apresentação é, por construção, um critério do engine: `Criterion` é o
 * `CriterionId` publicado por `@/lucid` (ADR-029). Assim, `CRITERION_META` abaixo é um
 * `Record<CriterionId, …>` — se o engine ganha um pass novo, este módulo deixa de compilar
 * até que a copy editorial dele seja escrita. Não há mais registro paralelo digitado à mão.
 */
export type Criterion = CriterionId;
export type Channel = "inline" | "passage";

export interface CriterionMeta {
  /** nome humano — o único que aparece na UI */
  label: string;
  ruleId: Criterion;
  /** tipo de trabalho editorial (para o cabeçalho da nota) */
  kind: string;
  /** diretriz da norma, em português corrente */
  principleName: string;
  channel: Channel;
  markStyleClass: string;
  /** como a regra determinística dispara (instrumentação honesta) */
  signal: string;
  /** por que isso afeta a leitura (glosa curta do princípio) */
  why: string;
}

/** Ordem de apresentação — sintaxe primeiro, depois léxico, depois medida. */
export const CRITERION_ORDER: readonly Criterion[] = [
  "passive_voice",
  "nominalization",
  "mais_que_perfeito_sintetico",
  "gerundismo",
  "jargon",
  "adverbio_mente_denso",
  "redundancia",
  "perifrase_inflada",
  "mesoclise",
  "dupla_negacao",
  "leitor_terceira_pessoa",
  "subordinacao_densa",
  "long_sentence",
  "paragraph_length",
  "prose_enumeration",
  "salto_de_nivel_titulo",
  "long_heading",
  "single_item_list",
  "heading_body_mismatch",
];

export const CRITERION_META: Record<Criterion, CriterionMeta> = {
  passive_voice: {
    label: "Voz passiva",
    ruleId: "passive_voice",
    kind: "Construção sintática",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dotted",
    signal: "âncora numa forma de “ser” seguida de particípio, em janela local de palavras",
    why: "Some quem pratica a ação — e o leitor precisa saber quem faz o quê.",
  },
  nominalization: {
    label: "Nominalização",
    ruleId: "nominalization",
    kind: "Escolha lexical",
    principleName: "Frases claras e concisas",
    channel: "inline",
    markStyleClass: "mark-dashed",
    signal: "verbo-suporte + determinante + substantivo derivado de verbo, em adjacência estrita",
    why: "Esconde a ação dentro de um substantivo e alonga a frase sem necessidade.",
  },
  jargon: {
    label: "Jargão",
    ruleId: "jargon",
    kind: "Escolha lexical",
    principleName: "Palavras familiares",
    channel: "inline",
    markStyleClass: "mark-solid",
    signal: "correspondência exata num glossário curado (maior correspondência primeiro)",
    why: "Termo pouco familiar fora do domínio afasta o leitor não especialista.",
  },
  long_sentence: {
    label: "Frase longa",
    ruleId: "long_sentence",
    kind: "Extensão da frase",
    principleName: "Frases concisas",
    channel: "passage",
    markStyleClass: "",
    signal: "contagem de palavras da frase acima do limite configurado",
    why: "Frases longas sobrecarregam a memória de trabalho de quem lê.",
  },
  mais_que_perfeito_sintetico: {
    label: "Mais-que-perfeito",
    ruleId: "mais_que_perfeito_sintetico",
    kind: "Tempo verbal",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dotted",
    signal: "forma num léxico de mais-que-perfeito sintético (derivado do PortiLexicon-UD), já sem formas ambíguas",
    why: "Forma verbal pouco usada na fala (“fizera” = “tinha feito”) — de leitura mais difícil.",
  },
  gerundismo: {
    label: "Gerundismo",
    ruleId: "gerundismo",
    kind: "Construção sintática",
    principleName: "Frases concisas",
    channel: "inline",
    markStyleClass: "mark-dashed",
    signal: "padrão “ir + estar + gerúndio” (ex.: “vai estar enviando”)",
    why: "Alonga a frase sem necessidade — a forma simples (“vai enviar”) é mais direta.",
  },
  adverbio_mente_denso: {
    label: "Advérbios em -mente",
    ruleId: "adverbio_mente_denso",
    kind: "Escolha lexical",
    principleName: "Frases concisas",
    channel: "inline",
    markStyleClass: "mark-solid",
    signal: "concentração de advérbios em -mente na mesma frase (allowlist do PortiLexicon-UD)",
    why: "O empilhamento de advérbios em -mente pesa a leitura.",
  },
  redundancia: {
    label: "Redundância",
    ruleId: "redundancia",
    kind: "Escolha lexical",
    principleName: "Frases concisas",
    channel: "inline",
    markStyleClass: "mark-solid",
    signal: "correspondência num léxico curado de pleonasmos e duplas redundantes",
    why: "Um termo repete o sentido do outro sem acrescentar informação.",
  },
  perifrase_inflada: {
    label: "Perífrase inflada",
    ruleId: "perifrase_inflada",
    kind: "Escolha lexical",
    principleName: "Frases concisas",
    channel: "inline",
    markStyleClass: "mark-dashed",
    signal: "locução cadastrada que ocupa o lugar de uma preposição/conjunção simples",
    why: "Alonga a frase no lugar de uma palavra simples.",
  },
  paragraph_length: {
    label: "Parágrafo longo",
    ruleId: "paragraph_length",
    kind: "Estrutura do documento",
    principleName: "Fácil de localizar",
    channel: "passage",
    markStyleClass: "",
    signal: "contagem de frases do parágrafo acima do limite configurado",
    why: "Um paredão de frases dificulta varrer o texto e achar a informação.",
  },
  prose_enumeration: {
    label: "Enumeração em prosa",
    ruleId: "prose_enumeration",
    kind: "Estrutura do documento",
    principleName: "Fácil de localizar",
    channel: "passage",
    markStyleClass: "",
    signal: "≥3 ordinais distintos (a partir de “primeiro”) no mesmo parágrafo",
    why: "Itens embutidos no texto corrido são mais difíceis de localizar que uma lista.",
  },
  mesoclise: {
    label: "Mesóclise",
    ruleId: "mesoclise",
    kind: "Forma verbal",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dotted",
    signal: "pronome encaixado no meio do verbo + terminação de futuro/condicional",
    why: "Forma arcaica (“far-se-á”) de leitura difícil — a forma comum é mais direta.",
  },
  dupla_negacao: {
    label: "Dupla negação",
    ruleId: "dupla_negacao",
    kind: "Construção sintática",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dashed",
    signal: "expressão cadastrada que afirma negando o negativo (litotes)",
    why: "O leitor precisa desfazer a negação para chegar ao sentido afirmativo.",
  },
  subordinacao_densa: {
    label: "Subordinação densa",
    ruleId: "subordinacao_densa",
    kind: "Construção sintática",
    principleName: "Frases concisas",
    channel: "passage",
    markStyleClass: "",
    signal: "concentração de conectivos subordinativos na mesma frase (léxico curado, sem os polissêmicos)",
    why: "Muitas orações subordinadas encadeadas prendem ideias demais numa frase só e pesam a leitura.",
  },
  leitor_terceira_pessoa: {
    label: "Fala indireta ao leitor",
    ruleId: "leitor_terceira_pessoa",
    kind: "Construção sintática",
    principleName: "Frases claras",
    channel: "inline",
    markStyleClass: "mark-dotted",
    signal: "substantivo que nomeia o leitor em posição de sujeito + verbo deôntico numa janela local",
    why: "Falar do leitor em terceira pessoa distancia; dizer “você” aproxima e deixa claro quem deve agir.",
  },
  salto_de_nivel_titulo: {
    label: "Salto de nível de título",
    ruleId: "salto_de_nivel_titulo",
    kind: "Estrutura do documento",
    principleName: "Fácil de localizar",
    channel: "passage",
    markStyleClass: "",
    signal: "título cujo nível pula mais de um degrau abaixo do título anterior (só em documento estruturado)",
    why: "Saltos na hierarquia de títulos quebram a leitura por estrutura — sumário, varredura, leitor de tela.",
  },
  long_heading: {
    label: "Título longo",
    ruleId: "long_heading",
    kind: "Estrutura do documento",
    principleName: "Fácil de localizar",
    channel: "passage",
    markStyleClass: "",
    signal: "título acima do limite de palavras, ou pontuado/formado como frase (só em documento estruturado)",
    why: "Um título é um rótulo para varrer e localizar; longo ou em forma de frase, deixa de cumprir esse papel.",
  },
  single_item_list: {
    label: "Lista de um item",
    ruleId: "single_item_list",
    kind: "Estrutura do documento",
    principleName: "Fácil de localizar",
    channel: "passage",
    markStyleClass: "",
    signal: "bloco de lista com exatamente um item (só em documento estruturado)",
    why: "Uma lista existe para comparar vários itens; com um só, não ajuda a localizar e sugere item faltando.",
  },
  heading_body_mismatch: {
    label: "Título sem eco no corpo",
    ruleId: "heading_body_mismatch",
    kind: "Estrutura do documento",
    principleName: "Relevância para o leitor",
    channel: "passage",
    markStyleClass: "",
    signal: "nenhuma palavra de conteúdo do título aparece no corpo da seção (comparação exata, sem lemas)",
    why: "Um título que não antecipa o conteúdo da seção deixa de ajudar o leitor a saber se vale a pena ler.",
  },
};

export function isCriterion(value: string): value is Criterion {
  return isCriterionId(value);
}
export function metaFor(criterion: string): CriterionMeta {
  return isCriterion(criterion) ? CRITERION_META[criterion] : CRITERION_META.jargon;
}

export function findingId(f: Finding): string {
  return `${f.criterion}:${f.span.start}:${f.span.end}`;
}

/* ---- Severidade -------------------------------------------------------- */

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 };
export function severityRank(sev: Severity): number {
  return SEVERITY_RANK[sev];
}
export function severityInkVar(sev: Severity): string {
  if (sev === "error") return "var(--sev-error)";
  if (sev === "warning") return "var(--sev-warn)";
  return "var(--sev-info)";
}
/** Rótulos humanos e editoriais — sem "info/alerta/erro" de terminal. */
export const SEVERITY_LABEL: Record<Severity, string> = {
  info: "Observação",
  warning: "Atenção",
  error: "Prioritário",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  lexical: "léxico",
  syntactic: "sintaxe",
  structural: "estrutura",
  metric: "métrica",
};

/* ---- Estado de automação (o eixo central da identidade do Lucid) ------- */

export type ActionState = "safe" | "human";

/** Segura só quando o engine assina uma substituição mecânica e não pede julgamento. */
export function actionStateOf(f: Finding): ActionState {
  return f.suggestion !== undefined && !f.requiresHuman ? "safe" : "human";
}
export function isSafe(f: Finding): boolean {
  return actionStateOf(f) === "safe";
}

/* ---- Princípios da norma (agrupamento por seção) ----------------------- */

/** Nome do princípio a partir da subseção ABNT (5.1→Relevante … 5.4→Usável). */
export function principleGroupOf(principle: string): string {
  if (principle.startsWith("5.1")) return "Relevante";
  if (principle.startsWith("5.2")) return "Localizável";
  if (principle.startsWith("5.4")) return "Usável";
  return "Compreensível";
}
