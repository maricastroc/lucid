# Experimentos

Um ADR registra uma **decisão**. Um experimento registra uma **medição** — inclusive, e principalmente, quando o número é desfavorável ao projeto.

Existe porque a disciplina que o `eval/report.json` já aplica aos detectores (limitação declarada conta *contra* a métrica; `precision` nunca é `1`; `recall` é `null` quando não há denominador) não tinha onde se aplicar às afirmações que o projeto faz sobre **si mesmo**. Uma promessa de README sem número é uma promessa; com número é uma medida, e às vezes a medida contradiz a promessa. É esse o material daqui.

## O que entra

- Hipótese testada e **rejeitada**, com o motivo medido.
- Afirmação do projeto que a medição **desmentiu**.
- Limite declarado qualitativamente que ganhou tamanho.
- Caminho investigado e **não** seguido, com o custo de segui-lo.

Resultado confirmatório entra também, mas só quando a confirmação era duvidosa antes. "Testei e funcionou como eu esperava" não é experimento; é teste unitário, e o lugar dele é `test/`.

## Formato

Todo documento diz, nesta ordem:

1. **O que mede** — e, explicitamente, **o que deliberadamente não mede**. Sem isso o leitor generaliza o resultado para além do que ele suporta.
2. **Método** — reprodutível por quem não escreveu o documento.
3. **Resultado** — o número, antes da interpretação.
4. **Conclusão** — incluindo o que ela custa ao projeto.
5. **O que continua em aberto.**

## Regra dura: número publicado aqui é número travado em teste

Nenhum valor entra num documento destes sem um teste que o recompute e falhe quando ele deixar de ser verdade. Um experimento que envelhece em silêncio é pior que experimento nenhum: ele empresta autoridade de medição a uma afirmação que já não vale. Cada documento nomeia o arquivo de teste que o sustenta.

## Índice

| # | Experimento | Resultado |
|---|---|---|
| [001](001-cobertura-depende-da-estrutura-declarada.md) | A cobertura da auditoria depende do recipiente do documento? | Depende da **estrutura declarada**, não do recipiente — e o relatório não dizia. Corrigido no [ADR-084](../decisoes/adr-084-cobertura-condicionada-ao-documento.md) |
