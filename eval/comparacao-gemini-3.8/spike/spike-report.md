# Teste de contrato · gemini-3.8-flash

Chamadas: 15 · custo observado US$ 0.0481

| chamada | nível | max | resultado | finishReason | entrada | saída | raciocínio | partes | legível | veto / provas | latência (ms) | US$ |
|---|---|--:|---|---|--:|--:|--:|---|---|---|--:|--:|
| rewrite·planalto-leis__1989-1994-l7992.txt#653-809 | low | 2048 | ok | STOP | 3808 | 42 | 0 | text+thoughtSignature | ok | veto target_resolved | 1618 | 0.00301 |
| rewrite·planalto-leis__1989-1994-l8022.txt#3160-3546 | low | 2048 | ok | STOP | 4997 | 131 | 0 | text+thoughtSignature | ok | veto target_resolved | 1687 | 0.00424 |
| rewrite·planalto-leis__1989-1994-l7992.txt#811-1030 | low | 2048 | ok | STOP | 3896 | 62 | 0 | text+thoughtSignature | ok | veto target_resolved | 988 | 0.00315 |
| rewrite·planalto-leis__1989-1994-l7992.txt#653-809 | medium | 2048 | ok | STOP | 3808 | 48 | 1966 | text+thoughtSignature | ok | sem veto  | 7513 | 0.01041 |
| rewrite·planalto-leis__1989-1994-l8022.txt#3160-3546 | medium | 2048 | ok | MAX_TOKENS | 4997 | 76 | 1965 | text+thoughtSignature | unparseable | veto target_resolved | 7227 | 0.01140 |
| rewrite·planalto-leis__1989-1994-l7992.txt#811-1030 | medium | 2048 | ok | STOP | 3896 | 69 | 1963 | text+thoughtSignature | ok | veto target_resolved | 8576 | 0.01054 |
| directed·planalto-leis__1989-1994-l7992.txt#811-1030 | low | 2048 | ok | STOP | 815 | 53 | 0 | text+thoughtSignature | ok | sem veto  | 1153 | 0.00081 |
| probe·casos-nao-enumerados | low | 512 | ok | STOP | 388 | 61 | 0 | text+thoughtSignature | ok | — | 933 | 0.00052 |
| probe·claro-prazo | low | 512 | ok | STOP | 394 | 57 | 0 | text+thoughtSignature | ok | — | 1060 | 0.00051 |
| probe·casos-nao-enumerados | medium | 512 | ok | STOP | 388 | 61 | 394 | text+thoughtSignature | ok | — | 2226 | 0.00200 |
| probe·claro-prazo | medium | 512 | ok | STOP | 394 | 57 | 253 | text+thoughtSignature | ok | — | 1781 | 0.00146 |
| contract·corpo-de-producao-do-2.5 | — | 256 | ok | STOP | 20 | 5 | 0 | text+thoughtSignature | ok | — | 946 | 0.00003 |
| contract·temperature-com-thinkingLevel | — | 256 | ok | STOP | 20 | 5 | 0 | text+thoughtSignature | ok | — | 954 | 0.00003 |
| contract·thinkingLevel-minimal | — | 256 | erro 400 | — | — | — | — | — | — | — | 236 | 0.00000 |
| contract·thinkingLevel-e-thinkingBudget | — | 256 | erro 400 | — | — | — | — | — | — | — | 365 | 0.00000 |

## Erros e respostas do contrato

- **corpo-de-producao-do-2.5** (contrato): ok · HTTP 200 · finishReason STOP · resposta "{\"ok\": true}"
- **temperature-com-thinkingLevel** (contrato): ok · HTTP 200 · finishReason STOP · resposta "{\"ok\": true}"
- **thinkingLevel-minimal** (contrato): error · HTTP 400 · INVALID_ARGUMENT: Thinking level MINIMAL is not supported for this model. Please retry with other thinking level.
- **thinkingLevel-e-thinkingBudget** (contrato): error · HTTP 400 · INVALID_ARGUMENT: You can only set only one of thinking budget and thinking level.

## Projeção da bateria completa (k = 3, 684 chamadas)

Tokens de entrada por caractere no 3.8, medidos no spike: 0.2843.

- **low · saída pela média**: US$ 2.65 (preço de 2026) · US$ 5.31 (preço de 2027) — rewrite 471 chamadas × 78 tok de saída → US$ 2.30; directed 132 chamadas × 53 tok de saída → US$ 0.31; probe 81 chamadas × 59 tok de saída → US$ 0.04
- **low · saída pela máximo observado**: US$ 2.75 (preço de 2026) · US$ 5.49 (preço de 2027) — rewrite 471 chamadas × 131 tok de saída → US$ 2.39; directed 132 chamadas × 53 tok de saída → US$ 0.31; probe 81 chamadas × 61 tok de saída → US$ 0.04
- **medium · saída pela média**: US$ 7.17 (preço de 2026) · US$ 14.35 (preço de 2027) — rewrite 471 chamadas × 2029 tok de saída → US$ 5.75; directed 132 chamadas × 2029 tok de saída → US$ 1.29; probe 81 chamadas × 383 tok de saída → US$ 0.14
- **medium · saída pela máximo observado**: US$ 7.22 (preço de 2026) · US$ 14.45 (preço de 2027) — rewrite 471 chamadas × 2041 tok de saída → US$ 5.77; directed 132 chamadas × 2041 tok de saída → US$ 1.30; probe 81 chamadas × 455 tok de saída → US$ 0.16
