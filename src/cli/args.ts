import { isCriterionId, type CriterionId } from "@/lucid";

export type OutputFormat = "text" | "json";
export type FailOn = "never" | "info" | "warning" | "error";

export interface CliOptions {
  readonly paths: readonly string[];
  readonly format: OutputFormat;
  readonly failOn: FailOn;
  readonly criteria: readonly CriterionId[];
  readonly quiet: boolean;
  readonly coverage: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export type ParseResult = { readonly ok: true; readonly options: CliOptions } | { readonly ok: false; readonly error: string };

const FORMATS: readonly OutputFormat[] = ["text", "json"];
const FAIL_ON: readonly FailOn[] = ["never", "info", "warning", "error"];

export function parseArgs(argv: readonly string[]): ParseResult {
  const paths: string[] = [];
  const criteria: CriterionId[] = [];
  let format: OutputFormat = "text";
  let failOn: FailOn = "never";
  let quiet = false;
  let coverage = false;
  let help = false;
  let version = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--version" || arg === "-v") {
      version = true;
      continue;
    }
    if (arg === "--quiet" || arg === "-q") {
      quiet = true;
      continue;
    }
    if (arg === "--coverage") {
      coverage = true;
      continue;
    }
    if (arg === "--format" || arg === "--fail-on" || arg === "--criterion") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) return { ok: false, error: `${arg} exige um valor` };
      i++;
      if (arg === "--format") {
        if (!(FORMATS as readonly string[]).includes(value)) {
          return { ok: false, error: `formato desconhecido: ${value} (use ${FORMATS.join(" ou ")})` };
        }
        format = value as OutputFormat;
        continue;
      }
      if (arg === "--fail-on") {
        if (!(FAIL_ON as readonly string[]).includes(value)) {
          return { ok: false, error: `gravidade desconhecida: ${value} (use ${FAIL_ON.join(", ")})` };
        }
        failOn = value as FailOn;
        continue;
      }
      if (!isCriterionId(value)) return { ok: false, error: `critério desconhecido: ${value}` };
      if (!criteria.includes(value)) criteria.push(value);
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") return { ok: false, error: `opção desconhecida: ${arg}` };

    paths.push(arg);
  }

  return { ok: true, options: { paths, format, failOn, criteria, quiet, coverage, help, version } };
}

export const HELP = `Lucid — auditor determinístico de Linguagem Simples (ABNT NBR ISO 24495-1)

USO
  lucid <arquivo...> [opções]
  cat documento.txt | lucid -

OPÇÕES
  --format text|json     formato da saída (padrão: text)
  --fail-on <gravidade>  never|info|warning|error — sai com código 2 se houver
                         achado nessa gravidade ou acima (padrão: never)
  --criterion <id>       audita só este critério; pode repetir
  -q, --quiet            só o resumo por arquivo
  --coverage             mapa de cobertura por cláusula da norma e sai;
                         não audita arquivo nenhum
  -v, --version          versão da engine e dos dados
  -h, --help             esta ajuda

CÓDIGOS DE SAÍDA
  0  a auditoria rodou
  1  nada foi auditado (opção inválida, arquivo ilegível, ou recusa —
     .docx com alterações rastreadas não resolvidas, ou sem conteúdo legível)
  2  o limite declarado em --fail-on foi cruzado

  Sair com 0 significa que a medição terminou — NÃO que o texto foi aprovado.
  A ferramenta mede; ela não atesta clareza. Só há código 2 quando você declara
  um limite: o corte é seu, nunca dela.

FORMATOS ACEITOS
  .txt  .md  .docx  e entrada padrão (-)

A auditoria é 100% determinística e offline: nenhuma rede, nenhum LLM.
Mesma entrada produz saída byte-idêntica.`;
