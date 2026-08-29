# Decisão final — as duas portas da IAris

Modelo fixo: `gemini-2.5-flash`. **20 alvos**, os pares completos das duas finalistas —
sem o recorte de 14 alvos, que existia só para equilibrar a tabela de seis braços.

A limitação de modelo único continua valendo: isto elege o melhor prompt PARA ESTE MODELO.

## O que o veto% mede

`veto = hasBlockingFailure = pelo menos uma das 7 provas reprovou`. É um E lógico:
basta uma prova falhar para a proposta não ser aprovada. O número não distingue uma
frase de 21 palavras contra um limiar de 20 de uma reescrita que inventou agente — a
tabela abaixo distingue. **Nenhum veto vira não-veto aqui**: a engine continua se
recusando a aprovar; o que muda é saber o que ela recusou.

| Candidato                  |   n | vetos | alvo aberto (marginal ≤5 palavras) | alvo aberto (substancial) | achado novo | fidelidade |
| -------------------------- | --: | ----: | ---------------------------------: | ------------------------: | ----------: | ---------: |
| iaris@v20+briefing+lista@2 |  20 |    10 |                                  4 |                         3 |           3 |          0 |
| iaris@v20+briefing         |  20 |     9 |                                  2 |                         4 |           3 |          0 |

### iaris@v20+briefing+lista@2 — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#322-529** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **24 palavras** (limiar 20): «Art. 1º Para que o Tribunal Superior do Trabalho possa atender à sua nova composição, são criados cargos em comissão e de categorias funcionais.»
  - frase que ainda dispara — **22 palavras** (limiar 20): «Esses cargos fazem parte do Quadro de Pessoal da Secretaria do Tribunal e seguem o que está no Anexo I desta Lei.»

**planalto-leis__1989-1994-l7992.txt#811-1030** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **31 palavras** (limiar 30): «A Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho passa a ter mais 151 (cento e cinquenta e uma) funções de assistência, conforme o Anexo II desta Lei.»

**planalto-leis__1989-1994-l7999.txt#2825-3097** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **23 palavras** (limiar 20): «§ 2º Quando as receitas de Operações de Crédito forem atualizadas, elas serão reajustadas conforme o artigo 23 da Lei nº 7.800, de 10 de julho de 1989.»

**planalto-leis__1989-1994-l8000.txt#6934-7435** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.2 → 7.0
- [no_new_findings] peso (severidade) total: 81.9 → 83.7
  - frase que ainda dispara — **35 palavras** (limiar 30): «Também será cancelada se pessoas que não exercem a atividade descrita na Lei usarem os veículos comprados com isenção, ou se os veículos forem usados em atividades que não sejam o transporte autônomo de passageiros.»
  - frase que ainda dispara — **22 palavras** (limiar 20): «Nesses casos, além das punições criminais e da cobrança do imposto que você não pagou (com correção monetária), haverá as seguintes consequências:»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «forem usados»

**planalto-leis__1989-1994-l8007.txt#529-1098** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.9 → 7.0
- [no_new_findings] peso (severidade) total: 11.9 → 13.0
  - frase que ainda dispara — **42 palavras** (limiar 30): «Art. 1º As mudanças nos artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, sobre a diminuição dos percentuais do Imposto de Importação e do Imposto sobre Produtos Industrializados, não valem para as importações que já tinham isenção ou redução.»
  - frase que ainda dispara — **39 palavras** (limiar 30): «Essas importações são as que seguem o Decreto-Lei nº 2.433, de 19 de maio de 1988 (com a mudança feita pelo Decreto-Lei nº 2.451, de 29 de julho de 1988), o Decreto-Lei nº 2.434, de 19 de maio de 1988, e a Lei nº 7.752, de 14 de abril de 1989.»

**planalto-leis__1989-1994-l8010.txt#1119-1451** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 4.0 → 5.0
- [no_new_findings] peso (severidade) total: 45.0 → 46.0
  - frase que ainda dispara — **21 palavras** (limiar 20): «§ 2º O que está neste artigo vale apenas para as importações feitas pelo Conselho Nacional de Desenvolvimento Científico e Tecnológico (CNPq).»
  - frase que ainda dispara — **36 palavras** (limiar 30): «Também vale para as importações feitas por entidades sem fins lucrativos que atuam no apoio, na coordenação ou na execução de programas de pesquisa científica e tecnológica ou de ensino, desde que sejam credenciadas pelo CNPq.»
  - introduzido: passive_voice: «sejam credenciadas pelo CNPq.»

**planalto-leis__1989-1994-l8013.txt#844-1221** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **45 palavras** (limiar 30): «Art. 7º Os valores que as empresas de energia elétrica têm a receber (saldos credores) até 31 de dezembro de 1989, por terem tido remuneração insuficiente e registrado isso na Conta de Resultados a Compensar, serão aqueles aprovados pelo Departamento Nacional de Águas e Energia Elétrica (DNAEE).»
  - introduzido: passive_voice: «ser compensados»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «§ 2º Ao planejar o orçamento dos valores arrecadados a mais em 1990, o governo dará prioridade a uma verba para pagar a correção monetária dos recursos deste artigo.»
  - frase que ainda dispara — **26 palavras** (limiar 20): «Essa correção será calculada com base na mudança mensal do valor do Bônus do Tesouro Nacional, a partir da data em que a receita foi registrada.»

**planalto-leis__1989-1994-l8022.txt#348-685** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **22 palavras** (limiar 20): «Art. 1º A Secretaria da Receita Federal passa a administrar as receitas arrecadadas pelo Instituto Nacional de Colonização e Reforma Agrária (INCRA).»

**planalto-leis__1989-1994-l8026.txt#821-1182** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «As regras dos artigos 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União), valem para este processo, no que for adequado.»
  - introduzido: leitor_terceira_pessoa: «o servidor está subordinado deve»

### iaris@v20+briefing — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#811-1030** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «Art. 4º A Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho passa a ter mais 151 (cento e cinquenta e uma) funções de assistência.»

**planalto-leis__1989-1994-l7994.txt#445-692** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **22 palavras** (limiar 20): «Art. 1º A categoria de Inspetor de Segurança Judiciária, Código TJDF-AJ-027, passa a fazer parte do Grupo de Atividades de Apoio Judiciário.»

**planalto-leis__1989-1994-l8000.txt#6934-7435** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.2 → 10.0
- [no_new_findings] peso (severidade) total: 81.9 → 86.7
  - frase que ainda dispara — **33 palavras** (limiar 30): «Também será cancelada se os veículos comprados com isenção forem usados por pessoas que não exercem a atividade descrita na Lei, ou se forem usados em atividades diferentes do transporte autônomo de passageiros.»
  - frase que ainda dispara — **22 palavras** (limiar 20): «Nesses casos, além das punições criminais e da cobrança do imposto que não foi pago (com correção monetária), haverá as seguintes consequências:»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «forem cumpridas»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «foi pago»

**planalto-leis__1989-1994-l8007.txt#529-1098** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.9 → 7.0
- [no_new_findings] peso (severidade) total: 11.9 → 13.0
  - frase que ainda dispara — **32 palavras** (limiar 30): «Art. 1º As mudanças nos artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, sobre a redução dos impostos de Importação e sobre Produtos Industrializados, não valem para algumas importações.»
  - frase que ainda dispara — **45 palavras** (limiar 30): «Essas importações são as que já tinham isenção ou redução de imposto, conforme o Decreto-Lei nº 2.433, de 19 de maio de 1988 (com as alterações do Decreto-Lei nº 2.451, de 29 de julho de 1988), o Decreto-Lei nº 2.434, de 19 de maio de 1988, e a Lei nº 7.752, de 14 de abril de 1989.»

**planalto-leis__1989-1994-l8010.txt#1119-1451** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **38 palavras** (limiar 30): «Também valem para as importações feitas por entidades sem fins lucrativos que atuam no apoio, na coordenação ou na execução de programas de pesquisa científica e tecnológica ou de ensino, desde que essas entidades sejam credenciadas pelo CNPq.»
  - introduzido: passive_voice: «sejam credenciadas pelo CNPq.»

**planalto-leis__1989-1994-l8013.txt#844-1221** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 4.0 → 7.0
- [no_new_findings] peso (severidade) total: 39.0 → 42.0
  - frase que ainda dispara — **31 palavras** (limiar 30): «Art. 7º Os valores que as empresas de energia elétrica tinham a receber (saldos credores) até 31 de dezembro de 1989 serão aqueles aprovados pelo Departamento Nacional de Águas e Energia Elétrica (DNAEE).»
  - frase que ainda dispara — **23 palavras** (limiar 20): «O DNAEE fará a aprovação de acordo com as regras da lei atual, para que os valores possam ser compensados conforme esta lei.»
  - introduzido: passive_voice: «foram feitos»
  - introduzido: nominalization: «fará a aprovação»
  - introduzido: passive_voice: «ser compensados»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **26 palavras** (limiar 20): «§ 2° Ao planejar o orçamento dos valores arrecadados a mais em 1990, o governo dará prioridade a uma verba para pagar a correção monetária dos recursos deste artigo.»
  - frase que ainda dispara — **26 palavras** (limiar 20): «Essa correção será calculada com base na mudança mensal do valor do Bônus do Tesouro Nacional, a partir da data em que a receita foi registrada.»

**planalto-leis__1989-1994-l8022.txt#348-685** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **22 palavras** (limiar 20): «Art. 1º A Secretaria da Receita Federal passa a administrar as receitas arrecadadas pelo Instituto Nacional de Colonização e Reforma Agrária (INCRA).»

**planalto-leis__1989-1994-l8026.txt#821-1182** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «Nesse processo, serão usadas as regras dos artigos 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União), no que for adequado.»

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                                       |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| --------------------------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |
| iaris@v20+briefing · gemini-2.5-flash         |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       60 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                                       |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| --------------------------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  20 |         100 |          6.2/7.0 |    50 |                3.7 → 2.2 |             15 |        -1.4 |            15 |                              0.3 |
| iaris@v20+briefing · gemini-2.5-flash         |  20 |         100 |          6.3/7.0 |    45 |                3.7 → 2.2 |             15 |        -1.4 |            15 |                              0.2 |

### 6b. As regras que a IAris declara sobre si — medidas igual para todos

| Sistema                                       |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| --------------------------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |  20 |            8% |           0 |                 0 |                          1.0 → 0.8 |                          0.9 |                     0.5 |                  0 |            0 |
| iaris@v20+briefing · gemini-2.5-flash         |  20 |            8% |           0 |                 0 |                          1.0 → 0.7 |                          0.8 |                     0.5 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                                       | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| --------------------------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |     1 |       19 |        0 |               0 | —                 | 19 ok / 0 quebrou |
| iaris@v20+briefing · gemini-2.5-flash         |     4 |       16 |        0 |               0 | —                 | 16 ok / 0 quebrou |

### 8. Custo

| Sistema                                       | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| --------------------------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| iaris@v20+briefing+lista@2 · gemini-2.5-flash |                 5239 |                  91 |        106601 |               4542 |    21159 |         0 |         0 |     0 |
| iaris@v20+briefing · gemini-2.5-flash         |                 4959 |                  91 |        100998 |               2780 |     8412 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **iaris@v20+briefing+lista@2 · gemini-2.5-flash** — target_resolved=10, no_new_findings=3, region_improved=3
- **iaris@v20+briefing · gemini-2.5-flash** — target_resolved=9, no_new_findings=3, region_improved=3

### Critérios introduzidos na região, por critério

- **iaris@v20+briefing+lista@2 · gemini-2.5-flash** — passive_voice=4, leitor_terceira_pessoa=1
- **iaris@v20+briefing · gemini-2.5-flash** — passive_voice=3, nominalization=1
