# A/B do prompt de reescrita

Harness de A/B do prompt de reescrita. Compara prompts sobre o corpus público, com
métricas determinísticas offline e amostra cega para julgamento humano.

**Nada aqui é produção.** `src/report/rewrite` é importado para construir os braços; o prompt
que sai hoje é o `rewrite@4` (`src/report/rewrite/prompt-v4.ts`).

## Como rodar

Cada bloco é ligado por variável de ambiente e todos são pulados no `npm test`.

```bash
AB_PLAN=1 npx vitest run test/eval/rewrite-ab/ab.test.ts
```

Mostra alvos, critérios do briefing, chamadas planejadas e teto. **Zero chamadas.**

```bash
caffeinate -i env AB=1 npx vitest run test/eval/rewrite-ab/ab.test.ts
```

Etapa 1 — roda os candidatos. `AB_CANDIDATES` e `AB_MODELS` estreitam o braço;
`AB_MAX_CALLS` e `AB_MAX_TOKENS` mudam o teto. Ver **Rede** abaixo.

```bash
AB_STAGE2=1 AB_WINNER=lucid@v2 npx vitest run test/eval/rewrite-ab/ab.test.ts
```

Etapa 2 — o mesmo prompt com documento inteiro × janela de ±1, ±2 e ±3 parágrafos. **Não
executada** até hoje. Só o contexto do prompt muda: a verificação continua com o documento
inteiro, porque `no_new_findings`, `no_invented_first_person` e `possible_invented_agent` são
globais por definição (`eval/rewrite-context.json`).

```bash
AB_REPORT=1 npx vitest run test/eval/rewrite-ab/ab.test.ts
AB_FINAL=1 AB_FINALISTS="lucid@v1,lucid@v2" npx vitest run test/eval/rewrite-ab/ab.test.ts
```

Pontuação e relatórios. **Offline, zero chamadas** — reexecutar não custa nada. `AB_REPORT`
escreve as tabelas dos sete braços e a amostra cega; `AB_FINAL` abre a anatomia do veto de duas
finalistas, refaz as métricas sobre os pares completos e monta o duelo cego.

## Rede — o que a rodada aprendeu na marra

- **Um provedor só.** O Lucid fala com o Gemini (ADR-097). O runner para na primeira cota diária:
  nenhuma espera dentro da corrida recupera isso.
- **Rodar sob `caffeinate -i`, em blocos com teto próprio.** A máquina suspende e o
  `AbortSignal.timeout` dorme junto — uma chamada chegou a marcar 33 min com mediana real de
  2,5s. Em blocos, uma suspensão custa um bloco, nunca a corrida.
- **Resposta salva nunca é repetida; linha com erro sempre é.** Terminal truncado não é motivo
  para chamar de novo; queda de provedor não é resultado.

## Arquivos

|                      |                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `targets.ts`         | seleção determinística dos alvos, com a regra escrita por extenso                                             |
| `candidates.ts`      | os construtores de prompt e o registro dos candidatos                                                         |
| `briefing.ts`        | os achados da engine renderizados como briefing                                                               |
| `lucid-v1-frozen.ts` | o texto exato do braço `lucid@v1`, congelado para a medição continuar reproduzível                            |
| `fidelity.ts`        | métricas offline: referência jurídica, relação entre normas, marcadores deônticos, inchaço e divisão de frase |
| `score.ts`           | verificação determinística + estrutura ADR-088 + round-trip `.docx`                                           |
| `veto-anatomy.ts`    | abre o `veto%` por prova, sem transformar veto em não-veto                                                    |
| `report.ts`          | agregação, recorte balanceado, amostra cega e duelo de duas                                                   |
| `runner.ts`          | rede: teto, reaproveitamento, parada por cota                                                                 |

Saídas em `eval/rewrite-ab/`: `runs.jsonl` (chamadas cruas), `relatorio.md`, `final-*.md`,
`duelo-*.md` e as chaves das amostras cegas.

## Regras que não podem cair

- **A verificação sempre vê o documento inteiro**, mesmo quando o prompt vê uma janela.
- **A sonda fica fora do A/B**: não é determinística, triplicaria as chamadas e nunca produz
  aprovação. Sentido é julgado pela amostra cega.
- **A amostra cega esconde o rótulo do prompt, não o modelo.** O modelo é fixo dentro de cada
  bloco — a única variável é o prompt. A ordem vem de embaralhamento determinístico do
  identificador do bloco; nada de `Math.random`.
- **Nenhum candidato vence por peso de detector menor.** A decisão passa por fidelidade, provas,
  estrutura e preferência humana.
