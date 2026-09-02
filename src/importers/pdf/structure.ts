import type { RawBlock, RawListItem } from "@/lucid/core/document/structured";
import type { ParagraphShape } from "./paragraphs";

export const ORDINAL = "[IVXLCDM]+|\\d{1,3}|[ÚU]NIC[OA]";

export interface StructureRule {
  readonly kind: string;
  readonly level: number;
  readonly reference: string;
  readonly pattern: RegExp;
}

export const HEADING_RULES: readonly StructureRule[] = [
  {
    kind: "parte",
    level: 1,
    reference: "LC 95/1998, art. 10, III",
    pattern: new RegExp(`^PARTE\\s+(?:${ORDINAL})\\b`, "iu"),
  },
  {
    kind: "livro",
    level: 1,
    reference: "LC 95/1998, art. 10, III",
    pattern: new RegExp(`^LIVRO\\s+(?:${ORDINAL})\\b`, "iu"),
  },
  {
    kind: "titulo",
    level: 1,
    reference: "LC 95/1998, art. 10, III",
    pattern: new RegExp(`^T[ÍI]TULO\\s+(?:${ORDINAL})\\b`, "iu"),
  },
  {
    kind: "anexo",
    level: 1,
    reference: "LC 95/1998, art. 11",
    pattern: new RegExp(`^(?:ANEXO|AP[ÊE]NDICE)(?:\\s+(?:${ORDINAL}))?\\b`, "iu"),
  },
  {
    kind: "capitulo",
    level: 2,
    reference: "LC 95/1998, art. 10, III",
    pattern: new RegExp(`^CAP[ÍI]TULO\\s+(?:${ORDINAL})\\b`, "iu"),
  },
  {
    kind: "secao",
    level: 3,
    reference: "LC 95/1998, art. 10, III",
    pattern: new RegExp(`^SE[ÇC][ÃA]O\\s+(?:${ORDINAL})\\b`, "iu"),
  },
  {
    kind: "subsecao",
    level: 4,
    reference: "LC 95/1998, art. 10, III",
    pattern: new RegExp(`^SUBSE[ÇC][ÃA]O\\s+(?:${ORDINAL})\\b`, "iu"),
  },
];

const DECIMAL = /^(\d{1,3}(?:\.\d{1,3})*)[.)]\s+(\S.*)$/u;

const INCISO = /^([IVXLCDM]{1,7})\s*[-–—.)]\s+(\S.*)$/u;
const ALINEA = /^([a-z])\s*[)\].]\s+(\S.*)$/u;
const BULLET = /^[*\-•●○◦·–—]\s+(\S.*)$/u;

const MAX_HEADING_CHARS = 90;
const MIN_TITLE_CHARS = 12;
const MAX_LEVEL = 5;

export type Classified =
  | { readonly kind: "heading"; readonly level: number; readonly text: string; readonly reference: string }
  | {
      readonly kind: "item";
      readonly level: number;
      readonly ordered: boolean;
      readonly text: string;
      readonly marker?: string;
    }
  | { readonly kind: "paragraph"; readonly text: string };

const endsOpen = (text: string): boolean => !/[.;:!?]$/u.test(text.trim());

const mostlyUpper = (text: string): boolean => {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return false;
  return letters.filter((c) => c === c.toLocaleUpperCase("pt-BR")).length / letters.length > 0.7;
};

export interface ShapeContext {
  readonly bodyHeight: number;
  readonly opening?: boolean;
}

export function classify(text: string, shape: ParagraphShape | undefined, context: ShapeContext): Classified {
  const trimmed = text.trim();

  const labelSized = trimmed.length <= MAX_HEADING_CHARS && (shape === undefined || shape.lines <= 2);
  if (labelSized) {
    for (const rule of HEADING_RULES) {
      if (rule.pattern.test(trimmed)) {
        return { kind: "heading", level: rule.level, text: trimmed, reference: rule.reference };
      }
    }
  }

  if (
    context.opening === true &&
    trimmed.length >= MIN_TITLE_CHARS &&
    labelSized &&
    endsOpen(trimmed) &&
    mostlyUpper(trimmed)
  ) {
    return { kind: "heading", level: 1, text: trimmed, reference: "abertura do documento" };
  }

  const decimal = DECIMAL.exec(trimmed);
  if (decimal !== null) {
    const depth = decimal[1].split(".").length;
    const body = decimal[2];
    const short = trimmed.length <= MAX_HEADING_CHARS && (shape === undefined || shape.lines === 1);
    const bigger = shape !== undefined && context.bodyHeight > 0 && shape.height > context.bodyHeight * 1.05;

    if (short && endsOpen(body) && (mostlyUpper(body) || bigger)) {
      return {
        kind: "heading",
        level: Math.min(6, depth + 1),
        text: trimmed,
        reference: "numeração decimal do documento",
      };
    }

    return { kind: "item", level: Math.min(MAX_LEVEL, depth - 1), ordered: true, text: body, marker: `${decimal[1]}.` };
  }

  const inciso = INCISO.exec(trimmed);
  if (inciso !== null) return { kind: "item", level: 1, ordered: true, text: inciso[2], marker: `${inciso[1]} -` };

  const alinea = ALINEA.exec(trimmed);
  if (alinea !== null) return { kind: "item", level: 2, ordered: true, text: alinea[2], marker: `${alinea[1]})` };

  const bullet = BULLET.exec(trimmed);
  if (bullet !== null) return { kind: "item", level: 0, ordered: false, text: bullet[1] };

  return { kind: "paragraph", text: trimmed };
}

export interface RecoveredStructure {
  readonly blocks: readonly RawBlock[];
  readonly anchors: readonly ParagraphShape[];
  readonly headings: number;
  readonly items: number;
  readonly references: readonly string[];
}

export function recoverStructure(
  paragraphs: readonly string[],
  shapes: readonly ParagraphShape[],
  bodyHeight: number,
): RecoveredStructure {
  const blocks: RawBlock[] = [];
  const anchors: ParagraphShape[] = [];
  const references = new Set<string>();
  let headings = 0;
  let items = 0;
  let open: RawListItem[] | null = null;
  let openAt: ParagraphShape | undefined;

  const closeList = (): void => {
    if (open !== null && open.length > 0) {
      blocks.push({ kind: "list", ordered: open[0].ordered, items: open });
      anchors.push(openAt ?? shapes[0]);
    }
    open = null;
    openAt = undefined;
  };

  paragraphs.forEach((text, index) => {
    const result = classify(text, shapes[index], { bodyHeight, opening: index === 0 });

    if (result.kind === "item") {
      items += 1;
      const item: RawListItem = {
        blocks: [result.text],
        level: result.level,
        ordered: result.ordered,
        ...(result.marker === undefined ? {} : { marker: result.marker }),
      };
      if (open === null) {
        open = [item];
        openAt = shapes[index];
      } else open.push(item);
      return;
    }

    closeList();
    if (result.kind === "heading") {
      headings += 1;
      references.add(result.reference);
      blocks.push({ kind: "heading", level: result.level, text: result.text });
      anchors.push(shapes[index]);
      return;
    }
    blocks.push({ kind: "paragraph", text: result.text });
    anchors.push(shapes[index]);
  });

  closeList();

  return { blocks, anchors, headings, items, references: [...references].sort() };
}
