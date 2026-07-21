# ADR (rascunho) — Modelo de anotação (Fase A, tagset Universal Dependencies)

> **Status:** proposta / desenho implementável. Concretiza `DESIGN-camada-anotacao.md` §5–§7 agora
> que **D1 = PortiLexicon-UD** fixou o tagset em **Universal Dependencies**.
> **Escopo deste ADR:** os TIPOS de anotação + a **Fase A** do pipeline (lookup + guesser, **sem
> desambiguação**). Fase B (desambiguação) e Fase C (chunking) são ADRs posteriores.

---

## 1. Por que UD muda o desenho de "genérico" para "concreto"

O `DESIGN-camada-anotacao.md` propôs um tagset "UD-like" hipotético. Com PortiLexicon-UD escolhido,
**adotamos Universal Dependencies literalmente** — POS e traços com os nomes canônicos da UD. Ganho:
o `Reading` é o espelho direto de uma linha do léxico (sem tradução), o tagset é padrão e
documentado, e a auditoria fica trivial ("por que VERB? porque a linha X do PortiLexicon diz VERB").

---

## 2. Tagset (UD POS) — adotado como está

Anotamos **só tokens `isWord`** (pontuação/número já são `isWord:false` no `Token` atual → POS
implícito `PUNCT`/`SYM`/`NUM`, não precisam de anotação). As tags UD que aparecem em conteúdo:

`ADJ · ADP · ADV · AUX · CCONJ · DET · INTJ · NOUN · NUM · PART · PRON · PROPN · SCONJ · VERB · X`

`X` = desconhecido/inclassificável. `AUX` (ser/estar/ter/haver/ir auxiliares) é distinto de `VERB` —
útil para `passive-voice` e locuções.

## 3. Traços (UD features) — subconjunto consumido, nomes UD verbatim

Adotamos os nomes UD (auditabilidade + padrão). Subconjunto que os detectores do catálogo pedem:

| Feature UD | Valores | Serve a |
|---|---|---|
| `Gender` | `Masc` `Fem` | concordância, pronome ambíguo |
| `Number` | `Sing` `Plur` | concordância, sujeito longo |
| `VerbForm` | `Fin` `Inf` `Part` `Ger` | passiva, gerundismo, perífrase |
| `Mood` | `Ind` `Sub` `Imp` `Cnd` | tempo raro, hedging |
| `Tense` | `Pres` `Past` `Imp` `Pqp` `Fut` | mais-que-perfeito, fut. do subjuntivo |
| `Person` | `1` `2` `3` | concordância, fala direta |
| `PronType` | `Prs` `Dem` `Rel` `Ind` `Int` `Tot` `Neg` | anáfora, "isso" vago, referente |
| `Case` | `Nom` `Acc` `Dat`… | pronome sujeito vs oblíquo |
| `Degree` | `Cmp` `Sup` `Dim` `Aug` | intensificador, `-íssimo` |
| `Polarity` | `Neg` | negação múltipla |

Extensível: um traço UD novo é adição de valor, não mudança de arquitetura. Traços **ausentes** no
léxico ficam `undefined` (nunca inventados).

## 4. Tipos (contrato implementável)

```ts
type UdPos = "ADJ"|"ADP"|"ADV"|"AUX"|"CCONJ"|"DET"|"INTJ"|"NOUN"|"NUM"|"PART"|"PRON"|"PROPN"|"SCONJ"|"VERB"|"X";
type Source = "lexicon" | "guessed";           // Fase A: sem "rule" (não há desambiguação ainda)

interface Reading {
  lemma: string;
  pos: UdPos;
  features: Readonly<Record<string, string>>;  // chaves/valores UD verbatim (ex.: {VerbForm:"Part",Gender:"Masc"})
  source: Source;
}

type Certainty = "certain" | "ambiguous" | "guessed" | "unknown";  // Fase A (sem "resolved")

interface TokenAnnotation {
  readings: readonly Reading[];   // ordenadas canonicamente (determinismo)
  certainty: Certainty;           // derivado (§6)
}
```

`features` como mapa de string→string (nomes UD) mantém o tipo aberto e auditável — não um enum
fechado que teria de crescer a cada traço.

## 5. Ingestão do PortiLexicon (o "prepared" do dataset)

- Cada **linha** do léxico → um `Reading` (`lemma`, `pos` UD, `features` UD).
- **Agrupar por `forma.toLowerCase()`** → `Map<string, Reading[]>`. Ambiguidade natural = a forma
  ter ≥2 readings (o léxico já entrega assim; nada a desambiguar).
- Este `Map` (compactado, §4 do ADR-D1) é o `prepared` do dataset `"lexico-morfologico.pt"` no data
  registry, com `fingerprint: "pinned"`.
- Ordenação canônica das readings de cada forma (por `pos`, depois `lemma`, depois `features`
  serializados) — determinismo do snapshot de anotação.

## 6. Pipeline Fase A (2 estágios, sem desambiguação)

1. **Lookup:** `token.lower → readings` do léxico (`source:"lexicon"`). Hit → readings. Miss → §2.
2. **Guesser (só OOV):** regras de sufixo **finitas** → readings `source:"guessed"`, sempre marcadas:
   `-mente`→`ADV`; `-ção/-mento/-dade/-agem/-ura`→`NOUN`; `-ando/-endo/-indo`→`VERB{VerbForm:Ger}`;
   `-ar/-er/-ir`→`VERB{VerbForm:Inf}` (candidato); `-íssimo/-íssima`→`ADJ{Degree:Sup}`;
   `-mente` só se raiz ≥ 3 letras etc. OOV sem sufixo reconhecido → `unknown` (sem reading).

**Certainty derivada (Fase A):**
- `certain` = exatamente 1 reading `lexicon`.
- `ambiguous` = ≥2 readings `lexicon`.
- `guessed` = só readings `guessed`.
- `unknown` = nenhuma reading.

(`resolved` só nasce na Fase B, quando regras reduzirem `ambiguous`→1.)

## 7. Superfície de consulta (os detectores nunca varrem `readings` à mão)

```ts
isCertainly(tok, { pos: "VERB", VerbForm: "Fin" }): boolean  // true só se TODAS as readings casam
couldBe(tok, { VerbForm: "Part" }): boolean                  // true se ALGUMA reading casa
certaintyOf(tok): Certainty
lemmasOf(tok): readonly string[]
```

Regra de consumo (§6 da anotação): finding sintático de alta precisão nasce só de `isCertainly(...)`;
diante de `ambiguous/guessed/unknown` o detector **abstém-se**. `precisão > recall` vira código.

## 8. O que a Fase A já destrava (sem desambiguação)

Detectores que só precisam de traço **inequívoco** (`certain`) ou de teste "poderia ser":
- `adverb_mente_overuse`, `intensifier_overuse` (Degree), `abstract_suffix_density`,
  `mesoclisis`/`gerundism` (VerbForm/forma), `heavy_verb_periphrasis` (Mood/Tense raros),
  `multiple_negation` (Polarity), `heavy_connective` (POS+lema fechado).
- Dá **base morfológica limpa** para `passive-voice`/`nominalization` migrarem depois (Fase B, ADR
  próprio) — hoje eles fazem morfologia ad hoc; não migram na Fase A.

**Espera Fase B/C:** `long_preverbal_subject`, `subject_verb_distance`, `ambiguous_pronoun`,
`subordination_depth` (precisam de desambiguação NOUN/VERB e/ou chunking).

## 9. Determinismo, auditabilidade, teste

- **Golden de anotação:** frases rotuladas à mão com a análise esperada por token, incluindo os
  casos ambíguos canônicos ("casa", "a", "for") — trava que a Fase A os mantém `ambiguous`, não os
  resolve na sorte. Snapshot **byte-idêntico**.
- **Métrica de cobertura:** % `certain`/`ambiguous`/`guessed`/`unknown` no golden — mede o teto e
  vigia OOV (decide se aciona o suplemento MorphoBr).
- **Proveniência:** cada reading rastreia `source`; guesser nunca vira `certain`.
- **Cerca/determinismo:** `core`, puro, sem rede; ordenação por code unit; fingerprint do léxico no
  `dataHash` (via data registry).

## 10. Questões em aberto (para os ADRs seguintes)

- **Forma síncrona vs async** do carregamento do léxico compacto (herdada do ADR-D1 §4 / registry
  §6.1) — decisão do ADR de integração da anotação.
- **Guesser:** conjunto exato de regras de sufixo (começar minúsculo, alta confiança).
- **Fase B:** formato das regras de desambiguação (Constraint-Grammar-like), ordem/ponto-fixo,
  `ruleId`, meta-eval.
- **Migração** do `passive-voice`/`nominalization` para consumir a anotação (ADR próprio, golden
  atualizado).

---

### Resumo

Adotar Universal Dependencies literalmente (POS + traços com nomes UD), `Reading` = espelho de uma
linha do PortiLexicon, ambiguidade = múltiplas readings. Fase A = lookup + guesser, **sem
desambiguação**; a `Certainty` (`certain`/`ambiguous`/`guessed`/`unknown`) faz `precisão > recall`
virar abstenção automática. Implementável assim que o data registry (peça 1) existir.
