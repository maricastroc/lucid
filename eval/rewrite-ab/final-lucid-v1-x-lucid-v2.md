# Decisão final — as duas finalistas

Modelo fixo: `gemini-2.5-flash`. **20 alvos**, os pares completos das duas finalistas —
sem o recorte que existe só para equilibrar a tabela de todos os braços.

A limitação de modelo único continua valendo: isto elege o melhor prompt PARA ESTE MODELO.

## O que o veto% mede

`veto = hasBlockingFailure = pelo menos uma das 7 provas reprovou`. É um E lógico:
basta uma prova falhar para a proposta não ser aprovada. O número não distingue uma
frase de 21 palavras contra um limiar de 20 de uma reescrita que inventou agente — a
tabela abaixo distingue. **Nenhum veto vira não-veto aqui**: a engine continua se
recusando a aprovar; o que muda é saber o que ela recusou.

| Candidato |   n | vetos | alvo aberto (marginal ≤5 palavras) | alvo aberto (substancial) | achado novo | fidelidade |
| --------- | --: | ----: | ---------------------------------: | ------------------------: | ----------: | ---------: |
| lucid@v1  |  20 |    12 |                                  6 |                         3 |           3 |          0 |
| lucid@v2  |  20 |     5 |                                  3 |                         2 |           0 |          0 |

### lucid@v1 — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#322-529** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **34 palavras** (limiar 30): «Art. 1º Para atender à nova composição do Tribunal Superior do Trabalho, são criados Cargos em Comissão e de Categorias Funcionais no Quadro de Pessoal de sua Secretaria, conforme o Anexo I desta Lei.»

**planalto-leis__1989-1994-l7992.txt#811-1030** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **24 palavras** (limiar 20): «Art. 4º São criadas mais 151 (cento e cinquenta e uma) funções na Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho.»

**planalto-leis__1989-1994-l7994.txt#445-692** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Este grupo faz parte do Quadro de Pessoal Permanente da Secretaria do Tribunal de Justiça do Distrito Federal e dos Territórios.»

**planalto-leis__1989-1994-l7999.txt#2825-3097** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **22 palavras** (limiar 20): «§ 2º Ao atualizar as receitas de Operações de Crédito, siga o que está no artigo 23 da Lei nº 7.800, de 10 de julho de 1989.»

**planalto-leis__1989-1994-l8000.txt#6934-7435** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.2 → 8.0
- [no_new_findings] peso (severidade) total: 81.2 → 84.0
  - frase que ainda dispara — **35 palavras** (limiar 30): «Também será extinta se os veículos comprados com isenção forem usados por pessoas que não exercem a atividade descrita na Lei, ou se forem usados em atividades que não sejam o transporte autônomo de passageiros.»
  - introduzido: passive_voice: «será extinta»
  - introduzido: passive_voice: «forem cumpridos»
  - introduzido: passive_voice: «será extinta»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «forem usados»

**planalto-leis__1989-1994-l8007.txt#529-1098** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 3× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.9 → 7.3
- [no_new_findings] peso (severidade) total: 11.9 → 13.3
  - frase que ainda dispara — **21 palavras** (limiar 20): «Art. 1º As mudanças nos artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, não valem para algumas importações.»
  - frase que ainda dispara — **47 palavras** (limiar 30): «As importações que não são afetadas são aquelas que já tinham isenção ou redução, conforme o Decreto-Lei nº 2.433, de 19 de maio de 1988, com a redação do Decreto-Lei nº 2.451, de 29 de julho de 1988, o Decreto-Lei nº 2.434, de 19 de maio de 1988, e a Lei nº 7.752, de 14 de abril de 1989.»
  - frase que ainda dispara — **21 palavras** (limiar 20): «Para que as mudanças não se apliquem, as Guias de Importação dessas importações devem ter sido emitidas até 29 de dezembro de 1989.»

**planalto-leis__1989-1994-l8010.txt#1119-1451** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **24 palavras** (limiar 20): «§ 2º Este artigo vale somente para as importações feitas pelo Conselho Nacional de Desenvolvimento Científico e Tecnológico (CNPq) e por entidades sem fins lucrativos.»
  - frase que ainda dispara — **27 palavras** (limiar 20): «Essas entidades devem atuar no fomento, na coordenação ou na execução de programas de pesquisa científica e tecnológica ou de ensino, e precisam ser credenciadas pelo CNPq.»
  - introduzido: passive_voice: «ser credenciadas pelo CNPq.»

**planalto-leis__1989-1994-l8013.txt#844-1221** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 4.0 → 5.0
- [no_new_findings] peso (severidade) total: 39.0 → 40.0
  - frase que ainda dispara — **43 palavras** (limiar 30): «Art. 7º Os saldos credores das concessionárias de serviços públicos de energia elétrica, que são insuficiências de remuneração registradas em Conta de Resultados a Compensar, e que existiam em 31 de dezembro de 1989, serão aprovados pelo Departamento Nacional de Águas e Energia Elétrica (DNAEE).»
  - introduzido: passive_voice: «serão aprovados pelo Departamento Nacional de Águas»
  - introduzido: passive_voice: «ser feita»

**planalto-leis__1989-1994-l8014.txt#325-604** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **24 palavras** (limiar 20): «Eu, Nelson Carneiro, Presidente do Senado Federal, promulgo a seguinte lei, para cumprir o que está no parágrafo único do art. 62 da Constituição Federal:»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «§ 2° Na programação orçamentária dos excessos de arrecadação de 1990, a dotação para pagar a correção monetária dos recursos deste artigo terá prioridade.»
  - frase que ainda dispara — **26 palavras** (limiar 20): «Essa correção será calculada com base na variação mensal do valor do Bônus do Tesouro Nacional, a partir da data em que a receita for classificada.»

**planalto-leis__1989-1994-l8022.txt#348-685** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Art. 1° A Secretaria da Receita Federal passa a administrar as receitas arrecadadas pelo Instituto Nacional de Colonização e Reforma Agrária (INCRA).»

**planalto-leis__1989-1994-l8026.txt#821-1182** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «No que for aplicável, o processo segue o que está nos arts. 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União).»

### lucid@v2 — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#811-1030** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **25 palavras** (limiar 20): «Art. 4º A Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho passa a ter mais 151 (cento e cinquenta e uma) funções.»

**planalto-leis__1989-1994-l8007.txt#529-1098** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 2× no trecho reescrito
  - frase que ainda dispara — **29 palavras** (limiar 20): «Art. 1º Os artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, mudam os percentuais de redução do Imposto de Importação e do Imposto sobre Produtos Industrializados.»
  - frase que ainda dispara — **24 palavras** (limiar 20): «Isso se aplica às importações feitas conforme o Decreto-Lei nº 2.433, de 19 de maio de 1988, com a redação do Decreto-Lei nº 2.451, de 29 de julho de 1988.»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «§ 2° Na programação orçamentária dos excessos de arrecadação de 1990, deve-se priorizar a verba para pagar a correção monetária dos recursos deste artigo.»
  - introduzido: passiva_sintetica: «deve-se»

**planalto-leis__1989-1994-l8022.txt#348-685** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Art. 1° A Secretaria da Receita Federal passa a administrar as receitas arrecadadas pelo Instituto Nacional de Colonização e Reforma Agrária (INCRA).»

**planalto-leis__1989-1994-l8026.txt#821-1182** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «As regras dos arts. 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União), valem para este processo, no que for adequado.»

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                     |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| --------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| lucid@v1 · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           40 |                       35 |
| lucid@v2 · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                     |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| --------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| lucid@v1 · gemini-2.5-flash |  20 |         100 |          6.1/7.0 |    60 |                3.5 → 2.1 |             15 |        -1.4 |            15 |                              0.3 |
| lucid@v2 · gemini-2.5-flash |  20 |         100 |          6.8/7.0 |    25 |                3.5 → 1.3 |              0 |        -2.2 |             0 |                              0.3 |

### 6b. Inchaço, divisão de frase e marcação — medidas igual para todos

| Sistema                     |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| --------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| lucid@v1 · gemini-2.5-flash |  20 |            2% |           0 |                 0 |                          1.0 → 0.8 |                          0.8 |                     0.3 |                  0 |            0 |
| lucid@v2 · gemini-2.5-flash |  20 |            6% |           0 |                 0 |                          1.0 → 0.3 |                          2.1 |                     0.3 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                     | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| --------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| lucid@v1 · gemini-2.5-flash |     6 |       14 |        0 |               0 | —                 | 14 ok / 0 quebrou |
| lucid@v2 · gemini-2.5-flash |     4 |       16 |        0 |               0 | —                 | 16 ok / 0 quebrou |

### 8. Custo

| Sistema                     | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| --------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| lucid@v1 · gemini-2.5-flash |                 3847 |                  89 |         78725 |               2040 |     8324 |         0 |         0 |     0 |
| lucid@v2 · gemini-2.5-flash |                 4010 |                  91 |         82035 |               1264 |     3546 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **lucid@v1 · gemini-2.5-flash** — target_resolved=12, no_new_findings=3, region_improved=3
- **lucid@v2 · gemini-2.5-flash** — target_resolved=5

### Critérios introduzidos na região, por critério

- **lucid@v1 · gemini-2.5-flash** — passive_voice=5
- **lucid@v2 · gemini-2.5-flash** — passive_voice=3, paragraph_length=1, passiva_sintetica=1
