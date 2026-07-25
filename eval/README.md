# Eval do Lucid — o instrumento medindo a si mesmo

`report.json` é o artefato de avaliação do motor determinístico, gerado por:

```bash
npm run eval
```

O cálculo mora em [`test/eval/compute.ts`](../test/eval/compute.ts) e é **fonte única**: os testes
de eval assertam sobre o mesmo retorno que este arquivo serializa. Não existe segunda
implementação para uma página divergir do CI — se o número publicado estiver errado, o teste
quebra junto.

## Como ler

- **`schemaVersion`** — versão da FORMA deste arquivo (não do motor; esse é `stamp.lucidVersion`).
  Quem consome lê isto antes de interpretar o resto: mudança incompatível de forma incrementa o
  número, em vez de quebrar o consumidor em silêncio.
- **`stamp`** — `(lucidVersion, localeId, configHash, dataHash, goldenHash)`. Sem ela o número é
  alegação, não medida: é o que permite reproduzir. O `dataHash` cobre **todos** os datasets do
  registro, não só os usados pelos critérios avaliados. O `goldenHash` cobre o corpus: a medição
  depende do golden tanto quanto do motor — declarar uma limitação nova muda o recall publicado
  sem tocar em config nem em dado, e sem esse hash dois artefatos discordantes seriam
  indistinguíveis.

  **Limite conhecido da estampa:** nenhum dos hashes cobre o **código-fonte** dos passes.
  `lucidVersion` é declarada à mão, então duas rodadas de código diferente sob a mesma versão têm
  estampa idêntica (verificado empiricamente). É por isso que o guard de drift compara **byte a
  byte** em vez de confiar na estampa.

- **`precision` / `recall` / `exactRate`** — `null` quando não há denominador (o detector não teve
  oportunidade de acertar nem de errar). **Nunca `1`**: fabricar 100% seria o mesmo erro do
  `fleschPt: 0` corrigido no ADR-066, e no melhor ponto da escala. `tp`/`fp`/`fn` estão sempre lá
  para o número ser recalculável.
- **`detectors[]`** — precisão/recall por critério, com `negatives` (quantos casos exigem que o
  detector **não** dispare) e `knownLimitations` (falsos positivos/negativos conhecidos, com
  motivo). Limitação conhecida **conta contra** a métrica em vez de ser excluída.
- **`criteriaCoverage`** — as três camadas de evidência, **derivadas dos dados**: critério novo
  sem eval aparece automaticamente em `unitTestsOnly`.
  - `measured` — precisão/recall contra golden com casos negativos.
  - `goldenLabelledOnly` — findings exatos rotulados no golden integrado, sem métrica agregada.
  - `unitTestsOnly` — só teste unitário. Teste unitário é escrito a partir da implementação e
    **não mede recall** sobre texto que ninguém antecipou. Ausência de número não é ausência de
    defeito.
- **`method.caveats`** — os limites do método, como dado **endereçável** (`{ id, text }`), para a
  página poder destacar ou linkar cada um. O mais importante é `circular_recall_curated`: **recall
  de critério de cobertura `curated` é circular** (os positivos do golden vêm do mesmo léxico que o
  detector consulta), então ele mede "o código lê a própria lista", não "o instrumento acha o
  fenômeno na língua".

## O artefato não pode ficar velho

[`test/eval/artifact-drift.test.ts`](../test/eval/artifact-drift.test.ts) roda na suíte normal
(sem flag, sem git) e falha se este arquivo divergir do que o código produz agora — dizendo qual
campo da estampa mudou, ou que a estampa é igual e o que mudou foi conteúdo medido. Mexeu em golden
ou em pass? Rode `npm run eval` e commite o resultado.

Em CI, o equivalente de uma linha é:

```bash
npm run eval && git diff --exit-code eval/report.json
```

## Sem timestamp

O artefato é **byte-idêntico** para o mesmo código e o mesmo dado — a promessa de determinismo da
Camada 1 estendida à própria medição. A identidade da rodada é a tripla da estampa, não o relógio;
a data está no histórico do git.

Nada aqui vem da Camada 2 (sonda/LLM): é tudo determinístico e offline.
