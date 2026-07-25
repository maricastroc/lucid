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

- **`stamp`** — `(lucidVersion, localeId, configHash, dataHash, goldenHash)`. Sem ela o número é
  alegação, não medida: é o que permite reproduzir. O `dataHash` cobre **todos** os datasets do
  registro, não só os usados pelos critérios avaliados. O `goldenHash` cobre o corpus: a medição
  depende do golden tanto quanto do motor — declarar uma limitação nova muda o recall publicado
  sem tocar em config nem em dado, e sem esse hash dois artefatos discordantes seriam
  indistinguíveis.
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
- **`method.caveats`** — os limites do método, como dado. O mais importante: **recall de critério
  de cobertura `curated` é circular** (os positivos do golden vêm do mesmo léxico que o detector
  consulta), então ele mede "o código lê a própria lista", não "o instrumento acha o fenômeno na
  língua".

## Sem timestamp

O artefato é **byte-idêntico** para o mesmo código e o mesmo dado — a promessa de determinismo da
Camada 1 estendida à própria medição. A identidade da rodada é a tripla da estampa, não o relógio;
a data está no histórico do git.

Nada aqui vem da Camada 2 (sonda/LLM): é tudo determinístico e offline.
