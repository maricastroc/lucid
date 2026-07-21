# ADR (rascunho) — Data registry: dados como entrada versionada de primeira classe

> **Status:** proposta / desenho (não implementa nada). Vira uma entrada em `docs/DECISOES.md`
> (ADR-0xx) quando for implementado.
> **Contexto maior:** substrato compartilhado citado em `DESIGN-camada1-teto-deterministico.md`
> §9.4 e `DESIGN-camada-anotacao.md` §4. É a fundação de **duas** frentes: o lote "juridiquês"
> (léxicos fechados) e a camada de anotação (léxico morfológico + overrides).
> **Restrições herdadas:** determinismo byte-idêntico, zero rede, zero I/O de arquivo em runtime,
> cerca `core` (I1/I4).

---

## 1. Contexto — o estado atual e a lacuna

Hoje a Camada 1 consome **9 datasets** curados, todos por `import` direto de JSON em tempo de
compilação, cada um construindo suas estruturas (Set/Map) no carregamento do módulo:

| Dataset | Consumidor | Onde |
|---|---|---|
| `abreviacoes.pt` | `segment-sentences` | **montagem do Document** (não é pass!) |
| `verbos-ser.pt`, `participios-irregulares/ambiguos/falsos-nominais.pt` | `passive-voice` | pass |
| `verbos-leves.pt`, `nominalizacoes.pt` | `nominalization` | pass |
| `jargao.pt` | `jargon` | pass |
| `participios-infinitivo.pt` | `passive-scaffold` | action (Tier 2, fora de `analyze`) |

Dois fatos do código que definem o desenho:

1. **`PassContext.data` (`LoadedData`) existe e chega sempre vazio** (`data: {}` em `analyzer.ts`).
   Ninguém lê `ctx.data`. É um gancho de extensibilidade **ocioso**.
2. **Dado não é entrada versionada.** `configHash` cobre só a `Config`. Editar `jargao.pt.json`
   **muda a saída de `analyze` mas não muda o `configHash`** — só o snapshot do golden pega a
   diferença. O `Diagnostic` não declara **com quais dados** foi produzido.
3. **Dado é consumido fora do pipeline de passes** (`segment-sentences`, na construção do
   `Document`). Qualquer noção de "fingerprint dos dados desta análise" tem de incluir isso.

Problemas que isso gera à medida que a Camada 1 cresce para dezenas de datasets (o léxico
morfológico sozinho é enorme):
- **Sem proveniência de dados no resultado** — a reprodutibilidade depende de `configHash` +
  `lucidVersion`, mas os dados ficam de fora. Ruim para eval e para o verificador do Tier 3 (que
  re-roda `analyze`).
- **Carregamento e preparação espalhados** — cada pass reconstrói suas estruturas; não há um lugar
  para carregar uma vez, versionar e governar.
- **Nenhum contrato de dependência** — um pass pode ler qualquer JSON; nada declara nem verifica
  "este pass depende destes dados".

---

## 2. Decisão — o data registry

Introduzir um **registro central de datasets** em `core`, que carrega/prepara cada dataset **uma
vez**, calcula um **fingerprint** por dataset, injeta em `ctx.data` apenas o que cada consumidor
**declara** precisar, e expõe um **`dataHash`** de proveniência no `Diagnostic`. Tudo puro,
determinístico, sem I/O de runtime (os dados continuam `import` de compilação; o registry só os
organiza).

### 2.1 Identidade tipada e a unidade `Dataset`

```ts
// União fechada de ids conhecidos — trocar id é evento de código, auditável.
type DatasetId =
  | "abreviacoes.pt" | "verbos-ser.pt"
  | "participios-irregulares.pt" | "participios-ambiguos.pt" | "participios-falsos-nominais.pt"
  | "participios-infinitivo.pt" | "verbos-leves.pt" | "nominalizacoes.pt" | "jargao.pt";
  // (futuro) | "lexico-morfologico.pt" | "overrides-morfologicos.pt" | regras de desambiguação

interface Dataset<TPrepared> {
  readonly id: DatasetId;
  readonly prepared: TPrepared;   // estrutura PRONTA (Set/Map/etc.), construída UMA vez
  readonly fingerprint: string;   // hash estável do conteúdo-fonte, ou versão pinada (2.3)
  readonly provenance: string;    // 1 linha espelhando o README — auditabilidade inline
}
```

Um **mapa de tipos** dá acesso tipado sem cast:

```ts
interface DataTypes {
  "verbos-ser.pt": ReadonlySet<string>;
  "abreviacoes.pt": ReadonlySet<string>;
  "nominalizacoes.pt": { entries: NominalizationEntry[]; conjugations: ConjTable };
  "jargao.pt": ReadonlyMap<string, JargonEntry>;
  // ...
}
```

### 2.2 O registro é construído uma vez, congelado, puro

```ts
// singleton de módulo — construído no load, Object.freeze, nunca remontado.
const REGISTRY: Readonly<Record<DatasetId, Dataset<unknown>>> = buildRegistry();
```

- **Preparação memoizada:** a transformação `raw JSON → prepared` (ex.: `new Set(serFormsData.forms)`)
  roda **uma vez** na construção do registro — preserva a performance atual (build-once), agora
  centralizada em vez de espalhada por pass. `prepare` é pura.
- **Zero I/O de runtime:** os dados são `import` de compilação (o bundler embute). O registry não
  lê arquivo em runtime — mantém I1/I4. O fingerprint é calculado em memória (2.3).

### 2.3 Fingerprint — duas estratégias, por tamanho do dataset

- **Datasets curados (pequenos, os 9 atuais):** fingerprint = **hash estável do conteúdo-fonte**,
  reusando o `stableStringify` + hash que o `hashConfig` já implementa (extrair para um util
  compartilhado). Automático, zero manutenção: mexeu no JSON, mudou o fingerprint. Nada de campo
  `version` manual para esquecer de bumpar.
- **Léxico-base reusado (futuro, enorme):** hashear centenas de milhares de formas a cada boot é
  caro. Para ele, fingerprint = **versão pinada** (string) — ele já é versionado externamente (é a
  Opção 1 do D1 da camada de anotação). Não se hasheia o conteúdo; confia-se na versão pinada +
  golden. (Ver Riscos §5 sobre bundle/async desse léxico.)

O registry escolhe a estratégia por dataset (uma flag `hashStrategy: "content" | "pinned"`).

### 2.4 Declaração de dependência + visão escopada (`DataView`)

O `Pass` ganha um campo declarativo; o consumidor **só enxerga o que declarou**:

```ts
interface Pass {
  readonly criterion: string;
  readonly category: Category;
  readonly principle: string;
  readonly dataDeps?: readonly DatasetId[];   // NOVO — declarativo
  run(ctx: PassContext): Finding[];
  // (futuro) readonly annotationDeps?: ...    // o MESMO mecanismo, para a camada de anotação
}

interface DataView {
  // lança se `id` não foi declarado em dataDeps — impede dependência oculta.
  get<K extends DatasetId>(id: K): DataTypes[K];
}
```

- O `analyzer` monta, **por pass**, um `DataView` escopado às `dataDeps` daquele pass, e o injeta
  no `ctx.data`. Um pass **fisicamente não consegue** ler um dataset que não declarou → o
  `dataHash` é honesto por construção (mentalidade de compilador: dependências explícitas).
- Custo nulo: `DataView` é um closure sobre um `Set<DatasetId>` + o registry congelado.
- **Dado de estágio de documento** (`abreviacoes.pt` no `segment-sentences`): tratado à parte —
  a construção do `Document` declara suas próprias `dataDeps` de estágio, que **sempre** contam
  para o `dataHash` (o documento é sempre construído). Assim o fingerprint cobre todo dado que
  influenciou o resultado, dentro e fora do pipeline de passes.

### 2.5 `dataHash` — proveniência de dados no `Diagnostic`

Adicionar um campo a `DiagnosticMeta`:

```ts
interface DiagnosticMeta {
  lucidVersion: string;
  configHash: string;
  dataHash: string;               // NOVO
  standardVersion: "ABNT NBR ISO 24495-1:2024";
}
```

`dataHash` = hash estável sobre os pares `(id, fingerprint)` **ordenados** dos datasets que
**influenciaram esta análise** = união de: (a) dados de estágio de documento (sempre) + (b)
`dataDeps` dos passes **ativos**. Consequência: **desabilitar um pass muda o `dataHash`** (menos
dado em jogo) — o fingerprint reflete exatamente o que podia ter influído.

**Contrato de reprodutibilidade, agora completo:** um `Diagnostic` é reproduzível dado
`(lucidVersion, configHash, dataHash)`. Governança automática: mudar qualquer léxico muda o
`dataHash` → o resultado se autodeclara, e o snapshot quebra de propósito. Fecha a lacuna do §1.2.

---

## 3. Alternativas consideradas

- **Dobrar o fingerprint dentro do `configHash`** (como os design docs sugeriram frouxamente).
  Rejeitado: config (limiares/toggles, comportamento) e dados (léxicos) são **entradas
  conceitualmente distintas**; separar em `configHash` + `dataHash` é mais inspecionável e diz
  *o que* mudou. Custo: um campo a mais no `meta` (churn de snapshot uma vez, deliberado).
- **Campo `version` manual em cada JSON.** Rejeitado para os curados: dá para esquecer de bumpar;
  o hash de conteúdo é automático e não mente. Mantido só para o léxico-base grande, onde hashear é
  caro e a versão externa já existe.
- **Visão global de dados** (todo pass vê todo dataset). Rejeitado: reintroduz dependência oculta e
  torna o `dataHash` impreciso (não dá para saber o que influiu). A visão escopada custa nada e
  torna a dependência um contrato verificável.
- **Ler arquivo + hashear em runtime (fs).** Rejeitado: viola I1/I4 (o `analyzer` nem lê
  `package.json` em runtime). Dados continuam `import` de compilação.
- **Tagger/estatística para "versão".** Fora de escopo — irrelevante aqui.

---

## 4. Consequências

**Positivas:**
- **Proveniência de dados no resultado** (`dataHash`) — reprodutibilidade e anti-drift completos;
  útil para eval e para o verificador do Tier 3 que re-roda `analyze`.
- **Governança automática** — mexeu em léxico, mudou o hash e quebrou snapshot; sem depender de
  lembrar de bumpar versão.
- **Carregamento/preparação centralizados e memoizados** — build-once preservado, agora num lugar
  só; fim da duplicação de `new Set(...)` por pass.
- **Contrato de dependência explícito** (`dataDeps`) — mentalidade de linter; base direta para
  `annotationDeps` da camada de anotação (o **mesmo** mecanismo, sem arquitetura nova).
- **Lazy real** — só prepara/conta os datasets que passes ativos declaram (importa para o léxico
  morfológico caro).

**Custos/impacto:**
- Um campo novo em `DiagnosticMeta` → atualização única de snapshots (deliberada, ADR).
- Refator dos 9 consumidores para ler de `ctx.data` em vez de `import` direto — **output-neutral**
  (o conteúdo não muda, só a via de carregamento).

---

## 5. Plano de migração (incremental, cada passo verificável)

1. **Registry + `dataHash` + `dataDeps` declaradas** (passes ainda importam direto). Saída idêntica
   **exceto** o novo `meta.dataHash`; snapshots atualizados uma vez. O `dataHash` já fica honesto
   porque o registry hasheia os mesmos JSONs.
2. **Migrar consumidores para `ctx.data.get(id)`**, um por vez, cada migração **output-neutral**
   (snapshots estáveis). Inclui o estágio de documento (`segment-sentences`).
3. **Remover os `import` diretos** dos passes migrados; o registry vira a única porta de dados.
4. (Depois) **Camada de anotação** registra seus datasets (léxico-base + overrides + regras) pelo
   mesmo mecanismo, declarados via `annotationDeps`.

Cada passo roda `npm run test && typecheck && lint && depcheck`; nenhum reabre a arquitetura.

---

## 6. Riscos e questões em aberto

1. **Léxico-base grande (bundle/async).** Datasets curados são `import` síncrono sem dor. Um léxico
   morfológico de vários MB embutido em todo build é pesado, e um `import()` dinâmico é **assíncrono**
   — mas `analyze` é **síncrono**. Duas saídas, a decidir no ADR da camada de anotação (não aqui):
   (a) aceitar o custo de bundle e manter tudo síncrono; (b) um caminho `analyzeAsync` só para
   análises que dependem de anotação, mantendo `analyze` síncrono para a faixa lexical. **Este ADR
   se restringe aos datasets curados atuais** (todos síncronos); só deixa o gancho pronto.
2. **Onde vive a transformação `prepare`.** Proposta: junto da definição do dataset no registry
   (não no pass), para centralizar. Verificar que nenhuma `prepare` introduz não-determinismo
   (devem ser puras; teste de fronteira cobre).
3. **Escopo do `dataHash`** — confirmar que datasets de action (Tier 2, ex.: `participios-infinitivo`)
   **não** entram no `dataHash` de `analyze` (não influenciam a saída de `analyze`). Corolário: o
   registry serve `core` inteiro, mas o `dataHash` só conta o que afeta o `Diagnostic`.
4. **Estabilidade do algoritmo de hash.** O `hashConfig` atual é "andaime mínimo" (hash de 32 bits).
   Para dado, colisão é mais provável com muitos datasets; considerar um hash mais largo ao extrair
   o util compartilhado. Decisão de implementação, não de arquitetura.

---

## 7. Encaixe com o resto do desenho

- **Lote juridiquês:** cada novo léxico (latinismos, fórmulas, duplas…) entra como um `Dataset`
  novo + um pass que o declara em `dataDeps`. Zero mudança de arquitetura — exatamente a promessa
  "novo detector = novo pass".
- **Camada de anotação:** `annotationDeps` é o `dataDeps` estendido; o léxico-base e as regras de
  desambiguação são `Dataset`s (com `hashStrategy: "pinned"` para o base). O `dataHash` passa a
  cobri-los, dando anti-drift à anotação de graça.
- **Contrato público inalterado:** `analyze(text, config)` continua a mesma assinatura; só o
  `meta` ganha `dataHash`. `analyzeWithPasses` (seam de teste) ganha o cálculo de `dataHash` a
  partir dos passes recebidos.

---

### Resumo em uma frase

Transformar dado de `import` invisível em **entrada versionada de primeira classe**: um registry
que carrega/prepara uma vez, dá a cada dataset um **fingerprint**, injeta só o que cada pass
**declara** (`dataDeps`, visão escopada), e estampa um **`dataHash`** no `Diagnostic` — fechando a
lacuna de governança e servindo de fundação única para o juridiquês e para a camada de anotação.
