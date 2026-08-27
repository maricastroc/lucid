export type PiiKind = "cpf" | "cnpj" | "email";

export interface PiiCount {
  readonly kind: PiiKind;
  readonly count: number;
}

interface Candidate {
  readonly kind: PiiKind;
  readonly start: number;
  readonly end: number;
}

const LEAD = "(?<!\\d)(?<!\\d[.\\-/])";
const TRAIL = "(?!\\d)(?![.\\-/]\\d)";

const RE_CPF = new RegExp(`${LEAD}\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}${TRAIL}`, "g");
const RE_CNPJ = new RegExp(`${LEAD}\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}${TRAIL}`, "g");
const RE_EMAIL = /(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+(?![\w-])/g;

function digitsOf(raw: string): number[] {
  return raw.replace(/\D/g, "").split("").map(Number);
}

function checkDigit(digits: readonly number[], weights: readonly number[]): number {
  const sum = digits.reduce((total, digit, i) => total + digit * weights[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function allTheSame(digits: readonly number[]): boolean {
  return digits.every((digit) => digit === digits[0]);
}

export function isValidCpf(raw: string): boolean {
  const digits = digitsOf(raw);
  if (digits.length !== 11 || allTheSame(digits)) return false;

  const first = checkDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits[9] === first && digits[10] === second;
}

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidCnpj(raw: string): boolean {
  const digits = digitsOf(raw);
  if (digits.length !== 14 || allTheSame(digits)) return false;

  const first = checkDigit(digits.slice(0, 12), CNPJ_FIRST_WEIGHTS);
  const second = checkDigit(digits.slice(0, 13), CNPJ_SECOND_WEIGHTS);
  return digits[12] === first && digits[13] === second;
}

function collect(text: string, re: RegExp, kind: PiiKind, accept: (raw: string) => boolean): Candidate[] {
  const out: Candidate[] = [];
  const scan = new RegExp(re.source, "g");
  for (let m = scan.exec(text); m !== null; m = scan.exec(text)) {
    if (accept(m[0])) out.push({ kind, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

const KIND_ORDER: readonly PiiKind[] = ["cpf", "cnpj", "email"];

export function countPii(text: string): PiiCount[] {
  const candidates = [
    ...collect(text, RE_CNPJ, "cnpj", isValidCnpj),
    ...collect(text, RE_CPF, "cpf", isValidCpf),
    ...collect(text, RE_EMAIL, "email", () => true),
  ].sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);

  const taken: Candidate[] = [];
  for (const candidate of candidates) {
    if (taken.some((kept) => candidate.start < kept.end && candidate.end > kept.start)) continue;
    taken.push(candidate);
  }

  return KIND_ORDER.map((kind) => ({ kind, count: taken.filter((c) => c.kind === kind).length })).filter(
    (entry) => entry.count > 0,
  );
}
