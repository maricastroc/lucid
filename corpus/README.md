# Corpus de avaliação assistida

Corpus de ato oficial federal para medir os detectores contra **texto que ninguém
escreveu para eles**. Racional completo em `docs/decisoes/adr-087`.

O `eval/report.json` já declara por que isto existe:

> `circular_recall_curated` — _"o número mede 'o código lê a própria lista', não 'o
> instrumento acha o fenômeno na língua'. **Recall honesto exige rotular documento
> real, cego ao léxico.**"_

Este corpus é a resposta a essa ressalva. A medição que ele produz **não** entra em
`measured` — vai para uma faixa própria, `measuredAssisted`, porque a supervisão é
de outra natureza.

---

## Os sete estágios

```
collect → extract → segment → label → reconcile → review → measure
  rede     texto     trechos   2 modelos  fila     pessoa   detector
                     + estratos independentes            (1ª e única vez)
```

```bash
npm run corpus:collect   -- --source planalto-leis --limit 20
npm run corpus:extract
npm run corpus:segment
npm run corpus:label     -- --criterion sigla_sem_expansao
npm run corpus:reconcile -- --criterion sigla_sem_expansao
npm run corpus:review    -- --criterion sigla_sem_expansao
npm run corpus:measure
```

Todo estágio é idempotente e retomável: rodar de novo continua de onde parou.
`--stub` no `label` exercita o pipeline inteiro sem chave de API — e o `measure`
**recusa publicar métrica** de corpus rotulado assim.

---

## A cerca

O detector encontra o corpus **uma única vez**, em `test/eval/corpus-measure.test.ts`,
depois de os rótulos estarem fechados. Nenhum arquivo de `scripts/corpus/` importa
pass, dataset ou motor — e isso não é disciplina, é build:

- `npm run depcheck` → regra `rotulagem-nao-ve-o-detector`
- `test/corpus/leakage.test.ts` → falha se um item de dataset aparecer num prompt

Se o rotulador visse a saída do detector, ele só saberia contestar o que o detector
achou e nunca apontar o que ele perdeu: o recall viraria inmensurável por construção.

---

## Os dois estratos

|                   | como entra                                    | o que se pode publicar                                       |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------ |
| **R** aleatório   | sorteio determinístico, sem olhar cue nenhuma | precisão **e recall**, mais a prevalência do fenômeno        |
| **E** enriquecido | casou a cue de superfície do critério         | **só precisão** — recall ali mediria a peneira, não a língua |

A cue é sempre **mais larga que o detector** (`test/corpus/strata.test.ts` verifica a
relação de superconjunto contra os passes reais) e independente dele: ela decide
quem entra no corpus, nunca qual é o rótulo.

O `segment` avisa quando uma cue casa mais de 90% dos blocos — nesse caso o estrato
E não enriquece nada sobre o aleatório, e gastar rotulagem ali é gasto sem retorno.

---

## Licença e dados pessoais

**Lei 9.610/98, art. 8º, IV:** leis, decretos, regulamentos e demais atos oficiais
**não são objeto de proteção como direitos autorais.** Não é uso justo nem
tolerância — está fora do regime. Só entra ato oficial publicado.

Dados pessoais, em duas linhas e nesta ordem:

1. **recorte por tipo de ato** — `denyPattern` exclui ato de pessoal (nomeação,
   exoneração, aposentadoria, benefício), que é onde mora CPF, nome e matrícula.
   Este é o controle principal;
2. **`countPii` como segunda linha**, com o limite que a ADR-086 fixou: _não achar
   nada não prova que não há_. Documento com detecção é **descartado, não mascarado**
   — mascarar mudaria o texto medido.

O repositório versiona **trecho + procedência + hash**, não o acervo: `corpus/raw/`
e `corpus/*/text/` ficam fora do git. Se a fonte alterar o documento, o `rawSha256`
denuncia em vez de a medição derivar calada.

---

## Split e selo

O split é atribuído **no documento**, nunca no trecho — trechos do mesmo ato
partilham vocabulário e redator, e dividir por trecho vaza estilo entre os lados.

`dev` é livre. **`test` é selado:** exige `LUCID_SEALED_EVAL=1` e cada execução fica
registrada em `test-runs.jsonl`. Não impede trapaça; torna visível.

---

## O que o número vai poder dizer

**Pode:** precisão e recall contra um padrão de referência por consenso de dois
modelos, com a taxa de erro da auditoria cega e o intervalo ao lado; recall sobre
texto **encontrado**, não autoral; prevalência do fenômeno em ato oficial;
concordância entre rotuladores como medida de quão bem definido está o critério.

**Não pode:** ser chamado de golden validado por humano (só o subconjunto revisado
é); somar `human` e `consensus` sem declarar a mistura; ser chamado de _ground
truth_; publicar recall do estrato E; publicar métrica de critério abaixo do piso de
concordância ou cujo consenso ninguém auditou — nos dois casos o `measurement.json`
traz `promoted: false` e o motivo.
