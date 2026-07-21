/**
 * Tier 3 · prompt VERSIONADO da reescrita (ADR-015).
 *
 * O modelo só PROPÕE uma reescrita fiel do trecho — quem julga é o verificador
 * determinístico. O prompt é blindado contra o risco fatal do LLM (inventar/adicionar
 * informação): manda reescrever SÓ o que está no trecho, preservar números/datas/nomes, e
 * responder apenas o JSON. `temperature 0` + modelo fixado + esta versão = reprodutibilidade
 * suficiente para eval (mesma disciplina da sonda, ARQUITETURA §5).
 *
 * Trocar QUALQUER palavra deste prompt exige subir `REWRITE_PROMPT_VERSION` — o id do
 * proposer carrega a versão, então uma mudança é rastreável no benchmark.
 */

export const REWRITE_PROMPT_VERSION = "rewrite@1";

/** Dica específica do que a reescrita precisa resolver, por critério do finding. */
const CRITERION_HINT: Record<string, string> = {
  long_sentence: "Divida em frases curtas, uma ideia por frase.",
  passive_voice: "Prefira a voz ativa: diga quem faz a ação.",
  nominalization: "Troque o substantivo de ação pelo verbo correspondente.",
  jargon: "Troque o termo técnico por uma palavra comum equivalente.",
};

export function buildRewritePrompt(trecho: string, criterion: string): string {
  const hint = CRITERION_HINT[criterion] ?? "Reescreva de forma mais clara e direta.";
  return `Você reescreve trechos em Linguagem Simples, sem NUNCA inventar.

Regras absolutas:
- Reescreva SOMENTE o trecho abaixo, usando apenas a informação que ele já contém.
- NÃO acrescente fatos, exemplos, opiniões ou explicações que não estejam no trecho.
- PRESERVE exatamente todos os números, datas, valores e nomes próprios.
- Se não for possível reescrever sem inventar, devolva o trecho original inalterado.
- ${hint}

TRECHO:
"""
${trecho}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita aqui"}`;
}
