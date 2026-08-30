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
| lucid@v2  |  20 |     5 |                                  3 |                         2 |           0 |          0 |
| lucid@v4  |  20 |     8 |                                  6 |                         1 |           1 |          0 |

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

### lucid@v4 — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#811-1030** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «São criadas 151 (cento e cinquenta e uma) funções na Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho.»

**planalto-leis__1989-1994-l7994.txt#445-692** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Este grupo faz parte do Quadro de Pessoal Permanente da Secretaria do Tribunal de Justiça do Distrito Federal e dos Territórios.»

**planalto-leis__1989-1994-l8000.txt#6934-7435** · achado-novo

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.2 → 7.0
- [no_new_findings] peso (severidade) total: 81.2 → 83.0
  - frase que ainda dispara — **21 palavras** (limiar 20): «Também será extinta se os veículos comprados com isenção forem usados por pessoas que não exercem a atividade descrita na Lei.»
  - introduzido: passive_voice: «será extinta»
  - introduzido: passive_voice: «forem cumpridas»
  - introduzido: passive_voice: «será extinta»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «serão aplicadas»

**planalto-leis__1989-1994-l8007.txt#529-1098** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Art. 1º As mudanças nos artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, não valem para algumas importações.»

**planalto-leis__1989-1994-l8013.txt#844-1221** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Art. 7º Os saldos credores das empresas de energia elétrica serão aprovados pelo Departamento Nacional de Águas e Energia Elétrica (DNAEE).»
  - introduzido: passive_voice: «serão aprovados pelo Departamento Nacional de Águas»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «§ 2° Na programação orçamentária dos excessos de arrecadação de 1990, a dotação para pagar a correção monetária dos recursos deste artigo terá prioridade.»

**planalto-leis__1989-1994-l8022.txt#348-685** · alvo-nao-resolvido-marginal

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **21 palavras** (limiar 20): «Art. 1° A Secretaria da Receita Federal passa a administrar as receitas arrecadadas pelo Instituto Nacional de Colonização e Reforma Agrária (INCRA).»

**planalto-leis__1989-1994-l8026.txt#821-1182** · alvo-nao-resolvido-substancial

- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
  - frase que ainda dispara — **27 palavras** (limiar 20): «Aplica-se a ele o que está nos arts. 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União), no que for cabível.»

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema                     |   n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
| --------------------------- | --: | ------: | --------: | ----------------: | -----------------------: | -----------------: | ---------------------------: | -----------------------: |
| lucid@v2 · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           35 |                       55 |
| lucid@v4 · gemini-2.5-flash |  20 |     100 |       100 |                 0 |                        0 |                  5 |                           30 |                       40 |

### 4–6. Provas, veto, peso e achados novos

| Sistema                     |   n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
| --------------------------- | --: | ----------: | ---------------: | ----: | -----------------------: | -------------: | ----------: | ------------: | -------------------------------: |
| lucid@v2 · gemini-2.5-flash |  20 |         100 |          6.8/7.0 |    25 |                3.5 → 1.3 |              0 |        -2.2 |             0 |                              0.3 |
| lucid@v4 · gemini-2.5-flash |  20 |         100 |          6.5/7.0 |    40 |                3.5 → 1.5 |              5 |        -2.0 |             5 |                              0.3 |

### 6b. Inchaço, divisão de frase e marcação — medidas igual para todos

| Sistema                     |   n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
| --------------------------- | --: | ------------: | ----------: | ----------------: | ---------------------------------: | ---------------------------: | ----------------------: | -----------------: | -----------: |
| lucid@v2 · gemini-2.5-flash |  20 |            6% |           0 |                 0 |                          1.0 → 0.3 |                          2.1 |                     0.3 |                  0 |            0 |
| lucid@v4 · gemini-2.5-flash |  20 |            6% |           0 |                 0 |                          1.0 → 0.4 |                          2.2 |                     0.3 |                  0 |            0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema                     | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive   |
| --------------------------- | ----: | -------: | -------: | --------------: | ----------------- | ----------------- |
| lucid@v2 · gemini-2.5-flash |     4 |       16 |        0 |               0 | —                 | 16 ok / 0 quebrou |
| lucid@v4 · gemini-2.5-flash |     2 |       18 |        0 |               0 | —                 | 18 ok / 0 quebrou |

### 8. Custo

| Sistema                     | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
| --------------------------- | -------------------: | ------------------: | ------------: | -----------------: | -------: | --------: | --------: | ----: |
| lucid@v2 · gemini-2.5-flash |                 4010 |                  91 |         82035 |               1264 |     3546 |         0 |         0 |     0 |
| lucid@v4 · gemini-2.5-flash |                 4922 |                  92 |        100286 |               7729 |    28689 |         0 |         0 |     0 |

### Provas reprovadas, por prova

- **lucid@v2 · gemini-2.5-flash** — target_resolved=5
- **lucid@v4 · gemini-2.5-flash** — target_resolved=8, no_new_findings=1, region_improved=1

### Critérios introduzidos na região, por critério

- **lucid@v2 · gemini-2.5-flash** — passive_voice=3, paragraph_length=1, passiva_sintetica=1
- **lucid@v4 · gemini-2.5-flash** — passive_voice=7
