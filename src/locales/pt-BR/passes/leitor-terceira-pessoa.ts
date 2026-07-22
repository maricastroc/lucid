/**
 * Pass "fala indireta ao leitor" (`leitor_terceira_pessoa`) — `5.3.3`, frases claras / fale COM o
 * leitor (docs/CLAUDE.md, Fase 2; guias gov.br e LAB.mg).
 *
 * Marca quando o texto se refere ao leitor em TERCEIRA PESSOA e lhe atribui uma OBRIGAÇÃO — "o
 * interessado deverá apresentar", "o requerente deve comparecer", "os candidatos precisam" — em vez
 * de falar diretamente ("você deve…" / imperativo). É a operacionalização determinística de "falta
 * fala direta": não dá para detectar ausência, mas dá para detectar a construção que a evita.
 *
 * MATCHER LOCAL POR TOKENS, SEM PARSER (mesma disciplina de `passive-voice`). Dupla exigência para
 * precisão:
 *   1. o substantivo-leitor (léxico `substantivos-leitor.pt`) está em POSIÇÃO DE SUJEITO — precedido
 *      de artigo definido ("o/a/os/as") ou no início da frase. Isso exclui os oblíquos ("do
 *      interessado", "ao requerente") e a leitura adjetival ("está interessado");
 *   2. um verbo DEÔNTICO (deve/deverá/poderá/precisa…) aparece numa janela curta à frente, abortando
 *      em pontuação ou conjunção (que muda de oração). Isso exclui "o cidadão tem direitos" (sem
 *      obrigação).
 *
 * Sinal FRACO por natureza (`info`): mudar a pessoa do texto é escolha de estilo do autor. NÃO
 * reescreve — `suggestion` nunca é preenchida; `requiresHuman` é sempre `true`.
 */
import type { Finding, Pass, Token } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "leitor_terceira_pessoa";
const PRINCIPLE = "5.3.3";

const READER_NOUNS = getPrepared("substantivos-leitor.pt");

/** Artigos definidos que marcam o substantivo-leitor como sujeito (nunca contrações como "do/ao"). */
const DEFINITE_ARTICLES = new Set(["o", "a", "os", "as"]);

/** Verbos deônticos de 3ª pessoa (obrigação/permissão). Classe fechada, inline como em passive-voice. */
const DEONTIC_VERBS = new Set([
  "deve", "devem", "deverá", "deverão", "deveria", "deveriam",
  "precisa", "precisam", "precisará", "precisarão",
  "poderá", "poderão", "pode", "podem",
]);

/** Pontuação que encerra/divide a oração — barreira dura. */
const BARRIER_PUNCTUATION = new Set([",", ";", ":", "!", "?", "…", "(", ")", "[", "]", '"', "'", "—", "–", "/"]);

/** Conjunções cuja presença indica que o verbo seguinte pertence a outra oração. */
const BARRIER_CONJUNCTIONS = new Set(["que", "e", "ou", "mas", "porque", "pois", "quando", "se", "como", "porém"]);

/** Máximo de tokens-palavra entre o substantivo-leitor e o verbo deôntico. */
const MAX_WINDOW_TOKENS = 4;

function isBarrier(token: Token): boolean {
  if (token.isWord) return BARRIER_CONJUNCTIONS.has(token.lower);
  return BARRIER_PUNCTUATION.has(token.text);
}

/** Índice do primeiro token-PALAVRA da frase (para reconhecer o sujeito no início, sem artigo). */
function firstWordIndex(tokens: readonly Token[]): number {
  for (let i = 0; i < tokens.length; i++) if (tokens[i].isWord) return i;
  return -1;
}

/** Procura um verbo deôntico à frente, dentro da janela, abortando em barreira. */
function findDeonticAfter(tokens: readonly Token[], startIndex: number): number | null {
  let consumed = 0;
  for (let i = startIndex; i < tokens.length && consumed < MAX_WINDOW_TOKENS; i++) {
    const token = tokens[i];
    if (token.isWord && DEONTIC_VERBS.has(token.lower)) return i;
    if (isBarrier(token)) return null;
    if (token.isWord) {
      consumed++;
      continue;
    }
    return null; // qualquer não-palavra que não seja barreira reconhecida → aborta
  }
  return null;
}

export const leitorTerceiraPessoaPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["substantivos-leitor.pt"],

  run(ctx) {
    if (!ctx.config.leitorTerceiraPessoa.enabled) return [];

    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      const firstWord = firstWordIndex(tokens);

      for (let i = 0; i < tokens.length; i++) {
        const noun = tokens[i];
        if (!(noun.isWord && READER_NOUNS.has(noun.lower))) continue;

        // Posição de sujeito: precedido de artigo definido, ou é a primeira palavra da frase.
        const prev = tokens[i - 1];
        const articleBefore = prev?.isWord && DEFINITE_ARTICLES.has(prev.lower) ? prev : null;
        const isSubject = articleBefore !== null || i === firstWord;
        if (!isSubject) continue;

        const deonticIndex = findDeonticAfter(tokens, i + 1);
        if (deonticIndex === null) continue;

        const start = (articleBefore ?? noun).start;
        const end = tokens[deonticIndex].end;

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "info",
          requiresHuman: true,
          justification:
            `O texto se refere ao leitor em terceira pessoa (“${noun.text}”) e lhe atribui uma obrigação. ` +
            "Falar diretamente com o leitor (“você deve…”) ou usar o imperativo aproxima e deixa claro quem " +
            "age. A ferramenta não reescreve: mudar a pessoa do texto é decisão de estilo sua.",
          meta: { readerNoun: noun.text, deonticVerb: tokens[deonticIndex].text },
        });
      }
    }

    return findings;
  },
};
