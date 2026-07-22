/**
 * Pass "título sem eco no corpo" (`heading_body_mismatch`) — `5.1`, RELEVANTE (Princípio 1).
 *
 * O PRIMEIRO detector a citar o Princípio 1 da norma: os anteriores medem mecânica de navegação
 * (5.2 — nível, comprimento, forma de frase); este mede um proxy de RELEVÂNCIA — o título antecipa
 * o que o leitor vai encontrar na seção? A norma trata "o leitor obtém o que precisa" como trabalho
 * de autor, não regra mecânica (CLAUDE.md); por isso este é, por desenho, um sinal FRACO: `info`,
 * nunca prova, nunca reescreve.
 *
 * PROXY, não semântica: compara as palavras de CONTEÚDO do título (tudo que não é palavra funcional
 * do `stopwords.pt`) contra as palavras de conteúdo do CORPO da seção (os blocos entre este título e
 * o próximo de nível igual ou mais alto). Zero sobreposição → flag. Como é comparação EXATA (sem
 * lema), singular/plural do mesmo termo não conta como eco — limitação conhecida, documentada e
 * testada (ver `heading-body-mismatch.test.ts`), aceitável porque o sinal já nasce fraco.
 *
 * Conservador: exige corpo com um mínimo de palavras de conteúdo (`minBodyContentWords`) antes de
 * julgar — evita ruído em seções curtas. Título sem palavra de conteúdo (só função) ou seção sem
 * corpo (título órfão, fora de escopo aqui) não disparam. Só existe em documento estruturado — texto
 * puro não tem título de verdade.
 */
import type { Block, Finding, Pass, Sentence } from "@/lucid/core/types";

const CRITERION = "heading_body_mismatch";
const PRINCIPLE = "5.1";

/** Frases de um bloco de topo — achata os itens quando o bloco é uma lista. */
function sentencesOf(block: Block): readonly Sentence[] {
  return block.kind === "list" ? block.items.flatMap((item) => item.sentences) : block.sentences;
}

/** Palavras de CONTEÚDO (não função) em caixa invariante, com repetição — para contar substância. */
function contentWords(sentences: readonly Sentence[], stopwords: ReadonlySet<string>): string[] {
  const words: string[] = [];
  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      if (token.isWord && token.lower.length > 1 && !stopwords.has(token.lower)) words.push(token.lower);
    }
  }
  return words;
}

export const headingBodyMismatchPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  principle: PRINCIPLE,
  dataDeps: ["stopwords.pt"],

  run(ctx) {
    if (!ctx.config.headingBodyMismatch.enabled) return [];

    const stopwords = ctx.data.get<ReadonlySet<string>>("stopwords.pt");
    const minBody = ctx.config.headingBodyMismatch.minBodyContentWords;
    const blocks = ctx.doc.blocks;
    const findings: Finding[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const heading = blocks[i];
      if (heading.kind !== "heading") continue;

      const body: Block[] = [];
      for (let j = i + 1; j < blocks.length; j++) {
        const next = blocks[j];
        if (next.kind === "heading" && next.level <= heading.level) break;
        body.push(next);
      }
      if (body.length === 0) continue;

      const headingWords = new Set(contentWords(heading.sentences, stopwords));
      if (headingWords.size === 0) continue;

      const bodyWordList = body.flatMap((b) => contentWords(sentencesOf(b), stopwords));
      if (bodyWordList.length < minBody) continue;

      const bodyWords = new Set(bodyWordList);
      const overlaps = [...headingWords].some((w) => bodyWords.has(w));
      if (overlaps) continue;

      findings.push({
        criterion: CRITERION,
        category: "structural",
        principle: PRINCIPLE,
        span: { start: heading.start, end: heading.end, text: heading.text },
        severity: "info",
        requiresHuman: true,
        justification:
          "Nenhuma palavra de conteúdo deste título aparece no texto da seção que ele encabeça. É um " +
          "sinal FRACO (proxy de relevância — o título antecipa o que o leitor vai encontrar? — nunca " +
          "prova): a comparação é exata, sem lemas, então plural/singular do mesmo termo não conta " +
          "como eco. Confira o trecho antes de decidir; a ferramenta não reescreve títulos.",
        meta: { headingContentWords: headingWords.size, bodyContentWords: bodyWordList.length },
      });
    }

    return findings;
  },
};
