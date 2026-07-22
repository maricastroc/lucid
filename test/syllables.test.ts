import { describe, expect, it } from "vitest";
import { countSyllables } from "../src/locales/pt-BR/services/syllables";

describe("countSyllables — palavras simples", () => {
  it.each([
    ["casa", 2],
    ["gato", 2],
    ["livro", 2],
    ["computador", 4],
  ])("'%s' tem %i sílabas", (palavra, esperado) => {
    expect(countSyllables(palavra)).toBe(esperado);
  });
});

describe("countSyllables — acentos", () => {
  it.each([
    ["café", 2],
    ["política", 4],
    ["número", 3],
  ])("'%s' tem %i sílabas", (palavra, esperado) => {
    expect(countSyllables(palavra)).toBe(esperado);
  });
});

describe("countSyllables — ditongos", () => {
  it("ditongo comum conta como 1 núcleo (cadeira: ca-dei-ra)", () => {
    expect(countSyllables("cadeira")).toBe(3);
  });

  it("ditongo simples monossílabo (pai)", () => {
    expect(countSyllables("pai")).toBe(1);
  });

  it("ditongo em posição átona no fim da palavra (história: his-tó-ria)", () => {
    expect(countSyllables("história")).toBe(3);
  });

  it("ditongo com 'u' após 'q' (água: á-gua — não quebra em hiato)", () => {
    expect(countSyllables("água")).toBe(2);
  });
});

describe("countSyllables — hiatos com acento gráfico", () => {
  it("hiato marcado por acento em í (saída: sa-í-da)", () => {
    expect(countSyllables("saída")).toBe(3);
  });

  it("hiato marcado por acento em ú (saúde: sa-ú-de)", () => {
    expect(countSyllables("saúde")).toBe(3);
  });
});

describe("countSyllables — hiatos sem acento gráfico (regras novas)", () => {
  it("hiato por vogal repetida (voo: vo-o)", () => {
    expect(countSyllables("voo")).toBe(2);
  });

  it("hiato entre duas vogais fortes o+e (poesia: melhora de 2→3, real=4 — ver limitação abaixo)", () => {
    expect(countSyllables("poesia")).toBe(3);
  });

  it("hiato entre duas vogais fortes e+a (teatro: te-a-tro)", () => {
    expect(countSyllables("teatro")).toBe(3);
  });

  it("hiato entre duas vogais fortes e+a, com sílaba extra antes (oceano: o-ce-a-no)", () => {
    expect(countSyllables("oceano")).toBe(4);
  });

  it("hiato entre duas vogais fortes e+a (real: re-al)", () => {
    expect(countSyllables("real")).toBe(2);
  });

  it("dois hiatos entre vogais fortes seguidos (aéreo: a-é-re-o)", () => {
    expect(countSyllables("aéreo")).toBe(4);
  });

  it("'i'/'u' átono antes de 'nh' é hiato (rainha: ra-i-nha)", () => {
    expect(countSyllables("rainha")).toBe(3);
  });

  it("'i'/'u' átono antes de 'nh' é hiato (moinho: mo-i-nho)", () => {
    expect(countSyllables("moinho")).toBe(3);
  });

  it("'nh' comum, sem vogal antes adjacente, não é afetado (caminho: ca-mi-nho)", () => {
    expect(countSyllables("caminho")).toBe(3);
  });

  it("exceção lexical documentada: 'ruim' (ru-im) não segue a regra padrão de ditongo", () => {
    expect(countSyllables("ruim")).toBe(2);
  });

  it("exceção lexical documentada: 'cruel' (cru-el) não segue a regra padrão de ditongo", () => {
    expect(countSyllables("cruel")).toBe(2);
  });
});

describe("countSyllables — LIMITAÇÕES CONHECIDAS (não corrigidas, documentadas)", () => {

  it("'poesia' melhora com a regra de vogais fortes (2→3) mas ainda não chega a 4 (real: po-e-si-a)", () => {
    expect(countSyllables("poesia")).toBe(3);
  });

  it("'reunião' permanece incorreto (hiato de fronteira de prefixo/morfema, não detectável localmente)", () => {
    expect(countSyllables("reunião")).toBe(2);
  });
});

describe("countSyllables — terminações -ção / -são / -mente / -dade / -eiro", () => {
  it("'nação' (-ção) tem 2 sílabas", () => {
    expect(countSyllables("nação")).toBe(2);
  });

  it("'profissão' (-são) tem 3 sílabas — confirma que a regra nova não quebra 'ão' nasal", () => {
    expect(countSyllables("profissão")).toBe(3);
  });

  it("'claramente' (-mente) tem 4 sílabas", () => {
    expect(countSyllables("claramente")).toBe(4);
  });

  it("'cidade' (-dade) tem 3 sílabas", () => {
    expect(countSyllables("cidade")).toBe(3);
  });

  it("'dinheiro' (-eiro) tem 3 sílabas", () => {
    expect(countSyllables("dinheiro")).toBe(3);
  });
});

describe("countSyllables — ão / ãe / õe (ditongo nasal, nunca hiato)", () => {
  it.each([
    ["não", 1],
    ["mãe", 1],
    ["põe", 1],
  ])("'%s' tem %i sílaba(s)", (palavra, esperado) => {
    expect(countSyllables(palavra)).toBe(esperado);
  });
});

describe("countSyllables — palavras hifenizadas", () => {
  it("'guarda-chuva' soma sílabas dos dois lados do hífen", () => {
    expect(countSyllables("guarda-chuva")).toBe(4);
  });

  it("'arco-íris' soma sílabas dos dois lados do hífen", () => {
    expect(countSyllables("arco-íris")).toBe(4);
  });
});

describe("countSyllables — apóstrofo (elisão)", () => {
  it("'d'água' conta o fragmento consonantal como 0 e soma com 'água'", () => {
    expect(countSyllables("d'água")).toBe(2);
  });
});

describe("countSyllables — siglas pronunciáveis vs. soletradas", () => {
  it("sigla pronunciável sem pontos internos ('ONU') conta como palavra normal", () => {
    expect(countSyllables("ONU")).toBe(2);
  });

  it("sigla grudada por pontos ('E.U.A', forma produzida pelo tokenizador) soma 1 por letra", () => {
    expect(countSyllables("E.U.A")).toBe(3);
  });

  it("sigla soletrada sem nenhuma vogal ('CPF') conta 1 unidade por letra", () => {
    expect(countSyllables("CPF")).toBe(3);
  });

  it("sigla soletrada sem nenhuma vogal ('FGTS') conta 1 unidade por letra", () => {
    expect(countSyllables("FGTS")).toBe(4);
  });

  it("sigla soletrada sem nenhuma vogal ('RG') conta 1 unidade por letra", () => {
    expect(countSyllables("RG")).toBe(2);
  });

  it("palavra maiúscula normal (não-sigla) não é afetada pela regra de soletração", () => {
    expect(countSyllables("A")).toBe(1);
  });
});

describe("countSyllables — Unicode NFC/NFD", () => {
  it("produz o mesmo resultado para a mesma palavra em NFC e NFD", () => {
    const nfc = "política";
    const nfd = nfc.normalize("NFD");
    expect(countSyllables(nfd)).toBe(countSyllables(nfc));
  });

  it("também vale para palavras com hiato por vogal forte (aéreo)", () => {
    const nfc = "aéreo";
    const nfd = nfc.normalize("NFD");
    expect(countSyllables(nfd)).toBe(countSyllables(nfc));
  });
});

describe("countSyllables — casos-limite", () => {
  it("string vazia tem 0 sílabas", () => {
    expect(countSyllables("")).toBe(0);
  });

  it("fragmento só-consoante minúsculo (sem vogal) tem piso de 1 sílaba", () => {
    expect(countSyllables("pfft")).toBe(1);
  });
});

describe("countSyllables — determinismo", () => {
  it("execução repetida produz sempre o mesmo resultado", () => {
    const palavra = "extraordinariamente";
    const r1 = countSyllables(palavra);
    const r2 = countSyllables(palavra);
    expect(r2).toBe(r1);
  });
});
