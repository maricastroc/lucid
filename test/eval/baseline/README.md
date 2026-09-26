# Baseline do gemini-2.5-flash

Fotografia do sistema de reescrita do Lucid como ele está, gravada antes da perda de acesso ao
`gemini-2.5-flash` (o Google restringiu os modelos 2.5 a quem já os usava em 18/09/2026). Serve de
referência pareada para avaliar sucessores (`gemini-3.8-flash`, talvez `gemini-3.5-flash-lite`).

**Nada aqui muda a produção.** O harness usa as classes de produção sem alterá-las:
`GeminiProvider`, `LlmRewriteProposer`, `LlmComprehensionProbe`, `parseRewrite`, `parseProbeResult` e
`verifyRewrite`. A instrumentação vive toda neste diretório: `recorder.ts` envolve o `fetch` global e
grava, por tentativa, o `generationConfig` enviado, o `finishReason`, o `usageMetadata` completo, o
`modelVersion`, o status HTTP e a latência. Headers nunca são gravados.

## O que roda

| suíte      | prompt                                |                                                                                     alvos | rodadas |
| ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------: | ------: |
| `rewrite`  | `rewrite@6` (braço `lucid@v5` do A/B) |                                      157 parágrafos do corpus v1 (`loadEvalTargets(500)`) |       2 |
| `directed` | `directed@4`                          | 44 desses parágrafos, os que têm um achado em que a UI pergunta o agente (`asksForAgent`) |       2 |
| `probe`    | `probe@1`                             |                                                   27 casos de `test/eval/probe-golden.ts` |       2 |

Ordem: rodada 1 inteira (rewrite → directed → probe), depois a rodada 2.

- `rewrite`: `criterion` e `focus` são os do primeiro achado do parágrafo; o briefing é o conjunto de
  achados que cruzam o parágrafo, como `generateRewrite` faz sem declaração.
- `directed`: a declaração é `{ agent: null }` ("manter impessoal") no ponto em foco. É a única resposta
  que o avaliador pode dar sem inventar um agente, então `declared_agent_present` não é exercitado.
- A sonda não roda dentro das reescritas (`meaning_preserved`), como no A/B. Ela é medida à parte.

## Como rodar

```bash
BASELINE_PLAN=1 npx vitest run --project engine test/eval/baseline/baseline.test.ts -t "plan and cost"
```

Plano e custo estimado. **Zero chamadas.**

```bash
caffeinate -i env BASELINE_RUN=1 npx vitest run --project engine test/eval/baseline/baseline.test.ts -t "paid run"
```

Execução paga. Antes de cada chamada, o runner confere se o gasto acumulado mais o pior caso da chamada
(entrada a 2,5 caracteres por token, saída no teto de `maxOutputTokens`) fica abaixo de US$ 1,90; a cada
10 chamadas, projeta o total pelo uso observado. Para ao primeiro 400/401/403/404 e em cota diária.
Retomável: chave com resposta válida não é chamada de novo; chave com erro é.

```bash
BASELINE_REPORT=1 npx vitest run --project engine test/eval/baseline/baseline.test.ts -t "report"
```

Relatório. **Offline, zero chamadas.** Reexecutar não custa nada.

## Saídas em `eval/baseline-gemini-2.5-flash/`

| arquivo                      | conteúdo                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stamp.json`                 | commit, régua (`lucidVersion`/`dataHash`/`configHash`), hash de cada arquivo do harness e do corpus, modelo, preços, parâmetros, seleção de alvos, trava de custo             |
| `calls.jsonl`                | uma linha por chamada, só acrescentada: prompt (hash e tamanho), resposta crua, `finishReason`, uso de tokens, `generationConfig` enviado, tentativas, erros, latência, custo |
| `report.md`                  | tabelas: operação, veredito com as opções de produção, tabelas do A/B, variação entre rodadas, meta-eval da sonda                                                             |
| `summary.json`               | os mesmos números, para comparar com sucessores                                                                                                                               |
| `para-leitura.md`            | propostas com sinal heurístico levantado ou ilegíveis, com original e proposta                                                                                                |
| `tentativa-chave-free-tier/` | a primeira tentativa, com a chave Free Tier: 404 na primeira chamada, custo zero                                                                                              |

O teste sempre ativo deste diretório garante que cada prompt planejado é, byte a byte, o que a produção
envia, e, enquanto a régua for a mesma, que cada prompt gravado ainda é reconstruído igual.
