/**
 * Tokenizador determinístico de palavras em PT-BR (docs/ARQUITETURA.md §7, passo 3).
 *
 * Regras + varredura de caracteres, zero-dep, zero análise morfológica pesada — mesmo
 * espírito de `segment-sentences.ts` (ADR-001 em docs/DECISOES.md). Opera sobre o
 * `source` JÁ normalizado (NFC) — ver `normalize.ts`; todo offset devolvido é relativo
 * a esse texto, nunca a um texto bruto.
 *
 * Política transversal (igual à da segmentação): em caso de dúvida, NÃO mesclar —
 * produzir um token de pontuação separado é sempre seguro; mesclar errado corrompe a
 * palavra. As três extensões de palavra (hífen, apóstrofo, ponto de sigla) só se aplicam
 * quando o padrão é inequívoco (letra imediatamente dos dois lados, sem espaço).
 */
import type { Sentence, Token } from "../types";

const RE_LETRA = /\p{L}/u;
const RE_DIGITO = /\p{Nd}/u;
const RE_ESPACO = /\s/u;

/**
 * Cadeia de letras únicas separadas por ponto (ex.: "E", "E.U", "E.U.A"). Usada para
 * decidir se um "." em andamento continua formando uma sigla grudada (E.U.A.) — nunca
 * para abreviações multiletra (Sr., art., p.ex.), que exigem exatamente 1 letra por
 * segmento e por isso não casam aqui.
 */
const RE_CADEIA_SIGLA = /^\p{L}(\.\p{L})*$/u;

/** Pontuação de borda removida da ponta de URLs/e-mails para não engolir o fim da frase. */
const PONTUACAO_DE_BORDA = new Set([".", ",", ";", ":", "!", "?", ")", "]", "}", "'", '"', "’", "”", "»"]);

const RE_URL = /(?:https?:\/\/|www\.)\S+/uy;
const RE_EMAIL = /[\p{L}\p{Nd}._%+-]+@[\p{L}\p{Nd}.-]+\.[\p{L}]{2,}/uy;

function apararPontuacaoDeBorda(source: string, inicio: number, fimBruto: number): number {
  let fim = fimBruto;
  while (fim > inicio && PONTUACAO_DE_BORDA.has(source[fim - 1])) {
    fim--;
  }
  return fim;
}

function casarUrl(source: string, i: number): number | null {
  RE_URL.lastIndex = i;
  const m = RE_URL.exec(source);
  if (!m) return null;
  const fim = apararPontuacaoDeBorda(source, i, i + m[0].length);
  return fim > i ? fim : null;
}

function casarEmail(source: string, i: number): number | null {
  RE_EMAIL.lastIndex = i;
  const m = RE_EMAIL.exec(source);
  if (!m) return null;
  const fim = apararPontuacaoDeBorda(source, i, i + m[0].length);
  return fim > i ? fim : null;
}

/** Consome um número: dígitos, com "." ou "," internos só quando têm dígito nos dois lados. */
function casarNumero(source: string, i: number): number {
  let j = i;
  while (j < source.length && RE_DIGITO.test(source[j])) j++;

  while (true) {
    const separador = source[j];
    const temDigitoDepois = j + 1 < source.length && RE_DIGITO.test(source[j + 1]);
    if ((separador === "." || separador === ",") && temDigitoDepois) {
      j++;
      while (j < source.length && RE_DIGITO.test(source[j])) j++;
    } else {
      break;
    }
  }

  return j;
}

/**
 * Consome uma palavra a partir de uma letra inicial, tentando estender por hífen,
 * apóstrofo ou ponto-de-sigla — cada extensão só é aceita quando inequívoca (letra
 * imediatamente após o caractere de ligação, sem espaço).
 */
function casarPalavra(source: string, i: number): number {
  let j = i;
  while (j < source.length && RE_LETRA.test(source[j])) j++;

  while (j < source.length) {
    const c = source[j];

    if (c === "-" && j + 1 < source.length && RE_LETRA.test(source[j + 1])) {
      j++;
      while (j < source.length && RE_LETRA.test(source[j])) j++;
      continue;
    }

    if ((c === "'" || c === "’") && j + 1 < source.length && RE_LETRA.test(source[j + 1])) {
      j++;
      while (j < source.length && RE_LETRA.test(source[j])) j++;
      continue;
    }

    if (c === ".") {
      let k = j + 1;
      while (k < source.length && RE_LETRA.test(source[k])) k++;
      if (k > j + 1) {
        const candidato = source.slice(i, k);
        if (RE_CADEIA_SIGLA.test(candidato)) {
          j = k;
          continue;
        }
      }
    }

    break;
  }

  return j;
}

function criarToken(source: string, start: number, end: number, isWord: boolean): Token {
  const text = source.slice(start, end);
  return { text, lower: text.toLowerCase(), start, end, isWord };
}

/**
 * Tokeniza `source` (texto JÁ normalizado) em uma lista achatada, em ordem de leitura.
 * Determinístico: mesma entrada produz sempre a mesma lista.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const tamanho = source.length;
  let i = 0;

  while (i < tamanho) {
    const ch = source[i];

    if (RE_ESPACO.test(ch)) {
      i++;
      continue;
    }

    const fimUrl = casarUrl(source, i);
    if (fimUrl !== null) {
      tokens.push(criarToken(source, i, fimUrl, false));
      i = fimUrl;
      continue;
    }

    const fimEmail = casarEmail(source, i);
    if (fimEmail !== null) {
      tokens.push(criarToken(source, i, fimEmail, false));
      i = fimEmail;
      continue;
    }

    if (RE_DIGITO.test(ch)) {
      const fim = casarNumero(source, i);
      tokens.push(criarToken(source, i, fim, false));
      i = fim;
      continue;
    }

    if (RE_LETRA.test(ch)) {
      const fim = casarPalavra(source, i);
      tokens.push(criarToken(source, i, fim, true));
      i = fim;
      continue;
    }

    // pontuação/símbolo isolado — nunca conta como palavra.
    tokens.push(criarToken(source, i, i + 1, false));
    i++;
  }

  return tokens;
}

/**
 * Distribui os tokens achatados (mesma origem de offsets que as frases) para cada
 * `Sentence`, preenchendo `tokens` e `wordCount` (contagem de tokens com `isWord`).
 * Como frases nunca contêm espaço nas bordas (já aparadas por `segmentSentences`) e
 * tokens nunca atravessam espaço, todo token cai inteiramente dentro de exatamente uma
 * frase — não há necessidade de tratar tokens "órfãos".
 */
export function attachTokens(sentences: readonly Sentence[], tokens: readonly Token[]): Sentence[] {
  return sentences.map((sentenca) => {
    const tokensDaFrase = tokens.filter((t) => t.start >= sentenca.start && t.end <= sentenca.end);
    const wordCount = tokensDaFrase.reduce((total, t) => total + (t.isWord ? 1 : 0), 0);
    return { ...sentenca, tokens: tokensDaFrase, wordCount };
  });
}
