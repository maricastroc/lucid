import type { Severity } from "@/lucid";
import type { AuditedFile } from "./audit";
import { SEVERITY_ORDER } from "./audit";

const SEVERITY_LABEL: Record<Severity, string> = {
  info: "observação",
  warning: "atenção",
  error: "prioritário",
};

const CAVEAT_MEASURES =
  "A auditoria mede, não aprova: ausência de achados não é atestado de clareza.";
const CAVEAT_CURATED =
  "Critérios de léxico consultam listas curadas — contagem zero significa que nada da lista casou, não que o fenômeno não existe.";

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function summaryLine(file: AuditedFile): string {
  const total = file.findings.length;
  if (total === 0) return `${file.name}: nenhum achado`;
  const parts = SEVERITY_ORDER.filter((s) => file.counts[s] > 0)
    .reverse()
    .map((s) => `${file.counts[s]} ${SEVERITY_LABEL[s]}`);
  return `${file.name}: ${total} ${plural(total, "achado", "achados")} (${parts.join(", ")})`;
}

export function renderText(files: readonly AuditedFile[], quiet: boolean): string {
  const out: string[] = [];

  for (const file of files) {
    out.push(summaryLine(file));

    if (!quiet) {
      file.findings.forEach((finding, i) => {
        const { line, column } = file.positions[i];
        const section = finding.normativeReference ? ` · ISO ${finding.normativeReference.section}` : "";
        const human = finding.requiresHuman ? " · exige decisão humana" : "";
        out.push(`  ${line}:${column}  ${SEVERITY_LABEL[finding.severity]}  ${finding.criterion}${section}${human}`);
        out.push(`      "${truncate(collapse(finding.span.text), 72)}"`);
        out.push(`      ${collapse(finding.justification)}`);
        if (finding.suggestion !== undefined) out.push(`      equivalente curado: "${finding.suggestion}"`);
      });
      const flesch = file.diagnostic.metrics.fleschPt;
      out.push(
        `  ${file.diagnostic.metrics.words} palavras · ${file.diagnostic.metrics.sentences} frases · Flesch-PT ${
          flesch === null ? "não medido" : flesch.toFixed(1)
        }`,
      );
    }
    out.push("");
  }

  if (files.length > 1) {
    const total = files.reduce((n, f) => n + f.findings.length, 0);
    out.push(`${files.length} arquivos · ${total} ${plural(total, "achado", "achados")}`);
    out.push("");
  }

  out.push(CAVEAT_MEASURES);
  out.push(CAVEAT_CURATED);
  return out.join("\n");
}

export function renderJson(files: readonly AuditedFile[]): string {
  const first = files[0]?.diagnostic.meta;
  const payload = {
    tool: "lucid",
    schemaVersion: 1,
    engine: first === undefined ? null : first,
    caveats: [CAVEAT_MEASURES, CAVEAT_CURATED],
    files: files.map((file) => ({
      name: file.name,
      counts: file.counts,
      totalFindings: file.findings.length,
      metrics: file.diagnostic.metrics,
      score: file.diagnostic.score,
      findings: file.findings.map((finding, i) => ({
        criterion: finding.criterion,
        category: finding.category,
        severity: finding.severity,
        source: finding.source,
        principleGroup: finding.principleGroup,
        normativeReference: finding.normativeReference ?? null,
        requiresHuman: finding.requiresHuman,
        suggestion: finding.suggestion ?? null,
        justification: finding.justification,
        span: { start: finding.span.start, end: finding.span.end, text: finding.span.text },
        position: file.positions[i],
      })),
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
