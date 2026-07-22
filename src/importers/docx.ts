/**
 * Importador DOCX → `AnnotatedDocument` (ADR-039). É o ÚNICO lugar ciente do formato `.docx`.
 * Vive FORA do core (a cerca proíbe core/locale de importar `src/importers`) e é o único que pode
 * usar biblioteca: `mammoth` converte o DOCX em HTML SEMÂNTICO (mapeia estilos do Word → `h1..h6`,
 * `ul`/`ol`, `p`), determinístico e rodável no browser. Daí extraímos os blocos estruturais e o
 * core neutro (`buildStructuredDocument`) monta o modelo canônico. Nenhuma detecção aqui — só
 * extração e estrutura.
 *
 * O parse do HTML é intencionalmente tolerante e regex-based: a saída do mammoth é plana e
 * bem-formada (blocos de topo `h*`/`p`/`ul`/`ol` com `li`), então não exige um DOM (funciona igual
 * no browser e em teste Node). Limitação conhecida: listas ANINHADAS são achatadas para os itens de
 * primeiro nível — v1; refinar quando aparecer no material real.
 */
import mammoth from "mammoth";
import type { Document } from "@/lucid";
import { buildStructuredDocument, type RawBlock } from "@/lucid/core/document/structured";
import type { DocumentBuildServices } from "@/lucid/core/document/model";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Texto de um trecho de HTML: remove tags inline (strong/em/a…) e decodifica entidades. */
function textOf(innerHtml: string): string {
  return decodeEntities(innerHtml.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * HTML do mammoth → blocos estruturais neutros. Percorre os blocos de TOPO em ordem de leitura.
 * Exportado à parte (sem mammoth) para ser testável com HTML escrito à mão.
 */
export function htmlToRawBlocks(html: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const blockRe = /<(h[1-6]|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  for (let m = blockRe.exec(html); m !== null; m = blockRe.exec(html)) {
    const tag = m[1].toLowerCase();
    const inner = m[2];

    if (tag === "p") {
      const text = textOf(inner);
      if (text) blocks.push({ kind: "paragraph", text });
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      const text = textOf(inner);
      if (text) blocks.push({ kind: "heading", level: Number(tag[1]), text });
      continue;
    }

    const ordered = tag === "ol";
    const items: string[] = [];
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    for (let li = liRe.exec(inner); li !== null; li = liRe.exec(inner)) {
      const text = textOf(li[1]);
      if (text) items.push(text);
    }
    if (items.length > 0) blocks.push({ kind: "list", ordered, items });
  }

  return blocks;
}

/**
 * `.docx` (bytes) → `Document`. `services` = os serviços de documento do locale (segmentação de
 * frases + abreviações); a UI passa os do pt-BR. Assíncrono porque o mammoth é assíncrono.
 */
export async function importDocx(bytes: ArrayBuffer, services: DocumentBuildServices): Promise<Document> {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: bytes });
  return buildStructuredDocument(htmlToRawBlocks(html), services);
}
