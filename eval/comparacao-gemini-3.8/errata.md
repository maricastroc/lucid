# Errata

## 1. Rótulo do dispositivo (`label.kept`) dependia de espaço em branco

**Onde:** `test/eval/compare/compare.ts`, verificação `label.kept`, usada em `relatorio-final.md`, `comparacao.json` e `aa-2.5.*`.

**O defeito:** o rótulo do original era comparado byte a byte com o início da proposta. O texto do corpus vem de PDF e traz
quebras de linha dentro do rótulo ("Art.\n19"). A proposta escreve "Art. 19". A comparação acusava rótulo perdido onde o
rótulo estava presente.

**A correção:** o rótulo e a proposta são comparados com espaço normalizado (`labelKept`), com teste para quebra de linha,
espaço duplo, rótulo ausente e rótulo trocado. Nenhuma chamada nova: os relatórios foram regerados a partir das respostas
gravadas.

**O que mudou:**

| suíte    | verificação              | antes (2.5 / 3.8, por rodada) | depois                    | classificação antes           | depois      |
| -------- | ------------------------ | ----------------------------- | ------------------------- | ----------------------------- | ----------- |
| rewrite  | `label.kept` (139 itens) | 106-105-107 / 101-101-101     | 139-139-139 / 139-139-139 | 4 regressões e 1 fraca do 3.8 | nenhuma     |
| directed | `label.kept` (42 itens)  | 1-1-1 / 24-23-24              | 1-1-1 / 33-32-32          | 23 melhoras do 3.8            | 32 melhoras |

Nenhum dos dois modelos perde o rótulo no `rewrite`. As 4 "regressões de rótulo" do 3.8 citadas na conclusão da bateria eram
artefato deste defeito. No `directed`, o 3.8 mantém o rótulo em mais itens do que o relatório dizia; o 2.5 continua perdendo
em 41 de 42.

**O que não mudou:** nenhuma outra verificação, nenhuma barreira obrigatória, a taxa de viradas, a sonda e a amostra da
leitura cega (`leitura-cega.md` e a chave são idênticos byte a byte aos lidos pela autora). A conclusão pelo protocolo
continua a mesma: as duas regressões fortes em `numbers_preserved` e as viradas acima de 5% não dependem do rótulo.
