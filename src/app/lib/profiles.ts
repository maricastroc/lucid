import { DEFAULT_CONFIG, hashConfig, type Config } from "@/lucid";

export const PROFILE_IDS = ["base", "normativo", "publico", "digital"] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export const PROFILE_VERSION = 1;

export interface ProfileDefinition {
  readonly id: ProfileId;
  readonly config: Config;
}

const withOverrides = (overrides: Partial<Config>): Config => ({ ...DEFAULT_CONFIG, ...overrides });

const CONFIGS: Record<ProfileId, Config> = {
  base: DEFAULT_CONFIG,

  normativo: withOverrides({
    sentenceLength: { warnAbove: 25, errorAbove: 40 },
    paragraphLength: { ...DEFAULT_CONFIG.paragraphLength, maxSentences: 6 },
    subordinacao: { ...DEFAULT_CONFIG.subordinacao, minPorFrase: 4 },
  }),

  publico: withOverrides({
    sentenceLength: { warnAbove: 15, errorAbove: 25 },
    paragraphLength: { ...DEFAULT_CONFIG.paragraphLength, maxSentences: 3 },
    subordinacao: { ...DEFAULT_CONFIG.subordinacao, minPorFrase: 2 },
    nominalizacaoEncadeada: { ...DEFAULT_CONFIG.nominalizacaoEncadeada, minPorFrase: 2 },
  }),

  digital: withOverrides({
    sentenceLength: { warnAbove: 15, errorAbove: 25 },
    paragraphLength: { ...DEFAULT_CONFIG.paragraphLength, maxSentences: 2 },
    longHeading: { ...DEFAULT_CONFIG.longHeading, maxWords: 8 },
    proseEnumeration: { ...DEFAULT_CONFIG.proseEnumeration, minMarkers: 2 },
  }),
};

export function profileConfig(id: ProfileId): Config {
  return CONFIGS[id];
}

export function profileHash(id: ProfileId): string {
  return hashConfig(CONFIGS[id]);
}

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === "string" && (PROFILE_IDS as readonly string[]).includes(value);
}

export function profileOf(config: Config): ProfileId | null {
  const hash = hashConfig(config);
  for (const id of PROFILE_IDS) if (hashConfig(CONFIGS[id]) === hash) return id;
  return null;
}

export interface ProfileDifference {
  readonly section: string;
  readonly field: string;
  readonly base: number | boolean;
  readonly value: number | boolean;
}

export function profileDifferences(id: ProfileId): ProfileDifference[] {
  return differencesBetween(DEFAULT_CONFIG, CONFIGS[id]);
}

export function adjustmentsOver(config: Config, id: ProfileId): ProfileDifference[] {
  return differencesBetween(CONFIGS[id], config);
}

function differencesBetween(from: Config, to: Config): ProfileDifference[] {
  const base = from as unknown as Record<string, Record<string, number | boolean>>;
  const target = to as unknown as Record<string, Record<string, number | boolean>>;
  const out: ProfileDifference[] = [];

  for (const section of Object.keys(base)) {
    for (const field of Object.keys(base[section])) {
      const from = base[section][field];
      const to = target[section][field];
      if (from !== to) out.push({ section, field, base: from, value: to });
    }
  }

  return out;
}
