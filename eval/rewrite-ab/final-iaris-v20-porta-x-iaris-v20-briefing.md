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

| Candidato          |   n | vetos | alvo aberto (marginal ≤5 palavras) | alvo aberto (substancial) | achado novo | fidelidade |
| ------------------ | --: | ----: | ---------------------------------: | ------------------------: | ----------: | ---------: |
| iaris@v20+briefing |  20 |     9 |                                  2 |                         4 |           3 |          0 |
| iaris@v20-porta    |  20 |    12 |                                  5 |                         5 |           1 |          1 |

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

### iaris@v20-porta — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#322-529** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **23 palavras** (limiar 20): «Art. 1º Para atender à nova composição do Tribunal Superior do Trabalho, são criados cargos no Quadro de Pessoal da Secretaria do Tribunal.»

**planalto-leis__1989-1994-l7992.txt#811-1030** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **31 palavras** (limiar 30): «Art. 4º São criadas 151 (cento e cinquenta e uma) funções de assistência na Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho, conforme o Anexo II desta Lei.»

**planalto-leis__1989-1994-l7994.txt#445-692** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **41 palavras** (limiar 30): «Art. 1º A função de Inspetor de Segurança Judiciária, Código TJDF-AJ-027, passa a fazer parte do Grupo de Atividades de Apoio Judiciário, que pertence ao Quadro de Pessoal Permanente da Secretaria do Tribunal de Justiça do Distrito Federal e dos Territórios.»

**planalto-leis__1989-1994-l8000.txt#6934-7435** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **25 palavras** (limiar 20): «Além das punições criminais e da cobrança do imposto que você não pagou (com correção monetária), o cancelamento da isenção também vai gerar outras consequências:»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «forem usados»

**planalto-leis__1989-1994-l8006.txt#879-1050** · fidelidade

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [numbers_preserved] números diferem: [2] → [1, 2]
  - frase que ainda dispara — **30 palavras** (limiar 20): «Art. 2º Os valores para cumprir o que está no artigo 1º virão do cancelamento de uma verba que está no Anexo II desta lei, no valor que lá está.»
  - original: «Art. 2º Os recursos necessários à execução do disposto no artigo anterior decorrerão do cancelamento de dotação constante do Anexo II desta lei e no montante especificado.»
  - proposta: «Art. 2º Os valores para cumprir o que está no artigo 1º virão do cancelamento de uma verba que está no Anexo II desta lei, no valor que lá está.»

**planalto-leis__1989-1994-l8007.txt#529-1098** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **38 palavras** (limiar 30): «Art. 1º As mudanças nos artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, sobre a redução dos impostos de Importação e sobre Produtos Industrializados, não valem para as importações que já têm isenção ou redução.»

**planalto-leis__1989-1994-l8010.txt#1119-1451** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **33 palavras** (limiar 30): «Também valem para as importações feitas por entidades sem fins lucrativos que atuam para promover, coordenar ou executar programas de pesquisa científica e tecnológica ou de ensino, desde que sejam credenciadas pelo CNPq.»
  - introduzido: passive_voice: «sejam credenciadas pelo CNPq.»

**planalto-leis__1989-1994-l8013.txt#844-1221** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **28 palavras** (limiar 20): «Art. 7º Os valores que as empresas de energia elétrica tinham a receber (saldos credores) até 31 de dezembro de 1989, por falta de pagamento, serão aqueles aprovados pelo DNAEE.»
  - introduzido: passive_voice: «ser compensados»

**planalto-leis__1989-1994-l8014.txt#325-604** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Por isso, e para cumprir o que diz o parágrafo único do artigo 62 da Constituição Federal, eu promulgo a seguinte lei:»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **26 palavras** (limiar 20): «§ 2º Na programação do orçamento de 1990, o dinheiro que sobrar da arrecadação será usado primeiro para pagar a correção monetária dos valores que este artigo menciona.»
  - frase que ainda dispara — **26 palavras** (limiar 20): «Essa correção será calculada com base na mudança mensal do valor do Bônus do Tesouro Nacional, a partir da data em que a receita foi registrada.»

**planalto-leis__1989-1994-l8022.txt#348-685** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **26 palavras** (limiar 20): «Art. 1º A Secretaria da Receita Federal passa a ser responsável por administrar as receitas que o Instituto Nacional de Colonização e Reforma Agrária (Incra) arrecada.»

**planalto-leis__1989-1994-l8026.txt#821-1182** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.0 → 7.0
- [no_new_findings] peso (severidade) total: 12.0 → 14.0
  - frase que ainda dispara — **33 palavras** (limiar 30): «Art. 2º O processo administrativo para investigar a responsabilidade pela ação ou omissão que o artigo 1º menciona será iniciado por uma decisão do Ministro de Estado ao qual o servidor está subordinado.»
  - frase que ainda dispara — **27 palavras** (limiar 20): «Nesse processo, serão aplicadas as regras dos artigos 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União), no que for adequado.»

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                               |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| ------------------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| iaris@v20-porta · gemini-2.5-flash    |  20 |      95 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |
| iaris@v20+briefing · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       60 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                               |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| ------------------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| iaris@v20-porta · gemini-2.5-flash    |  20 |         100 |          6.3/7.0 |    60 |                3.7 → 2.5 |              5 |        -1.2 |             5 |                              0.3 |
| iaris@v20+briefing · gemini-2.5-flash |  20 |         100 |          6.3/7.0 |    45 |                3.7 → 2.2 |             15 |        -1.4 |            15 |                              0.2 |

### 6b. As regras que a IAris declara sobre si — medidas igual para todos

| Sistema                               |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| ------------------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| iaris@v20-porta · gemini-2.5-flash    |  20 |            8% |           0 |                 0 |                          1.0 → 0.7 |                          1.1 |                     0.3 |                  0 |           15 |
| iaris@v20+briefing · gemini-2.5-flash |  20 |            8% |           0 |                 0 |                          1.0 → 0.7 |                          0.8 |                     0.5 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                               | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| ------------------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| iaris@v20-porta · gemini-2.5-flash    |     5 |       15 |        0 |               0 | —                 | 15 ok / 0 quebrou |
| iaris@v20+briefing · gemini-2.5-flash |     4 |       16 |        0 |               0 | —                 | 16 ok / 0 quebrou |

### 8. Custo

| Sistema                               | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| ------------------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| iaris@v20-porta · gemini-2.5-flash    |                 4942 |                  91 |        100664 |               3435 |    11193 |         0 |         0 |     0 |
| iaris@v20+briefing · gemini-2.5-flash |                 4959 |                  91 |        100998 |               2780 |     8412 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **iaris@v20-porta · gemini-2.5-flash** — target_resolved=12, no_new_findings=1, numbers_preserved=1, region_improved=1
- **iaris@v20+briefing · gemini-2.5-flash** — target_resolved=9, no_new_findings=3, region_improved=3

### Critérios introduzidos na região, por critério

- **iaris@v20-porta · gemini-2.5-flash** — passive_voice=5, nominalization=1
- **iaris@v20+briefing · gemini-2.5-flash** — passive_voice=3, nominalization=1
