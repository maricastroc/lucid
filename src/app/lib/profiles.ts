import { hashConfig, type Config } from "@/lucid";
import { DEFAULT_CONFIG as PT_DEFAULT, type PtConfig } from "@/locales/pt-BR";
import type { AnalysisLocale, AnalysisLocaleId } from "../locale/active";

export const PROFILE_IDS = ["base", "normativo", "publico", "digital"] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export const PROFILE_VERSION = 1;

export interface ProfileDefinition {
  readonly id: ProfileId;
  readonly config: Config;
}

const ptWith = (overrides: Partial<PtConfig>): PtConfig => ({ ...PT_DEFAULT, ...overrides });

const PT_PROFILES: Record<ProfileId, PtConfig> = {
  base: PT_DEFAULT,

  normativo: ptWith({
    sentenceLength: { warnAbove: 25 },
    paragraphLength: { ...PT_DEFAULT.paragraphLength, maxSentences: 6 },
    subordinacao: { ...PT_DEFAULT.subordinacao, minPorFrase: 4 },
  }),

  publico: ptWith({
    sentenceLength: { warnAbove: 15 },
    paragraphLength: { ...PT_DEFAULT.paragraphLength, maxSentences: 3 },
    subordinacao: { ...PT_DEFAULT.subordinacao, minPorFrase: 2 },
    nominalizacaoEncadeada: { ...PT_DEFAULT.nominalizacaoEncadeada, minPorFrase: 2 },
  }),

  digital: ptWith({
    sentenceLength: { warnAbove: 15 },
    paragraphLength: { ...PT_DEFAULT.paragraphLength, maxSentences: 2 },
    longHeading: { ...PT_DEFAULT.longHeading, maxWords: 8 },
    proseEnumeration: { ...PT_DEFAULT.proseEnumeration, minMarkers: 2 },
  }),
};

const PURPOSE_PROFILES: Partial<Record<AnalysisLocaleId, Partial<Record<ProfileId, Config>>>> = {
  "pt-BR": PT_PROFILES,
};

function profilesOf(locale: AnalysisLocale): Partial<Record<ProfileId, Config>> {
  return { base: locale.defaultConfig, ...PURPOSE_PROFILES[locale.id] };
}

export function availableProfiles(locale: AnalysisLocale): readonly ProfileId[] {
  const profiles = profilesOf(locale);
  return PROFILE_IDS.filter((id) => profiles[id] !== undefined);
}

export function isProfileAvailable(id: ProfileId, locale: AnalysisLocale): boolean {
  return profilesOf(locale)[id] !== undefined;
}

export function profileConfig(id: ProfileId, locale: AnalysisLocale): Config {
  const config = profilesOf(locale)[id];
  if (config === undefined) {
    throw new Error(`o perfil "${id}" não existe para o locale "${locale.id}".`);
  }
  return config;
}

export function profileHash(id: ProfileId, locale: AnalysisLocale): string {
  return hashConfig(profileConfig(id, locale), locale.configSections);
}

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === "string" && (PROFILE_IDS as readonly string[]).includes(value);
}

export function profileOf(config: Config, locale: AnalysisLocale): ProfileId | null {
  const hash = hashConfig(config, locale.configSections);
  for (const id of availableProfiles(locale)) if (profileHash(id, locale) === hash) return id;
  return null;
}

export interface ProfileDifference {
  readonly section: string;
  readonly field: string;
  readonly base: number | boolean;
  readonly value: number | boolean;
}

export function profileDifferences(id: ProfileId, locale: AnalysisLocale): ProfileDifference[] {
  return differencesBetween(locale.defaultConfig, profileConfig(id, locale));
}

export function adjustmentsOver(config: Config, id: ProfileId, locale: AnalysisLocale): ProfileDifference[] {
  return differencesBetween(profileConfig(id, locale), config);
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
