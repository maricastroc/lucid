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

/**
 * Fingerprint de 32 bits (8 caracteres hex) de `value`, determinístico (mesma entrada → mesmo
 * hash, sempre). NÃO é criptográfico e NÃO tem resistência a colisão — é uma soma de
 * verificação simples (estilo `hashCode` do Java), adequada para exibição/proveniência
 * (`Diagnostic.meta.configHash`/`dataHash`) e para invalidar cache best-effort, mas não deve
 * virar prova de integridade nem controle de acesso. Se algum dia um fluxo precisar de garantia
 * forte de unicidade, troque por um hash mais largo — isso muda o formato do valor retornado
 * (hoje fixado em 8 hex chars por `test/golden/diagnostic-snapshot.test.ts`).
 */
export function stableHash(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash * 31 + serialized.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
