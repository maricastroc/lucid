import fs from "node:fs/promises";
import path from "node:path";
import { ptDocumentServices } from "@/locales/pt-BR";
import { auditDocument, auditText, crossesThreshold, type AuditedFile } from "./audit";
import { HELP, parseArgs, type CliOptions } from "./args";
import { renderCoverage, renderJson, renderText } from "./render";

const DOCX = ".docx";
const PDF = ".pdf";

const REFUSAL_MESSAGE = {
  unreadable: "o arquivo não pôde ser lido. Confirme que é um .docx ou .pdf válido",
  tracked_changes:
    "o arquivo tem alterações rastreadas pendentes, então não dá para saber qual é o texto final. Aceite ou " +
    "rejeite as alterações no editor e rode o comando de novo",
  no_readable_content: "o arquivo não tem conteúdo legível para auditar",
  scanned:
    "este PDF é uma imagem digitalizada, sem texto para auditar. Use o arquivo original em .docx ou um PDF " +
    "exportado diretamente do editor de texto",
  columns:
    "este PDF está em duas ou mais colunas, e a leitura de cima para baixo misturaria o texto. Use o original " +
    "em .docx ou um PDF de uma coluna só",
  glued:
    "as palavras deste PDF saem grudadas na extração, então o texto lido não é o texto escrito. Use o original " +
    "em .docx",
  invariant:
    "um número que está no PDF se perdeu na leitura, então o texto extraído não é confiável. Use o original " +
    "em .docx",
} as const;
const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ""];

const FILE_ERROR: Record<string, string> = {
  ENOENT: "arquivo não encontrado",
  EISDIR: "o caminho é uma pasta, não um arquivo",
  EACCES: "sem permissão para ler o arquivo",
};

function failureReason(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (code !== undefined && code in FILE_ERROR) return FILE_ERROR[code];
  return error instanceof Error ? error.message : String(error);
}

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
    return auditDocument(target, result.value.doc, options.criteria, { format: "docx", ...result.value.notes });
  }
  if (extension === PDF) {
    const { importPdf } = await import("@/importers/pdf");
    const result = await importPdf(await fs.readFile(target), ptDocumentServices);
    if (!result.ok) throw new Error(REFUSAL_MESSAGE[result.refusal]);
    return auditDocument(target, result.value.doc, options.criteria, { format: "pdf", ...result.value.notes });
  }
  if (!TEXT_EXTENSIONS.includes(extension)) {
    throw new Error(`extensão não suportada: ${extension || target} (use .txt, .md, .docx, .pdf ou -)`);
  }
  return auditText(target, await fs.readFile(target, "utf8"), options.criteria);
}

async function versionLine(): Promise<string> {
  const { analyze } = await import("@/locales/pt-BR");
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
    const { coverageReport } = await import("@/locales/pt-BR");
    const report = coverageReport();
    process.stdout.write(
      options.format === "json" ? `${JSON.stringify(report, null, 2)}\n` : `${renderCoverage(report, options.quiet)}\n`,
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
      process.stderr.write(`lucid: não foi possível auditar ${target}: ${failureReason(error)}\n`);
      return 1;
    }
  }

  process.stdout.write(options.format === "json" ? renderJson(files) : `${renderText(files, options.quiet)}\n`);

  const { failOn } = options;
  if (failOn === "never") return 0;
  return files.some((file) => crossesThreshold(file.counts, failOn)) ? 2 : 0;
}
