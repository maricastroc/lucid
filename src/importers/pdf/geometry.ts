export interface PdfTextItem {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PdfRule {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly direction: "horizontal" | "vertical";
}

export interface PdfPageGeometry {
  readonly width: number;
  readonly height: number;
  readonly items: readonly PdfTextItem[];
  readonly images: number;
  readonly rules: readonly PdfRule[];
}

export interface PdfLine {
  readonly text: string;
  readonly page: number;
  readonly top: number;
  readonly left: number;
  readonly right: number;
  readonly height: number;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const at = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * fraction)));
  return sorted[at];
}
