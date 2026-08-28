export const PROBE_MAX_EXCERPT = 8000;

export interface ExcerptState {
  readonly text: string;
  readonly chars: number;
  readonly empty: boolean;
  readonly tooLong: boolean;
  readonly sendable: boolean;
}

export function excerptState(raw: string): ExcerptState {
  const text = raw.trim();
  return {
    text,
    chars: text.length,
    empty: text === "",
    tooLong: text.length > PROBE_MAX_EXCERPT,
    sendable: text !== "" && text.length <= PROBE_MAX_EXCERPT,
  };
}
