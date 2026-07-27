import { describe, expect, it } from "vitest";
import { analyze, configDeviations, DEFAULT_CONFIG, hashConfig, isDefaultConfig, type Config } from "@/lucid";

function withOverrides(overrides: Partial<Config>): Config {
  return { ...DEFAULT_CONFIG, ...overrides };
}

const LONG =
  "A operacionalização das diretrizes concernentes à reestruturação metodológica do processo de consolidação " +
  "das iniciativas institucionais revelou a inexistência de mecanismos suficientemente robustos para a " +
  "sistematização da priorização decisória adotada.";

describe("configDeviations — every departure from the default is nameable", () => {
  it("reports nothing for the default config", () => {
    expect(configDeviations(DEFAULT_CONFIG)).toEqual([]);
    expect(isDefaultConfig(DEFAULT_CONFIG)).toBe(true);
  });

  it("names a loosened threshold with the value it replaced", () => {
    const config = withOverrides({ sentenceLength: { warnAbove: 30, errorAbove: 45 } });
    expect(configDeviations(config)).toEqual([
      { section: "sentenceLength", field: "warnAbove", value: 30, fallback: 20 },
      { section: "sentenceLength", field: "errorAbove", value: 45, fallback: 30 },
    ]);
    expect(isDefaultConfig(config)).toBe(false);
  });

  it("names a disabled criterion", () => {
    const config = withOverrides({ passiveVoice: { enabled: false } });
    expect(configDeviations(config)).toEqual([
      { section: "passiveVoice", field: "enabled", value: false, fallback: true },
    ]);
  });

  it("names a criterion turned on that ships off", () => {
    const config = withOverrides({ adverbioMente: { enabled: true, minPorFrase: 3 } });
    expect(configDeviations(config)).toEqual([
      { section: "adverbioMente", field: "enabled", value: true, fallback: false },
    ]);
  });

  it("is deterministic and ordered by the default's own declaration order", () => {
    const config = withOverrides({
      mesoclise: { enabled: false },
      sentenceLength: { warnAbove: 25, errorAbove: 30 },
      passiveVoice: { enabled: false },
    });
    const sections = configDeviations(config).map((d) => d.section);
    expect(sections).toEqual(["sentenceLength", "passiveVoice", "mesoclise"]);
    expect(JSON.stringify(configDeviations(config))).toBe(JSON.stringify(configDeviations(config)));
  });
});

describe("the profile actually drives the engine", () => {
  it("a looser sentence threshold produces fewer long-sentence findings", () => {
    const strict = analyze(LONG).findings.filter((f) => f.criterion === "long_sentence");
    const loose = analyze(LONG, { sentenceLength: { warnAbove: 60, errorAbove: 90 } }).findings.filter(
      (f) => f.criterion === "long_sentence",
    );
    expect(strict.length).toBeGreaterThan(0);
    expect(loose).toHaveLength(0);
  });

  it("a disabled criterion stops producing findings", () => {
    const on = analyze(LONG).findings.filter((f) => f.criterion === "nominalizacao_encadeada");
    const off = analyze(LONG, { nominalizacaoEncadeada: { enabled: false, minPorFrase: 3 } }).findings.filter(
      (f) => f.criterion === "nominalizacao_encadeada",
    );
    expect(on.length).toBeGreaterThan(0);
    expect(off).toHaveLength(0);
  });
});

describe("the profile cannot be changed silently — the stamp moves with it", () => {
  it("changing a threshold changes the configHash", () => {
    const base = hashConfig(DEFAULT_CONFIG);
    expect(hashConfig(withOverrides({ sentenceLength: { warnAbove: 25, errorAbove: 30 } }))).not.toBe(base);
  });

  it("disabling a criterion changes the configHash", () => {
    expect(hashConfig(withOverrides({ mesoclise: { enabled: false } }))).not.toBe(hashConfig(DEFAULT_CONFIG));
  });

  it("the diagnostic carries the hash of the profile that produced it", () => {
    const custom: Partial<Config> = { sentenceLength: { warnAbove: 40, errorAbove: 60 } };
    expect(analyze(LONG, custom).meta.configHash).toBe(hashConfig(withOverrides(custom)));
    expect(analyze(LONG).meta.configHash).toBe(hashConfig(DEFAULT_CONFIG));
  });

  it("the same profile always hashes the same way", () => {
    const config = withOverrides({ jargon: { enabled: false, suggestFromGlossary: true } });
    expect(hashConfig(config)).toBe(hashConfig(config));
  });
});
