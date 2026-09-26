import type { PassFinding, Pass, Token } from "@/lucid/core/types";
import type { PtConfig } from "../config";

const CRITERION = "nominalizacao_encadeada";

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
  connectorIndexes: number[];
  tailIndexes: number[];
}

function matchChain(tokens: readonly Token[], headIndex: number, heads: ReadonlySet<string>): Chain | null {
  let endIndex = headIndex;
  let links = 0;
  let strongLink = false;
  const connectorIndexes: number[] = [];
  const tailIndexes: number[] = [];

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
    connectorIndexes.push(endIndex + 1);
    tailIndexes.push(tailIndex);
    endIndex = tailIndex;
  }

  return links > 0 ? { headIndex, endIndex, strongLink, links, connectorIndexes, tailIndexes } : null;
}

const quoted = (word: string): string => `“${word}”`;

function listed(words: readonly string[]): string {
  const q = words.map(quoted);
  return q.length <= 1 ? q.join("") : `${q.slice(0, -1).join(", ")} e ${q[q.length - 1]}`;
}

const unique = (words: readonly string[]): string[] => [...new Set(words)];

function chainJustification(
  actions: readonly string[],
  connectors: readonly string[],
  tails: readonly string[],
  span: string,
): string {
  if (actions.length >= 2) {
    return `${listed(actions)} são ações escritas como substantivo, ligadas por ${listed(unique(connectors))} em ${quoted(span)}.`;
  }
  return `${quoted(actions[0])} é uma ação escrita como substantivo, ligada por ${listed(unique(connectors))} a ${listed(tails)}.`;
}

export const nominalizacaoEncadeadaPass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["substantivos-acao.pt"],

  run(ctx) {
    if (!ctx.config.nominalizacaoEncadeada.enabled) return [];

    const heads = ctx.data.get<ReadonlySet<string>>("substantivos-acao.pt");
    const minPorFrase = ctx.config.nominalizacaoEncadeada.minPorFrase;
    const findings: PassFinding[] = [];

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
        const text = ctx.doc.source.slice(start, end);
        const words = [chain.headIndex, ...chain.tailIndexes].map((k) => tokens[k].text);
        const actions = [chain.headIndex, ...chain.tailIndexes]
          .filter((k) => heads.has(tokens[k].lower))
          .map((k) => tokens[k].text);
        const connectors = chain.connectorIndexes.map((k) => tokens[k].text);
        const tails = chain.tailIndexes.map((k) => tokens[k].text);
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text },
          severity: chain.strongLink ? "warning" : "info",
          requiresHuman: true,
          justification: chainJustification(actions, connectors, tails, text.replace(/\s+/gu, " ")),
          meta: {
            kind: "chain",
            links: chain.links,
            strongLink: chain.strongLink,
            words: words.join(" "),
            actions: actions.join(" "),
            connectors: connectors.join(" "),
          },
        });
      }

      if (hitIndexes.length < minPorFrase) continue;
      const counted = hitIndexes.map((k) => tokens[k].text);
      for (const hitIndex of hitIndexes) {
        if (covered.has(hitIndex)) continue;
        const token = tokens[hitIndex];
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start: token.start, end: token.end, text: token.text },
          severity: "info",
          requiresHuman: true,
          justification:
            `${quoted(token.text)} é uma das ${hitIndexes.length} ações escritas como substantivo nesta frase: ` +
            `${listed(counted)}. A partir de ${minPorFrase} na mesma frase, o Lucid marca cada uma para revisão.`,
          meta: { kind: "density", count: hitIndexes.length, words: counted.join(" ") },
        });
      }
    }

    return findings;
  },
};
