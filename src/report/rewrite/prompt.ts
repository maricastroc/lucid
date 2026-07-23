/**
 * Tier 3 · prompts VERSIONADOS da reescrita (ADR-016/017).
 *
 * TRÊS ESTRATÉGIAS, para o benchmark comparar SISTEMAS (não só textos):
 *   · `correct@1`  — orientada a CORRIGIR o finding com a MENOR alteração possível: mantém a
 *     estrutura e a ordem das ideias, troca o mínimo. É a hipótese conservadora.
 *   · `rewrite@2`  — REESCRITA DO ZERO para linguagem cidadã: liberdade para reorganizar,
 *     condensar e mudar a estrutura do trecho. É a hipótese ousada.
 *   · `directed` — a livre, mas DIRIGIDA pelos findings REAIS da engine no trecho (ADR-000:
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
  directed: "directed@3",
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
 * Rótulo NEUTRO dos critérios `requiresHuman` no briefing best-effort — sem a instrução do
 * `CRITERION_HINT` (que, pra passiva, diz "diga quem faz a ação" e nudge à invenção). Aqui só
 * NOMEIA o problema; a instrução (reformule-sem-inventar) vive no cabeçalho da seção.
 */
const REQUIRES_HUMAN_LABEL: Record<string, string> = {
  passive_voice: "Voz passiva sem agente explícito",
};

/**
 * Critérios `requiresHuman` que a IA PODE TENTAR reformular (best-effort), porque a falha de
 * invenção correspondente TEM guard determinístico no verificador. `passive_voice` (agente
 * omitido): o guard é `no_invented_first_person` (ADR-049) — se a IA "ativar" a frase inventando
 * um "nós"/"a equipe", o verificador VETA e a passiva fica honestamente sem resolver. Jargão
 * ambíguo e nominalização sem verbo seguro ficam FORA: sua falha (trocar por sentido errado) não
 * tem guard mecânico, então seguem só-humano (ADR-048). Allowlist, não denylist: só entra o que
 * comprovadamente tem rede de segurança.
 */
const BEST_EFFORT_CRITERIA = new Set(["passive_voice"]);

/**
 * Agrupa findings por critério (ordem de 1ª aparição) e renderiza um bullet por critério:
 * `- <rótulo><exemplos curtos>`. Trechos longos (> 6 palavras, ≈ a própria frase-alvo) não viram
 * exemplo. Puro e determinístico: os findings vêm de `analyze()` em ordem de documento, então a
 * saída é função pura deles (byte-idêntica). O `labelFor` decide o texto do bullet por critério.
 */
function renderBriefing(findings: readonly Finding[], labelFor: (criterion: string) => string): string {
  const order: string[] = [];
  const spansByCriterion = new Map<string, string[]>();
  for (const f of findings) {
    const seen = spansByCriterion.get(f.criterion);
    if (seen) seen.push(f.span.text.replace(/\s+/g, " ").trim());
    else {
      spansByCriterion.set(f.criterion, [f.span.text.replace(/\s+/g, " ").trim()]);
      order.push(f.criterion);
    }
  }
  return order
    .map((criterion) => {
      const shortSpans = [...new Set((spansByCriterion.get(criterion) ?? []).filter((s) => s.split(/\s+/).length <= 6))];
      const examples = shortSpans.length ? ` (ex.: ${shortSpans.map((s) => `"${s}"`).join(", ")})` : "";
      return `- ${labelFor(criterion)}${examples}`;
    })
    .join("\n");
}

/**
 * `directed@3` — reescrita livre DIRIGIDA pelos findings da engine no trecho. Igual à livre
 * (`rewrite@2`), mas troca a dica genérica por DOIS briefings dos problemas REAIS:
 *   · MANDATÓRIO (`!requiresHuman`) — "Resolva TODOS". Cobrado tudo-ou-nada pelo verificador.
 *   · BEST-EFFORT (`requiresHuman` ∈ `BEST_EFFORT_CRITERIA`) — "reformule SE der sem inventar;
 *     senão MANTENHA". NÃO é cobrado como resolução (a recusa correta de inventar não é punida,
 *     ADR-048); a rede é o guard de invenção (ADR-049), que VETA se a IA fabricar o agente.
 *
 * `directed@3` (ADR-050) REABRE o que o `directed@2` (ADR-047/048) tinha excluído: passiva sem
 * agente volta ao prompt, agora que existe guard determinístico contra a única forma perigosa de
 * "resolvê-la" (inventar quem age). Sem NENHUM finding em nenhuma das duas listas, degrada para o
 * formato livre (sem bloco de briefing). Mesmas blindagens de invenção.
 */
function buildDirectedPrompt(fullText: string, target: Span, findings: readonly Finding[]): string {
  const mandatory = findings.filter((f) => !f.requiresHuman);
  const bestEffort = findings.filter((f) => f.requiresHuman && BEST_EFFORT_CRITERIA.has(f.criterion));

  const mandatoryBrief = renderBriefing(
    mandatory,
    (c) => CRITERION_HINT[c] ?? "Resolva o problema de clareza apontado neste ponto.",
  );
  const bestEffortBrief = renderBriefing(bestEffort, (c) => REQUIRES_HUMAN_LABEL[c] ?? "Ponto que exige julgamento.");

  const sections: string[] = [];
  if (mandatoryBrief) {
    sections.push(`A engine determinística analisou o trecho e apontou os pontos abaixo. Resolva TODOS:\n${mandatoryBrief}`);
  }
  if (bestEffortBrief) {
    sections.push(
      "O ponto abaixo a engine NÃO resolve sozinha, porque o texto não diz quem pratica a ação. " +
        "TENTE reformular SEM inventar o agente — mude a estrutura da frase ou use o sujeito real que já " +
        'está no texto. Se a ÚNICA forma de resolver seria criar um agente que o texto não dá ("nós", ' +
        '"a equipe", "o órgão"), MANTENHA como está — não invente:\n' +
        bestEffortBrief,
    );
  }
  const brief = sections.length ? `\n${sections.join("\n\n")}\n` : "";
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
