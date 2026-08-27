import { GeminiProvider } from "../../src/llm/gemini";
import { GroqProvider } from "../../src/llm/groq";
import type { ChatProvider } from "../../src/llm/types";
import { criterionById } from "./lib/criteria";
import { appendJsonl, readJsonl } from "./lib/jsonl";
import { labelPassage } from "./lib/labeler";
import { paths } from "./lib/paths";
import { assertNotSealed, loadManifest, saveManifest } from "./lib/manifest";
import { sealedEvalEnabled } from "./lib/split";
import type { CorpusPassage, CriterionId, LabelerRun, LabelerSpec } from "./lib/types";

class StubProvider implements ChatProvider {
  readonly id = "stub";
  readonly models = ["stub-demo"];
  async complete(): Promise<string> {
    return '{"ocorrencias":[],"confianca":"baixa"}';
  }
}

function buildLabelers(useStub: boolean): Array<{ spec: LabelerSpec; provider: ChatProvider }> {
  if (useStub) {
    return [
      { spec: { id: "stub-a", model: "stub-demo", promptVersion: "", temperature: 0 }, provider: new StubProvider() },
      { spec: { id: "stub-b", model: "stub-demo", promptVersion: "", temperature: 0 }, provider: new StubProvider() },
    ];
  }

  const gemini = process.env.GEMINI_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  const missing = [gemini ? null : "GEMINI_API_KEY", groq ? null : "GROQ_API_KEY"].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `faltam chaves: ${missing.join(", ")}. Rode com --stub para exercitar o pipeline sem rede ` +
        "(o resultado não é publicável como métrica).",
    );
  }

  return [
    {
      spec: { id: "gemini", model: "gemini-2.5-flash", promptVersion: "", temperature: 0 },
      provider: new GeminiProvider(gemini as string),
    },
    {
      spec: { id: "groq", model: "openai/gpt-oss-120b", promptVersion: "", temperature: 0 },
      provider: new GroqProvider(groq as string),
    },
  ];
}

function parseArgs(argv: readonly string[]) {
  const args: { criterion?: string; split: string; limit?: number; stub: boolean } = { split: "dev", stub: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--criterion") args.criterion = argv[++i];
    else if (argv[i] === "--split") args.split = argv[++i];
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--stub") args.stub = true;
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.criterion === undefined) throw new Error("informe --criterion");

  const manifest = loadManifest();
  assertNotSealed(manifest, "label");

  if (args.split === "test" && !sealedEvalEnabled()) {
    throw new Error(
      "o split `test` está selado: rotular nele exige LUCID_SEALED_EVAL=1 e a execução fica " +
        "registrada. Itere no `dev` (ADR-087 §4.4).",
    );
  }

  const criterion = criterionById(args.criterion);
  const labelers = buildLabelers(args.stub);

  const all = readJsonl<CorpusPassage>(paths.passages());
  const eligible = all
    .filter((passage) => passage.split === args.split)
    .filter((passage) => passage.strata.random || passage.strata.cued.includes(criterion.id))
    .slice(0, args.limit ?? Number.POSITIVE_INFINITY);

  console.log(`${criterion.id} · split ${args.split} · ${eligible.length} trechos · rotuladores: ${labelers.map((l) => l.spec.id).join(", ")}`);

  for (const { spec, provider } of labelers) {
    const stamped: LabelerSpec = { ...spec, promptVersion: criterion.promptVersion };
    const runPath = paths.runs(criterion.id as CriterionId, spec.id);
    const done = new Set(readJsonl<LabelerRun>(runPath).map((run) => run.passageId));
    const pending = eligible.filter((passage) => !done.has(passage.passageId));
    console.log(`· ${spec.id}: ${pending.length} pendentes (${done.size} já feitos)`);

    let failures = 0;
    for (const [index, passage] of pending.entries()) {
      const run = await labelPassage({
        passageId: passage.passageId,
        passage: passage.text,
        criterion,
        spec: stamped,
        provider,
        at: new Date().toISOString(),
      });
      appendJsonl(runPath, run);
      if (!run.ok) failures += 1;
      if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${pending.length}…`);
    }
    if (failures > 0) console.log(`  ${failures} respostas inválidas — vão para a fila humana`);
  }

  const roster = labelers.map(({ spec }) => ({ ...spec, promptVersion: criterion.promptVersion }));
  const merged = [...manifest.labelers.filter((entry) => !roster.some((r) => r.id === entry.id && r.promptVersion === entry.promptVersion)), ...roster];
  saveManifest({ ...manifest, labelers: merged });

  console.log("pronto. Próximo: npm run corpus:reconcile -- --criterion " + criterion.id);
}

await main();
