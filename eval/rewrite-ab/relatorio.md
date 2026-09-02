# A/B da reescrita — Etapa 1

## LIMITAÇÃO DECLARADA: um modelo só (`gemini-2.5-flash`)

Este relatório compara PROMPTS com o modelo fixo. Ele **não** mostra que um prompt é o
melhor em geral — mostra qual é o melhor para este modelo. O segundo braço
O Lucid fala com um provedor só (ADR-097), então esta é a única leitura disponível —
e ela continua sendo sobre ESTE modelo, não sobre prompts em geral.

**Recorte das tabelas:** 14 alvos em que TODOS os candidatos responderam (de 20 com alguma resposta). Comparar candidatos sobre
conjuntos de alvos diferentes deixaria um alvo fácil inflar quem por acaso o pegou. A visão
sem esse recorte vem no fim, com o n de cada braço.

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                      |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| ---------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| ab-A@1 · gemini-2.5-flash    |  14 |      57 |       100 |                 0 |                       43 |                  7 |                           43 |                       86 |
| ab-B@1 · gemini-2.5-flash    |  14 |      79 |       100 |                 0 |                       21 |                  7 |                           36 |                       86 |
| ab-C@1 · gemini-2.5-flash    |  14 |      50 |       100 |                 0 |                       50 |                  7 |                           36 |                       79 |
| lucid@v1 · gemini-2.5-flash  |  14 |     100 |       100 |                 0 |                        0 |                  7 |                           36 |                       36 |
| lucid@v2 · gemini-2.5-flash  |  14 |     100 |       100 |                 0 |                        0 |                  7 |                           29 |                       57 |
| lucid@v3 · gemini-2.5-flash  |  14 |      93 |       100 |                 0 |                        7 |                  7 |                           36 |                       43 |
| lucid@v4 · gemini-2.5-flash  |  14 |     100 |       100 |                 0 |                        0 |                  7 |                           29 |                       43 |
| rewrite@2 · gemini-2.5-flash |  14 |      29 |       100 |                 0 |                       71 |                  7 |                           36 |                       93 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                      |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| ---------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| ab-A@1 · gemini-2.5-flash    |  14 |         100 |          5.9/7.0 |    57 |                2.2 → 1.7 |             14 |        -0.5 |            14 |                              0.3 |
| ab-B@1 · gemini-2.5-flash    |  14 |         100 |          6.1/7.0 |    50 |                2.2 → 1.6 |             21 |        -0.5 |            21 |                              0.4 |
| ab-C@1 · gemini-2.5-flash    |  14 |         100 |          5.7/7.0 |    64 |                2.2 → 1.9 |             21 |        -0.3 |            21 |                              0.3 |
| lucid@v1 · gemini-2.5-flash  |  14 |         100 |          5.9/7.0 |    57 |                2.2 → 1.9 |             29 |        -0.2 |            29 |                              0.2 |
| lucid@v2 · gemini-2.5-flash  |  14 |         100 |          6.6/7.0 |    21 |                2.2 → 1.4 |             14 |        -0.8 |            14 |                              0.4 |
| lucid@v3 · gemini-2.5-flash  |  14 |         100 |          6.6/7.0 |    29 |                2.2 → 0.9 |              7 |        -1.2 |             7 |                              0.3 |
| lucid@v4 · gemini-2.5-flash  |  14 |         100 |          6.5/7.0 |    36 |                2.2 → 1.6 |              7 |        -0.6 |             7 |                              0.4 |
| rewrite@2 · gemini-2.5-flash |  14 |         100 |          5.8/7.0 |    79 |                2.2 → 1.8 |             14 |        -0.4 |            14 |                              0.4 |

### 6b. Inchaço, divisão de frase e marcação — medidas igual para todos

| Sistema                      |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| ---------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| ab-A@1 · gemini-2.5-flash    |  14 |            7% |           7 |                 0 |                          1.0 → 0.5 |                          1.4 |                     0.6 |                  0 |            0 |
| ab-B@1 · gemini-2.5-flash    |  14 |           10% |          21 |                 0 |                          1.0 → 0.4 |                          1.9 |                     0.4 |                  0 |            0 |
| ab-C@1 · gemini-2.5-flash    |  14 |           11% |           7 |                 0 |                          1.0 → 0.6 |                          1.1 |                     0.4 |                  0 |            0 |
| lucid@v1 · gemini-2.5-flash  |  14 |            3% |           0 |                 0 |                          1.0 → 0.9 |                          0.9 |                     0.3 |                  0 |            0 |
| lucid@v2 · gemini-2.5-flash  |  14 |            7% |           0 |                 0 |                          1.0 → 0.2 |                          2.6 |                     0.3 |                  0 |            0 |
| lucid@v3 · gemini-2.5-flash  |  14 |            4% |           0 |                 0 |                          1.0 → 0.1 |                          2.6 |                     0.3 |                  0 |            7 |
| lucid@v4 · gemini-2.5-flash  |  14 |            8% |           0 |                 0 |                          1.0 → 0.4 |                          2.5 |                     0.3 |                  0 |            0 |
| rewrite@2 · gemini-2.5-flash |  14 |           10% |           7 |                 0 |                          1.0 → 0.2 |                          2.8 |                     0.1 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                      | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| ---------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| ab-A@1 · gemini-2.5-flash    |    14 |        0 |        0 |               0 | —                 | —                 |
| ab-B@1 · gemini-2.5-flash    |    14 |        0 |        0 |               0 | —                 | —                 |
| ab-C@1 · gemini-2.5-flash    |    14 |        0 |        0 |               0 | —                 | —                 |
| lucid@v1 · gemini-2.5-flash  |     5 |        9 |        0 |               0 | —                 | 9 ok / 0 quebrou  |
| lucid@v2 · gemini-2.5-flash  |     2 |       12 |        0 |               0 | —                 | 12 ok / 0 quebrou |
| lucid@v3 · gemini-2.5-flash  |     2 |       12 |        0 |               0 | —                 | 12 ok / 0 quebrou |
| lucid@v4 · gemini-2.5-flash  |     1 |       13 |        0 |               0 | —                 | 13 ok / 0 quebrou |
| rewrite@2 · gemini-2.5-flash |    14 |        0 |        0 |               0 | —                 | —                 |

### 8. Custo

| Sistema                      | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| ---------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| ab-A@1 · gemini-2.5-flash    |                 1867 |                  87 |         27348 |               5370 |    20931 |         0 |         0 |     0 |
| ab-B@1 · gemini-2.5-flash    |                 1961 |                  89 |         28701 |               9801 |    35306 |         0 |         0 |     0 |
| ab-C@1 · gemini-2.5-flash    |                 2233 |                  89 |         32509 |               5896 |    28879 |         0 |         0 |     0 |
| lucid@v1 · gemini-2.5-flash  |                 3695 |                  92 |         53017 |               1614 |     6261 |         0 |         0 |     0 |
| lucid@v2 · gemini-2.5-flash  |                 3858 |                  94 |         55329 |               1321 |     3546 |         0 |         0 |     0 |
| lucid@v3 · gemini-2.5-flash  |                 4533 |                  95 |         64786 |               3042 |    21939 |         0 |         0 |     0 |
| lucid@v4 · gemini-2.5-flash  |                 4770 |                  96 |         68115 |               3892 |    28689 |         0 |         0 |     0 |
| rewrite@2 · gemini-2.5-flash |                 1711 |                  88 |         25179 |               9445 |    26344 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **ab-A@1 · gemini-2.5-flash** — numbers_preserved=6, target_resolved=5, no_new_findings=2, region_improved=2
- **ab-B@1 · gemini-2.5-flash** — target_resolved=4, no_new_findings=3, numbers_preserved=3, region_improved=3
- **ab-C@1 · gemini-2.5-flash** — numbers_preserved=7, target_resolved=5, no_new_findings=3, region_improved=3
- **lucid@v1 · gemini-2.5-flash** — target_resolved=8, no_new_findings=4, region_improved=4
- **lucid@v2 · gemini-2.5-flash** — no_new_findings=2, region_improved=2, target_resolved=2
- **lucid@v3 · gemini-2.5-flash** — target_resolved=2, no_new_findings=1, numbers_preserved=1, region_improved=1
- **lucid@v4 · gemini-2.5-flash** — target_resolved=5, no_new_findings=1, region_improved=1
- **rewrite@2 · gemini-2.5-flash** — numbers_preserved=10, target_resolved=3, no_new_findings=2, region_improved=2

### Critérios introduzidos na região, por critério

- **ab-A@1 · gemini-2.5-flash** — passive_voice=4
- **ab-B@1 · gemini-2.5-flash** — passive_voice=3, paragraph_length=2
- **ab-C@1 · gemini-2.5-flash** — passive_voice=3, passiva_sintetica=1
- **lucid@v1 · gemini-2.5-flash** — passive_voice=3
- **lucid@v2 · gemini-2.5-flash** — passive_voice=3, paragraph_length=1, passiva_sintetica=1
- **lucid@v3 · gemini-2.5-flash** — passive_voice=3, passiva_sintetica=1
- **lucid@v4 · gemini-2.5-flash** — passive_voice=6
- **rewrite@2 · gemini-2.5-flash** — passive_voice=4, paragraph_length=1

---

## Sem o recorte balanceado (n desigual, para conferência)

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                      |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| ---------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| ab-A@1 · gemini-2.5-flash    |  16 |      56 |       100 |                 0 |                       44 |                  6 |                           44 |                       81 |
| ab-B@1 · gemini-2.5-flash    |  15 |      80 |       100 |                 0 |                       20 |                  7 |                           40 |                       80 |
| ab-C@1 · gemini-2.5-flash    |  15 |      53 |       100 |                 0 |                       47 |                  7 |                           33 |                       80 |
| lucid@v1 · gemini-2.5-flash  |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           40 |                       35 |
| lucid@v2 · gemini-2.5-flash  |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |
| lucid@v3 · gemini-2.5-flash  |  20 |      95 |       100 |                 0 |                        5 |                  5 |                           40 |                       45 |
| lucid@v4 · gemini-2.5-flash  |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           30 |                       40 |
| rewrite@2 · gemini-2.5-flash |  20 |      20 |       100 |                 0 |                       80 |                  5 |                           30 |                       85 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                      |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| ---------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| ab-A@1 · gemini-2.5-flash    |  16 |         100 |          5.9/7.0 |    63 |                2.3 → 1.7 |             13 |        -0.6 |            13 |                              0.3 |
| ab-B@1 · gemini-2.5-flash    |  15 |         100 |          6.1/7.0 |    53 |                2.2 → 1.7 |             20 |        -0.5 |            20 |                              0.3 |
| ab-C@1 · gemini-2.5-flash    |  15 |         100 |          5.7/7.0 |    67 |                2.2 → 1.9 |             20 |        -0.4 |            20 |                              0.3 |
| lucid@v1 · gemini-2.5-flash  |  20 |         100 |          6.0/7.0 |    60 |                2.2 → 1.7 |             20 |        -0.5 |            20 |                              0.3 |
| lucid@v2 · gemini-2.5-flash  |  20 |         100 |          6.5/7.0 |    30 |                2.2 → 1.3 |             10 |        -0.9 |            10 |                              0.3 |
| lucid@v3 · gemini-2.5-flash  |  20 |         100 |          6.6/7.0 |    35 |                2.2 → 1.0 |              5 |        -1.2 |             5 |                              0.3 |
| lucid@v4 · gemini-2.5-flash  |  20 |         100 |          6.5/7.0 |    40 |                2.2 → 1.5 |              5 |        -0.7 |             5 |                              0.3 |
| rewrite@2 · gemini-2.5-flash |  20 |         100 |          5.8/7.0 |    85 |                2.2 → 1.7 |             10 |        -0.5 |            10 |                              0.3 |

### 6b. Inchaço, divisão de frase e marcação — medidas igual para todos

| Sistema                      |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| ---------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| ab-A@1 · gemini-2.5-flash    |  16 |            7% |           6 |                 0 |                          1.0 → 0.6 |                          1.3 |                     0.6 |                  0 |            0 |
| ab-B@1 · gemini-2.5-flash    |  15 |           10% |          20 |                 0 |                          1.0 → 0.5 |                          1.9 |                     0.4 |                  0 |            0 |
| ab-C@1 · gemini-2.5-flash    |  15 |           10% |           7 |                 0 |                          1.0 → 0.7 |                          1.0 |                     0.5 |                  0 |            0 |
| lucid@v1 · gemini-2.5-flash  |  20 |            2% |           0 |                 0 |                          1.0 → 0.8 |                          0.8 |                     0.3 |                  0 |            0 |
| lucid@v2 · gemini-2.5-flash  |  20 |            6% |           0 |                 0 |                          1.0 → 0.3 |                          2.1 |                     0.3 |                  0 |            0 |
| lucid@v3 · gemini-2.5-flash  |  20 |            4% |           0 |                 0 |                          1.0 → 0.3 |                          2.3 |                     0.3 |                  0 |            5 |
| lucid@v4 · gemini-2.5-flash  |  20 |            6% |           0 |                 0 |                          1.0 → 0.4 |                          2.2 |                     0.3 |                  0 |            0 |
| rewrite@2 · gemini-2.5-flash |  20 |            6% |           5 |                 0 |                          1.0 → 0.2 |                          2.5 |                     0.1 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                      | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| ---------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| ab-A@1 · gemini-2.5-flash    |    16 |        0 |        0 |               0 | —                 | —                 |
| ab-B@1 · gemini-2.5-flash    |    15 |        0 |        0 |               0 | —                 | —                 |
| ab-C@1 · gemini-2.5-flash    |    15 |        0 |        0 |               0 | —                 | —                 |
| lucid@v1 · gemini-2.5-flash  |     6 |       14 |        0 |               0 | —                 | 14 ok / 0 quebrou |
| lucid@v2 · gemini-2.5-flash  |     4 |       16 |        0 |               0 | —                 | 16 ok / 0 quebrou |
| lucid@v3 · gemini-2.5-flash  |     2 |       18 |        0 |               0 | —                 | 18 ok / 0 quebrou |
| lucid@v4 · gemini-2.5-flash  |     2 |       18 |        0 |               0 | —                 | 18 ok / 0 quebrou |
| rewrite@2 · gemini-2.5-flash |    20 |        0 |        0 |               0 | —                 | —                 |

### 8. Custo

| Sistema                      | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| ---------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| ab-A@1 · gemini-2.5-flash    |                 1829 |                  89 |         30696 |               4923 |    20931 |         0 |         0 |     0 |
| ab-B@1 · gemini-2.5-flash    |                 1908 |                  91 |         29995 |               9230 |    35306 |         0 |         0 |     0 |
| ab-C@1 · gemini-2.5-flash    |                 2245 |                  90 |         35026 |               5945 |    28879 |         0 |         0 |     0 |
| lucid@v1 · gemini-2.5-flash  |                 3847 |                  89 |         78725 |               2040 |     8324 |         0 |         0 |     0 |
| lucid@v2 · gemini-2.5-flash  |                 4010 |                  91 |         82035 |               1264 |     3546 |         0 |         0 |     0 |
| lucid@v3 · gemini-2.5-flash  |                 4685 |                  92 |         95552 |               2535 |    21939 |         0 |         0 |     0 |
| lucid@v4 · gemini-2.5-flash  |                 4922 |                  92 |        100286 |               7729 |    28689 |         0 |         0 |     0 |
| rewrite@2 · gemini-2.5-flash |                 1859 |                  83 |         38847 |               8040 |    26344 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **ab-A@1 · gemini-2.5-flash** — numbers_preserved=7, target_resolved=7, no_new_findings=2, region_improved=2
- **ab-B@1 · gemini-2.5-flash** — target_resolved=5, no_new_findings=3, numbers_preserved=3, region_improved=3
- **ab-C@1 · gemini-2.5-flash** — numbers_preserved=7, target_resolved=6, no_new_findings=3, region_improved=3
- **lucid@v1 · gemini-2.5-flash** — target_resolved=12, no_new_findings=4, region_improved=4
- **lucid@v2 · gemini-2.5-flash** — target_resolved=5, no_new_findings=2, region_improved=2
- **lucid@v3 · gemini-2.5-flash** — target_resolved=5, no_new_findings=1, numbers_preserved=1, region_improved=1
- **lucid@v4 · gemini-2.5-flash** — target_resolved=8, no_new_findings=1, region_improved=1
- **rewrite@2 · gemini-2.5-flash** — numbers_preserved=16, target_resolved=4, no_new_findings=2, region_improved=2

### Critérios introduzidos na região, por critério

- **ab-A@1 · gemini-2.5-flash** — passive_voice=4
- **ab-B@1 · gemini-2.5-flash** — passive_voice=3, paragraph_length=2
- **ab-C@1 · gemini-2.5-flash** — passive_voice=3, passiva_sintetica=1
- **lucid@v1 · gemini-2.5-flash** — passive_voice=5
- **lucid@v2 · gemini-2.5-flash** — passive_voice=3, paragraph_length=1, passiva_sintetica=1
- **lucid@v3 · gemini-2.5-flash** — passive_voice=4, passiva_sintetica=1
- **lucid@v4 · gemini-2.5-flash** — passive_voice=7
- **rewrite@2 · gemini-2.5-flash** — passive_voice=6, paragraph_length=1
