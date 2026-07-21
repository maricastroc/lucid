/**
 * Narrativa dos diagnósticos — a copy do RELATÓRIO técnico do inspetor, centralizada e
 * honesta. Tudo é derivado do `Finding` real (span, meta, suggestion) + dos metadados de
 * critério; nada é inventado. A "confiança" NÃO é uma probabilidade: é a explicação
 * determinística de por que a engine assina (ou não) uma sugestão.
 *
 * `longSentenceGuidance` implementa a orientação assistida (item 1): mede a frase e
 * localiza PONTOS DE DIVISÃO CANDIDATOS em fronteiras defensáveis (`;`, `—`, vírgula +
 * conjunção coordenativa). A engine não corta — só aponta; a decisão é do autor.
 */
import type { Finding } from "@/lucid";

function metaNum(f: Finding, k: string): number | null {
  const v = f.meta?.[k];
  return typeof v === "number" ? v : null;
}
function metaStr(f: Finding, k: string): string | null {
  const v = f.meta?.[k];
  return typeof v === "string" ? v : null;
}
function metaBool(f: Finding, k: string): boolean {
  return f.meta?.[k] === true;
}
function flat(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const DOMAIN_PT: Record<string, string> = {
  administrative: "administrativo",
  legal: "jurídico",
  general: "técnico",
};

export function detectionHeadline(f: Finding): string {
  switch (f.criterion) {
    case "long_sentence": {
      const w = metaNum(f, "words");
      return w != null ? `Frase longa · ${w} palavras` : "Frase longa";
    }
    case "passive_voice":
      return metaBool(f, "hasAgent") ? "Voz passiva com agente" : "Voz passiva sem agente";
    case "nominalization": {
      const base = metaStr(f, "baseVerb");
      return base ? `Nominalização de “${base}”` : "Nominalização";
    }
    case "jargon": {
      const dom = DOMAIN_PT[metaStr(f, "domain") ?? ""] ?? "técnico";
      return `Jargão ${dom}`;
    }
    default:
      return f.criterion;
  }
}

export function detectedProse(f: Finding, line: number): string {
  const s = flat(f.span.text);
  switch (f.criterion) {
    case "long_sentence": {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      const over = w != null && th != null ? w - th : null;
      return `Na linha ${line}, uma única frase acumula ${w ?? "muitas"} palavras${
        over != null ? ` — ${over} acima do limite de ${th}` : ""
      }. O detector não interpreta o conteúdo: conta as palavras da frase e compara com o limiar.`;
    }
    case "passive_voice":
      return `Na linha ${line}, «${s}» combina uma forma do verbo “ser” com um particípio. ${
        metaBool(f, "hasAgent")
          ? "O agente aparece no próprio trecho."
          : "O texto não diz quem praticou a ação."
      }`;
    case "nominalization": {
      const base = metaStr(f, "baseVerb");
      return `Na linha ${line}, a ação${base ? ` do verbo “${base}”` : ""} aparece disfarçada de substantivo, presa a um verbo-suporte — o que alonga a frase e afasta o verbo do seu sentido.`;
    }
    case "jargon": {
      const dom = DOMAIN_PT[metaStr(f, "domain") ?? ""] ?? "técnico";
      return `Na linha ${line}, «${s}» é reconhecido no glossário curado como termo ${dom}, pouco familiar para leitores fora desse domínio.`;
    }
    default:
      return f.justification;
  }
}

export type ConfidenceLevel = "segura" | "assistida";

export function buildConfidence(f: Finding): { level: ConfidenceLevel; rationale: string } {
  const s = flat(f.span.text);
  const hasSug = f.suggestion !== undefined;

  if (f.criterion === "jargon") {
    if (hasSug)
      return {
        level: "segura",
        rationale: `“${s}” consta no glossário curado com um equivalente único e independente de contexto; trocar por “${f.suggestion}” preserva a regência e não pede reconjugação. É uma substituição 1:1 — por isso a engine assina embaixo.`,
      };
    return {
      level: "assistida",
      rationale: `Há um equivalente mais simples, mas a troca depende do que vem depois na frase: aplicá-la às cegas poderia quebrar a concordância. A engine detecta e aponta o caminho, mas deixa a troca com você.`,
    };
  }

  if (f.criterion === "nominalization") {
    if (hasSug)
      return {
        level: "segura",
        rationale: `O verbo-base substitui a construção diretamente, no infinitivo e com o complemento num formato limpo — 1:1, sem flexionar nada. Segura para aplicar.`,
      };
    const base = metaStr(f, "baseVerb");
    return {
      level: "assistida",
      rationale: `A construção foi detectada, mas gerar a troca exigiria reconjugar o verbo${
        base ? ` “${base}”` : ""
      } ou o complemento não está num formato que a engine reconheça com segurança. Ela recusa flexionar automaticamente e devolve o verbo-base para você reescrever.`,
    };
  }

  if (f.criterion === "passive_voice") {
    return {
      level: "assistida",
      rationale: metaBool(f, "hasAgent")
        ? `O agente está no texto, então a informação existe — mas virar para a ativa exige reordenar sujeito e objeto e reconjugar o verbo. Isso está fora da garantia mecânica (ADR-006): a engine monta o andaime, a frase final é sua.`
        : `Além de reordenar e reconjugar, aqui o agente não está no texto: reescrever na ativa exigiria inventar quem praticou a ação. A engine se recusa a fabricar e devolve a decisão a você.`,
    };
  }

  // long_sentence
  const w = metaNum(f, "words");
  const th = metaNum(f, "threshold");
  return {
    level: "assistida",
    rationale: `A engine mede o comprimento com exatidão${
      w != null && th != null ? ` (${w} palavras contra o limiar de ${th})` : ""
    }, mas não decide o que é supérfluo nem onde cortar — isso é trabalho de autor (Princípio 1). O que ela pode fazer é localizar onde a frase pode se dividir; a escolha é sua.`,
  };
}

/* ------------------------------------------------- orientação (item 1) --- */

export interface SplitCandidate {
  offset: number;
  before: string;
  after: string;
}
export interface LongSentenceGuidance {
  words: number | null;
  threshold: number | null;
  over: number | null;
  subordination: number;
  targetSentences: number | null;
  candidates: SplitCandidate[];
}

const SUBORD_RE = /\b(que|quando|porque|embora|cuj[ao]s?|onde|caso|conforme|porquanto|ainda que|de modo que)\b/gi;
const COORD = "(?:e|mas|porém|ou|contudo|todavia|entretanto|porque|pois|portanto|logo)";

export function longSentenceGuidance(f: Finding): LongSentenceGuidance {
  const start = f.span.start;
  const span = f.span.text;
  const words = metaNum(f, "words");
  const threshold = metaNum(f, "threshold");
  const over = words != null && threshold != null ? words - threshold : null;
  const targetSentences = words != null && threshold != null ? Math.ceil(words / threshold) : null;

  const commas = (span.match(/,/g) ?? []).length;
  const subs = (span.match(SUBORD_RE) ?? []).length;
  const subordination = commas + subs;

  const candidates: SplitCandidate[] = [];
  const seen = new Set<number>();
  const push = (localIdx: number) => {
    if (localIdx <= 0 || localIdx >= span.length - 1) return;
    const g = start + localIdx;
    if (seen.has(g)) return;
    seen.add(g);
    const before = flat(span.slice(Math.max(0, localIdx - 32), localIdx));
    const after = flat(span.slice(localIdx, localIdx + 32));
    if (before && after) candidates.push({ offset: g, before, after });
  };

  let m: RegExpExecArray | null;
  const punct = /[;—]/g;
  while ((m = punct.exec(span))) push(m.index);
  const coord = new RegExp(`,\\s+${COORD}\\b`, "gi");
  while ((m = coord.exec(span))) push(m.index);

  candidates.sort((a, b) => a.offset - b.offset);
  return { words, threshold, over, subordination, targetSentences, candidates: candidates.slice(0, 6) };
}
