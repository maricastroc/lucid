/**
 * Tier 3 · BENCHMARK de sistemas de reescrita (ADR-017). NÃO roda na CI.
 *
 * Compara SISTEMAS COMPLETOS — (modelo × estratégia de prompt) + o que o verificador
 * determinístico e a sonda conseguem PROVAR/SINALIZAR — não só "qual texto ficou mais fácil".
 * Roda de verdade contra a API do Groq (rede + custo), então é gateado por `BENCHMARK=1` e
 * carrega a chave do ambiente ou do `.env`.
 *
 * Rodar:
 *   set -a; . ./.env; set +a; BENCHMARK=1 npx vitest run test/rewrite-benchmark.test.ts
 * Opcional: BENCHMARK_MODELS="llama-3.3-70b-versatile,openai/gpt-oss-120b"
 *
 * As 6 dimensões pedidas: clareza (ΔFlesch/Δpalavras), fidelidade semântica (sonda),
 * findings restantes, provas determinísticas preservadas, sinais de deriva, custo/latência.
 * Honestidade (I5): a coluna de agregação é "% sem veto mecânico" / "% com provas preservadas",
 * NUNCA "taxa de aprovação".
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { analyze, type Span } from "../src/lucid";
import { GroqProvider } from "../src/llm";
import { applyProposal, LlmRewriteProposer, verifyRewrite, type RewriteStrategy } from "../src/report/rewrite";
import { LlmComprehensionProbe } from "../src/lucid/probe/llm-probe";

const RUN = process.env.BENCHMARK === "1";
const FLOOR_QUESTION = "Qual é o fato principal que este trecho comunica?";
const PROBE_MODEL = "llama-3.1-8b-instant";

function loadGroqKey(): string | null {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const m = fs.readFileSync(".env", "utf8").match(/^GROQ_API_KEY=(.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/** Golden de parágrafos administrativos/jurídicos — inclui números, datas e nomes para exercer as provas. */
const GOLDEN: { id: string; text: string }[] = [
  {
    id: "monstro-impessoal",
    text:
      "A operacionalização das diretrizes concernentes à reestruturação metodológica do processo de " +
      "consolidação das iniciativas institucionais, cuja implementação vinha sendo objeto de sucessivas " +
      "deliberações em virtude da recorrente necessidade de compatibilização entre demandas estratégicas " +
      "potencialmente conflitantes, revelou que a inexistência de mecanismos suficientemente robustos para a " +
      "sistematização da priorização decisória não apenas dificultava a mensuração da efetividade das ações " +
      "anteriormente executadas, como também comprometia a previsibilidade dos desdobramentos decorrentes.",
  },
  {
    id: "numeros-datas-nomes",
    text:
      "O pagamento de R$ 1.500,00, referente à competência de 03/2025, deverá ser efetuado pela Secretaria " +
      "de Finanças até 30/04/2025, sob pena de incidência dos encargos moratórios previstos no artigo 12 da " +
      "Resolução 45, sem prejuízo das demais sanções cabíveis ao caso concreto ora analisado.",
  },
  {
    id: "passiva-jargao",
    text:
      "Foi deliberado pela comissão que os autos supracitados fossem encaminhados à autoridade competente, " +
      "porquanto a documentação apresentada pelo requerente havia sido considerada insuficiente em sede de " +
      "análise preliminar, razão pela qual restou determinada a realização de diligência complementar.",
  },
];

interface Sample {
  changed: boolean;
  dFlesch: number;
  dWords: number;
  findingsAfter: number;
  proofsPreserved: boolean; // números + datas + jargão preservados
  blocked: boolean;
  meaningFlagged: boolean;
  entitiesFlagged: boolean;
  latencyMs: number;
  tokens: number;
}

function overlapsRegion(start: number, end: number, s: number, e: number): boolean {
  return s < end && e > start;
}

async function runSystem(key: string, model: string, strategy: RewriteStrategy): Promise<Sample[]> {
  const genProvider = new GroqProvider(key);
  const proposer = new LlmRewriteProposer(genProvider, model, strategy);
  const probe = new LlmComprehensionProbe(new GroqProvider(key), PROBE_MODEL);
  const samples: Sample[] = [];

  for (const item of GOLDEN) {
    const target: Span = { start: 0, end: item.text.length, text: item.text };

    const t0 = Date.now();
    const proposal = await proposer.propose({ text: item.text, target });
    const latencyMs = Date.now() - t0;
    const tokens = genProvider.lastUsage?.totalTokens ?? 0;

    const verification = await verifyRewrite(item.text, target, proposal, { probe, question: FLOOR_QUESTION });

    const rewritten = applyProposal(item.text, target, proposal);
    const after = analyze(rewritten);
    const newEnd = target.start + proposal.proposed.length;
    const findingsAfter = after.findings.filter((f) => overlapsRegion(f.span.start, f.span.end, target.start, newEnd)).length;

    const proofPassed = (c: string) => verification.proofs.find((p) => p.check === c)?.passed === true;
    const signalFlagged = (c: string) => verification.signals.find((s) => s.check === c)?.flagged === true;

    samples.push({
      changed: proposal.proposed !== proposal.original,
      dFlesch: verification.metrics.fleschPtAfter - verification.metrics.fleschPtBefore,
      dWords: verification.metrics.wordsAfter - verification.metrics.wordsBefore,
      findingsAfter,
      proofsPreserved: proofPassed("numbers_preserved") && proofPassed("dates_preserved") && proofPassed("no_new_jargon"),
      blocked: verification.hasBlockingFailure,
      meaningFlagged: signalFlagged("meaning_preserved"),
      entitiesFlagged: signalFlagged("entities_preserved"),
      latencyMs,
      tokens,
    });
  }
  return samples;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function pct(bools: boolean[]): number {
  return bools.length ? (100 * bools.filter(Boolean).length) / bools.length : 0;
}

describe.runIf(RUN)("benchmark de sistemas de reescrita (rede — fora da CI)", () => {
  it(
    "compara (modelo × estratégia) nas 6 dimensões",
    async () => {
      const key = loadGroqKey();
      if (!key) throw new Error("GROQ_API_KEY ausente (exporte ou ponha no .env)");

      const models = (process.env.BENCHMARK_MODELS ?? "llama-3.3-70b-versatile,openai/gpt-oss-120b")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      const strategies: RewriteStrategy[] = ["correct", "rewrite"];

      const rows: string[] = [];
      rows.push("| Sistema | reescreveu% | ΔFlesch | Δpalav | findings(depois) | provas OK% | fidelidade(s/deriva)% | s/nome-perdido% | sem veto% | latência ms | tokens |");
      rows.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|");

      for (const model of models) {
        for (const strategy of strategies) {
          const s = await runSystem(key, model, strategy);
          const label = `${model.replace("openai/", "")} · ${strategy}`;
          rows.push(
            `| ${label} | ${pct(s.map((x) => x.changed)).toFixed(0)} | ${mean(s.map((x) => x.dFlesch)).toFixed(1)} | ${mean(
              s.map((x) => x.dWords),
            ).toFixed(0)} | ${mean(s.map((x) => x.findingsAfter)).toFixed(1)} | ${pct(s.map((x) => x.proofsPreserved)).toFixed(
              0,
            )} | ${pct(s.map((x) => !x.meaningFlagged)).toFixed(0)} | ${pct(s.map((x) => !x.entitiesFlagged)).toFixed(0)} | ${pct(
              s.map((x) => !x.blocked),
            ).toFixed(0)} | ${mean(s.map((x) => x.latencyMs)).toFixed(0)} | ${mean(s.map((x) => x.tokens)).toFixed(0)} |`,
          );
        }
      }

      const table = rows.join("\n");
      // process.stdout.write NÃO é interceptado pelo vitest (console.log seria engolido).
      process.stdout.write(`\n=== BENCHMARK (${GOLDEN.length} trechos por sistema) ===\n${table}\n\n`);
      if (process.env.BENCHMARK_OUT) fs.writeFileSync(process.env.BENCHMARK_OUT, `${table}\n`);
      expect(rows.length).toBeGreaterThan(2);
    },
    600_000,
  );
});
