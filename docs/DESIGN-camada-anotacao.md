# DESIGN DOC — Camada de anotação determinística compartilhada

> **Status:** proposta / desenho (não implementa nada). Desdobra a decisão **Opção B** do
> `docs/DESIGN-camada1-teto-deterministico.md` §8.
> **Escopo:** desenhar a infraestrutura que anota cada token com informação morfossintática
> (`lema`, classe, traços), de forma **100% determinística, zero LLM, zero rede, auditável**,
> para que dezenas de detectores futuros a consumam **sem reimplementar morfologia**.
> **Não-objetivo:** implementar; propor qualquer tagger estatístico/neural; propor LLM.
> **Fonte de princípios:** ABNT NBR ISO 24495-1:2024 (a camada não é um princípio — é meio;
> ela **habilita** detectores dos Princípios 2 e 3).

---

## 1. Por que esta camada existe

O `DESIGN-camada1-teto-deterministico.md` mostrou que os detectores 🟡 de maior valor sintático
(`long_preverbal_subject`, `subject_verb_distance`, `subordination_depth`, `ambiguous_pronoun`,
concordância…) precisam saber coisas que o `Document` atual **não carrega**: se um token é verbo,
particípio, substantivo, seu gênero/número, seu lema. Hoje cada pass que precisa disso **reinventa**:

- `passive-voice.ts` decide "formato de particípio" com um regex (`RE_REGULAR_PARTICIPLE_SUFFIX`) +
  `participios-irregulares.pt.json`, e **desambigua na marra** com dois léxicos de exclusão
  (`participios-ambiguos` = "é dedicada" adjetival; `participios-falsos-nominais` = "foi resultado
  de" nominal). Isso já é **anotação morfológica + desambiguação local**, só que presa dentro de
  um pass e não reaproveitável.
- `nominalization.ts` carrega sua própria tabela fechada de conjugação (ADR-011) e um léxico de
  verbos leves com traços morfológicos (`feature: "pret.3s"`).

O quinto pass que precisar de "onde está o verbo" vai copiar a lógica do primeiro. **A camada de
anotação existe para matar essa duplicação uma vez** — e para subir o teto sintático da Camada 1
sem violar nada do que a torna confiável.

---

## 2. As restrições inegociáveis (o que "auditável e determinística" exige)

A camada é código de `core`. Ela herda **todas** as invariantes da Camada 1, e acrescenta as suas:

1. **Determinismo byte-idêntico.** Mesma entrada → mesma anotação, sempre. Sem `Date`, sem
   `Math.random`, sem rede, sem I/O assíncrono. Ordenação/comparação por *code unit*
   (`toLowerCase`, nunca `toLocaleLowerCase`; `<`/`>`, nunca `localeCompare`) — a mesma regra I4 já
   praticada.
2. **Auditabilidade = rastreabilidade + ausência de caixa-preta.** Toda tag atribuída a um token
   tem de ser **explicável**: de qual entrada de léxico ou de qual regra ela veio. Nada de "o
   modelo decidiu". Isso **exclui** taggers estatísticos/neurais — mesmo os determinísticos por
   argmax — porque o *porquê* de uma tag não é inspecionável. Ver Decisão D0.
3. **`precisão > recall`, herdada.** A camada **nunca inventa uma tag para parecer confiante.**
   Quando o léxico é genuinamente ambíguo e as regras não resolvem, ela **expõe a ambiguidade como
   dado**, não escolhe um palpite. É o mesmo "marcar em vez de inventar" do produto inteiro,
   aplicado ao nível morfológico.
4. **Cerca (I1).** Vive em `core/**`; não importa `probe/**`, `report/**`, `react`, `next`, rede.
   Consome dados locais versionados (via o data registry do design anterior, §9.4).
5. **Aditiva, não disruptiva.** Nenhum pass existente é forçado a migrar. `Document` continua
   válido; a anotação é uma camada **opcional** por cima. Migrar `passive-voice` para consumir a
   camada é um ADR à parte, com atualização de golden (pode mudar saída → tem de ser deliberado).

**A tese de honestidade da camada:** ela é, ela mesma, um instrumento que *mede e expõe, marca em
vez de inventar*. A ambiguidade morfológica não é um defeito a esconder — é informação que flui
para a mesma disciplina `precisão > recall` que governa o resto (§6).

---

## 3. Decisão D0 — léxico finito + regras finitas, nunca tagger estatístico

**Decisão:** a anotação vem de (a) um **dicionário de formas plenas** (full-form lexicon:
`forma_flexionada → conjunto de análises`) e (b) um conjunto de **regras de desambiguação finitas e
escritas à mão** (estilo *Constraint Grammar* — REMOVER/SELECIONAR análises pelo contexto local).
Nunca de um modelo treinado.

**Por quê.** Um POS tagger neural/estatístico *pode* ser determinístico (modelo fixo, argmax, sem
amostragem), mas **não é auditável**: não dá para apontar a célula que justificou a tag, nem
versionar a decisão como um fato de língua. Um dicionário finito é auditável entrada a entrada,
versionável, e mantém a saída byte-idêntica. É **a mesma filosofia da tabela de conjugação fechada
do ADR-011 e dos léxicos `verbos-ser`/`participios-*`**, generalizada de "um pass" para "toda a
Camada 1". Não é uma restrição nova; é a que o projeto já escolheu, levada à sua conclusão.

**Consequência aceita:** ambiguidade morfológica (§5.3) é real e frequente em PT; um dicionário de
formas plenas devolve **múltiplas análises** por token. A camada trata isso de frente (§6), em vez
de escondê-lo atrás de um número de confiança de um modelo.

---

## 4. Onde a camada se encaixa

Estende o `AnnotatedDocument` proposto no design anterior (§9.1). A anotação é a camada mais alta,
**opcional e preguiçosa**:

```
AnnotatedDocument
├── source          // texto normalizado (NFC) — âncora de offsets (já existe)
├── blocks?         // estrutura (parágrafos/títulos/listas) — outro ADR
├── sentences[]     // já existe
├── tokens[]        // já existe: {text, lower, start, end, isWord}
└── annotations?    // ESTA CAMADA — por token: readings[]; e (fase 3) chunks[]
```

- **Construída uma vez**, em `buildDocument` (ou variante), congelada (`Object.freeze`), pura.
- **Opt-in / lazy:** só é construída se algum pass **ativo** declarar `annotationDeps`. Um
  diagnóstico que roda só passes de léxico fechado (o lote juridiquês) **não paga** o custo.
- **Consome o data registry** (§9.4 do design anterior): o dicionário e as regras são datasets
  versionados; **o hash deles entra no `configHash`** — trocar o léxico sem ADR quebra o snapshot
  de propósito. Auditoria automática, igual à dos léxicos atuais.

Sequenciamento honesto com o "lote juridiquês": a maior parte dos detectores juridiquês é
**léxico fechado** (latinismos, fórmulas, duplas) e **não depende desta camada** — depende só do
*data registry* + da ergonomia de pass. Esta camada é o que destrava a **faixa sintática** 🟡. As
duas coisas compartilham o substrato (data registry, `PassContext.data`, query helpers); a morfologia
é a parte profunda, necessária para a sintaxe e *opcional* para o juridiquês.

---

## 5. O modelo de anotação

### 5.1 A unidade: `Reading` (uma análise possível)

Cada token recebe **zero ou mais** `Reading`s — as análises morfológicas candidatas. Esboço de
contrato (design, não implementação):

```ts
type Pos =
  | "NOUN" | "PROPN" | "VERB" | "AUX" | "ADJ" | "ADV" | "PRON" | "DET"
  | "ADP"  | "CCONJ" | "SCONJ" | "NUM" | "PART" | "INTJ" | "NUM" | "X";

type Source = "lexicon" | "rule" | "guessed"; // proveniência — a chave da auditabilidade

interface Reading {
  lemma: string;                 // forma base ("casas" → "casa")
  pos: Pos;
  features: Readonly<MorphFeatures>; // traços (ver 5.2)
  source: Source;                // de onde veio ESTA análise
  ruleId?: string;               // se source==="rule": qual regra a produziu/selecionou
}

interface TokenAnnotation {
  readings: readonly Reading[];  // ordenadas canonicamente (determinismo)
  certainty: Certainty;          // derivado (ver 6.1)
}
```

`source` é o coração da auditabilidade: **toda tag rastreia sua origem** — uma entrada de dicionário,
uma regra identificável (`ruleId`), ou um chute morfográfico marcado como tal.

### 5.2 Traços (`MorphFeatures`) — esquema por classe, extensível

Um saco de traços tipados, preenchido conforme a classe. Começa mínimo e cresce por ADR:

- **Verbo:** `finite: boolean`; se finito → `mood` (ind/subj/imp), `tense`
  (pres/pretPerf/pretImperf/pretMQP/fut/futPret), `person` (1/2/3), `number` (sg/pl); se não finito
  → `nonFinite` (infinitivo/gerúndio/particípio) + (infinitivo) `personal: boolean`.
- **Nome/adjetivo:** `gender` (m/f), `number` (sg/pl).
- **Pronome:** `pronType` (pessoal/possessivo/demonstrativo/relativo/indefinido/interrogativo);
  (pessoal) `case` (reto/oblíquo/reflexivo), `person`, `gender`, `number`.
- **Determinante/numeral/preposição/conjunção:** o mínimo que os detectores exigirem.

Extensível por design: um traço novo (ex.: grau aumentativo/diminutivo) é adição de campo, não
mudança de arquitetura.

### 5.3 Ambiguidade é dado, não falha

O caso normal, não a exceção. Exemplos canônicos de PT que o dicionário devolve com múltiplas
`readings`:

- **`a`** → `DET` (fem sg) | `PRON` pessoal oblíquo (3 fem sg) | parte de contração/`ADP`.
- **`casa`** → `NOUN` (fem sg, lema *casa*) | `VERB` (*casar*, ind pres 3sg).
- **`sobre`** → `ADP` | `VERB` (*sobrar*, subj pres).
- **`for`** → `VERB` (*ser* **ou** *ir*, fut subj 3sg) — ambíguo até no lema.

A camada **não escolhe** por conta própria. Ou uma regra finita resolve (e marca `source:"rule"`),
ou a ambiguidade permanece e **o detector decide o que fazer com ela** (§6.2). Isto é o `requiresHuman`
do produto, empurrado para o nível do token.

---

## 6. Como os detectores consomem — a régua de certeza

Este é o mecanismo que faz `precisão > recall` funcionar no nível morfológico.

### 6.1 A escada de certeza (`Certainty`), derivada das readings

| Nível | Condição | Significado |
|---|---|---|
| `certain` | 1 reading, `source:"lexicon"` | fato de dicionário, sem ambiguidade |
| `resolved` | reduzido a 1 reading por regra (`source:"rule"`) | reproduzível, mas **heurístico** |
| `ambiguous` | ≥2 readings restantes | o dicionário não decide; nenhuma regra decidiu |
| `guessed` | OOV, reading(s) de sufixo (`source:"guessed"`) | palpite morfográfico, marcado |
| `unknown` | OOV, sem palpite | a camada não sabe |

### 6.2 Cada detector escolhe seu piso de certeza

- **Detector de alta precisão** (a maioria; ex.: `subject_verb_distance`) age **só** sobre traços
  `certain` (e, se aceitar o risco de regra, `resolved` — mas então rebaixa `severity` ou marca
  `requiresHuman`). Diante de `ambiguous`/`guessed`/`unknown`, **abstém-se** — silêncio é a resposta
  segura.
- **Detector tolerante** (raro; ex.: uma métrica de densidade agregada) pode contar readings
  ambíguas com peso, porque o custo de um erro num agregado é baixo.

Consulta ambiguidade-consciente (evita que o pass improvise e reintroduza não-determinismo):

```ts
// helpers puros sobre TokenAnnotation — os passes NUNCA varrem readings à mão
isCertainly(tok, { pos: "VERB", finite: true })   // true só se TODAS as readings concordam
couldBe(tok, { nonFinite: "participio" })          // true se ALGUMA reading permite
certaintyOf(tok)                                   // o nível acima
```

**A regra de ouro do consumo:** um finding sintático só nasce de um traço `certain` (ou `resolved`
com severidade/`requiresHuman` rebaixados). Assim a camada **sobe o recall** dos detectores sem
baixar a precisão do produto — a ambiguidade vira abstenção, não falso positivo.

---

## 7. O pipeline de anotação (4 estágios determinísticos)

Cada estágio é puro e reproduzível; a ordem é fixa.

**Estágio 1 — Lookup no dicionário de formas plenas.** `token.lower → Reading[]` (`source:"lexicon"`).
Hit: readings do dicionário. Miss (OOV): vazio, segue ao estágio 2. Custo O(1) por token (mapa/trie).

**Estágio 2 — Guesser morfográfico (só para OOV).** Regras de sufixo **finitas** produzem readings
`source:"guessed"`, sempre marcadas como palpite: `-mente` → `ADV`; `-ção/-mento/-dade/-agem` →
`NOUN`; `-ando/-endo/-indo` → `VERB` gerúndio; `-ar/-er/-ir` → possível `VERB` infinitivo; `-íssimo`
→ `ADJ`. Nunca vira `certain`. Cobre neologismos/termos técnicos fora do léxico sem mentir sobre a
origem. OOV sem sufixo reconhecido → `unknown`.

**Estágio 3 — Desambiguação por regras finitas (Constraint-Grammar-like).** Regras escritas à mão
que **REMOVEM** ou **SELECIONAM** readings pelo contexto local dos vizinhos. Cada regra:
- tem `ruleId` estável (entra no `Reading.ruleId` e é auditável);
- é aplicada em **ordem fixa**, iterando até ponto-fixo **determinístico** (sem depender de ordem de
  hash);
- só **reduz** o conjunto de readings, nunca inventa uma nova análise (não pode criar tag que o
  léxico não deu);
- é conservadora: na dúvida **não remove** (mantém a ambiguidade) — `precisão > recall` de novo.

Exemplos (ilustrativos): "após `DET`, token `NOUN|VERB` → SELECIONA `NOUN`" (*a casa* → casa=NOUN);
"após pronome sujeito reto → prefere `VERB`". Um reading que sobrou sozinho por regra é `resolved`,
não `certain` — o consumidor sabe que houve heurística no meio.

**Estágio 4 (fase posterior) — Chunking raso.** Autômato finito sobre a **sequência de tags** já
desambiguadas, marcando sintagmas nominais (NP) e verbais (VP). Habilita `long_preverbal_subject`,
`subject_verb_distance`. Também ambiguidade-consciente: onde a tag é `ambiguous`, o chunk fica
`incerto` e os detectores que o usam abstêm-se. Depende da qualidade do estágio 3 → vem depois.

**Todos os estágios preservam offsets** (a anotação referencia o token; nunca reescreve o texto) e
**não produzem findings** — a camada é só substrato; quem acusa é o pass.

---

## 8. Decisão D1 (em aberto, com recomendação) — de onde vem o dicionário

A restrição D0 exige um dicionário de formas plenas do PT-BR. **De onde?**

- **Opção 1 — reusar léxico aberto existente** (linhagem DELAF-PB/Unitex-PB; `apertium-por`;
  dicionário Hunspell `pt_BR` expandido). Cobertura enorme de graça; ecoa o "reusar, não
  reconstruir" do `CLAUDE.md` (que já manda reusar NILC-Metrix/Flesch-PT). **Risco:** licença (checar
  compatibilidade caso a caso) e a tensão com "auditável célula a célula" — um léxico de centenas de
  milhares de formas não é curado à mão.
- **Opção 2 — construir/curar próprio.** Auditável ao extremo, cobertura ridícula para uma língua
  inteira; inviável como base.

**Recomendação: híbrido.** Base = **léxico aberto, fixado por versão e hasheado** (dado, não lógica).
Por cima, uma **camada de override curada e própria** (mesmo espírito dos `participios-*` atuais),
governada por ADR, que corrige/estende o que o domínio exige. A auditabilidade se redefine
honestamente assim:
1. a **lógica** (estágios, regras, guesser) é auditável e testada;
2. o **léxico-base** é *pinado* (versão fixa), *hasheado no `configHash`*, e coberto por um **golden
   de anotação** (§9) — não se audita cada célula, audita-se a versão + o comportamento;
3. os **overrides** são curados à mão, com proveniência no README, como os léxicos de hoje.

Isso mantém a promessa "sem caixa-preta" (não há modelo opaco; há um dicionário inspecionável e
versionado) sem a fantasia de curar 300 mil formas à mão. **É a decisão que este doc quer fechar
antes de implementar.**

Sub-decisões atreladas: granularidade do tagset (coarse UD-like vs fino); quanta desambiguação
escrever no estágio 3 (começar com pouquíssimas regras de altíssima confiança); escopo do chunking.

---

## 9. Determinismo, auditabilidade e teste (o contrato)

- **Golden de anotação:** um conjunto de frases rotuladas à mão com a análise esperada por token.
  Snapshot **byte-idêntico** da anotação — qualquer não-determinismo é bug (mesma disciplina da
  Camada 1). Cobre os casos ambíguos canônicos (§5.3) para travar que a camada os **mantém**
  ambíguos, não que os resolve na sorte.
- **Meta-eval das regras de desambiguação:** cada regra do estágio 3 tem de **acertar** onde diz
  acertar e **não piorar** o resto; regressão quebra o build. Regra é dado versionado, como prompt
  na Camada 2.
- **Métrica de cobertura:** % de tokens `certain` / `resolved` / `ambiguous` / `guessed` / `unknown`
  no golden — mede o teto real da camada e vigia OOV.
- **Hash de dados no `configHash`:** versão do léxico-base + versão do conjunto de regras + overrides
  entram no hash; trocar qualquer um quebra snapshots de propósito (governança automática).
- **Cerca:** `test/boundary.test.ts` + depcheck garantem que `core` (incl. a camada) não importa
  `probe`/`report`/rede.

---

## 10. Custo e desempenho

- Lookup: O(1) por token (mapa/trie); anotar o documento inteiro é **O(n)** linear.
- Desambiguação: janela local de tamanho fixo por token, ponto-fixo com nº de passes limitado → O(n).
- Memória: dicionário de formas plenas é grande; mitigar com **trie/FST compilado** e carregamento
  único. **Lazy build** garante custo zero quando nenhum pass ativo pede anotação.
- Nada superlinear. Custo nunca é o gargalo — o gargalo é a curadoria de dados/regras.

---

## 11. Fases de entrega (incremental, cada fase destrava detectores nomeados)

- **Fase A — Léxico + traços + guesser (sem desambiguação).** Só `certain`/`guessed`/`unknown`
  (sem `resolved`, sem estágio 3). Detectores que só precisam de traço **inequívoco** já rodam:
  `adverb_mente_overuse`, `abstract_suffix_density`, `heavy_verb_periphrasis`, `mesoclisis`,
  `gerundism` ganham base morfológica limpa. Passes existentes **não** migram ainda.
- **Fase B — Desambiguação (estágio 3) + `resolved`.** Regras finitas de alta confiança. Destrava
  a faixa que precisa distinguir NOUN/VERB, particípio/adjetivo: aqui `passive-voice` **poderia**
  migrar seus léxicos de exclusão para regras (ADR de migração, com golden), deduplicando de vez.
- **Fase C — Chunking raso (estágio 4).** Destrava `long_preverbal_subject`, `subject_verb_distance`,
  `subordination_depth`, `ambiguous_pronoun`. É o topo do teto sintático.

Cada fase é um ou mais ADRs; nenhuma reabre a arquitetura — só adiciona estágio/dado.

---

## 12. O que esta camada destrava (mapa para o catálogo)

Da faixa 🟡 do `DESIGN-camada1-teto-deterministico.md`, passam a ser viáveis **com precisão** (antes
eram frágeis ou impossíveis sem morfologia): `long_preverbal_subject`, `subject_verb_distance`,
`subordination_depth`, `embedded_clause_interruption`, `ambiguous_pronoun`, `heavy_verb_periphrasis`,
`agreement_error` (fase futura, difícil), além de dar base mais limpa a `passive_voice`,
`nominalization`, `abstract_suffix_density`, `adverb_mente_overuse`.

**Não destrava (continua 🔴):** correferência real, topicalidade, relevância, usabilidade. A camada
dá *classe e traço*; ela não dá *sentido*. O teto continua onde o design anterior o cravou — a
Camada 1 mede a **demanda estrutural**, nunca certifica compreensão.

---

## 13. Riscos e decisões em aberto

1. **D1 — fonte do dicionário** (§8): a decisão de fundo. Licença + a redefinição honesta de
   "auditável" (versão pinada + golden + overrides, não curadoria célula a célula).
2. **Ambiguidade residual alta:** se poucas regras resolvem pouco, muitos tokens ficam `ambiguous`
   e os detectores de alta precisão abstêm-se muito → recall baixo. Mitiga-se investindo no estágio
   3 aos poucos, medido pela métrica de cobertura (§9). Aceitável: melhor abster do que errar.
3. **Tensão de migração dos passes atuais:** consumir a camada pode mudar a saída de `passive-voice`.
   Não migrar de imediato; migração é ADR com atualização de golden. A camada é aditiva primeiro.
4. **Explosão de dados/regras:** léxico + overrides + regras multiplicam a superfície de curadoria.
   O data registry (versão + hash + golden) é o mecanismo de governança; sem ele, não começar.
5. **Granularidade do tagset e escopo do chunking:** decisões de calibração, melhor fechar com os
   primeiros detectores reais em mãos (co-desenhar dado e consumidor).

---

## 14. Próximos ADRs que este desenho gera

- **ADR — Fonte do dicionário morfológico** (fecha D1: léxico-base + overrides + licença).
- **ADR — Modelo de anotação** (`Reading`/`TokenAnnotation`/`Certainty`; tagset; esquema de traços).
- **ADR — Pipeline de anotação Fase A** (lookup + guesser; sem desambiguação).
- **ADR — Desambiguação Fase B** (formato de regra, ordem/ponto-fixo, `ruleId`, meta-eval).
- **ADR — Integração `AnnotatedDocument` + `annotationDeps` + lazy build + hash no `configHash`.**
- **ADR — Chunking raso Fase C.**
- **ADR (futuro) — Migração do `passive-voice` para consumir a camada** (com golden atualizado).

---

### Resumo em uma frase

Um dicionário de formas plenas (reusado, pinado, hasheado) + regras de desambiguação finitas e
auditáveis anotam cada token com `readings` que **expõem a ambiguidade em vez de mascará-la**; os
detectores consomem via uma **escada de certeza** que transforma `precisão > recall` em abstenção
automática — subindo o teto sintático da Camada 1 sem jamais trocar auditabilidade por cobertura.
