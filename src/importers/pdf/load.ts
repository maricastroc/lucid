import type { PdfPageGeometry, PdfRule, PdfTextItem } from "./geometry";

const SPARSE_PAGE = 50;

export const PDF_WORKER_URL = "/pdf.worker.min.mjs";

let configured = false;

async function pdfjs() {
  const library = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!configured) {
    configured = true;
    if (typeof window !== "undefined") library.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  }
  return library;
}

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const RULE_THICKNESS = 3;
const RULE_LENGTH = 8;

interface OperatorList {
  fnArray: number[];
  argsArray: unknown[];
}

async function readRules(
  page: { getOperatorList: () => Promise<OperatorList> },
  pageHeight: number,
): Promise<PdfRule[]> {
  const { OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  let list: OperatorList;
  try {
    list = await page.getOperatorList();
  } catch {
    return [];
  }

  let ctm: Matrix = IDENTITY;
  const stack: Matrix[] = [];
  const rules: PdfRule[] = [];

  for (const [at, code] of list.fnArray.entries()) {
    if (code === OPS.save) {
      stack.push(ctm);
      continue;
    }
    if (code === OPS.restore) {
      ctm = stack.pop() ?? IDENTITY;
      continue;
    }
    if (code === OPS.transform) {
      ctm = multiply(ctm, list.argsArray[at] as Matrix);
      continue;
    }
    if (code !== OPS.constructPath) continue;

    const args = list.argsArray[at] as unknown[] | undefined;
    const box = args?.[2] as number[] | undefined;
    if (!box || box.length < 4) continue;

    const corners = [
      apply(ctm, box[0], box[1]),
      apply(ctm, box[2], box[1]),
      apply(ctm, box[0], box[3]),
      apply(ctm, box[2], box[3]),
    ];

    const left = Math.min(...corners.map((c) => c[0]));
    const right = Math.max(...corners.map((c) => c[0]));
    const top = pageHeight - Math.max(...corners.map((c) => c[1]));
    const bottom = pageHeight - Math.min(...corners.map((c) => c[1]));

    const width = right - left;
    const height = bottom - top;
    const horizontal = height <= RULE_THICKNESS && width >= RULE_LENGTH;
    const vertical = width <= RULE_THICKNESS && height >= RULE_LENGTH;
    if (!horizontal && !vertical) continue;

    rules.push({ left, top, right, bottom, direction: horizontal ? "horizontal" : "vertical" });
  }

  return rules;
}

async function countImages(page: { getOperatorList: () => Promise<OperatorList> }): Promise<number> {
  const { OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const painters = new Set<number>([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);

  try {
    const { fnArray } = await page.getOperatorList();
    return fnArray.filter((code) => painters.has(code)).length;
  } catch {
    return 0;
  }
}

export async function loadPdfPages(bytes: Uint8Array): Promise<PdfPageGeometry[]> {
  const library = await pdfjs();
  const task = library.getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, disableFontFace: true });
  const document = await task.promise;
  const pages: PdfPageGeometry[] = [];

  try {
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      const items: PdfTextItem[] = [];
      for (const entry of content.items) {
        if (!("str" in entry)) continue;
        items.push({
          text: entry.str,
          left: entry.transform[4],
          top: viewport.height - entry.transform[5],
          width: entry.width,
          height: Math.abs(entry.height) || Math.abs(entry.transform[3]),
        });
      }

      const characters = items.reduce((total, item) => total + item.text.trim().length, 0);

      pages.push({
        width: viewport.width,
        height: viewport.height,
        items,
        images: characters < SPARSE_PAGE ? await countImages(page) : 0,
        rules: await readRules(page, viewport.height),
      });

      page.cleanup();
    }
  } finally {
    await task.destroy();
  }

  return pages;
}
