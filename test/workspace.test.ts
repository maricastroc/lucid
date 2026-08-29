import { beforeEach, describe, expect, it } from "vitest";
import { buildStructuredDocument, DEFAULT_CONFIG, EMPTY_BRIEFING, toRawBlocks, type RawBlock } from "@/lucid";
import { clearWorkspace, getSaveFailed, readWorkspace, writeWorkspace } from "../src/app/lib/workspace";
import { ptDocumentServices } from "@/lucid";

const STORAGE_KEY = "lucid-workspace";

function installStorage(overrides: Partial<Storage> = {}): Map<string, string> {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    ...overrides,
  } as Storage;
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
  return map;
}

const BLOCKS: RawBlock[] = [
  { kind: "heading", level: 1, text: "Prazos e documentos" },
  { kind: "paragraph", text: "O interessado deve entregar os documentos." },
  { kind: "list", ordered: true, items: ["Requerimento assinado", "Comprovante de residência"] },
];

describe("workspace — round trip through storage", () => {
  beforeEach(() => {
    installStorage();
    clearWorkspace();
  });

  it("restores a plain-text document with no structure", () => {
    writeWorkspace({
      originalText: null,
      text: "O prazo venceu ontem.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });
    expect(readWorkspace()).toEqual({
      originalText: null,
      text: "O prazo venceu ontem.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });
  });

  it("restores the revision trail and the working mode", () => {
    const ledger = [
      {
        source: "manual" as const,
        label: "Edição do autor",
        before: "em sede de",
        after: "no âmbito de",
        burdenBefore: 15.9,
        burdenAfter: 12.4,
      },
      { source: "ai" as const, label: "Reescrita por IA · directed@4", burdenBefore: 12.4, burdenAfter: 9.1 },
    ];
    writeWorkspace({
      originalText: null,
      text: "Texto revisado.",
      blocks: null,
      ledger,
      mode: "edit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });
    const restored = readWorkspace();
    expect(restored?.ledger).toEqual(ledger);
    expect(restored?.mode).toBe("edit");
  });

  it("rebuilds the imported .docx structure byte-identically", () => {
    const imported = buildStructuredDocument(BLOCKS, ptDocumentServices);
    writeWorkspace({
      originalText: null,
      text: imported.source,
      blocks: toRawBlocks(imported.blocks),
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });

    const restored = readWorkspace();
    expect(restored?.blocks).toEqual(BLOCKS);

    const rebuilt = buildStructuredDocument(restored!.blocks!, ptDocumentServices);
    expect(JSON.stringify(rebuilt)).toBe(JSON.stringify(imported));
  });
});

describe("workspace — the reader briefing (ADR-079)", () => {
  beforeEach(() => {
    installStorage();
    clearWorkspace();
  });

  it("restores the declared briefing", () => {
    const briefing = {
      audience: "Cidadão sem formação jurídica",
      purpose: "Saber se tem direito e reunir os documentos",
      priorKnowledge: "Não conhece o vocabulário do processo",
      mustFind: ["prazo de recurso", "valor da taxa"],
    };
    writeWorkspace({
      originalText: null,
      text: "Texto.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });
    expect(readWorkspace()?.briefing).toEqual(briefing);
  });

  it("reads a version 1 payload — saved work is never thrown away by the upgrade", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, text: "Texto antigo.", blocks: null, ledger: [], mode: "audit" }),
    );
    const restored = readWorkspace();
    expect(restored?.text).toBe("Texto antigo.");
    expect(restored?.briefing).toEqual(EMPTY_BRIEFING);
  });

  it("rejects a malformed briefing instead of restoring half of it", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, text: "a", blocks: null, ledger: [], mode: "audit", briefing: { audience: 42 } }),
    );
    expect(readWorkspace()).toBeNull();
  });

  it("rejects a briefing whose mustFind is not a list of strings", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        text: "a",
        blocks: null,
        ledger: [],
        mode: "audit",
        briefing: { audience: "", purpose: "", priorKnowledge: "", mustFind: [1, 2] },
      }),
    );
    expect(readWorkspace()).toBeNull();
  });
});

describe("workspace — the editorial profile (ADR-081)", () => {
  beforeEach(() => {
    installStorage();
    clearWorkspace();
  });

  it("restores a profile that departs from the default", () => {
    const config = {
      ...DEFAULT_CONFIG,
      sentenceLength: { warnAbove: 25, errorAbove: 40 },
      mesoclise: { enabled: false },
    };
    writeWorkspace({
      originalText: null,
      text: "Texto.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config,
      reviewMarks: {},
    });
    const restored = readWorkspace();
    expect(restored?.config.sentenceLength).toEqual({ warnAbove: 25, errorAbove: 40 });
    expect(restored?.config.mesoclise.enabled).toBe(false);
  });

  it("fills unknown or missing sections from the default instead of failing", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        text: "a",
        blocks: null,
        ledger: [],
        mode: "audit",
        config: { sentenceLength: { warnAbove: 25 }, criterioInventado: { enabled: true } },
      }),
    );
    const restored = readWorkspace();
    expect(restored?.config.sentenceLength).toEqual({ warnAbove: 25, errorAbove: 30 });
    expect(restored?.config.mesoclise).toEqual(DEFAULT_CONFIG.mesoclise);
  });

  it("reads a version 2 payload and assumes the default profile", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, text: "a", blocks: null, ledger: [], mode: "audit" }),
    );
    expect(readWorkspace()?.config).toEqual(DEFAULT_CONFIG);
  });

  it("rejects a profile whose value has the wrong type", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        text: "a",
        blocks: null,
        ledger: [],
        mode: "audit",
        config: { sentenceLength: { warnAbove: "vinte" } },
      }),
    );
    expect(readWorkspace()).toBeNull();
  });

  it("rejects a non-finite threshold", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        text: "a",
        blocks: null,
        ledger: [],
        mode: "audit",
        config: { sentenceLength: { warnAbove: null } },
      }),
    );
    expect(readWorkspace()).toBeNull();
  });
});

describe("workspace — a corrupt payload is discarded, never half-restored", () => {
  beforeEach(() => {
    installStorage();
    clearWorkspace();
  });

  const REJECTED: Record<string, unknown> = {
    "wrong schema version": { version: 99, text: "a", blocks: null, ledger: [], mode: "audit" },
    "missing text": { version: 1, blocks: null, ledger: [], mode: "audit" },
    "unknown mode": { version: 1, text: "a", blocks: null, ledger: [], mode: "revisar" },
    "block of unknown kind": {
      version: 1,
      text: "a",
      blocks: [{ kind: "quote", text: "a" }],
      ledger: [],
      mode: "audit",
    },
    "heading with no level": {
      version: 1,
      text: "a",
      blocks: [{ kind: "heading", text: "a" }],
      ledger: [],
      mode: "audit",
    },
    "ledger entry with unknown source": {
      version: 1,
      text: "a",
      blocks: null,
      ledger: [{ source: "bot", label: "x", burdenBefore: 1, burdenAfter: 0 }],
      mode: "audit",
    },
    "ledger entry with no burden": {
      version: 1,
      text: "a",
      blocks: null,
      ledger: [{ source: "manual", label: "x" }],
      mode: "audit",
    },
  };

  for (const [name, payload] of Object.entries(REJECTED)) {
    it(`rejects: ${name}`, () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      expect(readWorkspace()).toBeNull();
    });
  }

  it("rejects text that is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{nope");
    expect(readWorkspace()).toBeNull();
  });

  it("returns null when nothing was ever stored", () => {
    expect(readWorkspace()).toBeNull();
  });
});

describe("workspace — a storage that refuses to write is reported, not hidden", () => {
  it("flags the failure instead of pretending the work is safe", () => {
    installStorage({
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    writeWorkspace({
      originalText: null,
      text: "Documento grande.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });
    expect(getSaveFailed()).toBe(true);
  });

  it("clears the flag once a write succeeds again", () => {
    installStorage();
    writeWorkspace({
      originalText: null,
      text: "Documento pequeno.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks: {},
    });
    expect(getSaveFailed()).toBe(false);
  });

  it("survives a storage that throws on read", () => {
    installStorage({
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    expect(readWorkspace()).toBeNull();
  });
});

describe("workspace — the author's review marks", () => {
  beforeEach(() => {
    installStorage();
    clearWorkspace();
  });

  it("round-trips the marks so a long review survives closing the tab", () => {
    const reviewMarks = { "jargon:10:22": "seen" as const, "passive_voice:40:53": "dismissed" as const };
    writeWorkspace({
      originalText: null,
      text: "Texto.",
      blocks: null,
      ledger: [],
      mode: "audit",
      briefing: EMPTY_BRIEFING,
      config: DEFAULT_CONFIG,
      reviewMarks,
    });
    expect(readWorkspace()?.reviewMarks).toEqual(reviewMarks);
  });

  it("reads a workspace saved before the marks existed as an empty set", () => {
    localStorage.setItem(
      "lucid-workspace",
      JSON.stringify({
        version: 3,
        text: "Texto.",
        blocks: null,
        ledger: [],
        mode: "audit",
        briefing: EMPTY_BRIEFING,
        config: DEFAULT_CONFIG,
      }),
    );
    expect(readWorkspace()?.reviewMarks).toEqual({});
  });

  it("refuses a stored mark that is not one the app writes", () => {
    localStorage.setItem(
      "lucid-workspace",
      JSON.stringify({
        version: 4,
        text: "Texto.",
        blocks: null,
        ledger: [],
        mode: "audit",
        briefing: EMPTY_BRIEFING,
        config: DEFAULT_CONFIG,
        reviewMarks: { "jargon:1:2": "approved" },
      }),
    );
    expect(readWorkspace()).toBeNull();
  });
});

describe("workspace — the entry text", () => {
  beforeEach(() => {
    installStorage();
    clearWorkspace();
  });

  const base = {
    text: "O prazo foi prorrogado.",
    blocks: null,
    ledger: [],
    mode: "audit",
    briefing: EMPTY_BRIEFING,
    config: DEFAULT_CONFIG,
    reviewMarks: {},
  } as const;

  it("survives a reload with the document it belongs to", () => {
    writeWorkspace({ ...base, originalText: "O prazo foi prorrogado pela autoridade competente." });
    expect(readWorkspace()?.originalText).toBe("O prazo foi prorrogado pela autoridade competente.");
  });

  it("keeps an empty entry text as itself, saying the document was written here", () => {
    writeWorkspace({ ...base, originalText: "" });
    expect(readWorkspace()?.originalText).toBe("");
  });

  it("reads a workspace saved before the entry text existed, and says it was not recorded", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 4, text: "a", blocks: null, ledger: [], mode: "audit" }),
    );
    // Not "" — the document was not written here; nobody knows what it started as.
    expect(readWorkspace()?.originalText).toBeNull();
  });

  it("still reads every older version, entry text or not", () => {
    for (const version of [1, 2, 3, 4]) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version, text: "a", blocks: null, ledger: [], mode: "audit" }),
      );
      expect(readWorkspace()?.text).toBe("a");
      expect(readWorkspace()?.originalText).toBeNull();
    }
  });

  it("rejects a payload whose entry text is not text", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 5, text: "a", originalText: 42, blocks: null, ledger: [], mode: "audit" }),
    );
    expect(readWorkspace()).toBeNull();
  });

  it("accepts an explicit null, which is what an unrecorded document writes back", () => {
    writeWorkspace({ ...base, originalText: null });
    expect(readWorkspace()?.originalText).toBeNull();
  });
});
