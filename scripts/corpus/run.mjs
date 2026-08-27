import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

const STAGES = ["collect", "extract", "segment", "label", "reconcile", "review"];

const [stage, ...rest] = process.argv.slice(2);
if (!STAGES.includes(stage)) {
  console.error(`estágio desconhecido: ${stage ?? "(nenhum)"}\nuse um de: ${STAGES.join(", ")}`);
  process.exit(1);
}

const outfile = resolve(`dist/corpus/${stage}.mjs`);

await build({
  entryPoints: [resolve(`scripts/corpus/${stage}.ts`)],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  tsconfig: resolve("tsconfig.json"),
  logLevel: "warning",
});

process.argv = [process.argv[0], outfile, ...rest];

try {
  await import(pathToFileURL(outfile).href);
} finally {
  rmSync(outfile, { force: true });
}
