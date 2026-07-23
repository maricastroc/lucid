import type { Finding, Pass, Token } from "@/lucid/core/types";

const CRITERION = "nominalizacao_encadeada";
const PRINCIPLE = "5.3.3";

const DE_FORMS = new Set(["de", "da", "do", "das", "dos"]);

const TAIL_SUFFIXES = ["ção", "ções", "são", "sões", "mento", "mentos", "ância", "âncias", "ência", "ências"];

function hasDeverbalSuffix(lower: string): boolean {
  return TAIL_SUFFIXES.some((suffix) => lower.length > suffix.length && lower.endsWith(suffix));
}

interface Chain {
  headIndex: number;
  endIndex: number;
  strongLink: boolean;
  links: number;
}

function matchChain(tokens: readonly Token[], headIndex: number, heads: ReadonlySet<string>): Chain | null {
  let endIndex = headIndex;
  let links = 0;
  let strongLink = false;

  for (;;) {
    const deToken = tokens[endIndex + 1];
    if (!deToken?.isWord || !DE_FORMS.has(deToken.lower)) break;

    let tailIndex = endIndex + 2;
    let tail = tokens[tailIndex];
    if (tail?.isWord && !heads.has(tail.lower) && !hasDeverbalSuffix(tail.lower)) {
      tailIndex = endIndex + 3;
      tail = tokens[tailIndex];
    }
    if (!tail?.isWord) break;

    const tailIsHead = heads.has(tail.lower);
    if (!tailIsHead && !hasDeverbalSuffix(tail.lower)) break;

    if (tailIsHead) strongLink = true;
    links += 1;
    endIndex = tailIndex;
  }

  return links > 0 ? { headIndex, endIndex, strongLink, links } : null;
}

function chainJustification(strongLink: boolean): string {
  if (strongLink) {
    return (
      "Nominalizações encadeadas por “de” — ações escondidas em substantivos, uma governando " +
      "a outra. Devolver as ações aos verbos deixaria a frase mais direta, mas exige decidir " +
      "quem faz o quê; a ferramenta marca e não reescreve."
    );
  }
  return (
    "Nominalização com complemento abstrato encadeado por “de” — a ação principal está " +
    "escondida num substantivo. Em geral dá para reescrever com o verbo, mas a troca muda a " +
    "estrutura da frase; a ferramenta marca e não reescreve."
  );
}

export const nominalizacaoEncadeadaPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["substantivos-acao.pt"],

  run(ctx) {
    if (!ctx.config.nominalizacaoEncadeada.enabled) return [];

    const heads = ctx.data.get<ReadonlySet<string>>("substantivos-acao.pt");
    const minPorFrase = ctx.config.nominalizacaoEncadeada.minPorFrase;
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      const hitIndexes: number[] = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].isWord && heads.has(tokens[i].lower)) hitIndexes.push(i);
      }
      if (hitIndexes.length === 0) continue;

      const covered = new Set<number>();
      const chains: Chain[] = [];
      for (const headIndex of hitIndexes) {
        if (covered.has(headIndex)) continue;
        const chain = matchChain(tokens, headIndex, heads);
        if (!chain) continue;
        chains.push(chain);
        for (let k = chain.headIndex; k <= chain.endIndex; k++) covered.add(k);
      }

      for (const chain of chains) {
        const start = tokens[chain.headIndex].start;
        const end = tokens[chain.endIndex].end;
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: chain.strongLink ? "warning" : "info",
          requiresHuman: true,
          justification: chainJustification(chain.strongLink),
          meta: { kind: "chain", links: chain.links, strongLink: chain.strongLink },
        });
      }

      if (hitIndexes.length < minPorFrase) continue;
      for (const hitIndex of hitIndexes) {
        if (covered.has(hitIndex)) continue;
        const token = tokens[hitIndex];
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start: token.start, end: token.end, text: token.text },
          severity: "info",
          requiresHuman: true,
          justification:
            `Concentração de nominalizações (${hitIndexes.length} nesta frase) — substantivos de ` +
            "ação empilhados pesam a leitura. Considere devolver algumas ações ao verbo; a " +
            "ferramenta não decide quais.",
          meta: { kind: "density", count: hitIndexes.length },
        });
      }
    }

    return findings;
  },
};
