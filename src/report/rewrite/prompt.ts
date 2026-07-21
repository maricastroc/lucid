/**
 * Tier 3 · prompts VERSIONADOS da reescrita (ADR-016/017).
 *
 * DUAS ESTRATÉGIAS, para o benchmark comparar SISTEMAS (não só textos):
 *   · `correct@1` — orientada a CORRIGIR o finding com a MENOR alteração possível: mantém a
 *     estrutura e a ordem das ideias, troca o mínimo. É a hipótese conservadora.
 *   · `rewrite@2` — REESCRITA DO ZERO para linguagem cidadã: liberdade para reorganizar,
 *     condensar e mudar a estrutura do trecho. É a hipótese ousada.
 *
 * Ambas são BLINDADAS igualmente contra o risco fatal do LLM — inventar: nenhuma pode
 * acrescentar fato, e nenhuma pode inventar quem praticou a ação (o "nós" fabricado). Quem
 * julga a saída é o verificador determinístico + a sonda; o prompt só propõe.
 *
 * Trocar QUALQUER palavra de um prompt exige subir a versão da estratégia — o id do proposer
 * carrega `<estratégia@versão>`, então a mudança é rastreável no benchmark.
 */
import type { Span } from "../../lucid/core/types";

export type RewriteStrategy = "correct" | "rewrite";

export const STRATEGY_VERSION: Record<RewriteStrategy, string> = {
  correct: "correct@1",
  rewrite: "rewrite@2",
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

export function buildRewritePrompt(
  fullText: string,
  target: Span,
  options: { strategy?: RewriteStrategy; criterion?: string } = {},
): string {
  const strategy = options.strategy ?? "rewrite";
  return strategy === "correct"
    ? buildCorrectPrompt(target, options.criterion)
    : buildFreePrompt(fullText, target, options.criterion);
}
