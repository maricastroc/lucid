import fs from "node:fs/promises";
import path from "node:path";
import { ptDocumentServices } from "@/lucid";
import { auditDocument, auditText, crossesThreshold, type AuditedFile } from "./audit";
import { HELP, parseArgs, type CliOptions } from "./args";
import { renderCoverage, renderJson, renderText } from "./render";

const DOCX = ".docx";

const REFUSAL_MESSAGE = {
  unreadable: "não foi possível ler o arquivo — confirme que é um .docx válido",
  tracked_changes:
    "o arquivo tem alterações rastreadas ainda não resolvidas. Enquanto elas existirem, o próprio arquivo " +
    "não diz qual é o seu texto: aceite ou rejeite as alterações no editor e importe de novo",
  no_readable_content: "o arquivo não tem conteúdo legível para auditar",
} as const;
const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ""];

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function auditPath(target: string, options: CliOptions): Promise<AuditedFile> {
  if (target === "-") return auditText("<stdin>", await readStdin(), options.criteria);

  const extension = path.extname(target).toLowerCase();
  if (extension === DOCX) {
    const { importDocx } = await import("@/importers/docx");
    const result = await importDocx(await fs.readFile(target), ptDocumentServices);
    if (!result.ok) throw new Error(REFUSAL_MESSAGE[result.refusal]);
    return auditDocument(target, result.value.doc, options.criteria, result.value.notes);
  }
  if (!TEXT_EXTENSIONS.includes(extension)) {
    throw new Error(`extensão não suportada: ${extension || target} (use .txt, .md, .docx ou -)`);
  }
  return auditText(target, await fs.readFile(target, "utf8"), options.criteria);
}

async function versionLine(): Promise<string> {
  const { analyze } = await import("@/lucid");
  const { meta } = analyze("Texto.");
  return `lucid ${meta.lucidVersion} · locale ${meta.localeId} · ${meta.standardVersion} · config ${meta.configHash} · dados ${meta.dataHash}`;
}

export async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(`lucid: ${parsed.error}\n`);
    return 1;
  }

  const { options } = parsed;
  if (options.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (options.version) {
    process.stdout.write(`${await versionLine()}\n`);
    return 0;
  }
  if (options.coverage) {
    const { coverageReport } = await import("@/lucid");
    const report = coverageReport();
    process.stdout.write(
      options.format === "json"
        ? `${JSON.stringify(report, null, 2)}\n`
        : `${renderCoverage(report, options.quiet)}\n`,
    );
    return 0;
  }
  if (options.paths.length === 0) {
    process.stderr.write(`lucid: nenhum arquivo informado\n\n${HELP}\n`);
    return 1;
  }

  const files: AuditedFile[] = [];
  for (const target of options.paths) {
    try {
      files.push(await auditPath(target, options));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`lucid: não foi possível auditar ${target}: ${reason}\n`);
      return 1;
    }
  }

  process.stdout.write(options.format === "json" ? renderJson(files) : `${renderText(files, options.quiet)}\n`);

  const { failOn } = options;
  if (failOn === "never") return 0;
  return files.some((file) => crossesThreshold(file.counts, failOn)) ? 2 : 0;
}
