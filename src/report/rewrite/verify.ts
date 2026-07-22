/**
 * Tier 3 · o VERIFICADOR determinístico (docs/HANDOFF.md §3; ADR-014).
 *
 * Recebe uma proposta de reescrita e a submete à engine da Camada 1 como juíza. Separa,
 * por construção, PROVA de SINAL:
 *   · PROVA (determinística, de `analyze()` ou extração mecânica): a violação-alvo sumiu; o
 *     total de findings não aumentou; números e datas preservados; nenhum jargão novo; delta
 *     de métricas.
 *   · SINAL (heurístico, nunca prova): entidades/nomes preservados (heurística de
 *     maiúscula/sigla); sentido preservado via SONDA como teste NEGATIVO (se o leitor de piso
 *     extraía o fato do original e não da proposta, algo se perdeu).
 *
 * HONESTIDADE (I5): não há saída "aprovado". Tudo passar = "nenhuma falha de piso
 * detectada", jamais evidência positiva de qualidade. `hasBlockingFailure` é um veto
 * mecânico (alguma prova falhou), não o oposto de aprovação.
 *
 * Fronteira: `report/**` pode importar `core` e `probe`. `core` nunca importa daqui.
 */
import type { Finding, Severity, Span } from "../../lucid";
import type { ComprehensionProbe } from "../../lucid/probe/types";
import { interpret } from "../../lucid/probe/interpret";
import { rewriteLocalePtBR } from "../../locales/pt-BR/tier3";
import type { MetricsDelta, Proof, RewriteLocale, RewriteProposal, RewriteVerification, VerificationSignal } from "./types";

/** Locale default do Tier 3 — pt-BR. Preserva a compatibilidade dos chamadores existentes. */
const DEFAULT_LOCALE: RewriteLocale = rewriteLocalePtBR;

export interface VerifyOptions {
  /**
   * Locale que RE-ANALISA e fornece marcadores de 1ª pessoa + id de jargão (ADR-031). Default:
   * pt-BR. Se a proposta declara um `localeId` diferente, `verifyRewrite` recusa (anti-mistura).
   */
  locale?: RewriteLocale;
  /** sonda opcional para o SINAL de sentido (teste negativo). Sem ela, esse sinal é omitido. */
  probe?: ComprehensionProbe;
  /** a pergunta que o leitor veio fazer — exigida junto com `probe`. */
  question?: string;
  /** critério do finding, quando o alvo é a frase de um finding — habilita `target_resolved`. */
  criterion?: string;
  /**
   * Os findings que motivaram um BRIEFING DIRIGIDO (estratégia `directed@1`, ADR-000 · Etapa 4) —
   * habilita `directed_findings_resolved`: generaliza `target_resolved` (um critério) para TODOS os
   * critérios apontados no briefing. Fecha a lacuna que `region_improved` sozinho deixava: o peso
   * total da região pode não subir mesmo que o modelo IGNORE um achado específico do briefing
   * (ex.: corrige jargão mas mantém a voz passiva) — achado ao vivo de 2026-07-22, ver ADR-046/047.
   */
  findings?: readonly Finding[];
}

const RE_NUMBER = /\d[\d.,]*\d|\d/gu;
const RE_DATE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/gu;

const RE_ENTITY = /\b(?:\p{Lu}\p{Ll}[\p{L}]*|\p{Lu}{2,})\b/gu;
const RE_ACRONYM = /^\p{Lu}{2,}$/u;
const RE_SPACE = /\s/u;
const SENTENCE_TERMINATORS = ".!?…";

function extractSorted(text: string, re: RegExp): string[] {
  return (text.match(re) ?? []).slice().sort();
}

function firstPersonMarkers(text: string, re: RegExp): Set<string> {
  return new Set((text.match(re) ?? []).map((m) => m.toLowerCase()));
}

function extractEntities(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(RE_ENTITY.source, "gu");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const token = m[0];
    if (RE_ACRONYM.test(token)) {
      out.push(token);
      continue;
    }
    let i = m.index - 1;
    while (i >= 0 && RE_SPACE.test(text[i])) i--;
    const sentenceInitial = i < 0 || SENTENCE_TERMINATORS.includes(text[i]);
    if (!sentenceInitial) out.push(token);
  }
  return out.sort();
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, i) => value === b[i]);
}

function overlaps(f: Finding, start: number, end: number): boolean {
  return f.span.start < end && f.span.end > start;
}

const SEVERITY_WEIGHT: Record<Severity, number> = { error: 3, warning: 1, info: 0.3 };
const BURDEN_EPSILON = 1e-9;

function regionBurden(findings: readonly Finding[], start: number, end: number): number {
  return findings.reduce((sum, f) => (overlaps(f, start, end) ? sum + SEVERITY_WEIGHT[f.severity] : sum), 0);
}
/**
 * Peso de severidade TOTAL de um conjunto de findings (ADR-018). A régua canônica do veredito —
 * exportada para a trilha de proveniência (ADR-000 · Etapa 6) medir cada passo com a MESMA métrica
 * que julga uma reescrita, em vez de contagem crua (que pune divisão de frase).
 */
export function totalBurden(findings: readonly Finding[]): number {
  return findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
}

function jargonTextsOverlapping(
  findings: readonly Finding[],
  start: number,
  end: number,
  jargonCriterionId: string,
): Set<string> {
  const set = new Set<string>();
  for (const f of findings) {
    if (f.criterion === jargonCriterionId && overlaps(f, start, end)) set.add(f.span.text);
  }
  return set;
}

/**
 * Aplica a proposta ao texto inteiro (substitui o trecho-alvo) e devolve o texto reescrito.
 * Puro: não normaliza (o `analyze` normaliza de novo, idempotente).
 */
export function applyProposal(text: string, target: Span, proposal: RewriteProposal): string {
  return text.slice(0, target.start) + proposal.proposed + text.slice(target.end);
}

export async function verifyRewrite(
  text: string,
  target: Span,
  proposal: RewriteProposal,
  options: VerifyOptions = {},
): Promise<RewriteVerification> {
  const locale = options.locale ?? DEFAULT_LOCALE;

  if (proposal.localeId && proposal.localeId !== locale.id) {
    throw new Error(
      `proposta do locale '${proposal.localeId}' não pode ser verificada sob o locale '${locale.id}'`,
    );
  }

  const rewritten = applyProposal(text, target, proposal);
  const before = locale.analyze(text);
  const after = locale.analyze(rewritten);

  const originalStart = target.start;
  const originalEnd = target.end;
  const newStart = target.start;
  const newEnd = target.start + proposal.proposed.length;

  const proofs: Proof[] = [];

  if (options.criterion) {
    const criterion = options.criterion;
    const targetRemaining = after.findings.filter((f) => f.criterion === criterion && overlaps(f, newStart, newEnd))
      .length;
    proofs.push({
      check: "target_resolved",
      passed: targetRemaining === 0,
      detail:
        targetRemaining === 0
          ? `a violação de '${criterion}' não reaparece no trecho reescrito`
          : `'${criterion}' ainda é detectado ${targetRemaining}× no trecho reescrito`,
    });
  }

  if (options.findings && options.findings.length > 0) {
    // Só cobra o que foi de fato PEDIDO — achados `requiresHuman` (passiva sem agente, jargão
    // ambíguo, nominalização sem verbo seguro) o próprio Camada 1 já recusa resolver sem inventar
    // (I5); o briefing (`directed@2`, prompt.ts) nem pede isso. Cobrar essa recusa correta como
    // "não resolveu" puniria o modelo por não fabricar — achado ao vivo, ADR-047/048.
    const resolvable = options.findings.filter((f) => !f.requiresHuman);
    const directedCriteria = [...new Set(resolvable.map((f) => f.criterion))].sort();
    // Sem nada mecanicamente pedível (tudo requiresHuman), a prova é OMITIDA — igual a
    // `target_resolved` quando `options.criterion` não vem. Não inflar a contagem de provas com um
    // check vazio.
    if (directedCriteria.length > 0) {
      // Tolera exatamente as ocorrências `requiresHuman` do critério JÁ presentes na região
      // original — elas nunca foram pedidas, não é falha se ainda estiverem lá. Mais que isso
      // sobrando (ou aparecendo) é o que de fato não foi resolvido.
      const stillPresent = directedCriteria.filter((c) => {
        const tolerated = options.findings!.filter(
          (f) => f.criterion === c && f.requiresHuman && overlaps(f, originalStart, originalEnd),
        ).length;
        const afterCount = after.findings.filter((f) => f.criterion === c && overlaps(f, newStart, newEnd)).length;
        return afterCount > tolerated;
      });
      proofs.push({
        check: "directed_findings_resolved",
        passed: stillPresent.length === 0,
        detail:
          stillPresent.length === 0
            ? `todos os ${directedCriteria.length} critérios pedíveis do briefing dirigido foram resolvidos`
            : `briefing dirigido não resolveu: ${stillPresent.join(", ")}`,
      });
    }
  }

  const burdenBefore = regionBurden(before.findings, originalStart, originalEnd);
  const burdenAfter = regionBurden(after.findings, newStart, newEnd);
  proofs.push({
    check: "region_improved",
    passed: burdenAfter <= burdenBefore + BURDEN_EPSILON,
    detail: `peso (severidade) dos findings no trecho: ${burdenBefore.toFixed(1)} → ${burdenAfter.toFixed(1)}`,
  });

  const totalBefore = totalBurden(before.findings);
  const totalAfter = totalBurden(after.findings);
  const noNewFindings: Proof = {
    check: "no_new_findings",
    passed: totalAfter <= totalBefore + BURDEN_EPSILON,
    detail: `peso (severidade) total: ${totalBefore.toFixed(1)} → ${totalAfter.toFixed(1)}`,
  };

  const numsBefore = extractSorted(proposal.original, RE_NUMBER);
  const numsAfter = extractSorted(proposal.proposed, RE_NUMBER);
  const numbersPreserved: Proof = {
    check: "numbers_preserved",
    passed: sameMultiset(numsBefore, numsAfter),
    detail: sameMultiset(numsBefore, numsAfter)
      ? "todos os números do trecho foram preservados"
      : `números diferem: [${numsBefore.join(", ")}] → [${numsAfter.join(", ")}]`,
  };

  const datesBefore = extractSorted(proposal.original, RE_DATE);
  const datesAfter = extractSorted(proposal.proposed, RE_DATE);
  const datesPreserved: Proof = {
    check: "dates_preserved",
    passed: sameMultiset(datesBefore, datesAfter),
    detail: sameMultiset(datesBefore, datesAfter)
      ? "todas as datas do trecho foram preservadas"
      : `datas diferem: [${datesBefore.join(", ")}] → [${datesAfter.join(", ")}]`,
  };

  const beforeSpanJargon = jargonTextsOverlapping(before.findings, originalStart, originalEnd, locale.jargonCriterionId);
  const afterRegionJargon = jargonTextsOverlapping(after.findings, newStart, newEnd, locale.jargonCriterionId);
  const introducedJargon = [...afterRegionJargon].filter((t) => !beforeSpanJargon.has(t));
  const noNewJargon: Proof = {
    check: "no_new_jargon",
    passed: introducedJargon.length === 0,
    detail:
      introducedJargon.length === 0
        ? "a proposta não introduziu jargão novo"
        : `jargão novo introduzido: ${introducedJargon.join(", ")}`,
  };

  const sourceFirstPerson = firstPersonMarkers(text, locale.firstPersonMarkers);
  const inventedFirstPerson = [...firstPersonMarkers(proposal.proposed, locale.firstPersonMarkers)].filter(
    (m) => !sourceFirstPerson.has(m),
  );
  const noInventedFirstPerson: Proof = {
    check: "no_invented_first_person",
    passed: inventedFirstPerson.length === 0,
    detail:
      inventedFirstPerson.length === 0
        ? "a proposta não fabricou agente em 1ª pessoa"
        : `1ª pessoa inventada (ausente no original): ${inventedFirstPerson.sort().join(", ")}`,
  };

  proofs.push(noNewFindings, numbersPreserved, datesPreserved, noNewJargon, noInventedFirstPerson);

  const signals: VerificationSignal[] = [];

  const entitiesBefore = extractEntities(proposal.original);
  const entitiesAfter = new Set(extractEntities(proposal.proposed));
  const missingEntities = entitiesBefore.filter((e) => !entitiesAfter.has(e));
  signals.push({
    check: "entities_preserved",
    flagged: missingEntities.length > 0,
    detail:
      missingEntities.length > 0
        ? `nome(s) possivelmente ausentes na proposta — confira: ${[...new Set(missingEntities)].join(", ")}`
        : "sem sinal de nome próprio perdido (heurística, não prova)",
  });

  if (options.probe && options.question) {
    const [originalResult, proposedResult] = await Promise.all([
      options.probe.probe({ trecho: proposal.original, pergunta: options.question }),
      options.probe.probe({ trecho: proposal.proposed, pergunta: options.question }),
    ]);

    const originalReadable = originalResult.podeResponder && !originalResult.precisouInferir;
    const proposedReadable = proposedResult.podeResponder && !proposedResult.precisouInferir;
    const lost = originalReadable && !proposedReadable;
    const proposedSignal = interpret(proposedResult);
    signals.push({
      check: "meaning_preserved",
      flagged: lost,
      detail: lost
        ? "o leitor de piso extraía o fato do original mas trava na proposta — possível perda de informação"
        : proposedSignal.tipo === "flag"
          ? "a proposta trava o leitor de piso, mas o original também travava — sem conclusão de perda"
          : "sem sinal de perda de sentido pelo piso (não é garantia de compreensão)",
    });
  }

  const metrics: MetricsDelta = {
    fleschPtBefore: before.metrics.fleschPt,
    fleschPtAfter: after.metrics.fleschPt,
    wordsBefore: before.metrics.words,
    wordsAfter: after.metrics.words,
  };

  return {
    proofs,
    signals,
    metrics,
    hasBlockingFailure: proofs.some((p) => !p.passed),
  };
}
