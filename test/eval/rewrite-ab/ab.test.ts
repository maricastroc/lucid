import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CANDIDATES } from "./candidates";
import { aggregate, balancedSubset, buildBlindSample, buildDuelSample, renderTables } from "./report";
import { loadKeys, resultRows, runJobs, type Job } from "./runner";
import { scoreRow, type ScoredRow } from "./score";
import { renderVetoAnatomy, vetoDetail } from "./veto-anatomy";
import { loadEvalTargets, type EvalTarget } from "./targets";
import { windowAround, WINDOWS } from "./windows";

const OUT_DIR = path.join(process.cwd(), "eval/rewrite-ab");
const STAGE1_FILE = path.join(OUT_DIR, "runs.jsonl");

const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const TARGET_COUNT = num("AB_TARGETS", 20);
const MODELS = (process.env.AB_MODELS ?? "openai/gpt-oss-120b,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const ONLY = (process.env.AB_CANDIDATES ?? "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

const selectedCandidates = () => (ONLY.length === 0 ? CANDIDATES : CANDIDATES.filter((c) => ONLY.includes(c.id)));

const STAGE1_BUDGET = { maxCalls: num("AB_MAX_CALLS", 260), maxTokens: num("AB_MAX_TOKENS", 1_000_000) };
const STAGE2_BUDGET = { maxCalls: num("AB_MAX_CALLS", 140), maxTokens: num("AB_MAX_TOKENS", 450_000) };

const say = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

function targetsById(targets: readonly EvalTarget[]): Map<string, EvalTarget> {
  return new Map(targets.map((t) => [t.id, t]));
}

describe.runIf(process.env.AB_PLAN === "1")("plano (offline, zero chamadas)", () => {
  it("mostra os alvos, o custo estimado e o teto antes de qualquer chamada", () => {
    const targets = loadEvalTargets(TARGET_COUNT);
    const promptChars = targets.flatMap((t) => CANDIDATES.map((c) => c.build(t, t.text).length));
    const totalChars = promptChars.reduce((a, b) => a + b, 0) * MODELS.length;
    const criteria = new Map<string, number>();
    for (const t of targets) for (const c of t.criteria) criteria.set(c, (criteria.get(c) ?? 0) + 1);

    say(`\n=== PLANO ETAPA 1 ===`);
    say(
      `alvos: ${targets.length} · candidatos: ${CANDIDATES.length} · modelos: ${MODELS.length} (${MODELS.join(", ")})`,
    );
    say(`chamadas planejadas: ${targets.length * CANDIDATES.length * MODELS.length}`);
    say(`teto: ${STAGE1_BUDGET.maxCalls} chamadas / ${STAGE1_BUDGET.maxTokens} tokens`);
    say(`caracteres de prompt: ${totalChars} · estimativa ~${Math.round(totalChars / 3.5)} tokens de entrada`);
    say(`documentos distintos: ${new Set(targets.map((t) => t.document)).size}`);
    say(
      `critérios no briefing: ${[...criteria.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${c}=${n}`)
        .join(", ")}`,
    );
    say(`alvos com prose_enumeration: ${targets.filter((t) => t.criteria.includes("prose_enumeration")).length}`);
    for (const t of targets) {
      say(`  ${t.id} · ${t.span.text.length}c · [${t.criteria.join(", ")}]`);
    }
    expect(targets.length).toBeGreaterThan(0);
  });
});

describe.runIf(process.env.AB === "1")("etapa 1 — evolução do prompt (rede)", () => {
  it("roda os quatro candidatos nos mesmos alvos, modelos e parâmetros", async () => {
    const targets = loadEvalTargets(TARGET_COUNT);
    const candidates = selectedCandidates();
    if (candidates.length === 0) throw new Error(`AB_CANDIDATES não casou com nenhum candidato: ${ONLY.join(", ")}`);
    const jobs: Job[] = [];
    for (const target of targets) {
      for (const candidate of candidates) {
        for (const model of MODELS) {
          jobs.push({ candidate: candidate.id, model, context: "full", target, contextText: target.text });
        }
      }
    }

    say(`\n=== ETAPA 1 ===`);
    say(
      `alvos: ${targets.length} · candidatos: ${candidates.map((c) => c.id).join(", ")} · modelos: ${MODELS.join(", ")}`,
    );
    say(
      `plano: ${jobs.length} chamadas · teto: ${STAGE1_BUDGET.maxCalls} chamadas / ${STAGE1_BUDGET.maxTokens} tokens`,
    );

    const summary = await runJobs(STAGE1_FILE, jobs, loadKeys(), STAGE1_BUDGET, say);
    say(`\n${JSON.stringify(summary, null, 2)}`);
    expect(summary.called + summary.reused).toBeGreaterThan(0);
  }, 1_200_000);
});

describe.runIf(process.env.AB_STAGE2 === "1")("etapa 2 — redução de contexto (rede)", () => {
  it("roda o prompt escolhido com documento inteiro × janelas de ±1, ±2 e ±3 parágrafos", async () => {
    const winner = process.env.AB_WINNER;
    if (!winner) throw new Error("AB_WINNER não definido — a etapa 2 só roda com o prompt já escolhido");

    const targets = loadEvalTargets(TARGET_COUNT);
    const jobs: Job[] = [];
    for (const target of targets) {
      for (const paragraphs of WINDOWS) {
        for (const model of MODELS) {
          jobs.push({
            candidate: winner,
            model,
            context: `±${paragraphs}`,
            target,
            contextText: windowAround(target.text, target.span, paragraphs),
          });
        }
      }
    }

    say(`\n=== ETAPA 2 · prompt ${winner} ===`);
    say(`plano: ${jobs.length} chamadas novas (o "documento inteiro" reaproveita a etapa 1)`);
    say(`teto: ${STAGE2_BUDGET.maxCalls} chamadas / ${STAGE2_BUDGET.maxTokens} tokens`);

    const summary = await runJobs(STAGE1_FILE, jobs, loadKeys(), STAGE2_BUDGET, say);
    say(`\n${JSON.stringify(summary, null, 2)}`);
    expect(summary.called + summary.reused).toBeGreaterThan(0);
  }, 1_200_000);
});

describe.runIf(process.env.AB_REPORT === "1")("relatório (offline, zero chamadas)", () => {
  it("pontua as respostas salvas e escreve as tabelas e a amostra cega", async () => {
    const rows = resultRows(STAGE1_FILE);
    expect(rows.length).toBeGreaterThan(0);

    const byId = targetsById(loadEvalTargets(Math.max(TARGET_COUNT, 500)));
    const scored: ScoredRow[] = [];
    for (const row of rows) {
      const target = byId.get(row.targetId);
      if (!target) throw new Error(`alvo ausente para a linha salva: ${row.targetId}`);
      scored.push(await scoreRow(row, target));
    }

    const model = process.env.AB_MODEL ?? "gemini-2.5-flash";
    const onModel = scored.filter((r) => r.row.model === model);
    const balanced = balancedSubset(onModel);
    const covered = new Set(balanced.map((r) => r.row.targetId));

    const SCOPE = [
      "# A/B da reescrita — Etapa 1",
      "",
      `## LIMITAÇÃO DECLARADA: um modelo só (\`${model}\`)`,
      "",
      "Este relatório compara PROMPTS com o modelo fixo. Ele **não** mostra que um prompt é o",
      "melhor em geral — mostra qual é o melhor para este modelo. O segundo braço",
      "(`openai/gpt-oss-120b`) foi abandonado por cota diária do provedor esgotada, com a",
      "baseline da IAris em 1 e 0 respostas de 20: naquele modelo não havia com o que comparar.",
      "",
      "Que a diferença entre modelos é real, e não hipótese: nos dados parciais do Groq o",
      "`rewrite@2` preservou número em 83% dos casos, contra 25% no Gemini. Um vencedor eleito",
      "aqui vale para o Gemini até que o outro braço seja refeito.",
      "",
      `**Recorte das tabelas:** ${covered.size} alvos em que TODOS os candidatos responderam ` +
        `(de ${new Set(onModel.map((r) => r.row.targetId)).size} com alguma resposta). Comparar candidatos sobre`,
      "conjuntos de alvos diferentes deixaria um alvo fácil inflar quem por acaso o pegou. A visão",
      "sem esse recorte vem no fim, com o n de cada braço.",
      "",
    ].join("\n");

    const aggregates = aggregate(balanced);
    const tables = renderTables(aggregates);
    const unbalanced = renderTables(aggregate(onModel));
    const sample = buildBlindSample(balanced);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUT_DIR, "relatorio.md"),
      `${SCOPE}\n${tables}\n\n---\n\n## Sem o recorte balanceado (n desigual, para conferência)\n\n${unbalanced}\n`,
    );
    fs.writeFileSync(path.join(OUT_DIR, "agregados.json"), `${JSON.stringify(aggregates, null, 2)}\n`);
    fs.writeFileSync(path.join(OUT_DIR, "amostra-cega.md"), sample.markdown);
    fs.writeFileSync(path.join(OUT_DIR, "amostra-cega.chave.json"), `${JSON.stringify(sample.key, null, 2)}\n`);

    say(`\n${SCOPE}\n${tables}\n`);
    say(
      `amostra cega: ${sample.relevant} blocos com divergência relevante, ${sample.cosmetic} só de redação, ${sample.identical} idênticos\n`,
    );
  }, 900_000);
});

describe.runIf(process.env.AB_FINAL === "1")("decisão final entre as duas finalistas (offline)", () => {
  it("abre o veto, refaz as métricas sobre os 20 pares completos e monta a amostra cega reduzida", async () => {
    const model = process.env.AB_MODEL ?? "gemini-2.5-flash";
    const finalists = (process.env.AB_FINALISTS ?? "iaris@v20-porta,iaris@v20+briefing")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const byId = targetsById(loadEvalTargets(Math.max(TARGET_COUNT, 500)));
    const rows = resultRows(STAGE1_FILE).filter((r) => r.model === model && finalists.includes(r.candidate));
    expect(rows.length).toBeGreaterThan(0);

    const scored: ScoredRow[] = [];
    for (const row of rows) {
      const target = byId.get(row.targetId);
      if (!target) throw new Error(`alvo ausente para a linha salva: ${row.targetId}`);
      scored.push(await scoreRow(row, target));
    }

    const pairs = balancedSubset(scored);
    const targets = new Set(pairs.map((r) => r.row.targetId));

    const anatomy = renderVetoAnatomy(scored.map(vetoDetail));
    const aggregates = aggregate(pairs);
    const tables = renderTables(aggregates);
    const duel = buildDuelSample(pairs, finalists[0], finalists[1]);

    const HEAD = [
      "# Decisão final — as duas portas da IAris",
      "",
      `Modelo fixo: \`${model}\`. **${targets.size} alvos**, os pares completos das duas finalistas —`,
      "sem o recorte de 14 alvos, que existia só para equilibrar a tabela de seis braços.",
      "",
      "A limitação de modelo único continua valendo: isto elege o melhor prompt PARA ESTE MODELO.",
      "",
    ].join("\n");

    const slug = finalists.map((c) => c.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "")).join("-x-");
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, `final-${slug}.md`), `${HEAD}${anatomy}\n\n${tables}\n`);
    fs.writeFileSync(path.join(OUT_DIR, `duelo-${slug}.md`), duel.markdown);
    fs.writeFileSync(path.join(OUT_DIR, `duelo-${slug}.chave.json`), `${JSON.stringify(duel.key, null, 2)}\n`);

    say(`\n${HEAD}${anatomy}\n\n${tables}\n`);
    say(`duelo cego: ${duel.material} materiais, ${duel.wordingOnly} só de redação, ${duel.identical} idênticos\n`);
  }, 900_000);
});
