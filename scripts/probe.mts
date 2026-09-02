// Sonda de investigação: roda o analisador em frases soltas e imprime os findings.
// Uso: npx tsx scripts/probe.mts "frase 1" "frase 2" ...
//      npx tsx scripts/probe.mts --file caminho.txt   (uma frase por linha)
import { readFileSync } from "node:fs";
import { analyze } from "../src/lucid";

const args = process.argv.slice(2);
const lines =
  args[0] === "--file"
    ? readFileSync(args[1], "utf-8").split("\n").filter((l) => l.trim() !== "" && !l.startsWith("#"))
    : args;

const only = process.env.ONLY?.split(",").map((s) => s.trim());

for (const line of lines) {
  const d = analyze(line);
  const found = d.findings.filter((f) => only === undefined || only.includes(f.criterion));
  const tag = found.length === 0 ? "—" : found.map((f) => `${f.criterion}[${f.severity}${f.requiresHuman ? "/H" : ""}]"${f.span.text}"`).join(" · ");
  console.log(`${found.length === 0 ? "  " : "!!"} ${line}\n     ${tag}`);
}
