import type { Finding } from "../../lucid/core/types";

const LABEL: Record<string, string> = {
  passive_voice: "Voz passiva",
  passiva_sintetica: "Voz passiva sintética",
  nominalization: "Nominalização",
  nominalizacao_encadeada: "Nominalização encadeada",
  mais_que_perfeito_sintetico: "Mais-que-perfeito sintético",
  gerundismo: "Gerundismo",
  jargon: "Jargão",
  sigla_sem_expansao: "Sigla sem expansão",
  adverbios_vagos: "Advérbios vagos",
  adverbio_mente_denso: "Advérbios em -mente (descontinuado)",
  redundancia: "Redundância",
  perifrase_inflada: "Perífrase inflada",
  mesoclise: "Mesóclise",
  dupla_negacao: "Dupla negação",
  leitor_terceira_pessoa: "Fala indireta ao leitor",
  subordinacao_densa: "Subordinação densa",
  long_sentence: "Frase longa",
  paragraph_length: "Parágrafo longo",
  prose_enumeration: "Enumeração em prosa",
  salto_de_nivel_titulo: "Salto de nível de título",
  long_heading: "Título longo",
  single_item_list: "Lista de um item",
  heading_body_mismatch: "Título sem eco no corpo",
};

const HINT: Record<string, string> = {
  long_sentence: "O trecho é longo demais: divida em frases curtas, uma ideia por frase.",
  passive_voice: "Prefira a voz ativa: diga quem faz a ação (sem inventar, se o texto não disser).",
  nominalization: "Troque substantivos de ação pelos verbos correspondentes.",
  jargon: "Troque termos técnicos por palavras comuns equivalentes.",
  passiva_sintetica:
    'A construção com "se" esconde quem age. Se o texto disser quem é, diga; se não disser, NÃO invente.',
  nominalizacao_encadeada: "Desfaça a cadeia de substantivos de ação: use os verbos correspondentes.",
  sigla_sem_expansao: "A sigla aparece antes de ser apresentada — escreva por extenso na primeira vez.",
  adverbios_vagos: "Corte o advérbio de reforço que não acrescenta informação.",
  perifrase_inflada: "Troque a locução inflada pela palavra simples equivalente.",
  mesoclise: "Desfaça a mesóclise usando a forma comum do verbo.",
  mais_que_perfeito_sintetico: "Troque o mais-que-perfeito sintético pela forma composta.",
  gerundismo: "Use a forma simples do verbo no lugar do gerundismo.",
  redundancia: "Corte a redundância: um dos termos já diz tudo.",
  dupla_negacao: "Afirme direto no lugar de negar o negativo.",
  leitor_terceira_pessoa: 'Fale com o leitor: "você", no lugar do substantivo em terceira pessoa.',
  subordinacao_densa: "Separe as orações subordinadas encadeadas em frases próprias.",
  single_item_list: "Uma lista de um item só não é lista — reintegre o item ao texto.",
  prose_enumeration: "Os itens estão embutidos na prosa e ficam difíceis de localizar.",
  paragraph_length: "O parágrafo acumula frases demais.",
};

export const criterionLabel = (criterion: string): string => LABEL[criterion] ?? criterion;

const FALLBACK_HINT = "Resolva o problema de clareza apontado neste ponto.";

const HUMAN_TAIL =
  " — este ponto exige julgamento: resolva SEM inventar; se a única saída for inventar, mantenha como está.";

function shortExamples(findings: readonly Finding[]): string {
  const spans = [
    ...new Set(
      findings.map((f) => f.span.text.replace(/\s+/gu, " ").trim()).filter((s) => s.split(/\s+/u).length <= 6),
    ),
  ];
  return spans.length ? ` (ex.: ${spans.map((s) => `"${s}"`).join(", ")})` : "";
}

export function renderBriefing(findings: readonly Finding[]): string {
  const order: string[] = [];
  const byCriterion = new Map<string, Finding[]>();
  for (const finding of findings) {
    const bucket = byCriterion.get(finding.criterion);
    if (bucket) bucket.push(finding);
    else {
      byCriterion.set(finding.criterion, [finding]);
      order.push(finding.criterion);
    }
  }

  return order
    .map((criterion) => {
      const group = byCriterion.get(criterion)!;
      const human = group.every((f) => f.requiresHuman) ? HUMAN_TAIL : "";
      return `- ${criterionLabel(criterion)} · ${group.length}× — ${HINT[criterion] ?? FALLBACK_HINT}${shortExamples(
        group,
      )}${human}`;
    })
    .join("\n");
}
