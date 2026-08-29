import type { PdfPageGeometry } from "./geometry";

const EMPTY_PAGE_CHARS = 50;
const SCANNED_PAGE_RATIO = 0.7;
const MIN_SPACE_RATIO = 0.08;
const MAX_WORD_LENGTH = 8;
const MIN_ALPHA_RATIO = 0.75;

const LETTER_OR_SPACE = /[\p{L}\s]/u;

export interface TextQuality {
  readonly spaceRatio: number;
  readonly wordLength: number;
  readonly alphaRatio: number;
}

export function qualityOf(text: string): TextQuality {
  if (text.length === 0) return { spaceRatio: 0, wordLength: 0, alphaRatio: 0 };

  const words = text.split(/\s+/).filter((word) => word !== "");
  const letters = [...text].filter((character) => LETTER_OR_SPACE.test(character)).length;
  const wordCharacters = words.reduce((total, word) => total + word.length, 0);

  return {
    spaceRatio: [...text].filter((character) => character === " ").length / text.length,
    wordLength: words.length > 0 ? wordCharacters / words.length : 0,
    alphaRatio: letters / text.length,
  };
}

export function isGlued({ spaceRatio, wordLength, alphaRatio }: TextQuality): boolean {
  return spaceRatio < MIN_SPACE_RATIO || wordLength > MAX_WORD_LENGTH || alphaRatio < MIN_ALPHA_RATIO;
}

const charactersOn = (page: PdfPageGeometry): number =>
  page.items.reduce((total, item) => total + item.text.trim().length, 0);

export function emptyPages(pages: readonly PdfPageGeometry[]): number {
  return pages.filter((page) => charactersOn(page) < EMPTY_PAGE_CHARS).length;
}

export function isScanned(pages: readonly PdfPageGeometry[]): boolean {
  if (pages.length === 0) return false;
  const scanned = pages.filter((page) => charactersOn(page) < EMPTY_PAGE_CHARS && page.images > 0).length;
  return scanned / pages.length >= SCANNED_PAGE_RATIO;
}
