import type { Finding, Severity, Span } from "../../lucid";
import { rewriteLocalePtBR } from "../../locales/pt-BR/tier3";
import { criterionLabel } from "./briefing";
import type {
  AgentDeclaration,
  MetricsDelta,
  Proof,
  ProofOutcome,
  RewriteLocale,
  RewriteProposal,
  RewriteVerification,
  VerificationNotice,
  VerificationSignal,
} from "./types";

const DEFAULT_LOCALE: RewriteLocale = rewriteLocalePtBR;

export interface VerifyOptions {
  locale?: RewriteLocale;
  criterion?: string;
  focus?: Span;
  findings?: readonly Finding[];
  declarations?: readonly AgentDeclaration[];
}

function sameSpan(a: Span, b: Span): boolean {
  return a.start === b.start && a.end === b.end;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/gu, " ").trim();
}

const RE_NUMBER = /\d[\d.,]*\d|\d/gu;
const RE_DATE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/gu;

const RE_ENTITY = /(?<![\p{L}\p{N}])(?:\p{Lu}\p{Ll}[\p{L}]*|\p{Lu}{2,})(?![\p{L}\p{N}])/gu;
const RE_ACRONYM = /^\p{Lu}{2,}$/u;
const RE_SPACE = /\s/u;
const SENTENCE_TERMINATORS = ".!?…";

function tally(text: string, re: RegExp): Map<string, number> {
  const out = new Map<string, number>();
  for (const value of text.match(re) ?? []) out.set(value, (out.get(value) ?? 0) + 1);
  return out;
}

function times(n: number): string {
  return n === 1 ? "1 vez" : `${n} vezes`;
}

function quoted(values: readonly string[]): string {
  return values.map((v) => `«${v}»`).join(", ");
}

function outcomeOf(passed: boolean): ProofOutcome {
  return passed ? "confirmed" : "not_confirmed";
}

interface LiteralTerms {
  readonly originalHasNone: string;
  readonly proposalHasNone: string;
  readonly kept: (values: readonly string[]) => string;
  readonly lost: (values: readonly string[]) => string;
  readonly added: (values: readonly string[], original: ReadonlyMap<string, number>) => string;
  readonly nothingAdded: string;
}

const digitsOnly = (value: string): string => value.replace(/[.,]/gu, "");

const NUMBER_TERMS: LiteralTerms = {
  originalHasNone: "O trecho original não tem número em algarismos.",
  proposalHasNone: "A proposta não tem número em algarismos.",
  kept: (values) =>
    values.length === 1
      ? `O número ${quoted(values)} do trecho original aparece na proposta, com a mesma grafia.`
      : `Os números ${quoted(values)} do trecho original aparecem na proposta, com a mesma grafia.`,
  lost: (values) =>
    values.length === 1
      ? `O número ${quoted(values)} do trecho original não foi encontrado na proposta com a mesma grafia.`
      : `Os números ${quoted(values)} do trecho original não foram encontrados na proposta com a mesma grafia.`,
  added: (values, original) => {
    const respelled = values.filter((v) => [...original.keys()].some((o) => digitsOnly(o) === digitsOnly(v)));
    const unseen = values.filter((v) => !respelled.includes(v));
    const sentences: string[] = [];
    if (unseen.length === 1) {
      sentences.push(`A proposta contém o número ${quoted(unseen)}, que não aparece em algarismos no trecho original.`);
    } else if (unseen.length > 1) {
      sentences.push(
        `A proposta contém os números ${quoted(unseen)}, que não aparecem em algarismos no trecho original.`,
      );
    }
    for (const v of respelled) {
      const spellings = [...original.keys()].filter((o) => digitsOnly(o) === digitsOnly(v));
      sentences.push(`A proposta escreve ${quoted([v])}, que no trecho original aparece como ${quoted(spellings)}.`);
    }
    return sentences.join(" ");
  },
  nothingAdded: "Todo número em algarismos da proposta aparece no trecho original, com a mesma grafia.",
};

const DATE_TERMS: LiteralTerms = {
  originalHasNone: "O trecho original não tem data escrita só com algarismos, como 10/05/2024.",
  proposalHasNone: "A proposta não tem data escrita só com algarismos.",
  kept: (values) =>
    values.length === 1
      ? `A data ${quoted(values)} do trecho original aparece na proposta, com a mesma grafia.`
      : `As datas ${quoted(values)} do trecho original aparecem na proposta, com a mesma grafia.`,
  lost: (values) =>
    values.length === 1
      ? `A data ${quoted(values)} do trecho original não foi encontrada na proposta com a mesma grafia.`
      : `As datas ${quoted(values)} do trecho original não foram encontradas na proposta com a mesma grafia.`,
  added: (values) =>
    values.length === 1
      ? `A proposta contém a data ${quoted(values)}, que não aparece com essa grafia no trecho original.`
      : `A proposta contém as datas ${quoted(values)}, que não aparecem com essa grafia no trecho original.`,
  nothingAdded: "Toda data em algarismos da proposta aparece no trecho original, com a mesma grafia.",
};

function literalProofs(
  kept: "numbers_kept" | "dates_kept",
  added: "numbers_added" | "dates_added",
  re: RegExp,
  proposal: RewriteProposal,
  terms: LiteralTerms,
): [Proof, Proof] {
  const before = tally(proposal.original, re);
  const after = tally(proposal.proposed, re);
  const lost = [...before.keys()].filter((k) => !after.has(k));
  const fewer = [...before.keys()].filter((k) => after.has(k) && after.get(k)! < before.get(k)!);
  const unseen = [...after.keys()].filter((k) => !before.has(k));
  const more = [...after.keys()].filter((k) => before.has(k) && after.get(k)! > before.get(k)!);
  const inOriginal = (k: string) => `${times(before.get(k) ?? 0)} no trecho original`;
  const inProposal = (k: string) => `${times(after.get(k) ?? 0)} na proposta`;

  const keptOutcome: ProofOutcome =
    before.size === 0 ? "not_applicable" : lost.length + fewer.length === 0 ? "confirmed" : "not_confirmed";
  const keptDetail =
    keptOutcome === "not_applicable"
      ? terms.originalHasNone
      : keptOutcome === "confirmed"
        ? terms.kept([...before.keys()])
        : [
            ...(lost.length > 0 ? [terms.lost(lost)] : []),
            ...fewer.map((k) => `${quoted([k])} aparece ${inOriginal(k)} e ${inProposal(k)}.`),
          ].join(" ");

  const addedOutcome: ProofOutcome =
    after.size === 0 ? "not_applicable" : unseen.length + more.length === 0 ? "confirmed" : "addition";
  const addedDetail =
    addedOutcome === "not_applicable"
      ? terms.proposalHasNone
      : addedOutcome === "confirmed"
        ? terms.nothingAdded
        : [
            ...(unseen.length > 0 ? [terms.added(unseen, before)] : []),
            ...more.map((k) => `${quoted([k])} aparece ${inProposal(k)} e ${inOriginal(k)}.`),
          ].join(" ");

  return [
    { check: kept, outcome: keptOutcome, passed: keptOutcome !== "not_confirmed", detail: keptDetail },
    { check: added, outcome: addedOutcome, passed: addedOutcome !== "addition", detail: addedDetail },
  ];
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

function labelsOf(criteria: readonly string[]): string {
  return criteria.map((c) => `«${criterionLabel(c)}»`).join(", ");
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
    throw new Error(`proposta do locale '${proposal.localeId}' não pode ser verificada sob o locale '${locale.id}'`);
  }

  const rewritten = applyProposal(text, target, proposal);
  const before = locale.analyze(text);
  const after = locale.analyze(rewritten);

  const originalStart = target.start;
  const originalEnd = target.end;
  const newStart = target.start;
  const newEnd = target.start + proposal.proposed.length;

  const declarations = (options.declarations ?? []).filter(
    (d) => d.span.start < originalEnd && d.span.end > originalStart,
  );
  const declaredAgents = declarations.map((d) => d.agent).filter((a): a is string => a !== null && a.trim().length > 0);
  const declaredAgentsText = declaredAgents.join(" ");

  const proofs: Proof[] = [];
  const notices: VerificationNotice[] = [];

  if (options.criterion) {
    const criterion = options.criterion;
    const focus = options.focus;
    const declarationFor = (f: Finding) => declarations.find((d) => sameSpan(d.span, f.span));
    const keptImpersonal = (f: Finding) => declarationFor(f)?.agent === null;
    const awaitsAuthor = (f: Finding) =>
      focus !== undefined &&
      !sameSpan(f.span, focus) &&
      f.criterion === "passive_voice" &&
      f.requiresHuman &&
      f.meta?.hasAgent !== true &&
      declarationFor(f) === undefined;

    const regionBefore = before.findings.filter(
      (f) => f.criterion === criterion && overlaps(f, originalStart, originalEnd),
    );
    const required = regionBefore.filter((f) => !keptImpersonal(f) && !awaitsAuthor(f));
    const impersonal = regionBefore.filter(keptImpersonal);
    const awaiting = regionBefore.filter((f) => !keptImpersonal(f) && awaitsAuthor(f));
    const take = (pool: Finding[], f: Finding): boolean => {
      const key = normalizeForMatch(f.span.text);
      const index = pool.findIndex((b) => normalizeForMatch(b.span.text) === key);
      if (index < 0) return false;
      pool.splice(index, 1);
      return true;
    };

    let stillRequired = 0;
    let impersonalLeft = 0;
    const awaitingLeft: Finding[] = [];
    for (const f of after.findings) {
      if (f.criterion !== criterion || !overlaps(f, newStart, newEnd)) continue;
      if (take(required, f)) stillRequired++;
      else if (take(impersonal, f)) impersonalLeft++;
      else if (take(awaiting, f)) awaitingLeft.push(f);
      else stillRequired++;
    }

    const label = labelsOf([criterion]);
    const quoted = awaitingLeft.map((f) => `«${f.span.text.replace(/\s+/gu, " ").trim()}»`).join(", ");
    const exceptions: string[] = [];
    if (awaitingLeft.length > 0) exceptions.push(`em ${quoted}`);
    if (impersonalLeft > 0) exceptions.push("onde você pediu para manter a forma impessoal");
    proofs.push({
      check: "target_resolved",
      outcome: outcomeOf(stillRequired === 0),
      passed: stillRequired === 0,
      detail:
        stillRequired > 0
          ? `O Lucid ainda aponta ${label} no trecho reescrito (${times(stillRequired)}).`
          : exceptions.length === 0
            ? `O Lucid não aponta mais ${label} no trecho reescrito.`
            : `O Lucid não aponta mais ${label} no trecho reescrito, exceto ${exceptions.join(" e ")}.`,
    });

    if (awaitingLeft.length > 0) {
      notices.push({
        check: "awaiting_author",
        detail:
          awaitingLeft.length === 1
            ? `${label} continua em ${quoted}, onde o Lucid não encontrou quem pratica a ação. Abra esse ponto e ` +
              "informe o agente para a IA poder resolvê-lo."
            : `${label} continua em ${quoted}, onde o Lucid não encontrou quem pratica a ação. Abra cada um ` +
              "desses pontos e informe o agente para a IA poder resolvê-los.",
      });
    }
  }

  const explicitNoAgentDeclared = declarations.some((d) => d.agent === null);

  if (options.findings && options.findings.length > 0) {
    const resolvable = options.findings.filter((f) => !f.requiresHuman);
    const directedCriteria = [...new Set(resolvable.map((f) => f.criterion))].sort();

    if (directedCriteria.length > 0) {
      const remaining: string[] = [];
      const degraded: string[] = [];
      for (const c of directedCriteria) {
        const resolvableRemaining = after.findings.filter(
          (f) => f.criterion === c && !f.requiresHuman && overlaps(f, newStart, newEnd),
        ).length;
        if (resolvableRemaining > 0) {
          remaining.push(`${labelsOf([c])} (${times(resolvableRemaining)})`);
          continue;
        }

        const humanBefore = before.findings.filter(
          (f) => f.criterion === c && f.requiresHuman && overlaps(f, originalStart, originalEnd),
        ).length;
        const humanAfter = after.findings.filter(
          (f) => f.criterion === c && f.requiresHuman && overlaps(f, newStart, newEnd),
        ).length;
        if (humanAfter > humanBefore && !explicitNoAgentDeclared) {
          degraded.push(
            `Em ${labelsOf([c])}, os pontos que o Lucid marca para decisão humana passaram de ${humanBefore} para ` +
              `${humanAfter}.`,
          );
        }
      }
      const resolved = remaining.length === 0 && degraded.length === 0;
      proofs.push({
        check: "directed_findings_resolved",
        outcome: outcomeOf(resolved),
        passed: resolved,
        detail: resolved
          ? directedCriteria.length === 1
            ? `O Lucid não aponta mais no trecho reescrito o critério pedido à IA: ${labelsOf(directedCriteria)}.`
            : `O Lucid não aponta mais no trecho reescrito os ${directedCriteria.length} critérios pedidos à IA: ` +
              `${labelsOf(directedCriteria)}.`
          : [
              ...(remaining.length > 0
                ? [
                    `O Lucid ainda aponta no trecho reescrito, entre os critérios pedidos à IA: ${remaining.join(", ")}.`,
                  ]
                : []),
              ...degraded,
            ].join(" "),
      });
    }
  }

  if (declaredAgents.length > 0) {
    const normalizedProposal = normalizeForMatch(proposal.proposed);
    const missing = declaredAgents.filter((a) => !normalizedProposal.includes(normalizeForMatch(a)));
    proofs.push({
      check: "declared_agent_present",
      outcome: outcomeOf(missing.length === 0),
      passed: missing.length === 0,
      detail:
        missing.length === 0
          ? declaredAgents.length === 1
            ? `O agente que você informou aparece na proposta: ${quoted(declaredAgents)}.`
            : `Os agentes que você informou aparecem na proposta: ${quoted(declaredAgents)}.`
          : missing.length === 1
            ? `O agente que você informou não foi encontrado na proposta: ${quoted(missing)}.`
            : `Estes agentes que você informou não foram encontrados na proposta: ${quoted(missing)}.`,
    });
  }

  const burdenBefore = regionBurden(before.findings, originalStart, originalEnd);
  const burdenAfter = regionBurden(after.findings, newStart, newEnd);
  proofs.push({
    check: "region_improved",
    outcome: outcomeOf(burdenAfter <= burdenBefore + BURDEN_EPSILON),
    passed: burdenAfter <= burdenBefore + BURDEN_EPSILON,
    detail: `Peso dos achados no trecho, pela gravidade: ${burdenBefore.toFixed(1)} → ${burdenAfter.toFixed(1)}`,
  });

  const totalBefore = totalBurden(before.findings);
  const totalAfter = totalBurden(after.findings);
  const noNewFindings: Proof = {
    check: "no_new_findings",
    outcome: outcomeOf(totalAfter <= totalBefore + BURDEN_EPSILON),
    passed: totalAfter <= totalBefore + BURDEN_EPSILON,
    detail: `Peso dos achados no texto todo, pela gravidade: ${totalBefore.toFixed(1)} → ${totalAfter.toFixed(1)}`,
  };

  const numbers = literalProofs("numbers_kept", "numbers_added", RE_NUMBER, proposal, NUMBER_TERMS);
  const dates = literalProofs("dates_kept", "dates_added", RE_DATE, proposal, DATE_TERMS);

  const beforeSpanJargon = jargonTextsOverlapping(
    before.findings,
    originalStart,
    originalEnd,
    locale.jargonCriterionId,
  );
  const afterRegionJargon = jargonTextsOverlapping(after.findings, newStart, newEnd, locale.jargonCriterionId);
  const introducedJargon = [...afterRegionJargon].filter((t) => !beforeSpanJargon.has(t));
  const noNewJargon: Proof = {
    check: "no_new_jargon",
    outcome: outcomeOf(introducedJargon.length === 0),
    passed: introducedJargon.length === 0,
    detail:
      introducedJargon.length === 0
        ? "O Lucid não aponta jargão novo no trecho reescrito."
        : `O Lucid aponta jargão novo no trecho reescrito: ${quoted(introducedJargon)}.`,
  };

  const documentFirstPerson = [...firstPersonMarkers(text, locale.firstPersonMarkers)].sort();
  const agentFirstPerson = [...firstPersonMarkers(declaredAgentsText, locale.firstPersonMarkers)].sort();
  const proposalFirstPerson = [...firstPersonMarkers(proposal.proposed, locale.firstPersonMarkers)].sort();
  const firstPersonOutcome: ProofOutcome =
    documentFirstPerson.length > 0 || agentFirstPerson.length > 0
      ? "not_applicable"
      : proposalFirstPerson.length > 0
        ? "addition"
        : "confirmed";
  const noInventedFirstPerson: Proof = {
    check: "no_invented_first_person",
    outcome: firstPersonOutcome,
    passed: firstPersonOutcome !== "addition",
    detail:
      documentFirstPerson.length > 0
        ? `O documento já usa formas de 1ª pessoa da lista do Lucid: ${quoted(documentFirstPerson)}.`
        : agentFirstPerson.length > 0
          ? `O agente que você informou usa formas de 1ª pessoa da lista do Lucid: ${quoted(agentFirstPerson)}.`
          : proposalFirstPerson.length > 0
            ? `A proposta usa formas de 1ª pessoa que não aparecem no documento${
                declaredAgents.length > 0 ? " nem no agente que você informou" : ""
              }: ${quoted(proposalFirstPerson)}.`
            : "A proposta não usa nenhuma forma de 1ª pessoa da lista do Lucid.",
  };

  proofs.push(noNewFindings, ...numbers, ...dates, noNewJargon, noInventedFirstPerson);

  const signals: VerificationSignal[] = [];

  const entitiesBefore = extractEntities(proposal.original);
  const entitiesAfter = new Set(extractEntities(proposal.proposed));
  const missingEntities = entitiesBefore.filter((e) => !entitiesAfter.has(e));
  signals.push({
    check: "entities_preserved",
    flagged: missingEntities.length > 0,
    detail:
      missingEntities.length > 0
        ? `Estas palavras com inicial maiúscula do original não estão na proposta: ${quoted([
            ...new Set(missingEntities),
          ])}. Confira se algum nome saiu.`
        : "Toda sigla e toda palavra com inicial maiúscula do original, fora do início de frase, aparecem na proposta " +
          "(heurística, não prova).",
  });

  const sourceAgentNouns = agentNounsAnywhere(`${text} ${declaredAgentsText}`, locale.thirdPersonAgentNouns);
  const proposedAgentSubjects = agentSubjectMentions(proposal.proposed, locale.thirdPersonAgentSubject);
  const inventedAgents = [...proposedAgentSubjects].filter((a) => !sourceAgentNouns.has(a)).sort();
  signals.push({
    check: "possible_invented_agent",
    flagged: inventedAgents.length > 0,
    detail:
      inventedAgents.length > 0
        ? inventedAgents.length === 1
          ? `A proposta tem como possível sujeito ${quoted(inventedAgents)}, palavra que não aparece no documento. ` +
            "Confira quem pratica a ação no original."
          : `A proposta tem como possíveis sujeitos ${quoted(inventedAgents)}, palavras que não aparecem no ` +
            "documento. Confira quem pratica a ação no original."
        : "Nenhum substantivo de agente da lista do Lucid aparece como sujeito novo na proposta (heurística, não prova).",
  });

  const sourceIsDeontic = new RegExp(locale.deonticInSource.source, "iu").test(proposal.original);
  const introduced = sourceIsDeontic ? null : new RegExp(locale.deonticIntroduced.source, "iu").exec(proposal.proposed);
  signals.push({
    check: "possible_invented_obligation",
    flagged: introduced !== null,
    detail:
      introduced !== null
        ? `A proposta escreve «${introduced[0]}», e o trecho original não tem nenhum marcador de dever da lista do ` +
          "Lucid. Confira se uma descrição virou obrigação."
        : sourceIsDeontic
          ? "O trecho original já tem marcador de dever, e este sinal só compara trechos sem marcador (heurística, não " +
            "prova)."
          : "A proposta não tem marcador de dever da lista do Lucid (heurística, não prova).",
  });

  const strip = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLowerCase();
  const proposedFolded = strip(proposal.proposed);
  const categoriesDropped = [
    ...new Set(
      [...proposal.original.matchAll(new RegExp(locale.legalCategories.source, "giu"))]
        .map((match) => match[0])
        .filter((term) => !proposedFolded.includes(strip(term))),
    ),
  ];
  signals.push({
    check: "possible_category_narrowed",
    flagged: categoriesDropped.length > 0,
    detail:
      categoriesDropped.length > 0
        ? `A proposta não cita ${categoriesDropped.length === 1 ? "esta categoria" : "estas categorias"} do ` +
          `original: ${quoted(categoriesDropped)}. Confira se a regra continua valendo para o mesmo grupo.`
        : "Toda categoria jurídica da lista do Lucid citada no original aparece na proposta (heurística, não prova).",
  });

  const metrics: MetricsDelta = {
    readabilityBefore: before.metrics.readability,
    readabilityAfter: after.metrics.readability,
    wordsBefore: before.metrics.words,
    wordsAfter: after.metrics.words,
  };

  return {
    proofs,
    notices,
    signals,
    metrics,
    hasBlockingFailure: proofs.some((p) => !p.passed),
  };
}
