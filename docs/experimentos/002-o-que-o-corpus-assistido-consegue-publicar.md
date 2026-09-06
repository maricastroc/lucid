# 002 — O que o corpus assistido consegue publicar sobre texto que ninguém escreveu para o detector?

> Escrito em 06/09/2026, ao ligar a faixa `measuredAssisted` ao artefato de eval, e **fechado no
> mesmo dia**, depois da revisão humana que ele próprio identificou como pendente.
>
> A pergunta nasceu do próprio `eval/report.json`: a ressalva `circular_recall_curated` diz, desde
> sempre, que "recall honesto exige rotular documento real, cego ao léxico". O corpus foi construído
> para isso. A pergunta é o que ele consegue publicar quando ligado.
>
> **Resposta curta:** **1 de 3** critérios atravessa o portão, e o que ele publica é uma **ausência**,
> não uma taxa. Os outros dois estão retidos por concordância entre rotuladores abaixo do piso — e
> **isso não pode ser destravado por revisão**, o que foi a descoberta mais útil da medição. Ver §4.
>
> Teste que trava **todo número deste documento**:
> [`test/eval/experimento-002.test.ts`](../../test/eval/experimento-002.test.ts) — cada `it` cita a
> seção que sustenta. As invariantes de publicação da faixa ficam em
> [`test/eval/assisted-corpus.test.ts`](../../test/eval/assisted-corpus.test.ts) e
> [`test/eval/assisted-rate.test.ts`](../../test/eval/assisted-rate.test.ts).

---

## 1. O que mede, e o que deliberadamente não mede

|              |                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mede**     | quantos critérios atravessam o portão de promoção · qual portão cada um falha · se a revisão humana pendente muda esse quadro · o que a concordância entre rotuladores diz sobre o critério                |
| **Não mede** | se os detectores estão **corretos** (isso é `test/`) · precisão ou recall dos dois critérios retidos — é exatamente o que o portão recusou publicar · qualquer coisa sobre a sonda: nenhum número vem dela |

## 2. Método

O `corpus:measure` roda os três passes sobre os trechos rotulados, calcula concordância e estratos, e
decide promoção. A projeção para o artefato (`test/eval/assisted-corpus.ts`) apenas **lê** o
`measurement.json` e aplica a regra de publicação — não recomputa nada.

Portão de promoção, tal como está no código:

```ts
promoted: !belowFloor && !stubbed && !auditMissing && randomRows.length > 0;
```

Quatro condições, todas necessárias. `belowFloor` compara o **AC1 de Gwet** contra o piso de `0,7`
declarado no manifesto; `auditMissing` exige que alguém tenha revisado a amostra de auditoria do
consenso; `stubbed` barra corpus rotulado pelo provedor de demonstração; a última exige estrato
aleatório não vazio.

## 3. Resultado

Este documento foi escrito em **duas medições**, separadas por uma revisão humana de **1 item**.

### 3.1 Antes da revisão

```
critérios medidos    : 3
com métrica promovida: 0
medidos e retidos    : 3
```

Filas de revisão pendentes: **65 itens** (49 · 15 · 1).

| Critério             |   AC1 | κ de Cohen | pares | portão que falhou                      |
| -------------------- | ----: | ---------: | ----: | -------------------------------------- |
| `prose_enumeration`  | 1,000 |          — |    16 | consenso ainda não auditado por pessoa |
| `sigla_sem_expansao` | 0,558 |      0,464 |    36 | AC1 abaixo do piso de 0,7              |
| `perifrase_inflada`  | 0,321 |      0,314 |    82 | AC1 abaixo do piso de 0,7              |

### 3.2 Depois da revisão de 1 item

O item revisado foi `planalto-leis__1989-1994-l7994#0002`, rota `human_audit_sample`, **em cego**.
Veredito humano: `count: 0` — o modelo não errou.

```
critérios medidos    : 3
com métrica promovida: 1   ← prose_enumeration
medidos e retidos    : 2
```

`prose_enumeration`, promovido:

| estrato     | casos | negativos | tp · fp · fn | precisão | recall      |
| ----------- | ----: | --------: | ------------ | -------- | ----------- |
| aleatório   |    16 |        16 | 0 · 0 · 0    | —        | —           |
| enriquecido |     0 |         0 | 0 · 0 · 0    | —        | não se mede |

Auditoria do consenso: `n = 1`, `0` divergências, taxa de erro `0`.

Os outros dois não se moveram: AC1 é propriedade das corridas de modelo, e a revisão não a toca.

## 4. Conclusão

### 4.1 A revisão humana não move o AC1 — e descobrir isso valeu mais que o número

A concordância é calculada sobre os pares das duas corridas de modelo — `gemini-2.5-flash` ×
`openai/gpt-oss-120b` —, e a adjudicação humana entra **depois**, no rótulo consolidado. Dos 65 itens
que estavam na fila:

- **1 item** destravou a promoção de `prose_enumeration`, porque o portão de auditoria era o único que
  aquele critério ainda falhava;
- **os outros 64** melhoram a qualidade dos rótulos e movem os estratos, mas **não** levantam
  `sigla_sem_expansao` nem `perifrase_inflada` acima do piso.

Isso custou ao projeto a leitura confortável de que "é só terminar a revisão". Não é. Para aqueles
dois, as saídas honestas são outras: rotulador melhor, prompt melhor, ou a admissão de que o critério
não está bem definido o bastante para dois leitores independentes concordarem sobre ele.

**E essa é a leitura mais útil do número.** AC1 baixo entre dois rotuladores que nunca viram o detector
não é ruído de medição: é uma medida de **quão bem definido está o critério**. `perifrase_inflada` em
0,321 diz que dois leitores competentes, com a mesma definição na mão, discordam sobre o que conta como
perífrase inflada em ato oficial na maioria dos casos difíceis. Publicar uma precisão contra um padrão
de referência tão instável seria publicar um número mais preciso que o seu próprio denominador.

### 4.2 O que o critério promovido publica é uma ausência, não uma taxa

`prose_enumeration` atravessou o portão e mesmo assim **precisão e recall saem como `—`**: o detector
não disparou em nenhum dos 16 trechos aleatórios, e o rótulo — com o item auditado revisado em cego —
concorda que não devia. Sem disparo não há denominador; sem denominador não há taxa.

O achado é real e é o seguinte: **zero falso positivo em 16 trechos de lei federal que ninguém escreveu
pensando neste detector.** É modesto, é verdadeiro, e não vira precisão de 100% — que é exatamente o
erro que o ADR-069 proíbe.

Isso obrigou uma correção na interface, feita no mesmo dia: o selo dizia "métrica publicada" sobre dois
traços, o que lê como defeito ou como resultado vazio. O selo passou a dizer **"publicado"** — um fato
sobre o portão — e o cartão ganhou uma linha que enuncia o achado quando os dois denominadores estão
vazios.

### 4.3 O que a faixa publica de um critério retido

As contagens (`cases`, `negatives`, `tp`, `fp`, `fn`) e as estatísticas de concordância, com as **taxas
nuladas** e o motivo da retenção ao lado. Contagem é observação; taxa é afirmação, e a afirmação é
justamente o que o piso recusou. Os números completos continuam em `corpus/v1/measurement.json` para
quem discordar do piso e quiser recomputar.

### 4.4 O que isso custou ao README

A ressalva `circular_recall_curated` **continua de pé**. O corpus não a resolveu — ele a instrumentou, e
entregou um critério cujo resultado é uma ausência. A diferença entre "resolvida" e "instrumentada" é o
conteúdo deste documento, e o README diz isso em vez de anunciar cobertura que ninguém validou.

### 4.5 Uma correção de fato, feita junto

A nota `no_layer_2` afirmava que "nenhum dado deste artefato vem da Camada 2: é tudo determinístico e
offline". Com a faixa assistida no artefato isso passou a ser **falso pela metade**: a medição continua
determinística e offline, mas os **rótulos de referência** foram propostos por dois modelos. A nota foi
reescrita como distinção, não como negação — o detector nunca encontrou um modelo; encontrou o rótulo. O
rodapé da `/avaliacao` foi corrigido pelo mesmo motivo.

## 5. A previsão que este documento fez, e o que aconteceu

A versão escrita **antes** da revisão registrou, em §5.1, o que esperava que o item destravasse:

> _"O que ele vai publicar é modesto e verdadeiro: o detector ficou calado nos 15 trechos aleatórios e o
> rótulo concorda — `precision` e `recall` saem como `—` (sem denominador), e o resultado legível é zero
> falso positivo em 15 trechos de lei federal."_

**A forma acertou; o número errou por um.** O estrato aleatório publicou **16** casos, não 15 — porque o
trecho auditado passou a contar como rótulo humano e entrou no estrato, que antes tinha só os 15
consensuais. A revisão não apenas destravou o portão: ela **acrescentou um caso à medição**.

Vale registrar por quê: previsão sobre uma medição que ainda não rodou é palpite mesmo quando o mecanismo
é conhecido, e o erro veio de esquecer que a fila de auditoria e o corpus medido não são conjuntos
disjuntos.

## 6. O que continua em aberto

1. **O piso de 0,7 nunca foi justificado por medição**, só declarado no manifesto. Um piso arbitrário que
   barra dois de três critérios merece ou uma defesa ou uma revisão — e a revisão não pode ser feita
   depois de ver quais critérios ela promoveria.
2. **Se o AC1 baixo é do critério ou do rotulador**, ninguém separou. Um terceiro rotulador, ou o mesmo
   par com prompt reescrito, distinguiria "o critério é vago" de "o prompt é vago".
3. **A auditoria do consenso tem n = 1.** A taxa de erro publicada é `0`, e um denominador de 1 não
   sustenta quase nada. A `consensusAuditRate` de 5% sobre 15 consensuais dá exatamente 1 item — para o
   corpus atual, a política de amostragem produz uma auditoria simbólica.
4. **Os 64 itens restantes na fila** (49 de `perifrase_inflada`, 15 de `sigla_sem_expansao`) continuam sem
   revisão. Eles não promovem nada, mas mudam os estratos dos dois critérios retidos — e o
   `measurement.json` mede o que existe, não o que foi revisado.
5. **O estrato aleatório é pequeno** (9, 16 e 6 casos). Mesmo promovido, o intervalo de Wilson seria largo
   o bastante para não sustentar quase nenhuma afirmação — o que o intervalo já diria, se houvesse taxa a
   publicar.
