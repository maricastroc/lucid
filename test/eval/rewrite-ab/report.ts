import type { ScoredRow } from "./score";

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (xs: readonly boolean[]): number => (xs.length ? (100 * xs.filter(Boolean).length) / xs.length : 0);

function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export interface Aggregate {
  readonly candidate: string;
  readonly model: string;
  readonly context: string;
  readonly n: number;
  readonly changedPct: number;
  readonly proofsPassedMean: number;
  readonly proofsTotalMean: number;
  readonly vetoPct: number;
  readonly failedProofCounts: Record<string, number>;
  readonly regionBurdenBefore: number;
  readonly regionBurdenAfter: number;
  readonly regionWorsePct: number;
  readonly totalBurdenDelta: number;
  readonly totalWorsePct: number;
  readonly newCriteriaMean: number;
  readonly newCriteriaCounts: Record<string, number>;
  readonly refsLostPct: number;
  readonly relationsLostPct: number;
  readonly valuesLostPct: number;
  readonly markerFamilyLostPct: number;
  readonly markerFamilyLostCounts: Record<string, number>;
  readonly growthMean: number;
  readonly inflatedPct: number;
  readonly paragraphsLostPct: number;
  readonly over20Before: number;
  readonly over20After: number;
  readonly shortSentencesAddedMean: number;
  readonly parentheticalsAddedMean: number;
  readonly markupLeakedPct: number;
  readonly producedListPct: number;
  readonly entitiesFlaggedPct: number;
  readonly inventedAgentPct: number;
  readonly structure: Record<string, number>;
  readonly refusalReasons: Record<string, number>;
  readonly docxOk: number;
  readonly docxBroken: number;
  readonly promptTokensMean: number;
  readonly completionTokensMean: number;
  readonly totalTokens: number;
  readonly latencyMeanMs: number;
  readonly latencyP95Ms: number;
  readonly truncated: number;
  readonly unparseable: number;
  readonly errors: number;
}

function tally(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

export function aggregate(rows: readonly ScoredRow[]): Aggregate[] {
  const groups = new Map<string, ScoredRow[]>();
  for (const r of rows) {
    const key = `${r.row.candidate}|${r.row.model}|${r.row.context}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, group]) => {
      const [candidate, model, context] = key.split("|");
      const structure = tally(group.map((r) => r.structure.kind));
      return {
        candidate,
        model,
        context,
        n: group.length,
        changedPct: pct(group.map((r) => r.changed)),
        proofsPassedMean: mean(group.map((r) => r.proofsPassed)),
        proofsTotalMean: mean(group.map((r) => r.proofsTotal)),
        vetoPct: pct(group.map((r) => r.vetoed)),
        failedProofCounts: tally(group.flatMap((r) => r.failedProofs)),
        regionBurdenBefore: mean(group.map((r) => r.regionBurdenBefore)),
        regionBurdenAfter: mean(group.map((r) => r.regionBurdenAfter)),
        regionWorsePct: pct(group.map((r) => r.regionBurdenAfter > r.regionBurdenBefore)),
        totalBurdenDelta: mean(group.map((r) => r.totalBurdenAfter - r.totalBurdenBefore)),
        totalWorsePct: pct(group.map((r) => r.totalBurdenAfter > r.totalBurdenBefore)),
        newCriteriaMean: mean(group.map((r) => r.newCriteriaInRegion.length)),
        newCriteriaCounts: tally(group.flatMap((r) => r.newCriteriaInRegion)),
        refsLostPct: pct(group.map((r) => r.fidelity.legalRefsLost.length > 0)),
        relationsLostPct: pct(group.map((r) => r.fidelity.relationsLost.length > 0)),
        valuesLostPct: pct(group.map((r) => r.fidelity.valuesLost.length > 0)),
        markerFamilyLostPct: pct(group.map((r) => r.fidelity.markerFamiliesLost.length > 0)),
        markerFamilyLostCounts: tally(group.flatMap((r) => [...r.fidelity.markerFamiliesLost])),
        growthMean: mean(group.map((r) => r.style.growth)),
        inflatedPct: pct(group.map((r) => r.style.inflated)),
        paragraphsLostPct: pct(group.map((r) => r.style.paragraphsLost)),
        over20Before: mean(group.map((r) => r.style.sentencesOver20Before)),
        over20After: mean(group.map((r) => r.style.sentencesOver20After)),
        shortSentencesAddedMean: mean(group.map((r) => r.style.shortSentencesAdded)),
        parentheticalsAddedMean: mean(group.map((r) => r.style.parentheticalsAdded)),
        markupLeakedPct: pct(group.map((r) => r.style.markupLeaked)),
        producedListPct: pct(group.map((r) => r.style.producedList)),
        entitiesFlaggedPct: pct(group.map((r) => r.flaggedSignals.includes("entities_preserved"))),
        inventedAgentPct: pct(group.map((r) => r.flaggedSignals.includes("possible_invented_agent"))),
        structure,
        refusalReasons: tally(group.flatMap((r) => (r.structure.kind === "refused" ? [r.structure.reason] : []))),
        docxOk: group.filter((r) => r.structure.kind === "expanded" && r.structure.docxSurvives === true).length,
        docxBroken: group.filter((r) => r.structure.kind === "expanded" && r.structure.docxSurvives === false).length,
        promptTokensMean: mean(group.map((r) => r.row.promptTokens)),
        completionTokensMean: mean(group.map((r) => r.row.completionTokens)),
        totalTokens: group.reduce((n, r) => n + r.row.totalTokens, 0),
        latencyMeanMs: mean(group.map((r) => r.row.latencyMs)),
        latencyP95Ms: quantile(
          group.map((r) => r.row.latencyMs),
          0.95,
        ),
        truncated: group.filter((r) => r.row.truncated).length,
        unparseable: group.filter((r) => r.row.parseOutcome === "unparseable").length,
        errors: group.filter((r) => r.row.error !== null).length,
      };
    });
}

const n1 = (x: number): string => x.toFixed(1);
const n0 = (x: number): string => x.toFixed(0);

export function balancedSubset(rows: readonly ScoredRow[]): ScoredRow[] {
  const candidates = new Set(rows.map((r) => r.row.candidate));
  const byTarget = new Map<string, Set<string>>();
  for (const r of rows) {
    const seen = byTarget.get(r.row.targetId) ?? new Set<string>();
    seen.add(r.row.candidate);
    byTarget.set(r.row.targetId, seen);
  }
  const complete = new Set(
    [...byTarget.entries()].filter(([, seen]) => seen.size === candidates.size).map(([target]) => target),
  );
  return rows.filter((r) => complete.has(r.row.targetId));
}

export function renderTables(aggregates: readonly Aggregate[]): string {
  const label = (a: Aggregate): string =>
    `${a.candidate} · ${a.model.replace("openai/", "")}${a.context === "full" ? "" : ` · ${a.context}`}`;

  const out: string[] = [];

  out.push("### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)");
  out.push("");
  out.push(
    "| Sistema | n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |",
  );
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|");
  for (const a of aggregates) {
    const numbersOk = 100 - (a.failedProofCounts.numbers_preserved ?? 0) * (100 / a.n);
    const datesOk = 100 - (a.failedProofCounts.dates_preserved ?? 0) * (100 / a.n);
    out.push(
      `| ${label(a)} | ${a.n} | ${n0(numbersOk)} | ${n0(datesOk)} | ${n0(a.valuesLostPct)} | ${n0(a.refsLostPct)} | ${n0(
        a.relationsLostPct,
      )} | ${n0(a.markerFamilyLostPct)} | ${n0(a.entitiesFlaggedPct)} |`,
    );
  }

  out.push("");
  out.push("### 4–6. Provas, veto, peso e achados novos");
  out.push("");
  out.push(
    "| Sistema | n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |",
  );
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|");
  for (const a of aggregates) {
    out.push(
      `| ${label(a)} | ${a.n} | ${n0(a.changedPct)} | ${n1(a.proofsPassedMean)}/${n1(a.proofsTotalMean)} | ${n0(
        a.vetoPct,
      )} | ${n1(a.regionBurdenBefore)} → ${n1(a.regionBurdenAfter)} | ${n0(a.regionWorsePct)} | ${n1(
        a.totalBurdenDelta,
      )} | ${n0(a.totalWorsePct)} | ${n1(a.newCriteriaMean)} |`,
    );
  }

  out.push("");
  out.push("### 6b. As regras que a IAris declara sobre si — medidas igual para todos");
  out.push("");
  out.push(
    "| Sistema | n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |",
  );
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|");
  for (const a of aggregates) {
    out.push(
      `| ${label(a)} | ${a.n} | ${(100 * a.growthMean).toFixed(0)}% | ${n0(a.inflatedPct)} | ${n0(
        a.paragraphsLostPct,
      )} | ${n1(a.over20Before)} → ${n1(a.over20After)} | ${n1(a.shortSentencesAddedMean)} | ${n1(
        a.parentheticalsAddedMean,
      )} | ${n0(a.markupLeakedPct)} | ${n0(a.producedListPct)} |`,
    );
  }

  out.push("");
  out.push("### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)");
  out.push("");
  out.push("| Sistema | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive |");
  out.push("|---|--:|--:|--:|--:|---|---|");
  for (const a of aggregates) {
    const reasons =
      Object.entries(a.refusalReasons)
        .map(([r, n]) => `${r}=${n}`)
        .join(", ") || "—";
    const docx = a.docxOk + a.docxBroken === 0 ? "—" : `${a.docxOk} ok / ${a.docxBroken} quebrou`;
    out.push(
      `| ${label(a)} | ${a.structure.unchanged ?? 0} | ${a.structure.expanded ?? 0} | ${a.structure.refused ?? 0} | ${
        a.structure["not-checked"] ?? 0
      } | ${reasons} | ${docx} |`,
    );
  }

  out.push("");
  out.push("### 8. Custo");
  out.push("");
  out.push(
    "| Sistema | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |",
  );
  out.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|");
  for (const a of aggregates) {
    out.push(
      `| ${label(a)} | ${n0(a.promptTokensMean)} | ${n0(a.completionTokensMean)} | ${a.totalTokens} | ${n0(
        a.latencyMeanMs,
      )} | ${n0(a.latencyP95Ms)} | ${a.truncated} | ${a.unparseable} | ${a.errors} |`,
    );
  }

  out.push("");
  out.push("### Provas reprovadas, por prova");
  out.push("");
  for (const a of aggregates) {
    const failures =
      Object.entries(a.failedProofCounts)
        .map(([c, n]) => `${c}=${n}`)
        .join(", ") || "nenhuma";
    out.push(`- **${label(a)}** — ${failures}`);
  }

  out.push("");
  out.push("### Critérios introduzidos na região, por critério");
  out.push("");
  for (const a of aggregates) {
    const introduced =
      Object.entries(a.newCriteriaCounts)
        .map(([c, n]) => `${c}=${n}`)
        .join(", ") || "nenhum";
    out.push(`- **${label(a)}** — ${introduced}`);
  }

  return out.join("\n");
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function permute<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LETTERS = "ABCDEFGH";

export interface BlindBlock {
  readonly target: string;
  readonly model: string;
  readonly relevant: boolean;
  readonly versions: Array<{ letter: string; candidate: string }>;
}

export interface BlindSample {
  readonly markdown: string;
  readonly key: BlindBlock[];
  readonly relevant: number;
  readonly cosmetic: number;
  readonly identical: number;
}

function verdictOf(r: ScoredRow): string {
  return [
    r.vetoed ? "veto" : "-",
    r.failedProofs.includes("target_resolved") ? "alvo-aberto" : "-",
    r.fidelity.legalRefsLost.length > 0 ? "refs" : "-",
    r.fidelity.relationsLost.length > 0 ? "rel" : "-",
    r.fidelity.valuesLost.length > 0 ? "val" : "-",
    r.fidelity.markerFamiliesLost.length > 0 ? "marc" : "-",
    r.structure.kind,
  ].join("/");
}

export function buildBlindSample(rows: readonly ScoredRow[], context = "full"): BlindSample {
  const groups = new Map<string, ScoredRow[]>();
  for (const r of rows) {
    if (r.row.context !== context) continue;
    const key = `${r.row.targetId}|${r.row.model}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r);
    else groups.set(key, [r]);
  }

  const relevantSections: string[] = [];
  const cosmeticSections: string[] = [];
  const key: BlindBlock[] = [];
  let identical = 0;
  let relevantCount = 0;
  let cosmeticCount = 0;

  for (const groupKey of [...groups.keys()].sort()) {
    const group = groups.get(groupKey)!;
    const [targetId, model] = groupKey.split("|");
    if (new Set(group.map((r) => r.row.proposed)).size < 2) {
      identical++;
      continue;
    }

    const relevant = new Set(group.map(verdictOf)).size > 1;
    if (relevant) relevantCount++;
    else cosmeticCount++;

    const ordered = permute(
      [...group].sort((a, b) => a.row.candidate.localeCompare(b.row.candidate)),
      seedOf(groupKey),
    );

    const lines: string[] = [];
    lines.push(`## ${targetId} · ${model}`);
    lines.push("");
    lines.push("### Original");
    lines.push("");
    lines.push(group[0].row.original.replace(/\s+/gu, " ").trim());
    lines.push("");
    ordered.forEach((r, i) => {
      lines.push(`### Versão ${LETTERS[i]}`);
      lines.push("");
      lines.push(r.row.proposed);
      lines.push("");
    });
    (relevant ? relevantSections : cosmeticSections).push(lines.join("\n"));

    key.push({
      target: targetId,
      model,
      relevant,
      versions: ordered.map((r, i) => ({ letter: LETTERS[i], candidate: r.row.candidate })),
    });
  }

  const markdown = [
    "# Amostra cega — Etapa 1",
    "",
    "Cada bloco fixa um trecho e um modelo: a única coisa que muda entre as versões é o PROMPT,",
    "e o rótulo do prompt está escondido. Diga qual versão prefere e por quê.",
    "",
    "A chave (letra → candidato) está em `amostra-cega.chave.json` e não foi consultada para montar",
    "esta amostra. A ordem das versões vem de um embaralhamento determinístico do identificador do",
    "bloco — nada de aleatório, nada que siga a ordem dos candidatos.",
    "",
    `## Divergências relevantes (${relevantCount})`,
    "",
    "Blocos em que os candidatos chegam a VEREDITOS diferentes — veto, critério-alvo não resolvido,",
    "referência jurídica, relação entre normas, valor ou família de marcador perdida. É aqui que a",
    "sua preferência decide alguma coisa.",
    "",
    relevantSections.join("\n"),
    "",
    `## Divergências apenas de redação (${cosmeticCount})`,
    "",
    "Mesmos vereditos determinísticos, textos diferentes. Ficam aqui para não esconder nada.",
    "",
    cosmeticSections.join("\n"),
    "",
  ].join("\n");

  return { markdown, key, relevant: relevantCount, cosmetic: cosmeticCount, identical };
}

export interface DuelBlock {
  readonly target: string;
  readonly material: boolean;
  readonly reason: string;
  readonly versions: Array<{ letter: "X" | "Y"; candidate: string }>;
}

export interface DuelSample {
  readonly markdown: string;
  readonly key: DuelBlock[];
  readonly material: number;
  readonly wordingOnly: number;
  readonly identical: number;
}

export function buildDuelSample(
  rows: readonly ScoredRow[],
  first: string,
  second: string,
  context = "full",
): DuelSample {
  const byTarget = new Map<string, Map<string, ScoredRow>>();
  for (const r of rows) {
    if (r.row.context !== context) continue;
    if (r.row.candidate !== first && r.row.candidate !== second) continue;
    const bucket = byTarget.get(r.row.targetId) ?? new Map<string, ScoredRow>();
    bucket.set(r.row.candidate, r);
    byTarget.set(r.row.targetId, bucket);
  }

  const structureOf = (r: ScoredRow): string =>
    r.structure.kind === "expanded" ? `expandiu:${r.structure.blocks.join("|")}` : r.structure.kind;

  const sections: string[] = [];
  const wording: string[] = [];
  const key: DuelBlock[] = [];
  let material = 0;
  let wordingOnly = 0;
  let identical = 0;

  for (const targetId of [...byTarget.keys()].sort()) {
    const pair = byTarget.get(targetId)!;
    const a = pair.get(first);
    const b = pair.get(second);
    if (!a || !b) continue;
    if (a.row.proposed === b.row.proposed) {
      identical++;
      continue;
    }

    const reasons: string[] = [];
    if (a.vetoed !== b.vetoed) reasons.push("uma das versões foi vetada e a outra não");
    if (a.failedProofs.join(",") !== b.failedProofs.join(",")) reasons.push("provas reprovadas diferem");
    if (verdictOf(a) !== verdictOf(b)) reasons.push("veredito de fidelidade difere");
    if (structureOf(a) !== structureOf(b)) reasons.push("estrutura resultante difere");

    const isMaterial = reasons.length > 0;
    if (isMaterial) material++;
    else wordingOnly++;

    const ordered = permute([a, b], seedOf(targetId)) as [ScoredRow, ScoredRow];
    const letters: Array<"X" | "Y"> = ["X", "Y"];

    const lines: string[] = [];
    lines.push(`## ${targetId}`);
    lines.push("");
    if (isMaterial) {
      lines.push(`> Diferença medida: ${reasons.join("; ")}.`);
      lines.push("");
    }
    lines.push("### Original");
    lines.push("");
    lines.push(a.row.original.replace(/\s+/gu, " ").trim());
    lines.push("");
    ordered.forEach((r, i) => {
      lines.push(`### Versão ${letters[i]}`);
      lines.push("");
      lines.push(r.row.proposed);
      lines.push("");
    });
    (isMaterial ? sections : wording).push(lines.join("\n"));

    key.push({
      target: targetId,
      material: isMaterial,
      reason: reasons.join("; ") || "só redação",
      versions: ordered.map((r, i) => ({ letter: letters[i], candidate: r.row.candidate })),
    });
  }

  const markdown = [
    "# Amostra cega reduzida — as duas finalistas",
    "",
    "Só os dois prompts que sobraram. `rewrite@2` e os candidatos A/B/C ficaram de fora: já foram",
    "eliminados por fidelidade e estrutura, e mantê-los aqui só disputaria a sua atenção.",
    "",
    "Cada bloco fixa um trecho e o modelo (`gemini-2.5-flash`): a única variável é o prompt, e o",
    "rótulo dele está escondido. A ordem X/Y vem de um embaralhamento determinístico do",
    "identificador do alvo — não segue a ordem dos candidatos e não foi escolhida a dedo.",
    "",
    `## Diferenças materiais (${material})`,
    "",
    "Blocos em que as duas versões chegam a vereditos determinísticos diferentes — veto, provas",
    "reprovadas, fidelidade ou estrutura resultante. A linha «Diferença medida» diz qual.",
    "",
    sections.join("\n"),
    "",
    `## Diferenças só de redação (${wordingOnly})`,
    "",
    "Mesmo veredito medido, texto diferente. Ficam aqui para não esconder nada.",
    "",
    wording.join("\n"),
    "",
  ].join("\n");

  return { markdown, key, material, wordingOnly, identical };
}
