import type { Finding, Severity, Span } from "../../lucid";
import type { ComprehensionProbe } from "../../lucid/probe/types";
import { interpret } from "../../lucid/probe/interpret";
import { rewriteLocalePtBR } from "../../locales/pt-BR/tier3";
import type { MetricsDelta, Proof, RewriteLocale, RewriteProposal, RewriteVerification, VerificationSignal } from "./types";

const DEFAULT_LOCALE: RewriteLocale = rewriteLocalePtBR;

export interface VerifyOptions {
  locale?: RewriteLocale;
  probe?: ComprehensionProbe;
  question?: string;
  criterion?: string;
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

function agentNounsAnywhere(text: string, re: RegExp): Set<string> {
  return new Set((text.match(re) ?? []).map((m) => m.toLowerCase()));
}

function agentSubjectMentions(text: string, re: RegExp): Set<string> {
  const set = new Set<string>();
  const r = new RegExp(re.source, re.flags);
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) {
    set.add((m[1] ?? m[0]).toLowerCase());
  }
  return set;
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
    const resolvable = options.findings.filter((f) => !f.requiresHuman);
    const directedCriteria = [...new Set(resolvable.map((f) => f.criterion))].sort();

    if (directedCriteria.length > 0) {
      const stillPresent = directedCriteria.filter((c) => {
        const resolvableRemaining = after.findings.filter(
          (f) => f.criterion === c && !f.requiresHuman && overlaps(f, newStart, newEnd),
        ).length;
        return resolvableRemaining > 0;
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
  const proposalFirstPerson = [...firstPersonMarkers(proposal.proposed, locale.firstPersonMarkers)].sort();
  const inventedFirstPerson = sourceFirstPerson.size === 0 ? proposalFirstPerson : [];
  const noInventedFirstPerson: Proof = {
    check: "no_invented_first_person",
    passed: inventedFirstPerson.length === 0,
    detail:
      inventedFirstPerson.length === 0
        ? "a proposta não fabricou agente em 1ª pessoa"
        : `1ª pessoa inventada (texto original é impessoal): ${inventedFirstPerson.join(", ")}`,
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

  const sourceAgentNouns = agentNounsAnywhere(text, locale.thirdPersonAgentNouns);
  const proposedAgentSubjects = agentSubjectMentions(proposal.proposed, locale.thirdPersonAgentSubject);
  const inventedAgents = [...proposedAgentSubjects].filter((a) => !sourceAgentNouns.has(a)).sort();
  signals.push({
    check: "possible_invented_agent",
    flagged: inventedAgents.length > 0,
    detail:
      inventedAgents.length > 0
        ? `a proposta introduz possível agente ausente no original: ${inventedAgents.join(", ")}`
        : "sem sinal de agente em 3ª pessoa fabricado (heurística, não prova)",
  });

  if (options.probe && options.question) {
    try {
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
    } catch (error) {
      console.warn(
        `[verify] sonda de compreensão falhou — signal 'meaning_preserved' omitido. ` +
          `criterion=${options.criterion ?? "-"} error=${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
