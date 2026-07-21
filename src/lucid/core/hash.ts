/**
 * Hash estável determinístico COMPARTILHADO (usado por `config.ts` e pelo data registry).
 *
 * Serialização por chave ordenada recursivamente — não depende da ordem de inserção do objeto.
 * Comparação/serialização por code unit (`JSON.stringify`), nunca `localeCompare` (I4). Puro,
 * síncrono, sem I/O. Hash de 32 bits (andaime mínimo herdado do ADR-009); a única garantia
 * exigida é que a mesma entrada produza sempre o mesmo hash. Ver docs/DESIGN-data-registry.md §6.4
 * (largura do hash é decisão de implementação, não de arquitetura).
 */

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${pairs.join(",")}}`;
}

/** Hash estável de 8 hex chars de qualquer valor serializável. Determinístico e puro. */
export function stableHash(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash * 31 + serialized.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
