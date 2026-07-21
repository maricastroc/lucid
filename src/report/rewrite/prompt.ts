/**
 * Tier 3 · prompt VERSIONADO da reescrita (ADR-016).
 *
 * `rewrite@2`: o modelo lê o DOCUMENTO INTEIRO como contexto e reescreve SOMENTE o trecho-alvo
 * — mas com liberdade real: pode reorganizar as frases do trecho, condensar e mudar a
 * estrutura, para um cidadão comum entender na primeira leitura. É esse salto (reorganizar o
 * discurso, não trocar palavra a palavra) que faltava.
 *
 * A liberdade é contrabalançada pela BLINDAGEM contra o risco fatal do LLM: inventar. O prompt
 * proíbe acrescentar informação e — o ponto crítico — proíbe **inventar quem praticou a ação**
 * (o erro clássico de "humanizar" texto impessoal criando um "nós"). Quem julga a saída é o
 * verificador determinístico + a sonda de compreensão; o prompt só propõe.
 *
 * Trocar QUALQUER palavra deste prompt exige subir `REWRITE_PROMPT_VERSION` — o id do proposer
 * carrega a versão, então a mudança é rastreável no benchmark.
 */
import type { Span } from "../../lucid/core/types";

export const REWRITE_PROMPT_VERSION = "rewrite@2";

/** Dica específica do que a reescrita precisa resolver, quando há um critério (caminho finding). */
const CRITERION_HINT: Record<string, string> = {
  long_sentence: "O trecho é longo demais: divida em frases curtas, uma ideia por frase.",
  passive_voice: "Prefira a voz ativa: diga quem faz a ação (sem inventar, se o texto disser).",
  nominalization: "Troque substantivos de ação pelos verbos correspondentes.",
  jargon: "Troque termos técnicos por palavras comuns equivalentes.",
};

export function buildRewritePrompt(fullText: string, target: Span, criterion?: string): string {
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
- acrescentar fato, exemplo, número, data ou explicação que não esteja no trecho;
- inventar quem praticou a ação — se o texto não diz o agente, NÃO diga (não crie "nós", "a
  equipe", "o governo" etc.);
- mudar ou remover números, datas, valores ou nomes próprios.
${hint ? `\nObservação: ${hint}\n` : ""}
TRECHO-ALVO (reescreva só isto):
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita do trecho-alvo aqui"}`;
}
