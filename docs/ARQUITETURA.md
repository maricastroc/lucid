# Lucid — Arquitetura (documento de decisão)

> Documento de arquitetura. **Não contém implementação.** Serve de contrato para a
> fase de código (a ser executada posteriormente pelo Sonnet 5).
> Fonte de verdade dos princípios: `CLAUDE.md`. Este arquivo detalha *como* construir
> o que o `CLAUDE.md` define *o que/porquê*.

Status: **congelado para revisão** · Alvo: MVP (Camada 1) primeiro.

---

## 0. Sumário executivo

Lucid é uma biblioteca TypeScript pura que diagnostica um texto PT-BR contra os
critérios de Linguagem Simples da **ABNT NBR ISO 24495-1:2024**. A saída **nunca é
texto reescrito** — é `texto original + findings anotados + placar + métricas`.

Duas camadas com **cerca dura** entre elas:

- **Camada 1 (`core`)** — linter determinístico, zero LLM, zero rede, saída
  byte-idêntica. É o produto.
- **Camada 2 (`probe`)** — sonda de compreensão sintética via LLM, **só teste
  negativo**, opt-in, isolada atrás de interface. Nunca reescreve, nunca produz
  check verde, nunca é importada pela Camada 1.

A regra que governa toda decisão abaixo: **marcar em vez de inventar**. Onde a regra
mecânica não alcança com segurança, o código recusa e sinaliza (`requiresHuman`), em
vez de adivinhar.

---

## 1. Princípios arquiteturais (invariantes de projeto)

Estes valem como testes, não como intenção. Cada um tem um mecanismo de garantia.

| # | Invariante | Como é garantido |
|---|---|---|
| I1 | `core` não importa nada de `probe`, nem `react`/`next`, nem I/O de rede | Regra `dependency-cruiser` + teste de fronteira no CI |
| I2 | Mesma entrada + mesma config → saída **byte-idêntica** | Snapshot tests + teste de dupla-execução (`analyze(x)` duas vezes deve dar buffers idênticos) |
| I3 | O texto de entrada nunca é mutado; todo offset aponta pro `source` original | `Document.source` é `readonly`; findings carregam `{start,end}` no original; teste que reconstrói o trecho por slice |
| I4 | Nenhuma fonte de não-determinismo (`Date.now`, `Math.random`, ordem de `Set`/`Map` dependente de inserção não-controlada, `toLocaleLowerCase`) em `core` | Regra de lint (`no-restricted-syntax`/`no-restricted-properties`) + revisão |
| I5 | A sonda nunca emite aprovação; "passou no piso" = neutro | O tipo de saída da sonda **não tem** estado `aprovado`; só `flag` \| `neutro` |
| I6 | Todo `Finding` cita `principle` (subseção da norma) e traz `justification` | Campos obrigatórios no tipo; nenhum pass pode emitir sem eles |
| I7 | Sugestão mecânica só quando o mapeamento é **único e seguro** | Cada pass decide `suggestion?`; ausência é o default; multi-sentido nunca gera `suggestion` |

**Nota sobre I2 (determinismo é a espinha dorsal).** Três armadilhas concretas em PT/TS:
1. **Ponto flutuante:** métricas (Flesch-PT) devem ser arredondadas a casas fixas na
   fronteira de saída (`config.metrics.decimalPlaces`). O número bruto nunca vaza pro snapshot.
2. **Normalização Unicode:** normalizar `source` para **NFC** uma vez, na entrada, e
   comparar/baixar-caixa com um `toLowerCase()` invariante (não `toLocaleLowerCase`).
   Guardar o `source` normalizado como base de todos os offsets.
3. **Ordenação de findings:** ordenar sempre por `(start, end, criterion, principle)`
   antes de retornar. Nunca confiar na ordem de execução dos passes.

---

## 2. Estrutura de pastas

O repo já é um app Next.js 16. A biblioteca vive como **árvore de módulos puros**
que o app e a CLI importam — nunca o contrário.

```
src/
  lucid/                      # ← a biblioteca. PURA. sem react/next/rede.
    index.ts                 # API pública da Camada 1 (barrel): analyze, tipos, config
    core/
      types.ts               # Finding, Diagnostic, Span, Severity, Category, Score…
      config.ts              # Config + DEFAULT_CONFIG + hashConfig()
      analyzer.ts            # orquestra: string -> Diagnostic
      document/
        model.ts             # Document, Sentence, Token (readonly)
        normalize.ts         # NFC + caixa invariante
        segment-sentences.ts # divisor de frases (data-backed)
        tokenize.ts          # tokenizador com offsets
        syllables.ts         # silabação PT-BR (para métricas)
      passes/
        types.ts             # interface Pass, contexto de execução
        registry.ts          # lista ordenada de passes ativos por fase
        sentence-length.ts   # critério 1  · 5.3.4
        passive-voice.ts     # critério 2  · 5.3.3
        nominalization.ts    # critério 3  · 5.3.3 / 5.3.4
        jargon.ts            # critério 4  · 5.3.2
      metrics/
        types.ts             # Metrics
        flesch-pt.ts         # Martins et al. (1996)
        index.ts             # runMetrics(doc) -> Metrics
      score/
        index.ts             # agrega findings -> Score (contagens + densidade)
    data/                    # dados versionados (JSON), carregados estaticamente
      abreviacoes.pt.json
      participios-irregulares.pt.json
      verbos-ser-estar.pt.json
      nominalizacoes.pt.json      # nominalização -> verbo base (1:1 seguro)
      verbos-leves.pt.json        # fazer/realizar/proceder/efetuar…
      jargao.pt.json              # jargão -> equivalente comum (glossário)
      frequencia.pt.json          # ou .txt: ranque de frequência PT-BR
      README.md                   # proveniência de cada dataset + licença
    probe/                   # ← CAMADA 2. isolada. core NUNCA importa daqui.
      types.ts               # ComprehensionProbe, ProbeInput, ProbeResult, ProbeSignal
      prompt.ts              # prompt versionado (const PROMPT_VERSION)
      interpret.ts           # ProbeResult -> ProbeSignal (puro; flag|neutro)
      stub-probe.ts          # implementação determinística p/ testes
      llm-probe.ts           # implementação real (fase 2; atrás de flag)
  report/                    # ← camada de composição (pode importar core E probe)
    types.ts                 # DiagnosticReport = Diagnostic + (ProbeSignal[] | null)
    compose.ts               # junta Camada 1 + Camada 2 p/ apresentação
  app/                       # Next.js (já existe) — consome src/report e src/lucid
    …
cli/
  lucid.ts                   # CLI fina: stdin/arquivo -> JSON | relatório
test/
  golden/                    # golden set: trechos rotulados + pergunta do leitor
  __snapshots__/
  determinism.test.ts        # I2/I3
  boundary.test.ts           # I1 (fronteira core↛probe)
docs/
  ARQUITETURA.md             # este arquivo
  DECISOES.md                # log de decisões (ADR curto) — criar na fase de código
```

**Por que `report/` existe.** A composição Camada 1 + Camada 2 precisa importar as
duas — mas `core` não pode importar `probe`. Resolvemos movendo a junção para fora de
ambos: `report/` é o único lugar que conhece as duas camadas. Assim a cerca (I1) fica
trivial de checar: "nada dentro de `lucid/core/**` importa de `lucid/probe/**`".

---

## 3. Tipos centrais

> Assinaturas de referência. A fase de código pode ajustar nomes, mas **os campos
> obrigatórios e a semântica são contrato**.

### 3.1 Primitivos e Finding

```ts
type Severity = "info" | "warning" | "error";
type Category = "lexical" | "syntactic" | "structural" | "metric";

// offset SEMPRE no source normalizado (NFC). end exclusivo.
interface Span { start: number; end: number; text: string }

interface Finding {
  criterion: string;         // id estável: "long_sentence", "passive_voice", …
  category: Category;
  principle: string;         // subseção ABNT, ex. "5.3.4"  (nunca inventado)
  span: Span;
  severity: Severity;
  suggestion?: string;       // presente SÓ quando mecanicamente segura (I7)
  requiresHuman: boolean;    // true = a ferramenta se recusa a resolver
  justification: string;     // por que este trecho viola este critério (texto em PT-BR)
  // proveniência opcional p/ debug/telemetria (não entra no snapshot canônico):
  meta?: Record<string, string | number | boolean>;
}
```

### 3.2 Document (modelo compartilhado pelos passes)

Construído **uma vez** por análise; todos os passes leem o mesmo Document. Isso evita
recomputar segmentação e garante que todos os offsets são consistentes.

**Convenção de offset (normativa — ver ADR-009, testada em `test/provenance.test.ts`).**
Todo `start`/`end` (em `Token`, `Sentence`, `Span`) é um índice de **code unit UTF-16**
sobre `Document.source`, que é a entrada **normalizada em NFC**. `end` é sempre
**exclusivo**. `Diagnostic.text === Document.source`, então
`Diagnostic.text.slice(start, end) === span.text` é invariante para todo finding.
Caracteres fora do BMP (emoji) ocupam 2 code units e deslocam os offsets em 2 — porque
`.length`/`.slice` do JS operam em code units UTF-16. Nenhum pass reconstrói texto com
offsets próprios; todos fatiam o mesmo `source`. Essa convenção não muda em silêncio.

```ts
interface Token {
  text: string;      // como aparece no source
  lower: string;     // caixa invariante (p/ lookups)
  start: number;     // offset no source normalizado
  end: number;       // exclusivo
  isWord: boolean;   // false p/ pontuação/espaço/número puro (definição em tokenize.ts)
}

interface Sentence {
  text: string;
  start: number;
  end: number;
  tokens: readonly Token[];   // subconjunto do flat, mesma identidade de offset
  wordCount: number;          // tokens com isWord
}

interface Document {
  readonly source: string;          // JÁ normalizado (NFC)
  readonly sentences: readonly Sentence[];
  readonly tokens: readonly Token[]; // flat, ordem de leitura
  // extensível: paragraphs?, headings? na Fase 2
}
```

### 3.3 Pass (unidade do pipeline)

```ts
interface PassContext {
  readonly doc: Document;
  readonly config: Config;
  readonly data: LoadedData;   // léxicos já carregados/congelados
}

interface Pass {
  readonly criterion: string;  // id estável
  readonly category: Category;
  readonly principle: string;  // subseção-âncora do pass (finding pode refinar)
  run(ctx: PassContext): Finding[];   // PURO. sem efeitos. sem rede.
}
```

Decisão: **um pass = um critério**. Métricas não são passes (não emitem `Finding`);
vivem em `metrics/` e produzem `Metrics`. Isso mantém `Finding[]` homogêneo e o
placar simples.

### 3.4 Metrics e Score

```ts
interface Metrics {
  fleschPt: number;            // arredondado a config.metrics.decimalPlaces
  words: number;
  sentences: number;
  syllables: number;           // total de sílabas do documento — adicionado na
                                // implementação da etapa de métricas (Fase 1); ausente
                                // desta assinatura original, necessário para expor o
                                // total de sílabas como métrica própria, não só como
                                // intermediário de syllablesPerWord
  wordsPerSentence: number;
  syllablesPerWord: number;
  // Fase 2: métricas NILC via adapter externo (fora do core determinístico)
}

interface CriterionScore {
  criterion: string;
  principle: string;
  count: { info: number; warning: number; error: number };
  densityPer100Words: number;   // findings a cada 100 palavras, arredondado
}

interface Score {
  byCriterion: CriterionScore[];
  totalFindings: number;
  // deliberadamente SEM "nota geral" nem "aprovado". Score mede, não aprova.
}
```

> **Decisão anti-selo:** mesmo na Camada 1 não existe badge "texto simples ✓".
> O placar expõe contagens e densidade. A leitura de "está bom" é do humano, não da
> ferramenta. Isso mantém a Camada 1 coerente com a filosofia da Camada 2.

### 3.5 Diagnostic (saída da Camada 1)

```ts
interface DiagnosticMeta {
  lucidVersion: string;        // versão da lib
  configHash: string;          // hash estável da Config efetiva (p/ integridade do snapshot)
  standardVersion: "ABNT NBR ISO 24495-1:2024";
  // SEM timestamp aqui — timestamp é não-determinístico (I4)
}

interface Diagnostic {
  text: string;                // === Document.source (original normalizado, intacto)
  findings: Finding[];         // ordenados por (start,end,criterion,principle)
  score: Score;
  metrics: Metrics;
  meta: DiagnosticMeta;
}
```

### 3.6 API pública da Camada 1

```ts
// src/lucid/index.ts
export function analyze(text: string, config?: Partial<Config>): Diagnostic;
export const DEFAULT_CONFIG: Config;
export type { Finding, Diagnostic, Span, Severity, Category, Score, CriterionScore, Metrics, Config };
// NÃO exporta nada de probe/ aqui. A sonda é import separado, explícito.
```

`analyze` é **síncrona** — Camada 1 é pura e sem I/O. (A sonda é async e mora noutro
import; ver §5.)

---

## 4. Config

```ts
interface Config {
  sentenceLength: { warnAbove: number; errorAbove: number };   // default 20 / 30 palavras
  passiveVoice: {
    enabled: boolean;                 // default true
    treatEstarAsPassive: boolean;     // default FALSE (ver §6.2 — estar é ruidoso)
  };
  nominalization: { enabled: boolean; suggest: boolean };  // suggest default true
  jargon: {
    enabled: boolean;
    frequencyRankCutoff: number;      // palavras abaixo do ranque N -> flag
    suggestFromGlossary: boolean;     // default true (só mapeamento único)
  };
  metrics: { decimalPlaces: number }; // default 1
}
```

**Regra de ouro da Config:** só entram campos que **afetam a saída determinística**.
Cada campo é parte do `configHash` em `DiagnosticMeta`. Trocar um default é um
event de versão (quebra snapshots de propósito). Nada de flags de apresentação aqui —
essas moram na CLI/`report`.

---

## 5. Camada 2 — Sonda (contrato, sem implementação real no MVP)

```ts
type OperacaoLeitura =
  | "resolver_referente_a_distancia"
  | "integrar_entre_frases"
  | "decodificar_termo_tecnico"
  | "inferir_agente_omitido"
  | "segurar_sujeito_longo"
  | "desfazer_negacao_aninhada";

interface ProbeInput {
  trecho: string;
  pergunta: string;        // a pergunta que o leitor veio fazer
  persona?: string;        // persona de piso (baixa literacia)
}

interface ProbeResult {   // espelha o JSON do prompt (CLAUDE.md)
  podeResponder: boolean;
  respostaExtraida: string;
  ondeTravou: { frase: string; motivo: string }[];
  operacoesDeLeitura: OperacaoLeitura[];
  precisouInferir: boolean;
}

interface ComprehensionProbe {
  readonly id: string;     // "modelo@versão + prompt@versão" — proveniência p/ eval
  probe(input: ProbeInput): Promise<ProbeResult>;
}

// interpret.ts — PURO e determinístico dado um ProbeResult:
type ProbeSignal =
  | { tipo: "flag"; motivo: string; trecho?: Span; operacoes: OperacaoLeitura[] }
  | { tipo: "neutro"; nota: "sem violação de piso detectada (não é garantia de compreensão)";
      operacoes: OperacaoLeitura[] };

function interpret(r: ProbeResult): ProbeSignal;
// regra: podeResponder=false || precisouInferir=true  -> flag
//        caso contrário                                -> neutro  (NUNCA aprovação)
```

**Blindagens de projeto (I5):**
- `ProbeSignal` **não tem** variante "aprovado". O melhor caso possível é `neutro`.
- `temperature: 0`, modelo fixado, `PROMPT_VERSION` versionado. `id` carrega ambos.
- `stub-probe.ts` é determinístico (mapeia input→output fixo por fixture) e é o que os
  testes usam. `llm-probe.ts` fica atrás de flag e **não** é dependência do build.
- A sonda recebe `trecho`+`pergunta` já prontos; **não** decide sozinha o que testar.
  Quem escolhe trechos/perguntas é a camada de aplicação (ou o golden set).

---

## 6. Decisões linguísticas difíceis (o coração do MVP)

Cada subseção fecha uma decisão com trade-off explícito. A regra transversal:
**preferir precisão a recall** — um falso positivo barulhento corrói a confiança mais
do que um falso negativo silencioso. Severidade `info` é o amortecedor: quando a
heurística é fraca, rebaixar para `info` em vez de suprimir.

### 6.0 Segmentação de frases (fundação — tudo depende disto)

Divisor **baseado em regras + léxico**, zero-dep. Trata as armadilhas do PT-BR:
- Abreviações que não terminam frase: `Sr.`, `Sra.`, `Dr.`, `art.`, `inc.`, `nº`, `p.ex.`,
  `etc.`, `Ltda.`, `Av.` → dataset `abreviacoes.pt.json`.
- Números decimais e ordinais: `1.234,56`, `1º`, `3ª`.
- Reticências `…`/`...` e aspas/parênteses de fecho após `.?!`.

**Decisão:** segmentador determinístico próprio. Não usar libs de NLP pesadas (violam
zero-dep e o teto de auditabilidade). Casos ambíguos residuais viram **frases mais
longas** (fail-safe: juntar em vez de quebrar errado), o que no máximo aciona o critério
de comprimento — nunca corrompe offsets.

### 6.1 Análise morfológica — a decisão-mãe

`CLAUDE.md` pede escolha entre (a) regras+léxico e (b) POS tagger embutido.

**Decisão: (a) regras + léxicos, para o MVP inteiro.** Justificativa:
- Mantém o núcleo 100% auditável e sem dependência pesada (alinha com I1/I2 e o teto de
  determinismo).
- Passiva e nominalização em PT são detectáveis com precisão aceitável por
  padrões morfossintáticos + listas fechadas de particípios irregulares e verbos
  auxiliares/leves.
- Custo: recall menor e alguns falsos positivos. Mitigação: severidade calibrada e
  `requiresHuman` generoso. Um POS tagger fica registrado como **porta de saída da
  Fase 2** se a eval mostrar que a precisão do modo-regras trava abaixo do aceitável.

Registrar essa escolha no `docs/DECISOES.md` (ADR-001) na fase de código.

### 6.2 Voz passiva (`5.3.3`)

**Alvo MVP:** passiva analítica com auxiliar **`ser`** + particípio.
`[ser conjugado] (+ advérbio opcional) + [particípio]`, com detecção de agente
`por/pelo/pela/pelos/pelas + SN`.

Regras de decisão:
- **Particípio** = regular (`-ado`/`-ido`, com concordância) **ou** da lista de
  irregulares (`feito, dito, visto, posto, escrito, aberto, ganho, pago…`) em
  `participios-irregulares.pt.json`.
- **`estar` + particípio** é frequentemente resultativo/adjetival ("a porta está
  fechada"), não passiva de ação. **Decisão:** `estar` fica **atrás da flag
  `treatEstarAsPassive` (default false)**. No default, só `ser` dispara.
- **Passiva sintética/reflexa** ("vendem-se casas", `se` + verbo 3ª pessoa) →
  **Fase 2**. É outra construção e outro conjunto de falsos positivos.
- **Predicativo adjetival** ("é importante", "é necessário") → **não** é passiva:
  filtrar quando o "particípio" está numa lista de adjetivos/particípios lexicalizados
  de alta frequência, ou quando não há concordância verbal plausível. Preferir não
  disparar (precisão > recall).

`severity` e `requiresHuman`:
- Passiva **sempre é flag** (`warning`).
- `requiresHuman = (agente ausente)`. Sem agente explícito, ativar a voz exigiria
  **inventar quem agiu** — proibido. Com agente, o ator é recuperável, mas…
- **Decisão sobre `suggestion`:** o MVP **não** auto-sugere a forma ativa, nem com
  agente presente. Transformar passiva→ativa exige reordenar e reconjugar (concordância
  de número/pessoa/tempo) — mecanicamente frágil demais para caber em I7. A ferramenta
  **aponta** a passiva e diz *por quê*; a reescrita é do humano. (Reavaliar na Fase 2 só
  para o caso trivialíssimo "SN₁ + ser + particípio + por + SN₂".)

### 6.3 Nominalização (`5.3.3`/`5.3.4`)

Duas detecções, tratadas diferente:

1. **Construção de verbo-leve + nominalização deverbal** (o caso sugerível):
   `[verbo leve] + [artigo] + [nominalização] (+ "de")`
   ex.: "fazer a análise de" → "analisar"; "realizar o pagamento" → "pagar";
   "proceder à avaliação" → "avaliar".
   - Verbos leves em `verbos-leves.pt.json` (`fazer, realizar, proceder, efetuar,
     promover, dar, ter…`).
   - Nominalização→verbo em `nominalizacoes.pt.json`, **apenas mapeamentos 1:1 seguros**.
   - **`suggestion` só quando:** (a) a nominalização está na tabela, (b) o verbo leve casa,
     (c) o mapeamento é único. Senão: flag sem sugestão.

2. **Densidade de nominalizações** (sinal fraco): muitas palavras `-ção/-mento/-ância/
   -agem` numa frase. → **flag `info`, nunca sugestão, nunca score punitivo forte.**
   Fica melhor como Fase 2 para não gerar ruído no MVP.

`requiresHuman`: `false` no caso 1 com sugestão (é mecanicamente seguro); `true` quando
detecta a construção mas não tem mapeamento seguro (a decisão do verbo certo é do autor).

### 6.4 Jargão / termo incomum (`5.3.2`)

**Decisão de escopo (MVP, ADR-008 em `docs/DECISOES.md`):** só o mecanismo 1 abaixo
está implementado em `jargonPass`. O mecanismo 2 (raridade por frequência) fica fora do
runtime nesta etapa inteira — `frequencia.pt.json` não existe ainda e, quando existir,
serve só de ferramenta OFFLINE de curadoria (achar candidatos para um humano avaliar
antes de entrarem no glossário), nunca de autoridade de diagnóstico. Ver ADR-008 para o
raciocínio completo (por que frequência sozinha inverteria precisão⟷recall).

Mecanismos previstos, saídas distintas:

1. **Glossário jargão→comum** (`jargao.pt.json`): termo técnico com equivalente comum
   **único**. → flag `warning` **com `suggestion`**. **Implementado.**
2. **Raridade por frequência** (`frequencia.pt.json`): palavra abaixo do ranque de corte
   e **sem** mapeamento no glossário. → flag `info` "termo pouco comum", **sem sugestão**.
   **Não implementado nesta etapa** (ADR-008).

Blindagens:
- **Sentido múltiplo nunca troca** ("banco", "manga", "processo"): marcar a palavra como
  `ambiguous: true` no dataset; para essas, **só flag, jamais `suggestion`** (I7).
- **Nomes próprios / siglas:** heurística — token capitalizado no meio da frase, ou
  all-caps curto, é provável nome/sigla → **não flagar como raro** (evita afogar em
  falsos positivos). É heurística: manter `info` e documentar como fraca.
- **Números e datas:** `isWord=false` ou classe numérica → fora do jargão.

Trade-off: a lista de frequência define o volume de ruído. **Decisão:** começar com
corte conservador (só palavras genuinamente raras disparam) e afrouxar via eval, não o
contrário.

### 6.5 Legibilidade / métricas (`5.4`)

- **Flesch-PT de Martins et al. (1996)** — não o Flesch do inglês. Depende de
  **silabação PT-BR** determinística (`syllables.ts`, baseada em regras de divisão
  silábica do PT). Saída arredondada a `config.metrics.decimalPlaces`.
- **NILC-Metrix é Python** (~200 métricas). Embutir violaria zero-dep/zero-rede do
  `core`. **Decisão:** o `core` calcula um subconjunto nativo (Flesch-PT + médias). A
  integração NILC-Metrix vira um **adapter externo opcional na Fase 2**, fora da
  garantia determinística do core (subprocesso/serviço), claramente rotulado. Não bloqueia
  o MVP.
- **Regra normativa:** métrica é sinal de apoio (`5.4`), **nunca aprovação**. O
  `Metrics` reporta números; a UI mostra antes/depois; ninguém escreve "aprovado".

---

## 7. Fluxo de execução (Camada 1)

```
analyze(text, config?)
  │
  ├─ 1. normalize(text) ................. NFC + guarda como Document.source
  ├─ 2. segmentSentences(source) ........ Sentence[] (offsets no source)
  ├─ 3. tokenize(source, sentences) ..... Token[] flat + por-frase
  │        └─ constrói Document (readonly)
  ├─ 4. runMetrics(doc) ................. Metrics   (usa syllables)
  ├─ 5. para cada Pass em registry(fase): findings.push(...pass.run(ctx))
  ├─ 6. sort(findings, (start,end,criterion,principle))
  ├─ 7. buildScore(findings, doc) ....... Score
  └─ 8. return { text, findings, score, metrics, meta:{configHash,…} }
```

Tudo síncrono, puro, determinístico. A sonda (Camada 2) roda **depois e por fora**, na
camada `report`, consumindo `Diagnostic` + escolhendo trechos/perguntas.

---

## 8. Estratégia de testes (a eval é parte da arquitetura)

- **Snapshot byte-idêntico (I2):** cada fixture do golden set tem um snapshot de
  `analyze(fixture)`. `determinism.test.ts` roda `analyze` duas vezes e compara buffers.
- **Reconstrução de span (I3):** para todo finding, `source.slice(start,end) === span.text`.
- **Fronteira (I1):** `boundary.test.ts` + `dependency-cruiser` falham o build se
  `lucid/core/**` importar `lucid/probe/**`, `react`, `next`, ou módulo de rede.
- **Golden set:** trechos rotulados (simples/não-simples) **+ a pergunta do leitor** de
  cada um. Serve à Camada 1 (o linter acha o que devia) e à Camada 2 (a sonda trava onde
  humanos travaram).
- **Meta-eval da sonda (Fase 2):** concordância da sonda com os rótulos; `PROMPT_VERSION`
  e modelo versionados; regressão quebra o build. Usa `stub-probe` no CI por default.
- **Calibração de precisão:** para passiva/nominalização/jargão, manter um conjunto de
  **contra-exemplos** (frases que NÃO devem disparar) — o guardião contra falsos positivos.
- **Golden set integrado + snapshots (consolidação, ADR-009):** `test/golden/` roda
  documentos completos por `analyze()` de ponta a ponta, com asserções semânticas
  nomeadas E snapshots do `Diagnostic` inteiro. Os snapshots são o **contrato observável**
  da Camada 1. Suítes dedicadas: `test/determinism.test.ts` (repetição byte-idêntica,
  24 permutações de ordem de passes, independência de ordem de dataset, estado
  compartilhado A-B-A, variações de Config), `test/interaction.test.ts` (múltiplos
  critérios por texto, sem dedup entre critérios distintos), `test/ordering.test.ts`
  (auditoria de `sortFindings`), `test/provenance.test.ts` (offsets UTF-16/NFC/Unicode),
  `test/score-audit.test.ts` (score derivado, sem contagem dupla, sem aprovação).
- **Política de revisão de snapshot (ADR-009):** um snapshot que muda exige revisão
  humana explícita e causa documentada; nunca se roda `vitest -u` às cegas; mudança
  semântica relevante (severidade, span, sugestão, `LUCID_VERSION`) é registrada em ADR/
  changelog antes de reescrever o retrato. Diferenciar mudança desejada de regressão é
  parte do processo, não um detalhe.

Tooling de teste: **Vitest** (rápido, snapshots nativos, TS direto). Registrar em
`docs/DECISOES.md`.

---

## 9. Plano de implementação incremental

> Cada etapa é um PR pequeno, com testes, que deixa o build verde. Ordem pensada para
> que a fundação (segmentação/offsets) exista antes de qualquer critério.

### Fase 0 — Andaime (1 PR)
1. Configurar Vitest + `dependency-cruiser` (regra da cerca I1) + regras de lint anti-não-determinismo (I4).
2. Criar árvore `src/lucid/**` vazia com barrels e os tipos de `core/types.ts` e
   `probe/types.ts` (só tipos, sem lógica).
3. `docs/DECISOES.md` com ADR-001 (regras+léxico) e ADR-002 (Vitest).
4. Testes de fronteira (I1) já passando (mesmo sem implementação).

### Fase 1 — MVP Camada 1 (núcleo do produto)
> **Estado:** itens 1–11 concluídos — os quatro critérios linguísticos do MVP
> (`long_sentence`, `passive_voice`, `nominalization`, `jargon`) estão implementados
> (ADR-006/007/008) e a Camada 1 foi **consolidada** (golden set integrado, snapshots do
> `Diagnostic`, suítes de determinismo/ordenação/proveniência/score — ADR-009). Itens
> 12–13 (`probe/` real e CLI) permanecem abertos.

Ordem obrigatória (dependências):
1. **`normalize.ts`** (NFC + caixa invariante) + testes.
2. **`segment-sentences.ts`** + `abreviacoes.pt.json` + snapshots. *(fundação)*
3. **`tokenize.ts`** (offsets, `isWord`) + testes de reconstrução (I3).
4. **`syllables.ts`** + **`flesch-pt.ts`** + `metrics/index.ts` + testes numéricos.
5. **`analyzer.ts`** mínimo: monta Document, roda métricas, retorna Diagnostic vazio de
   findings + `configHash`. Fecha o esqueleto determinístico (I2/I3 verdes).
6. **Pass `sentence-length`** (`5.3.4`) — o mais fácil, valida o pipeline de findings.
7. **Pass `passive-voice`** (`5.3.3`, só `ser`) + `participios-irregulares.pt.json` +
   `verbos-ser-estar.pt.json` + contra-exemplos.
8. **Pass `nominalization`** (`5.3.3/5.3.4`, caso verbo-leve) + `nominalizacoes.pt.json`
   + `verbos-leves.pt.json`.
9. **Pass `jargon`** (`5.3.2`) + `jargao.pt.json` (+ tratamento de nomes próprios e
   aspas) — `frequencia.pt.json` fica fora do runtime desta etapa (ADR-008, §6.4).
10. **`score/index.ts`** + integração no analyzer. ✅
11. **Golden set integrado** (`test/golden/`, 17 documentos completos) + snapshots do
    `Diagnostic` + suítes `determinism`/`ordering`/`interaction`/`provenance`/`score-audit`
    (ADR-009). ✅ *(boundary suite já existente desde a Fase 0)*
12. **`probe/`**: interface + `prompt.ts` (versionado) + `interpret.ts` + `stub-probe.ts`.
    `llm-probe.ts` fica como stub lançando "não implementado". Sonda **desligável** por
    flag e ausente do caminho do `core`.
13. **CLI fina** (`cli/lucid.ts`): lê arquivo/stdin, imprime JSON ou relatório legível.
    Sem dependência de UI.

Critério de "MVP pronto": os 4 critérios linguísticos + métrica Flesch-PT + placar +
proveniência, tudo com snapshot byte-idêntico e as suites I1/I2/I3 verdes; sonda como
stub atrás de flag.

### Fase 2 — Ampliação
- `treatEstarAsPassive`, passiva sintética (`se` + verbo), predicativo adjetival refinado.
- Densidade de subordinação (orações/frase); enumeração-em-prosa→lista;
  título-que-não-responde (flag fraca, nunca score); 2ª pessoa ausente.
- Densidade de nominalizações (sinal fraco, `info`).
- **`llm-probe.ts`** real (`temperature:0`, modelo fixado) + **meta-eval** da sonda.
- **Adapter NILC-Metrix** externo, opcional, fora do core determinístico.
- Expandir golden set e contra-exemplos; calibrar cortes de frequência por eval.

### Fase 3 — Produto/UX
- Camada web Next.js reusando `src/lucid` + `src/report`: diagnóstico anotado clicável
  (trecho→critério+justificativa), cartão separado "exige decisão humana"
  (`requiresHuman`), painel da sonda **sempre com caveat, sem check verde**.
- Métrica antes/depois (comparar dois diagnósticos).
- Packs de domínio (glossários setoriais) plugáveis.
- Dashboard de eval.

---

## 10. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Segmentação erra e desalinha offsets | corrompe todos os findings | fail-safe "juntar em vez de quebrar"; teste I3 obrigatório; dataset de abreviações |
| Falsos positivos de passiva/jargão afogam o sinal | usuário perde confiança | precisão>recall; contra-exemplos no CI; `info` como amortecedor; cortes conservadores |
| Vazamento da Camada 2 no core | quebra a promessa central | `dependency-cruiser` + `boundary.test.ts` no CI; `report/` como único ponto de junção |
| Não-determinismo sutil (float/Unicode/ordem) | snapshots instáveis | NFC na entrada, arredondamento na saída, ordenação canônica, lint I4 |
| NILC-Metrix arrastar Python pro core | mata zero-dep/zero-rede | manter fora do core, adapter externo opcional na Fase 2 |
| Sonda "preenche lacunas" e vira selo | fura a filosofia | prompt blindado + `ProbeSignal` sem estado "aprovado" (I5) |

---

## 11. Decisões em aberto (para confirmar na fase de código)

1. **Fonte dos datasets** (`frequencia.pt.json`, `jargao.pt.json`): definir origem e
   licença de cada um em `data/README.md`. Frequência PT-BR pode vir de corpora abertos;
   glossário jargão→comum dos guias gov (LAB.mg, gov.br) — **só como exemplos/glossário,
   nunca como princípios** (o `principle` vem sempre da norma).
2. **CLI: formato de saída default** — JSON (máquina) vs. relatório colorido (humano).
   Sugestão: `--json` opt-in, humano por default.
3. **Empacotamento** — **DECIDIDO:** lib como `src/lucid/**` dentro do app Next (import
   direto), sem monorepo. Extrair para workspace/package só quando houver segundo
   consumidor. Não antecipar. *(ADR-003)*

### Decisões confirmadas (não reabrir)

- **Test runner: Vitest** — snapshots nativos byte-idênticos, roda TS direto. Uma
  devDependency no projeto Next. *(ADR-002)*
- **Empacotamento: `src/lucid/**` dentro do app** — sem monorepo no MVP. *(ADR-003)*

---

### Apêndice A — Mapa critério → norma (fonte do campo `principle`)

| criterion | principle | Nome (ABNT) |
|---|---|---|
| `long_sentence` | `5.3.4` | frases concisas |
| `passive_voice` | `5.3.3` | frases claras (quem faz o quê) |
| `nominalization` | `5.3.3` / `5.3.4` | frases claras / concisas |
| `jargon` / `uncommon_term` | `5.3.2` | palavras familiares |
| (métricas) | `5.4` | usável (sinal de apoio, não selo) |
| (`requiresHuman` de relevância) | `5.1` | relevante (trabalho de autor) |

Princípios 2 e 3 = terreno forte do linter. Princípio 1 = `requiresHuman`.
Princípio 4 = sonda (proxy-piso). Ver `CLAUDE.md` §"Fonte canônica".
