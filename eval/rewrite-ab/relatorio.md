# A/B da reescrita — Etapa 1

## LIMITAÇÃO DECLARADA: um modelo só (`gemini-2.5-flash`)

Este relatório compara PROMPTS com o modelo fixo. Ele **não** mostra que um prompt é o
melhor em geral — mostra qual é o melhor para este modelo. O segundo braço
(`openai/gpt-oss-120b`) foi abandonado por cota diária do provedor esgotada, com a
baseline da IAris em 1 e 0 respostas de 20: naquele modelo não havia com o que comparar.

Que a diferença entre modelos é real, e não hipótese: nos dados parciais do Groq o
`rewrite@2` preservou número em 83% dos casos, contra 25% no Gemini. Um vencedor eleito
aqui vale para o Gemini até que o outro braço seja refeito.

**Recorte das tabelas:** 14 alvos em que TODOS os candidatos responderam (de 20 com alguma resposta). Comparar candidatos sobre
conjuntos de alvos diferentes deixaria um alvo fácil inflar quem por acaso o pegou. A visão
sem esse recorte vem no fim, com o n de cada braço.

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                                       |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| --------------------------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| ab-A@1 · gemini-2.5-flash                     |  14 |      57 |       100 |                 0 |                       43 |                  7 |                           43 |                       86 |
| ab-B@1 · gemini-2.5-flash                     |  14 |      79 |       100 |                 0 |                       21 |                  7 |                           36 |                       86 |
| ab-C@1 · gemini-2.5-flash                     |  14 |      50 |       100 |                 0 |                       50 |                  7 |                           36 |                       79 |
| iaris@v20-porta · gemini-2.5-flash            |  14 |      93 |       100 |                 0 |                        0 |                  7 |                           29 |                       57 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  14 |     100 |       100 |                 0 |                        0 |                  7 |                           36 |                       57 |
| iaris@v20+briefing · gemini-2.5-flash         |  14 |     100 |       100 |                 0 |                        0 |                  7 |                           29 |                       64 |
| rewrite@2 · gemini-2.5-flash                  |  14 |      29 |       100 |                 0 |                       71 |                  7 |                           36 |                       93 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                                       |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| --------------------------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| ab-A@1 · gemini-2.5-flash                     |  14 |         100 |          5.9/7.0 |    57 |                3.6 → 2.1 |             14 |        -1.5 |            14 |                              0.3 |
| ab-B@1 · gemini-2.5-flash                     |  14 |         100 |          6.2/7.0 |    43 |                3.6 → 2.0 |             14 |        -1.5 |            14 |                              0.4 |
| ab-C@1 · gemini-2.5-flash                     |  14 |         100 |          5.9/7.0 |    64 |                3.6 → 2.2 |             14 |        -1.4 |            14 |                              0.3 |
| iaris@v20-porta · gemini-2.5-flash            |  14 |         100 |          6.3/7.0 |    64 |                3.6 → 2.2 |              0 |        -1.3 |             0 |                              0.2 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  14 |         100 |          6.1/7.0 |    43 |                3.6 → 2.4 |             21 |        -1.1 |            21 |                              0.3 |
| iaris@v20+briefing · gemini-2.5-flash         |  14 |         100 |          6.1/7.0 |    43 |                3.6 → 2.6 |             21 |        -1.0 |            21 |                              0.3 |
| rewrite@2 · gemini-2.5-flash                  |  14 |         100 |          5.8/7.0 |    79 |                3.6 → 2.0 |             14 |        -1.5 |            14 |                              0.4 |

### 6b. As regras que a IAris declara sobre si — medidas igual para todos

| Sistema                                       |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| --------------------------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| ab-A@1 · gemini-2.5-flash                     |  14 |            7% |           7 |                 0 |                          1.0 → 0.5 |                          1.4 |                     0.6 |                  0 |            0 |
| ab-B@1 · gemini-2.5-flash                     |  14 |           10% |          21 |                 0 |                          1.0 → 0.4 |                          1.9 |                     0.4 |                  0 |            0 |
| ab-C@1 · gemini-2.5-flash                     |  14 |           11% |           7 |                 0 |                          1.0 → 0.6 |                          1.1 |                     0.4 |                  0 |            0 |
| iaris@v20-porta · gemini-2.5-flash            |  14 |            8% |           0 |                 0 |                          1.0 → 0.7 |                          1.3 |                     0.4 |                  0 |           21 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  14 |           11% |           0 |                 0 |                          1.0 → 0.8 |                          0.9 |                     0.5 |                  0 |            0 |
| iaris@v20+briefing · gemini-2.5-flash         |  14 |            9% |           0 |                 0 |                          1.0 → 0.7 |                          0.7 |                     0.5 |                  0 |            0 |
| rewrite@2 · gemini-2.5-flash                  |  14 |           10% |           7 |                 0 |                          1.0 → 0.2 |                          2.8 |                     0.1 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                                       | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| --------------------------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| ab-A@1 · gemini-2.5-flash                     |    14 |        0 |        0 |               0 | —                 | —                 |
| ab-B@1 · gemini-2.5-flash                     |    14 |        0 |        0 |               0 | —                 | —                 |
| ab-C@1 · gemini-2.5-flash                     |    14 |        0 |        0 |               0 | —                 | —                 |
| iaris@v20-porta · gemini-2.5-flash            |     3 |       11 |        0 |               0 | —                 | 11 ok / 0 quebrou |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |     1 |       13 |        0 |               0 | —                 | 13 ok / 0 quebrou |
| iaris@v20+briefing · gemini-2.5-flash         |     2 |       12 |        0 |               0 | —                 | 12 ok / 0 quebrou |
| rewrite@2 · gemini-2.5-flash                  |    14 |        0 |        0 |               0 | —                 | —                 |

### 8. Custo

| Sistema                                       | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| --------------------------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| ab-A@1 · gemini-2.5-flash                     |                 1867 |                  87 |         27348 |               5370 |    20931 |         0 |         0 |     0 |
| ab-B@1 · gemini-2.5-flash                     |                 1961 |                  89 |         28701 |               9801 |    35306 |         0 |         0 |     0 |
| ab-C@1 · gemini-2.5-flash                     |                 2233 |                  89 |         32509 |               5896 |    28879 |         0 |         0 |     0 |
| iaris@v20-porta · gemini-2.5-flash            |                 4794 |                  94 |         68424 |               4016 |    11193 |         0 |         0 |     0 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |                 5087 |                  94 |         72533 |               5241 |    21159 |         0 |         0 |     0 |
| iaris@v20+briefing · gemini-2.5-flash         |                 4807 |                  93 |         68602 |               3093 |     8412 |         0 |         0 |     0 |
| rewrite@2 · gemini-2.5-flash                  |                 1711 |                  88 |         25179 |               9445 |    26344 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **ab-A@1 · gemini-2.5-flash** — numbers_preserved=6, target_resolved=5, no_new_findings=2, region_improved=2
- **ab-B@1 · gemini-2.5-flash** — target_resolved=4, numbers_preserved=3, no_new_findings=2, region_improved=2
- **ab-C@1 · gemini-2.5-flash** — numbers_preserved=7, target_resolved=5, no_new_findings=2, region_improved=2
- **iaris@v20-porta · gemini-2.5-flash** — target_resolved=9, numbers_preserved=1
- **iaris@v20+briefing+lista@2 · gemini-2.5-flash** — target_resolved=6, no_new_findings=3, region_improved=3
- **iaris@v20+briefing · gemini-2.5-flash** — target_resolved=6, no_new_findings=3, region_improved=3
- **rewrite@2 · gemini-2.5-flash** — numbers_preserved=10, target_resolved=3, no_new_findings=2, region_improved=2

### Critérios introduzidos na região, por critério

- **ab-A@1 · gemini-2.5-flash** — passive_voice=4
- **ab-B@1 · gemini-2.5-flash** — passive_voice=3, paragraph_length=2
- **ab-C@1 · gemini-2.5-flash** — passive_voice=3, passiva_sintetica=1
- **iaris@v20-porta · gemini-2.5-flash** — passive_voice=3
- **iaris@v20+briefing+lista@2 · gemini-2.5-flash** — passive_voice=4
- **iaris@v20+briefing · gemini-2.5-flash** — passive_voice=3, nominalization=1
- **rewrite@2 · gemini-2.5-flash** — passive_voice=4, paragraph_length=1

---

## Sem o recorte balanceado (n desigual, para conferência)

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                                       |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| --------------------------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| ab-A@1 · gemini-2.5-flash                     |  16 |      56 |       100 |                 0 |                       44 |                  6 |                           44 |                       81 |
| ab-B@1 · gemini-2.5-flash                     |  15 |      80 |       100 |                 0 |                       20 |                  7 |                           40 |                       80 |
| ab-C@1 · gemini-2.5-flash                     |  15 |      53 |       100 |                 0 |                       47 |                  7 |                           33 |                       80 |
| iaris@v20-porta · gemini-2.5-flash            |  20 |      95 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |
| iaris@v20+briefing · gemini-2.5-flash         |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       60 |
| rewrite@2 · gemini-2.5-flash                  |  20 |      20 |       100 |                 0 |                       80 |                  5 |                           30 |                       85 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                                       |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| --------------------------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| ab-A@1 · gemini-2.5-flash                     |  16 |         100 |          5.9/7.0 |    63 |                3.8 → 2.1 |             13 |        -1.7 |            13 |                              0.3 |
| ab-B@1 · gemini-2.5-flash                     |  15 |         100 |          6.2/7.0 |    47 |                3.7 → 2.1 |             13 |        -1.6 |            13 |                              0.3 |
| ab-C@1 · gemini-2.5-flash                     |  15 |         100 |          5.9/7.0 |    67 |                3.7 → 2.2 |             13 |        -1.6 |            13 |                              0.3 |
| iaris@v20-porta · gemini-2.5-flash            |  20 |         100 |          6.3/7.0 |    60 |                3.7 → 2.5 |              5 |        -1.2 |             5 |                              0.3 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  20 |         100 |          6.2/7.0 |    50 |                3.7 → 2.2 |             15 |        -1.4 |            15 |                              0.3 |
| iaris@v20+briefing · gemini-2.5-flash         |  20 |         100 |          6.3/7.0 |    45 |                3.7 → 2.2 |             15 |        -1.4 |            15 |                              0.2 |
| rewrite@2 · gemini-2.5-flash                  |  20 |         100 |          5.8/7.0 |    85 |                3.7 → 2.0 |             10 |        -1.7 |            10 |                              0.3 |

### 6b. As regras que a IAris declara sobre si — medidas igual para todos

| Sistema                                       |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| --------------------------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| ab-A@1 · gemini-2.5-flash                     |  16 |            7% |           6 |                 0 |                          1.0 → 0.6 |                          1.3 |                     0.6 |                  0 |            0 |
| ab-B@1 · gemini-2.5-flash                     |  15 |           10% |          20 |                 0 |                          1.0 → 0.5 |                          1.9 |                     0.4 |                  0 |            0 |
| ab-C@1 · gemini-2.5-flash                     |  15 |           10% |           7 |                 0 |                          1.0 → 0.7 |                          1.0 |                     0.5 |                  0 |            0 |
| iaris@v20-porta · gemini-2.5-flash            |  20 |            8% |           0 |                 0 |                          1.0 → 0.7 |                          1.1 |                     0.3 |                  0 |           15 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  20 |            8% |           0 |                 0 |                          1.0 → 0.8 |                          0.9 |                     0.5 |                  0 |            0 |
| iaris@v20+briefing · gemini-2.5-flash         |  20 |            8% |           0 |                 0 |                          1.0 → 0.7 |                          0.8 |                     0.5 |                  0 |            0 |
| rewrite@2 · gemini-2.5-flash                  |  20 |            6% |           5 |                 0 |                          1.0 → 0.2 |                          2.5 |                     0.1 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                                       | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| --------------------------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| ab-A@1 · gemini-2.5-flash                     |    16 |        0 |        0 |               0 | —                 | —                 |
| ab-B@1 · gemini-2.5-flash                     |    15 |        0 |        0 |               0 | —                 | —                 |
| ab-C@1 · gemini-2.5-flash                     |    15 |        0 |        0 |               0 | —                 | —                 |
| iaris@v20-porta · gemini-2.5-flash            |     5 |       15 |        0 |               0 | —                 | 15 ok / 0 quebrou |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |     1 |       19 |        0 |               0 | —                 | 19 ok / 0 quebrou |
| iaris@v20+briefing · gemini-2.5-flash         |     4 |       16 |        0 |               0 | —                 | 16 ok / 0 quebrou |
| rewrite@2 · gemini-2.5-flash                  |    20 |        0 |        0 |               0 | —                 | —                 |

### 8. Custo

| Sistema                                       | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| --------------------------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| ab-A@1 · gemini-2.5-flash                     |                 1829 |                  89 |         30696 |               4923 |    20931 |         0 |         0 |     0 |
| ab-B@1 · gemini-2.5-flash                     |                 1908 |                  91 |         29995 |               9230 |    35306 |         0 |         0 |     0 |
| ab-C@1 · gemini-2.5-flash                     |                 2245 |                  90 |         35026 |               5945 |    28879 |         0 |         0 |     0 |
| iaris@v20-porta · gemini-2.5-flash            |                 4942 |                  91 |        100664 |               3435 |    11193 |         0 |         0 |     0 |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |                 5239 |                  91 |        106601 |               4542 |    21159 |         0 |         0 |     0 |
| iaris@v20+briefing · gemini-2.5-flash         |                 4959 |                  91 |        100998 |               2780 |     8412 |         0 |         0 |     0 |
| rewrite@2 · gemini-2.5-flash                  |                 1859 |                  83 |         38847 |               8040 |    26344 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **ab-A@1 · gemini-2.5-flash** — numbers_preserved=7, target_resolved=7, no_new_findings=2, region_improved=2
- **ab-B@1 · gemini-2.5-flash** — target_resolved=5, numbers_preserved=3, no_new_findings=2, region_improved=2
- **ab-C@1 · gemini-2.5-flash** — numbers_preserved=7, target_resolved=6, no_new_findings=2, region_improved=2
- **iaris@v20-porta · gemini-2.5-flash** — target_resolved=12, no_new_findings=1, numbers_preserved=1, region_improved=1
- **iaris@v20+briefing+lista@2 · gemini-2.5-flash** — target_resolved=10, no_new_findings=3, region_improved=3
- **iaris@v20+briefing · gemini-2.5-flash** — target_resolved=9, no_new_findings=3, region_improved=3
- **rewrite@2 · gemini-2.5-flash** — numbers_preserved=16, target_resolved=4, no_new_findings=2, region_improved=2

### Critérios introduzidos na região, por critério

- **ab-A@1 · gemini-2.5-flash** — passive_voice=4
- **ab-B@1 · gemini-2.5-flash** — passive_voice=3, paragraph_length=2
- **ab-C@1 · gemini-2.5-flash** — passive_voice=3, passiva_sintetica=1
- **iaris@v20-porta · gemini-2.5-flash** — passive_voice=5, nominalization=1
- **iaris@v20+briefing+lista@2 · gemini-2.5-flash** — passive_voice=4, leitor_terceira_pessoa=1
- **iaris@v20+briefing · gemini-2.5-flash** — passive_voice=3, nominalization=1
- **rewrite@2 · gemini-2.5-flash** — passive_voice=6, paragraph_length=1
