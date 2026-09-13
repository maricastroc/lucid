import { configSections, type Config } from "../config";
import type { LocaleBundle } from "./locale";

export function assertLocaleBundle<C extends Config>(locale: LocaleBundle<C>): void {
  const where = `locale "${locale.id}"`;
  const config = configSections(locale.config);
  const schema = locale.configSchema;
  const criteria = new Set(locale.criteria.ids);
  const passes = new Set(locale.passes.map((pass) => pass.criterion));

  if (!("metrics" in config) || !("metrics" in schema)) {
    throw new Error(`${where}: toda configuração precisa da seção "metrics", declarada no schema.`);
  }

  for (const section of Object.keys(config)) {
    if (!(section in schema)) {
      throw new Error(
        `${where}: a seção de configuração "${section}" não está declarada no schema. Um locale não carrega ` +
          "configuração que não declarou — é por esse caminho que um critério de outro locale entraria por omissão.",
      );
    }
  }

  let vocabularySections = 0;
  for (const [section, spec] of Object.entries(schema)) {
    if (!(section in config)) {
      throw new Error(`${where}: o schema declara a seção "${section}", mas a configuração não a tem.`);
    }
    if (spec.criterion !== null && !criteria.has(spec.criterion)) {
      throw new Error(
        `${where}: a seção "${section}" controla o critério "${spec.criterion}", que não está no catálogo do locale.`,
      );
    }
    for (const field of Object.keys(spec.thresholds ?? {})) {
      if (typeof config[section][field] !== "number") {
        throw new Error(`${where}: o limiar declarado "${section}.${field}" não é um número na configuração.`);
      }
    }
    if (spec.role === "organization-vocabulary") {
      vocabularySections += 1;
      const values = config[section];
      if (typeof values.enabled !== "boolean" || !Array.isArray(values.terms)) {
        throw new Error(
          `${where}: a seção de vocabulário "${section}" precisa de "enabled" (booleano) e "terms" (lista).`,
        );
      }
    }
  }
  if (vocabularySections > 1) {
    throw new Error(`${where}: há ${vocabularySections} seções de vocabulário da organização; o schema admite uma.`);
  }

  for (const id of criteria) {
    if (!passes.has(id)) throw new Error(`${where}: o critério "${id}" está no catálogo e não tem pass.`);
    if (!(id in locale.taxonomy)) {
      throw new Error(`${where}: o critério "${id}" não tem entrada na taxonomia (ADR-056).`);
    }
  }
  for (const id of passes) {
    if (!criteria.has(id)) throw new Error(`${where}: o pass "${id}" roda fora do catálogo do locale.`);
  }
  for (const id of Object.keys(locale.criteria.canonical ?? {})) {
    if (!criteria.has(id)) {
      throw new Error(`${where}: o mapeamento canônico cita "${id}", que não está no catálogo do locale.`);
    }
  }
}
