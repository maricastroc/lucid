import type { ChatProvider } from "../../../src/llm/types";
import type { CriterionSpec } from "./criteria";
import type { Confidence, LabelerRun, LabelerSpec, Occurrence } from "./types";

export function buildPrompt(criterion: CriterionSpec, passage: string): string {
  return [
    "Você está rotulando um corpus linguístico de textos oficiais brasileiros.",
    "Sua tarefa é marcar TODAS as ocorrências de um fenômeno no trecho abaixo.",
    "",
    `## Fenômeno: ${criterion.label}`,
    "",
    criterion.definition,
    "",
    "## Trecho",
    "",
    passage,
    "",
    "## Resposta",
    "",
    "Responda SOMENTE com JSON válido, sem cercas de código e sem comentário, nesta forma:",
    "",
    '{"ocorrencias":[{"trecho":"<a substring EXATA do trecho, copiada caractere por caractere>"}],"confianca":"alta"}',
    "",
    "Regras da resposta:",
    '- "trecho" precisa ser uma substring literal do texto acima. Não normalize, não corrija, não abrevie.',
    '- Nenhuma ocorrência: {"ocorrencias":[],"confianca":"alta"}.',
    '- Use "confianca":"baixa" quando o caso for ambíguo, quando faltar contexto para decidir, ou quando',
    "  você marcaria diferente numa segunda leitura. Confiança baixa manda o caso para revisão humana,",
    "  que é o resultado desejado quando há dúvida real — não é erro seu.",
  ].join("\n");
}

interface ParsedResponse {
  trechos: string[];
  confidence: Confidence;
}

export function parseResponse(raw: string): ParsedResponse | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as { ocorrencias?: unknown; confianca?: unknown };
  if (!Array.isArray(record.ocorrencias)) return null;

  const trechos: string[] = [];
  for (const item of record.ocorrencias) {
    if (typeof item === "string") {
      trechos.push(item);
      continue;
    }
    if (typeof item === "object" && item !== null) {
      const value = (item as { trecho?: unknown }).trecho;
      if (typeof value === "string") trechos.push(value);
    }
  }

  return { trechos, confidence: record.confianca === "baixa" ? "baixa" : "alta" };
}

export function locate(passage: string, trechos: readonly string[]): { occurrences: Occurrence[]; unresolved: string[] } {
  const occurrences: Occurrence[] = [];
  const unresolved: string[] = [];
  const taken: Array<{ start: number; end: number }> = [];

  for (const trecho of trechos) {
    if (trecho.length === 0) {
      unresolved.push(trecho);
      continue;
    }
    let from = 0;
    let placed = false;
    for (;;) {
      const index = passage.indexOf(trecho, from);
      if (index < 0) break;
      const overlaps = taken.some((span) => index < span.end && index + trecho.length > span.start);
      if (!overlaps) {
        occurrences.push({ start: index, end: index + trecho.length, text: trecho });
        taken.push({ start: index, end: index + trecho.length });
        placed = true;
        break;
      }
      from = index + 1;
    }
    if (!placed) unresolved.push(trecho);
  }

  occurrences.sort((a, b) => a.start - b.start);
  return { occurrences, unresolved };
}

export interface LabelRequest {
  passageId: string;
  passage: string;
  criterion: CriterionSpec;
  spec: LabelerSpec;
  provider: ChatProvider;
  at: string;
}

export async function labelPassage(request: LabelRequest): Promise<LabelerRun> {
  const { passageId, passage, criterion, spec, provider, at } = request;
  const base = {
    passageId,
    criterion: criterion.id,
    labelerId: spec.id,
    model: spec.model,
    promptVersion: spec.promptVersion,
    temperature: spec.temperature,
    at,
  };

  let raw = "";
  try {
    raw = await provider.complete(buildPrompt(criterion, passage), {
      model: spec.model,
      temperature: spec.temperature,
      maxTokens: 3000,
    });
  } catch (cause) {
    return { ...base, ok: false, error: String(cause), count: 0, occurrences: [], confidence: "baixa", rawResponse: "" };
  }

  const parsed = parseResponse(raw);
  if (parsed === null) {
    return {
      ...base,
      ok: false,
      error: "resposta não é JSON no formato pedido",
      count: 0,
      occurrences: [],
      confidence: "baixa",
      rawResponse: raw,
    };
  }

  const { occurrences, unresolved } = locate(passage, parsed.trechos);
  if (unresolved.length > 0) {
    return {
      ...base,
      ok: false,
      error: `trecho não encontrado literalmente no texto: ${JSON.stringify(unresolved)}`,
      count: occurrences.length,
      occurrences,
      confidence: "baixa",
      rawResponse: raw,
    };
  }

  return {
    ...base,
    ok: true,
    count: occurrences.length,
    occurrences,
    confidence: parsed.confidence,
    rawResponse: raw,
  };
}
