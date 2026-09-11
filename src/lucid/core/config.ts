import { stableHash } from "./hash";

export interface OrgTerm {
  readonly term: string;
  readonly plain: string | null;
  readonly reason: string;
}

export type ConfigValue = number | boolean;

export type ConfigField = ConfigValue | readonly OrgTerm[];

export type ConfigSection = Readonly<Record<string, ConfigField>>;

export interface Config {
  readonly metrics: { readonly decimalPlaces: number };
}

export type ThresholdStatus = "provisional" | "product-parameter";

export interface ThresholdBasis {
  readonly status: ThresholdStatus;
  readonly basis: string;
}

export type ConfigSectionRole = "organization-vocabulary";

export interface ConfigSectionSchema {
  readonly criterion: string | null;
  readonly role?: ConfigSectionRole;
  readonly thresholds?: Readonly<Record<string, ThresholdBasis>>;
}

export type ConfigSchema = Readonly<Record<string, ConfigSectionSchema>>;

export function configSections(config: Config): Readonly<Record<string, ConfigSection>> {
  return config as unknown as Readonly<Record<string, ConfigSection>>;
}

export function pickSections(config: Config, sections: readonly string[]): Record<string, unknown> {
  const record = configSections(config);
  const picked: Record<string, unknown> = {};
  for (const section of sections) {
    if (section in record) picked[section] = record[section];
  }
  return picked;
}

export function hashConfig(config: Config, sections?: readonly string[]): string {
  return stableHash(sections === undefined ? config : pickSections(config, sections));
}

export interface ConfigDeviation {
  readonly section: string;
  readonly field: string;
  readonly value: ConfigValue;
  readonly fallback: ConfigValue;
}

export function configDeviations(config: Config, baseConfig: Config): ConfigDeviation[] {
  const deviations: ConfigDeviation[] = [];
  const base = configSections(baseConfig);
  const current = configSections(config);

  for (const section of Object.keys(base)) {
    const defaults = base[section];
    const values = current[section];
    if (values === undefined) continue;
    for (const field of Object.keys(defaults)) {
      const value = values[field];
      const fallback = defaults[field];

      if (typeof value !== "number" && typeof value !== "boolean") continue;
      if (typeof fallback !== "number" && typeof fallback !== "boolean") continue;
      if (value === fallback) continue;
      deviations.push({ section, field, value, fallback });
    }
  }

  return deviations;
}

export function isDefaultConfig(config: Config, baseConfig: Config): boolean {
  return configDeviations(config, baseConfig).length === 0;
}
