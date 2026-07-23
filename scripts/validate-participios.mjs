import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATASETS = path.join(HERE, "..", "src", "locales", "pt-BR", "datasets");
const PART_IN = path.join(DATASETS, "participios-infinitivo.pt.json");

async function main() {
  const tsvPath = process.env.VERB_TSV ?? process.argv[2];
  if (!tsvPath) {
    console.error(
      "ERRO: informe o VERB.tsv do PortiLexicon-UD via env VERB_TSV ou 1º argumento.\n" +
        '  curl -sL "https://huggingface.co/spaces/NILC-ICMC-USP/PortiLexicon-UD/resolve/main/VERB.tsv" -o VERB.tsv\n' +
        "  VERB_TSV=./VERB.tsv node scripts/validate-participios.mjs",
    );
    process.exit(2);
  }
  if (!fs.existsSync(tsvPath)) {
    console.error(`ERRO: VERB.tsv não encontrado em ${tsvPath}`);
    process.exit(2);
  }

  const participleMap = JSON.parse(fs.readFileSync(PART_IN, "utf8")).map;
  const partLemmas = new Map(Object.keys(participleMap).map((p) => [p, new Set()]));

  const rl = readline.createInterface({ input: fs.createReadStream(tsvPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const tab1 = line.indexOf("\t");
    const tab2 = line.indexOf("\t", tab1 + 1);
    if (tab1 < 0 || tab2 < 0) continue;
    const form = line.slice(0, tab1);
    const lemma = line.slice(tab1 + 1, tab2);
    const featsRaw = line.slice(tab2 + 1);

    if (featsRaw.includes("VerbForm=Part") && partLemmas.has(form)) {
      partLemmas.get(form).add(lemma);
    }
  }

  const errors = [];
  const warnings = [];

  for (const [participle, infinitive] of Object.entries(participleMap)) {
    const lemmas = partLemmas.get(participle) ?? new Set();
    if (!lemmas.has(infinitive)) {
      errors.push(
        `participio: "${participle}" → "${infinitive}" não confirmado no léxico ` +
          `(lemas de particípio no léxico: ${[...lemmas].join(", ") || "nenhum"})`,
      );
    } else if (lemmas.size > 1) {
      warnings.push(
        `participio: "${participle}" é particípio de {${[...lemmas].sort().join(", ")}}; ` +
          `curadoria escolheu "${infinitive}"`,
      );
    }
  }

  for (const w of warnings) console.error(`AVISO  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERRO   ${e}`);
    console.error(`\n${errors.length} divergência(s) contra o léxico.`);
    process.exit(1);
  }

  console.error(
    `OK: ${Object.keys(participleMap).length} particípios validados` +
      (warnings.length ? ` (${warnings.length} aviso[s] de desambiguação)` : "") +
      ".",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
