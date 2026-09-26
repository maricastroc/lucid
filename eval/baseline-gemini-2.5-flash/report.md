# Baseline · gemini-2.5-flash · rewrite@6

Commit `78ce2e515c801589355f30382b3fc52580dd4524` (feat/rewrite-card-order) · régua {"lucidVersion":"0.1.0","dataHash":"a7ae67e2","configHash":"4c2da7fd"} · criado em 2026-09-26T16:14:53.492Z.
Fotografia do sistema como está, para comparar sucessores. **Nada aqui é aprovação**: veto% é a taxa de propostas barradas pelo verificador determinístico, e ausência de veto não é qualidade.

## Operação e custo (todas as linhas gravadas, inclusive erros e repetições)

Linhas gravadas em calls.jsonl: 684 · chaves distintas: 684 · custo total US$ 1.2012

**rewrite · rodada 1**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 157 | 157 | 0 | 157 | 0 | STOP=157 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 6479 | 84 / 225 | 0 | 1199 / 1130 / 1772 / 2325 | 0.3380 |

**rewrite · rodada 2**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 157 | 157 | 0 | 157 | 0 | STOP=157 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 6479 | 84 / 225 | 0 | 1135 / 1078 / 1649 / 2497 | 0.3380 |

**rewrite · rodada 3**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 157 | 157 | 0 | 157 | 0 | STOP=157 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 6479 | 84 / 224 | 0 | 1181 / 1110 / 1678 / 2451 | 0.3381 |

**directed · rodada 1**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 44 | 44 | 0 | 44 | 0 | STOP=44 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 3343 | 90 / 220 | 0 | 1148 / 1078 / 1828 / 2098 | 0.0540 |

**directed · rodada 2**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 44 | 44 | 0 | 44 | 0 | STOP=44 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 3343 | 89 / 220 | 0 | 1087 / 1004 / 1576 / 3099 | 0.0539 |

**directed · rodada 3**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 44 | 44 | 0 | 44 | 0 | STOP=44 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 3343 | 90 / 220 | 0 | 1126 / 1067 / 1613 / 1709 | 0.0540 |

**probe · rodada 1**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 27 | 27 | 0 | 27 | 0 | STOP=27 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 391 | 77 / 177 | 0 | 1021 / 912 / 1713 / 2672 | 0.0083 |

**probe · rodada 2**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 27 | 27 | 0 | 27 | 0 | STOP=27 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 391 | 77 / 177 | 0 | 888 / 827 / 1286 / 1326 | 0.0084 |

**probe · rodada 3**

| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |
|--:|--:|--:|--:|--:|---|--:|--:|
| 27 | 27 | 0 | 27 | 0 | STOP=27 | 0 | 0 |

| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |
|--:|--:|--:|--:|--:|
| 391 | 77 / 177 | 0 | 1060 / 938 / 2089 / 2854 | 0.0083 |

generationConfig distintos observados: rewrite: {"temperature":0,"maxOutputTokens":2048,"responseMimeType":"application/json","thinkingConfig":{"thinkingBudget":0}} · directed: {"temperature":0,"maxOutputTokens":2048,"responseMimeType":"application/json","thinkingConfig":{"thinkingBudget":0}} · probe: {"temperature":0,"maxOutputTokens":512,"responseMimeType":"application/json","thinkingConfig":{"thinkingBudget":0}}

modelVersion observados: gemini-2.5-flash=684

## Veredito com as opções exatas de produção

`rewrite`: `criterion` e `focus` do primeiro achado, sem `findings`, como `generateRewrite` faz sem declaração. `directed`: `findings` = achados do parágrafo, `declarations` = manter impessoal no ponto em foco.

| Sistema | n | reescreveu% | provas OK (méd.) | veto% | provas reprovadas | sinais levantados | com aviso ao autor |
|---|--:|--:|--:|--:|---|---|--:|
| rewrite · r1 | 157 | 100 | 6.1/7.0 | 56 | target_resolved=86, no_new_findings=27, region_improved=27, numbers_preserved=1 | entities_preserved=28, possible_invented_obligation=21, possible_category_narrowed=1 | 0 |
| rewrite · r2 | 157 | 100 | 6.1/7.0 | 55 | target_resolved=85, no_new_findings=28, region_improved=28, numbers_preserved=1 | entities_preserved=29, possible_invented_obligation=22, possible_category_narrowed=1 | 0 |
| rewrite · r3 | 157 | 100 | 6.1/7.0 | 56 | target_resolved=86, no_new_findings=26, region_improved=26, numbers_preserved=1 | entities_preserved=29, possible_invented_obligation=21, possible_category_narrowed=1 | 0 |
| directed · r1 | 44 | 100 | 4.7/7.0 | 100 | target_resolved=36, numbers_preserved=33, no_new_findings=16, region_improved=16 | entities_preserved=33, possible_category_narrowed=2, possible_invented_obligation=2 | 1 |
| directed · r2 | 44 | 100 | 4.7/7.0 | 100 | target_resolved=35, numbers_preserved=32, no_new_findings=18, region_improved=18 | entities_preserved=33, possible_category_narrowed=2, possible_invented_obligation=2 | 1 |
| directed · r3 | 44 | 100 | 4.6/7.0 | 100 | target_resolved=36, numbers_preserved=32, no_new_findings=19, region_improved=19 | entities_preserved=33, possible_category_narrowed=2, possible_invented_obligation=2 | 1 |

## Tabelas do A/B (mesma pontuação de test/eval/rewrite-ab, comparável ao relatorio.md)

Atenção: a verificação do A/B passa `findings` e não passa `focus`, então o veto daqui difere do veto de produção acima. Fidelidade, estilo e estrutura não dependem disso.

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema | n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| directed@4 · r1 · gemini-2.5-flash | 44 | 25 | 100 | 2 | 70 | 2 | 27 | 75 |
| directed@4 · r2 · gemini-2.5-flash | 44 | 27 | 100 | 2 | 68 | 2 | 27 | 75 |
| directed@4 · r3 · gemini-2.5-flash | 44 | 27 | 100 | 2 | 68 | 2 | 25 | 75 |
| rewrite@6 · r1 · gemini-2.5-flash | 157 | 99 | 100 | 0 | 1 | 1 | 24 | 18 |
| rewrite@6 · r2 · gemini-2.5-flash | 157 | 99 | 100 | 0 | 1 | 1 | 25 | 18 |
| rewrite@6 · r3 · gemini-2.5-flash | 157 | 99 | 100 | 0 | 1 | 1 | 23 | 18 |

### 4–6. Provas, veto, peso e achados novos

| Sistema | n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| directed@4 · r1 · gemini-2.5-flash | 44 | 100 | 4.8/7.0 | 91 | 2.6 → 3.0 | 36 | 0.4 | 36 | 0.1 |
| directed@4 · r2 · gemini-2.5-flash | 44 | 100 | 4.8/7.0 | 91 | 2.6 → 3.0 | 41 | 0.4 | 41 | 0.2 |
| directed@4 · r3 · gemini-2.5-flash | 44 | 100 | 4.7/7.0 | 91 | 2.6 → 3.0 | 43 | 0.4 | 43 | 0.1 |
| rewrite@6 · r1 · gemini-2.5-flash | 157 | 100 | 6.1/7.0 | 57 | 1.7 → 1.4 | 17 | -0.3 | 17 | 0.3 |
| rewrite@6 · r2 · gemini-2.5-flash | 157 | 100 | 6.1/7.0 | 56 | 1.7 → 1.4 | 18 | -0.3 | 18 | 0.3 |
| rewrite@6 · r3 · gemini-2.5-flash | 157 | 100 | 6.1/7.0 | 57 | 1.7 → 1.4 | 17 | -0.3 | 17 | 0.3 |

### 6b. Inchaço, divisão de frase e marcação — medidas igual para todos

| Sistema | n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| directed@4 · r1 · gemini-2.5-flash | 44 | -2% | 0 | 0 | 1.0 → 1.0 | 0.5 | 0.5 | 0 | 0 |
| directed@4 · r2 · gemini-2.5-flash | 44 | -3% | 0 | 0 | 1.0 → 1.0 | 0.5 | 0.5 | 0 | 0 |
| directed@4 · r3 · gemini-2.5-flash | 44 | -2% | 0 | 0 | 1.0 → 1.0 | 0.5 | 0.5 | 0 | 0 |
| rewrite@6 · r1 · gemini-2.5-flash | 157 | 2% | 1 | 0 | 1.0 → 0.6 | 1.2 | 0.1 | 0 | 4 |
| rewrite@6 · r2 · gemini-2.5-flash | 157 | 2% | 1 | 0 | 1.0 → 0.6 | 1.2 | 0.1 | 0 | 3 |
| rewrite@6 · r3 · gemini-2.5-flash | 157 | 2% | 1 | 0 | 1.0 → 0.6 | 1.2 | 0.1 | 0 | 4 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive |
|---|--:|--:|--:|--:|---|---|
| directed@4 · r1 · gemini-2.5-flash | 44 | 0 | 0 | 0 | — | — |
| directed@4 · r2 · gemini-2.5-flash | 44 | 0 | 0 | 0 | — | — |
| directed@4 · r3 · gemini-2.5-flash | 44 | 0 | 0 | 0 | — | — |
| rewrite@6 · r1 · gemini-2.5-flash | 103 | 54 | 0 | 0 | — | 54 ok / 0 quebrou |
| rewrite@6 · r2 · gemini-2.5-flash | 102 | 55 | 0 | 0 | — | 55 ok / 0 quebrou |
| rewrite@6 · r3 · gemini-2.5-flash | 103 | 54 | 0 | 0 | — | 54 ok / 0 quebrou |

### 8. Custo

| Sistema | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| directed@4 · r1 · gemini-2.5-flash | 3343 | 90 | 151031 | 1148 | 1828 | 0 | 0 | 0 |
| directed@4 · r2 · gemini-2.5-flash | 3343 | 89 | 151003 | 1087 | 1576 | 0 | 0 | 0 |
| directed@4 · r3 · gemini-2.5-flash | 3343 | 90 | 151032 | 1126 | 1613 | 0 | 0 | 0 |
| rewrite@6 · r1 · gemini-2.5-flash | 6479 | 84 | 1030362 | 1199 | 1772 | 0 | 0 | 0 |
| rewrite@6 · r2 · gemini-2.5-flash | 6479 | 84 | 1030364 | 1135 | 1649 | 0 | 0 | 0 |
| rewrite@6 · r3 · gemini-2.5-flash | 6479 | 84 | 1030393 | 1181 | 1678 | 0 | 0 | 0 |

### Provas reprovadas, por prova

- **directed@4 · r1 · gemini-2.5-flash** — numbers_preserved=33, target_resolved=32, no_new_findings=16, region_improved=16
- **directed@4 · r2 · gemini-2.5-flash** — numbers_preserved=32, target_resolved=32, no_new_findings=18, region_improved=18
- **directed@4 · r3 · gemini-2.5-flash** — numbers_preserved=32, target_resolved=32, no_new_findings=19, region_improved=19
- **rewrite@6 · r1 · gemini-2.5-flash** — target_resolved=86, no_new_findings=27, region_improved=27, directed_findings_resolved=3, numbers_preserved=1
- **rewrite@6 · r2 · gemini-2.5-flash** — target_resolved=85, no_new_findings=28, region_improved=28, directed_findings_resolved=3, numbers_preserved=1
- **rewrite@6 · r3 · gemini-2.5-flash** — target_resolved=86, no_new_findings=26, region_improved=26, directed_findings_resolved=3, numbers_preserved=1

### Critérios introduzidos na região, por critério

- **directed@4 · r1 · gemini-2.5-flash** — subordinacao_densa=3, adverbios_vagos=2
- **directed@4 · r2 · gemini-2.5-flash** — adverbios_vagos=3, subordinacao_densa=3, sigla_sem_expansao=1
- **directed@4 · r3 · gemini-2.5-flash** — adverbios_vagos=3, subordinacao_densa=3
- **rewrite@6 · r1 · gemini-2.5-flash** — passive_voice=38, passiva_sintetica=3, adverbios_vagos=1, leitor_terceira_pessoa=1
- **rewrite@6 · r2 · gemini-2.5-flash** — passive_voice=39, passiva_sintetica=4, adverbios_vagos=1, leitor_terceira_pessoa=1
- **rewrite@6 · r3 · gemini-2.5-flash** — passive_voice=38, passiva_sintetica=4, adverbios_vagos=1, leitor_terceira_pessoa=1, single_item_list=1

## Variação entre as rodadas (temperature 0, 3 rodadas)

| Suíte | par | itens | texto idêntico | mesmo veto | mesmas provas reprovadas | Jaccard médio de palavras |
|---|---|--:|--:|--:|--:|--:|
| rewrite | r1×r2 | 157 | 110 (70%) | 154 (98%) | 154 (98%) | 0.959 |
| rewrite | r1×r3 | 157 | 116 (74%) | 155 (99%) | 152 (97%) | 0.970 |
| rewrite | r2×r3 | 157 | 105 (67%) | 154 (98%) | 151 (96%) | 0.955 |
| directed | r1×r2 | 44 | 31 (70%) | 44 (100%) | 41 (93%) | 0.953 |
| directed | r1×r3 | 44 | 33 (75%) | 44 (100%) | 41 (93%) | 0.957 |
| directed | r2×r3 | 44 | 36 (82%) | 44 (100%) | 42 (95%) | 0.969 |

| Suíte | itens | texto idêntico nas 3 | veredito unânime | provas reprovadas unânimes | vetado por maioria |
|---|--:|--:|--:|--:|--:|
| rewrite | 157 | 87 (55%) | 153 (97%) | 150 (96%) | 87 (55%) |
| directed | 44 | 28 (64%) | 44 (100%) | 40 (91%) | 44 (100%) |

Itens sem veredito unânime (rewrite), veredito por rodada:
- `planalto-leis__1989-1994-l8022.txt#1620-1894`: r1 veto(target_resolved) · r2 sem veto · r3 veto(target_resolved)
- `planalto-leis__1989-1994-l8010.txt#550-915`: r1 sem veto · r2 veto(target_resolved+region_improved+no_new_findings) · r3 sem veto
- `planalto-leis__1989-1994-l8022.txt#847-1071`: r1 sem veto · r2 sem veto · r3 veto(target_resolved)
- `planalto-leis__1989-1994-l7999.txt#13979-14415`: r1 veto(target_resolved) · r2 sem veto · r3 sem veto

## Meta-eval da sonda (probe@1)

| Rodada | n | TP | FN | FP | TN | recall | precisão | acurácia | autocontradições | ilegíveis | truncados | erros |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| r1 | 27 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | 0 | 0 | 0 |
| r2 | 27 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | 0 | 0 | 0 |
| r3 | 27 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | 0 | 0 | 0 |

Estabilidade: 27 casos com as 3 rodadas · mesmo sinal (flag/neutro) em todas: 27 · resposta idêntica em todas: 22. Maioria 2/3: recall 0.83 · precisão 1.00 · acurácia 0.96.

r1 por categoria (concordam/total): agente_omitido=1/1, carga_extraivel=3/3, claro=3/3, condicao_nomeada=15/15, fato_ausente=1/2, inferencia_exigida=1/1, negacao_aninhada=1/1, referente_ambiguo=1/1
r1 discordâncias: casos-nao-enumerados · autocontradições: —

r2 por categoria (concordam/total): agente_omitido=1/1, carga_extraivel=3/3, claro=3/3, condicao_nomeada=15/15, fato_ausente=1/2, inferencia_exigida=1/1, negacao_aninhada=1/1, referente_ambiguo=1/1
r2 discordâncias: casos-nao-enumerados · autocontradições: —

r3 por categoria (concordam/total): agente_omitido=1/1, carga_extraivel=3/3, claro=3/3, condicao_nomeada=15/15, fato_ausente=1/2, inferencia_exigida=1/1, negacao_aninhada=1/1, referente_ambiguo=1/1
r3 discordâncias: casos-nao-enumerados · autocontradições: —

## Casos para leitura humana

Sinais heurísticos levantados, propostas ilegíveis e vereditos que viraram estão em `para-leitura.md`.
