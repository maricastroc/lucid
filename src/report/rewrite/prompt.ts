/**
 * Tier 3 · prompts VERSIONADOS da reescrita (ADR-016/017).
 *
 * TRÊS ESTRATÉGIAS, para o benchmark comparar SISTEMAS (não só textos):
 *   · `correct@1`  — orientada a CORRIGIR o finding com a MENOR alteração possível: mantém a
 *     estrutura e a ordem das ideias, troca o mínimo. É a hipótese conservadora.
 *   · `rewrite@2`  — REESCRITA DO ZERO para linguagem cidadã: liberdade para reorganizar,
 *     condensar e mudar a estrutura do trecho. É a hipótese ousada.
 *   · `directed@1` — a livre, mas DIRIGIDA pelos findings REAIS da engine no trecho (ADR-000:
 *     "a engine dirige, a IA executa"). Hipótese a validar no benchmark antes de virar default —
 *     por isso o Briefing como entidade de 1ª classe fica DEFERIDO até a prova (ver ADR-000).
 *
 * Todas são BLINDADAS igualmente contra o risco fatal do LLM — inventar: nenhuma pode
 * acrescentar fato, e nenhuma pode inventar quem praticou a ação (o "nós" fabricado). Quem
 * julga a saída é o verificador determinístico + a sonda; o prompt só propõe.
 *
 * Trocar QUALQUER palavra de um prompt exige subir a versão da estratégia — o id do proposer
 * carrega `<estratégia@versão>`, então a mudança é rastreável no benchmark.
 */
import type { Finding, Span } from "../../lucid/core/types";

export type RewriteStrategy = "correct" | "rewrite" | "directed";

export const STRATEGY_VERSION: Record<RewriteStrategy, string> = {
  correct: "correct@1",
  rewrite: "rewrite@2",
  directed: "directed@2",
};

/** Versão da estratégia PADRÃO (`rewrite`) — mantida para compatibilidade de import. */
export const REWRITE_PROMPT_VERSION = STRATEGY_VERSION.rewrite;

const CRITERION_HINT: Record<string, string> = {
  long_sentence: "O trecho é longo demais: divida em frases curtas, uma ideia por frase.",
  passive_voice: "Prefira a voz ativa: diga quem faz a ação (sem inventar, se o texto não disser).",
  nominalization: "Troque substantivos de ação pelos verbos correspondentes.",
  jargon: "Troque termos técnicos por palavras comuns equivalentes.",
};

const NO_INVENTION_RULES = `- NÃO acrescente fato, exemplo, número, data ou explicação que não esteja no trecho;
- NÃO invente quem praticou a ação — se o texto não diz o agente, NÃO diga (não crie "nós", "a
  equipe", "o governo" etc.);
- NÃO mude nem remova números, datas, valores ou nomes próprios.`;

/** `correct@1` — corrige com mínima alteração, preservando a estrutura. */
function buildCorrectPrompt(target: Span, criterion?: string): string {
  const hint = criterion ? (CRITERION_HINT[criterion] ?? "") : "";
  return `Você corrige trechos em Linguagem Simples com a MENOR alteração possível.

Corrija o problema de clareza do trecho abaixo, mas:
- MANTENHA a estrutura, a ordem das ideias e o máximo das palavras originais;
- NÃO reorganize o discurso nem condense além do estritamente necessário;
- faça a menor mudança que resolva o problema.
${NO_INVENTION_RULES}
${hint ? `\nProblema a resolver: ${hint}\n` : ""}
TRECHO:
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "o trecho corrigido aqui"}`;
}

/** `rewrite@2` — reescrita livre para o cidadão, com o documento inteiro de contexto. */
function buildFreePrompt(fullText: string, target: Span, criterion?: string): string {
  const hint = criterion ? (CRITERION_HINT[criterion] ?? "") : "";
  return `Você reescreve textos em Linguagem Simples para um cidadão comum, sem NUNCA inventar.

Contexto: abaixo está o DOCUMENTO INTEIRO, apenas para você entender o assunto.
"""
${fullText}
"""

Sua tarefa: reescreva SOMENTE o TRECHO-ALVO abaixo para que um cidadão comum o entenda na
primeira leitura.

Você PODE, dentro do trecho-alvo:
- reorganizar a ordem das ideias e das frases;
- dividir uma frase longa em várias curtas (uma ideia por frase);
- condensar expressões e trocar palavras difíceis por comuns;
- mudar a estrutura do trecho.

Você NÃO PODE:
${NO_INVENTION_RULES}
${hint ? `\nObservação: ${hint}\n` : ""}
TRECHO-ALVO (reescreva só isto):
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita do trecho-alvo aqui"}`;
}

/**
 * Briefing DIRIGIDO (ADR-000, "a engine dirige"): renderiza os findings REAIS que a engine
 * determinística achou no trecho-alvo, agrupados por critério — a instrução do critério (reusa
 * `CRITERION_HINT`) + os trechos CURTOS citados como exemplo (jargão, passiva). Trechos longos
 * (≈ a própria frase-alvo) não são recitados. Puro e determinístico: os findings vêm de
 * `analyze()` em ordem de documento, então a saída é função pura deles (byte-idêntica).
 *
 * `directed@2` (achado ao vivo de 2026-07-22, ver ADR-047/048): SÓ inclui findings com
 * `requiresHuman: false`. Um finding `requiresHuman: true` (passiva sem agente, jargão
 * ambíguo, nominalização sem verbo seguro) é o próprio Camada 1 dizendo "não dá pra resolver
 * sem inventar" — pedir pra IA "resolver TODOS" incluiria isso, colidindo direto com a regra de
 * não-invenção (I5) logo abaixo no mesmo prompt. Um modelo bem-comportado recusa inventar e
 * corretamente deixa a violação — não é falha do modelo, é a exigência errada.
 */
function buildDirectedBriefing(findings: readonly Finding[]): string {
  const order: string[] = [];
  const spansByCriterion = new Map<string, string[]>();
  for (const f of findings) {
    if (f.requiresHuman) continue;
    const seen = spansByCriterion.get(f.criterion);
    if (seen) seen.push(f.span.text.replace(/\s+/g, " ").trim());
    else {
      spansByCriterion.set(f.criterion, [f.span.text.replace(/\s+/g, " ").trim()]);
      order.push(f.criterion);
    }
  }
  return order
    .map((criterion) => {
      const instruction = CRITERION_HINT[criterion] ?? "Resolva o problema de clareza apontado neste ponto.";
      const shortSpans = [...new Set((spansByCriterion.get(criterion) ?? []).filter((s) => s.split(/\s+/).length <= 6))];
      const examples = shortSpans.length ? ` (ex.: ${shortSpans.map((s) => `"${s}"`).join(", ")})` : "";
      return `- ${instruction}${examples}`;
    })
    .join("\n");
}

/**
 * `directed@2` — reescrita livre DIRIGIDA pelos findings da engine no trecho. Igual à livre
 * (`rewrite@2`), mas troca a dica genérica pelo briefing dos problemas REAIS e MECANICAMENTE
 * PEDÍVEIS (`!requiresHuman`) que a engine apontou. Sem findings pedíveis, degrada para o formato
 * livre (sem bloco de briefing). Mesmas blindagens de invenção.
 */
function buildDirectedPrompt(fullText: string, target: Span, findings: readonly Finding[]): string {
  const briefing = buildDirectedBriefing(findings);
  const brief = briefing
    ? `\nA engine determinística analisou o trecho e apontou os pontos abaixo. Resolva TODOS:\n${briefing}\n`
    : "";
  return `Você reescreve textos em Linguagem Simples para um cidadão comum, sem NUNCA inventar.

Contexto: abaixo está o DOCUMENTO INTEIRO, apenas para você entender o assunto.
"""
${fullText}
"""

Sua tarefa: reescreva SOMENTE o TRECHO-ALVO abaixo para que um cidadão comum o entenda na
primeira leitura.
${brief}
Você PODE, dentro do trecho-alvo:
- reorganizar a ordem das ideias e das frases;
- dividir uma frase longa em várias curtas (uma ideia por frase);
- condensar expressões e trocar palavras difíceis por comuns;
- mudar a estrutura do trecho.

Você NÃO PODE:
${NO_INVENTION_RULES}

TRECHO-ALVO (reescreva só isto):
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita do trecho-alvo aqui"}`;
}

export function buildRewritePrompt(
  fullText: string,
  target: Span,
  options: { strategy?: RewriteStrategy; criterion?: string; findings?: readonly Finding[] } = {},
): string {
  const strategy = options.strategy ?? "rewrite";
  if (strategy === "correct") return buildCorrectPrompt(target, options.criterion);
  if (strategy === "directed") return buildDirectedPrompt(fullText, target, options.findings ?? []);
  return buildFreePrompt(fullText, target, options.criterion);
}
