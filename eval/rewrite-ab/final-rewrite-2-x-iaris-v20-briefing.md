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

| Candidato | n | vetos | alvo aberto (marginal ≤5 palavras) | alvo aberto (substancial) | achado novo | fidelidade |
|---|--:|--:|--:|--:|--:|--:|
| iaris@v20+briefing | 20 | 9 | 2 | 4 | 3 | 0 |
| rewrite@2 | 20 | 17 | 0 | 0 | 1 | 16 |

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

### rewrite@2 — cada alvo vetado

**planalto-leis__1989-1994-l7992.txt#322-529** · fidelidade
- [numbers_preserved] números diferem: [1] → []
  - original: «Art. 1º Para atendimento da nova composição do Tribunal Superior do Trabalho são criados, no Quadro de Pessoal de sua Secretaria, Cargos em Comissão e de Categorias Funcionais, na forma do Anexo I desta Lei.»
  - proposta: «O Tribunal Superior do Trabalho terá uma nova estrutura. Para isso, foram criados novos cargos. Esses cargos são de dois tipos: Cargos em Comissão e Cargos de Categorias Funcionais. Eles fazem parte do Quadro de Pessoal da Secretaria do Tribunal. Os detalhes desses cargos estão no Anexo I desta Lei.»

**planalto-leis__1989-1994-l7992.txt#811-1030** · fidelidade
- [numbers_preserved] números diferem: [151, 4] → [151]
  - original: «Art. 4º São criadas, na Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho, mais 151 (cento e cinqüenta e uma) funções, a nível de assistência, na forma constante do Anexo II desta Lei.»
  - proposta: «Foram criadas 151 novas funções. Elas são para assistência. Essas funções fazem parte da Tabela de Gratificação de Representação de Gabinete do Tribunal Superior do Trabalho. Os detalhes estão no Anexo II desta Lei.»

**planalto-leis__1989-1994-l7993.txt#478-633** · fidelidade
- [numbers_preserved] números diferem: [1, 12, 1988, 2.452, 29] → [12, 1988, 2.452, 29]
  - introduzido: passive_voice: «é limitado»
  - original: «"Art. 1º Fica limitado em 12 (doze) o número de Zonas de Processamento de Exportações - ZPEs, de que trata o Decreto-Lei nº 2.452, de 29 de julho de 1988."»
  - proposta: «O número de Zonas de Processamento de Exportações (ZPEs) é limitado a 12. Essas ZPEs são aquelas mencionadas no Decreto-Lei nº 2.452, de 29 de julho de 1988.»

**planalto-leis__1989-1994-l7994.txt#445-692** · fidelidade
- [numbers_preserved] números diferem: [027, 1] → [027]
  - original: «Art. 1º É incluída, no Grupo-Atividades de Apoio Judiciário, do Quadro de Pessoal Permanente da Secretaria do Tribunal de Justiça do Distrito Federal e dos Territórios, a categoria funcional de Inspetor de Segurança Judiciária, Código TJDF-AJ-027.»
  - proposta: «A função de Inspetor de Segurança Judiciária foi criada. Ela faz parte do grupo de Atividades de Apoio Judiciário. Esse grupo pertence ao quadro de funcionários fixos da Secretaria do Tribunal de Justiça do Distrito Federal e dos Territórios. O código dessa nova função é TJDF-AJ-027.»

**planalto-leis__1989-1994-l7994.txt#860-1015** · fidelidade
- [numbers_preserved] números diferem: [3] → []
  - introduzido: passive_voice: «for aprovado»
  - original: «Art. 3º O ingresso na categoria funcional de Inspetor de Segurança Judiciária far-se-á na primeira referência da classe inicial, mediante concurso público.»
  - proposta: «Para se tornar um Inspetor de Segurança Judiciária, é preciso passar em um concurso público. Quem for aprovado começará na primeira etapa da classe inicial.»

**planalto-leis__1989-1994-l7999.txt#2654-2823** · fidelidade
- [numbers_preserved] números diferem: [1, 165, 3] → [165, 3]
  - original: «§ 1º As estimativas de receita serão atualizadas, mensalmente, demonstrando-se as atualizações no Relatório Bimestral a que se refere o § 3º do art. 165 da Constituição.»
  - proposta: «Os valores de receita estimados serão corrigidos todo mês. Essas correções serão mostradas no Relatório Bimestral, conforme o parágrafo 3º do artigo 165 da Constituição.»

**planalto-leis__1989-1994-l7999.txt#2825-3097** · fidelidade
- [numbers_preserved] números diferem: [10, 1989, 2, 23, 5, 7.800] → [10, 1989, 23, 5, 7.800]
  - original: «§ 2º Na atualização a que se refere o parágrafo anterior, as receitas decorrentes de Operações de Crédito serão reajustadas, observando-se o estabelecido no artigo 23 da Lei nº 7.800, de 10 de julho de 1989 , e as dotações reajustadas na forma do § 5º do artigo desta Lei.»
  - proposta: «Ao atualizar as receitas, aquelas que vêm de Operações de Crédito serão corrigidas. Essa correção seguirá o que está no artigo 23 da Lei nº 7.800, de 10 de julho de 1989. As verbas destinadas a gastos também serão corrigidas. Isso será feito conforme o parágrafo 5º desta Lei.»

**planalto-leis__1989-1994-l8000.txt#6934-7435** · fidelidade
- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [region_improved] peso (severidade) dos findings no trecho: 5.2 → 8.0
- [no_new_findings] peso (severidade) total: 81.9 → 84.7
- [numbers_preserved] números diferem: [7] → []
  - frase que ainda dispara — **22 palavras** (limiar 20): «Também será cancelada se os veículos comprados com a isenção forem usados por pessoas que não trabalham na atividade descrita na Lei.»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «forem seguidas»
  - introduzido: passive_voice: «será cancelada»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «forem usados»
  - introduzido: passive_voice: «foi pago»
  - introduzido: passive_voice: «será cobrado»
  - original: «Art. 7º Considerar-se-á extinta a isenção, se ocorrer a inobservância de qualquer dos requisitos ou condições previstos nesta Lei, bem como, qualquer ato ou fato que importem na utilização dos veículos adquiridos com isenção por pessoas que não exerçam efetivamente a atividade nela discriminada, ou o uso deles em atividades que não sejam o transporte autônomo de passageiros, o que, sem prejuízo das sanções penais cabíveis e da exigência do tributo dispensado, monetariamente corrigido, acarretará:»
  - proposta: «A isenção será cancelada se as regras ou condições desta Lei não forem seguidas. Também será cancelada se os veículos comprados com a isenção forem usados por pessoas que não trabalham na atividade descrita na Lei. Ou ainda, se os veículos forem usados para outras atividades que não sejam o transporte autônomo de passageiros. Se isso acontecer, além das punições criminais, o imposto que não foi pago será cobrado, com correção monetária. Isso também causará as seguintes consequências:»

**planalto-leis__1989-1994-l8002.txt#436-598** · fidelidade
- [numbers_preserved] números diferem: [1, 200.000, 500] → [200.000, 500]
  - original: «Art. 1º Fica sujeito à multa, variável de 500 a 200.000 Bônus do Tesouro Nacional - BTN, sem prejuízo das sanções penais que couberem na forma da lei, aquele que:»
  - proposta: «Quem fizer o que está descrito abaixo poderá receber uma multa. O valor da multa pode variar de 500 a 200.000 Bônus do Tesouro Nacional (BTN). Além da multa, a pessoa também poderá sofrer outras punições criminais, conforme a lei.»

**planalto-leis__1989-1994-l8006.txt#879-1050** · fidelidade
- [numbers_preserved] números diferem: [2] → []
  - original: «Art. 2º Os recursos necessários à execução do disposto no artigo anterior decorrerão do cancelamento de dotação constante do Anexo II desta lei e no montante especificado.»
  - proposta: «O dinheiro para fazer o que está no artigo anterior virá do cancelamento de uma verba. Essa verba está no Anexo II desta lei e tem um valor específico.»

**planalto-leis__1989-1994-l8007.txt#529-1098** · fidelidade
- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [numbers_preserved] números diferem: [1, 14, 19, 19, 1988, 1988, 1988, 1989, 1989, 1989, 2.433, 2.434, 2.451, 28, 29, 29, 4, 5, 7.752, 7.988] → [14, 19, 19, 1988, 1988, 1988, 1989, 1989, 1989, 2.433, 2.434, 2.451, 28, 29, 29, 4, 5, 7.752, 7.988]
  - frase que ainda dispara — **35 palavras** (limiar 30): «Isso vale para importações feitas conforme o Decreto-Lei nº 2.433, de 19 de maio de 1988, o Decreto-Lei nº 2.451, de 29 de julho de 1988, o Decreto-Lei nº 2.434, de 19 de maio de 1988, e a Lei nº 7.752, de 14 de abril de 1989.»
  - original: «Art. 1º As alterações constantes dos arts. 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989 , relativamente a percentuais de redução do Imposto de Importação e do Imposto sobre Produtos Industrializados, não se aplicam às importações beneficiadas com isenção ou redução, na forma do Decreto-Lei nº 2.433, de 19 de maio de 1988 , com a redação dada pelo Decreto-Lei nº 2.451, de 29 de julho de 1988 , do Decreto-Lei nº 2.434, de 19 de maio de 1988 , e da Lei nº 7.752, de 14 de abril de 1989 , cujas Guias de Importação tenham sido emitidas até 29 de dezembro de 1989.»
  - proposta: «As mudanças nos artigos 4º e 5º da Lei nº 7.988, de 28 de dezembro de 1989, não valem para algumas situações. Essas mudanças são sobre a redução dos impostos de Importação e sobre Produtos Industrializados. Elas não se aplicam a importações que já tinham isenção ou redução de impostos. Isso vale para importações feitas conforme o Decreto-Lei nº 2.433, de 19 de maio de 1988, o Decreto-Lei nº 2.451, de 29 de julho de 1988, o Decreto-Lei nº 2.434, de 19 de maio de 1988, e a Lei nº 7.752, de 14 de abril de 1989. As Guias de Importação para esses casos devem ter sido emitidas até 29 de dezembro de 1989.»

**planalto-leis__1989-1994-l8010.txt#1119-1451** · fidelidade
- [numbers_preserved] números diferem: [2] → []
  - introduzido: passive_voice: «ser credenciadas pelo CNPq.»
  - original: «§ 2º O disposto neste artigo aplica-se somente às importações realizadas pelo Conselho Nacional de Desenvolvimento Científico e Tecnológico - CNPq, e por entidades sem fins lucrativos ativas no fomento, na coordenação ou na execução de programas de pesquisa científica e tecnológica ou de ensino, devidamente credenciadas pelo CNPq.»
  - proposta: «As regras deste artigo valem apenas para importações feitas pelo CNPq. Também valem para importações de entidades sem fins lucrativos. Essas entidades devem atuar no apoio, coordenação ou execução de programas de pesquisa científica e tecnológica. Ou ainda, em programas de ensino. Todas essas entidades precisam ser credenciadas pelo CNPq.»

**planalto-leis__1989-1994-l8013.txt#844-1221** · achado-novo
- [region_improved] peso (severidade) dos findings no trecho: 4.0 → 5.0
- [no_new_findings] peso (severidade) total: 39.0 → 40.0
  - introduzido: paragraph_length: «O Artigo 7º trata dos valores que as empresas de energia elétrica tinham a receber. Esses valores são chamados de 'saldos credores'. Eles surgiram porque a remuneração das empresas foi insuficiente. Esses saldos foram registrados em uma 'Conta de Resultados a Compensar'. Os valores existentes até 31 de dezembro de 1989 serão aqueles aprovados pelo DNAEE. A aprovação seguirá as regras da lei atual. Isso é para que esses valores possam ser compensados, conforme esta lei estabelece.»
  - introduzido: passive_voice: «são chamados»
  - introduzido: passive_voice: «foram registrados»
  - introduzido: passive_voice: «ser compensados»

**planalto-leis__1989-1994-l8016.txt#2059-2437** · fidelidade
- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [numbers_preserved] números diferem: [1990, 2] → [1990]
  - frase que ainda dispara — **28 palavras** (limiar 20): «Em 1990, se o governo arrecadar mais dinheiro do que o esperado, uma parte desse dinheiro extra será usada para pagar a correção monetária dos valores mencionados neste artigo.»
  - original: «§ 2° Na programação orçamentária dos excessos de arrecadação de 1990, priorizar-se-á dotação para o pagamento da correção monetária dos recursos a que se refere este artigo, a ser calculada com base na variação mensal do valor do Bônus do Tesouro Nacional, a partir da data da classificação da receita, ressalvada a prioridade dos pagamentos de pessoal e dos serviços da dívida.»
  - proposta: «Em 1990, se o governo arrecadar mais dinheiro do que o esperado, uma parte desse dinheiro extra será usada para pagar a correção monetária dos valores mencionados neste artigo. Essa correção será calculada todo mês, seguindo a variação do Bônus do Tesouro Nacional. No entanto, o pagamento de salários e das dívidas terá prioridade sobre essa correção.»

**planalto-leis__1989-1994-l8018.txt#794-963** · fidelidade
- [numbers_preserved] números diferem: [2] → []
  - original: «Art. 2° Os detentores dos Certificados de Privatização terão direito a utilizá-los como pagamento de ações das empresas do setor público que venham a ser desestatizadas.»
  - proposta: «Quem tiver os Certificados de Privatização poderá usá-los para comprar ações de empresas públicas que forem vendidas pelo governo.»

**planalto-leis__1989-1994-l8022.txt#348-685** · fidelidade
- [numbers_preserved] números diferem: [1, 1994, 8.847] → []
  - original: «Art. 1° É transferida para a Secretaria da Receita Federal a competência de administração das receitas arrecadadas pelo Instituto Nacional de Colonização e Reforma Agrária - INCRA, e para a Procuradoria-Geral da Fazenda Nacional a competência para a apuração, inscrição e cobrança da respectiva dívida ativa. (Vide Lei nº 8.847, de 1994)»
  - proposta: «A administração das receitas que o INCRA arrecada agora é responsabilidade da Secretaria da Receita Federal. A Procuradoria-Geral da Fazenda Nacional será responsável por verificar, registrar e cobrar as dívidas relacionadas a essas receitas.»

**planalto-leis__1989-1994-l8026.txt#821-1182** · fidelidade
- [target_resolved] 'long_sentence' ainda é detectado 1× no trecho reescrito
- [numbers_preserved] números diferem: [1, 1.711, 1952, 2, 219, 239, 28] → [1, 1.711, 1952, 219, 239, 28]
  - frase que ainda dispara — **31 palavras** (limiar 30): «O Ministro de Estado, ao qual o funcionário está ligado, vai iniciar um processo para investigar se o funcionário agiu ou deixou de agir de forma errada, conforme o Artigo 1º.»
  - original: «Art. 2º O processo administrativo para apuração da responsabilidade pela ação ou omissão a que se refere o art. 1º será instaurado mediante ato do Ministro de Estado a que estiver subordinado o funcionário, aplicando-se, no que couber, o disposto nos arts. 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952 (Estatuto dos Funcionários Públicos Civis da União).»
  - proposta: «O Ministro de Estado, ao qual o funcionário está ligado, vai iniciar um processo para investigar se o funcionário agiu ou deixou de agir de forma errada, conforme o Artigo 1º. Para isso, serão usadas as regras dos Artigos 219 a 239 da Lei nº 1.711, de 28 de outubro de 1952. Essa lei é o Estatuto dos Funcionários Públicos Civis da União.»

### 1–3. Fidelidade (números/datas/valores/nomes, relações entre normas, obrigações e exceções)

| Sistema | n | núm.OK% | datas OK% | valores perdidos% | refs jurídicas perdidas% | relações perdidas% | família de marcador perdida% | nome próprio sinalizado% |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| iaris@v20+briefing · gemini-2.5-flash | 20 | 100 | 100 | 0 | 0 | 5 | 35 | 60 |
| rewrite@2 · gemini-2.5-flash | 20 | 20 | 100 | 0 | 80 | 5 | 30 | 85 |

### 4–6. Provas, veto, peso e achados novos

| Sistema | n | reescreveu% | provas OK (méd.) | veto% | peso região antes→depois | região piorou% | Δpeso total | total piorou% | critérios novos na região (méd.) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| iaris@v20+briefing · gemini-2.5-flash | 20 | 100 | 6.3/7.0 | 45 | 3.7 → 2.2 | 15 | -1.4 | 15 | 0.2 |
| rewrite@2 · gemini-2.5-flash | 20 | 100 | 5.8/7.0 | 85 | 3.7 → 2.0 | 10 | -1.7 | 10 | 0.3 |

### 6b. As regras que a IAris declara sobre si — medidas igual para todos

| Sistema | n | inchaço médio | inflou >40% | perdeu parágrafo% | frases >20 palavras (antes→depois) | frases curtas criadas (méd.) | parênteses novos (méd.) | marcação proibida% | virou lista% |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| iaris@v20+briefing · gemini-2.5-flash | 20 | 8% | 0 | 0 | 1.0 → 0.7 | 0.8 | 0.5 | 0 | 0 |
| rewrite@2 · gemini-2.5-flash | 20 | 6% | 5 | 0 | 1.0 → 0.2 | 2.5 | 0.1 | 0 | 0 |

### 7. Estrutura resultante e aplicação no documento estruturado (ADR-088)

| Sistema | igual | expandiu | recusado | não verificável | motivos da recusa | .docx sobrevive |
|---|--:|--:|--:|--:|---|---|
| iaris@v20+briefing · gemini-2.5-flash | 4 | 16 | 0 | 0 | — | 16 ok / 0 quebrou |
| rewrite@2 · gemini-2.5-flash | 20 | 0 | 0 | 0 | — | — |

### 8. Custo

| Sistema | tokens prompt (méd.) | tokens saída (méd.) | tokens totais | latência méd. (ms) | p95 (ms) | truncados | ilegíveis | erros |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| iaris@v20+briefing · gemini-2.5-flash | 4959 | 91 | 100998 | 2780 | 8412 | 0 | 0 | 0 |
| rewrite@2 · gemini-2.5-flash | 1859 | 83 | 38847 | 8040 | 26344 | 0 | 0 | 0 |

### Provas reprovadas, por prova

- **iaris@v20+briefing · gemini-2.5-flash** — target_resolved=9, no_new_findings=3, region_improved=3
- **rewrite@2 · gemini-2.5-flash** — numbers_preserved=16, target_resolved=4, no_new_findings=2, region_improved=2

### Critérios introduzidos na região, por critério

- **iaris@v20+briefing · gemini-2.5-flash** — passive_voice=3, nominalization=1
- **rewrite@2 · gemini-2.5-flash** — passive_voice=6, paragraph_length=1
