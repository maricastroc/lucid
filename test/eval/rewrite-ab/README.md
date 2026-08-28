# A/B do prompt de reescrita

Harness da rodada do **ADR-089**. Compara prompts de reescrita sobre o corpus público, com
métricas determinísticas offline e amostra cega para julgamento humano.

**Nada aqui é produção.** `src/report/rewrite` é importado só para a linha de base;
`REWRITE_PROMPT_VERSION` continua `rewrite@2`.

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
AB_STAGE2=1 AB_WINNER=iaris@v20+briefing npx vitest run test/eval/rewrite-ab/ab.test.ts
```
Etapa 2 — o mesmo prompt com documento inteiro × janela de ±1, ±2 e ±3 parágrafos. **Não
executada** até hoje. Só o contexto do prompt muda: a verificação continua com o documento
inteiro, porque `no_new_findings`, `no_invented_first_person` e `possible_invented_agent` são
globais por definição (`eval/rewrite-context.json`).

```bash
AB_REPORT=1 npx vitest run test/eval/rewrite-ab/ab.test.ts
AB_FINAL=1 AB_FINALISTS="iaris@v20+briefing,iaris@v20-porta" npx vitest run test/eval/rewrite-ab/ab.test.ts
```
Pontuação e relatórios. **Offline, zero chamadas** — reexecutar não custa nada. `AB_REPORT`
escreve as tabelas dos sete braços e a amostra cega; `AB_FINAL` abre a anatomia do veto de duas
finalistas, refaz as métricas sobre os pares completos e monta o duelo cego.

## Rede — o que a rodada aprendeu na marra

- **Cota diária existe.** Groq `on_demand` = 200.000 tokens/dia **por modelo**. Checar a cota
  antes de subir o teto do experimento. O runner para na primeira cota diária: nenhuma espera
  dentro da corrida recupera isso.
- **Rodar sob `caffeinate -i`, em blocos com teto próprio.** A máquina suspende e o
  `AbortSignal.timeout` dorme junto — uma chamada chegou a marcar 33 min com mediana real de
  2,5s. Em blocos, uma suspensão custa um bloco, nunca a corrida.
- **Resposta salva nunca é repetida; linha com erro sempre é.** Terminal truncado não é motivo
  para chamar de novo; queda de provedor não é resultado.

## Arquivos

| | |
|---|---|
| `targets.ts` | seleção determinística dos alvos, com a regra escrita por extenso |
| `candidates.ts` | os construtores de prompt e o registro dos candidatos |
| `briefing.ts` | os achados da engine renderizados como briefing |
| `iaris-baseline.ts` | a v20 da IAris copiada byte a byte, com `INCOMPATIBLE` e `PATCHED` |
| `iaris-drift.test.ts` | falha se a cópia divergir da fonte; pula sem o repo vizinho |
| `fidelity.ts` | métricas offline: referência jurídica, relação entre normas, marcadores deônticos, as regras que a IAris declara sobre si |
| `score.ts` | verificação determinística + estrutura ADR-088 + round-trip `.docx` |
| `veto-anatomy.ts` | abre o `veto%` por prova, sem transformar veto em não-veto |
| `report.ts` | agregação, recorte balanceado, amostra cega e duelo de duas |
| `runner.ts` | rede: teto, reaproveitamento, parada por cota |

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
