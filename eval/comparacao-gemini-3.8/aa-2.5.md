# Teste A/A: gemini-2.5-flash contra ele mesmo

A máquina da comparação, aplicada rodada contra rodada do mesmo modelo, com a mesma configuração. Tudo o que aparece como regressão ou melhora aqui é ruído do próprio 2.5. Com uma rodada por lado não existe maioria nem item instável, então toda diferença aparece como regressão ou melhora forte.

## 2.5·r1 × 2.5·r2

Maioria 2/3 em cada braço quando há 3 rodadas; com uma rodada por braço, a maioria é a própria rodada. Colunas por rodada: itens em que a verificação passou em cada rodada, na ordem das rodadas.

Viradas de veredito em rewrite: 2.5·r1 0/157 (0.0%) · 2.5·r2 0/157 (0.0%). Acima de 5%: investigação obrigatória, não reprovação.

## rewrite

| verificação | obrig. | itens | 2.5·r1 por rodada | 2.5·r2 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.parse | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.stop | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.condicao |  | 157 | 123 | 123 | 1 | 0 | 1 | 33 | 122 | 0 |
| fid.marker.excecao |  | 157 | 153 | 152 | 1 | 0 | 0 | 4 | 152 | 0 |
| fid.marker.negacao |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.obrigacao |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.marker.permissao |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.proibicao |  | 157 | 154 | 154 | 0 | 0 | 0 | 3 | 154 | 0 |
| fid.refs | sim | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.relations |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.values | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| label.kept |  | 139 | 139 | 139 | 0 | 0 | 0 | 0 | 139 | 0 |
| proof.dates_preserved | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_invented_first_person | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_new_findings |  | 157 | 130 | 129 | 1 | 0 | 0 | 27 | 129 | 0 |
| proof.no_new_jargon |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.numbers_preserved | sim | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| proof.region_improved |  | 157 | 130 | 129 | 1 | 0 | 0 | 27 | 129 | 0 |
| proof.target_resolved |  | 157 | 71 | 72 | 1 | 0 | 2 | 84 | 70 | 0 |
| proof.target_resolved[long_sentence] |  | 154 | 69 | 70 | 1 | 0 | 2 | 83 | 68 | 0 |
| proof.target_resolved[outros] |  | 3 | 2 | 2 | 0 | 0 | 0 | 1 | 2 | 0 |
| region.no_new_criteria |  | 157 | 115 | 113 | 3 | 0 | 1 | 41 | 112 | 0 |
| region.no_new_passive |  | 157 | 119 | 118 | 2 | 0 | 1 | 37 | 117 | 0 |
| signal.entities_preserved |  | 157 | 129 | 128 | 2 | 0 | 1 | 27 | 127 | 0 |
| signal.possible_category_narrowed |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| signal.possible_invented_agent |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| signal.possible_invented_obligation |  | 157 | 136 | 135 | 1 | 0 | 0 | 21 | 135 | 0 |
| struct.docx | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| struct.not_refused | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.list_rule |  | 157 | 151 | 153 | 0 | 0 | 2 | 4 | 151 | 0 |
| style.markup | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.not_inflated |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| style.paragraphs | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| verdict.sem_veto |  | 157 | 69 | 70 | 1 | 0 | 2 | 86 | 68 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 157 | 129 | 128 | 1 | 0 | 0 | 28 | 128 | 0 |

- **fid.marker.condicao** — regressões: planalto-leis__1989-1994-l8014.txt#707-1117 · fracas: —
- **fid.marker.excecao** — regressões: planalto-leis__1989-1994-l8000.txt#6934-7435 · fracas: —
- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l8010.txt#550-915 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l8010.txt#550-915 · fracas: —
- **proof.target_resolved** — regressões: planalto-leis__1989-1994-l8010.txt#550-915 · fracas: —
- **proof.target_resolved[long_sentence]** — regressões: planalto-leis__1989-1994-l8010.txt#550-915 · fracas: —
- **region.no_new_criteria** — regressões: planalto-leis__1989-1994-l7994.txt#1483-1748, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#8770-8955 · fracas: —
- **region.no_new_passive** — regressões: planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#8770-8955 · fracas: —
- **signal.entities_preserved** — regressões: planalto-leis__1989-1994-l7994.txt#1483-1748, planalto-leis__1989-1994-l7999.txt#673-879 · fracas: —
- **signal.possible_invented_obligation** — regressões: planalto-leis__1989-1994-l7999.txt#1352-1632 · fracas: —
- **verdict.sem_veto** — regressões: planalto-leis__1989-1994-l8010.txt#550-915 · fracas: —
- **verdict.sem_veto_exceto_comprimento** — regressões: planalto-leis__1989-1994-l8010.txt#550-915 · fracas: —

## directed

| verificação | obrig. | itens | 2.5·r1 por rodada | 2.5·r2 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.parse | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.stop | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| directed.kept_passive_verbatim |  | 44 | 9 | 10 | 0 | 0 | 1 | 34 | 9 | 0 |
| fid.marker.condicao |  | 44 | 34 | 34 | 0 | 0 | 0 | 10 | 34 | 0 |
| fid.marker.excecao |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.negacao |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.obrigacao |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.permissao |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.proibicao |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| fid.refs | sim | 44 | 13 | 14 | 0 | 0 | 1 | 30 | 13 | 0 |
| fid.relations |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.values | sim | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| label.kept |  | 42 | 1 | 1 | 0 | 0 | 0 | 41 | 1 | 0 |
| proof.dates_preserved | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.directed_findings_resolved |  | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| proof.no_invented_first_person | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.no_new_findings |  | 44 | 28 | 26 | 2 | 0 | 0 | 16 | 26 | 0 |
| proof.no_new_jargon |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.numbers_preserved | sim | 44 | 11 | 12 | 0 | 0 | 1 | 32 | 11 | 0 |
| proof.region_improved |  | 44 | 28 | 26 | 2 | 0 | 0 | 16 | 26 | 0 |
| proof.target_resolved |  | 44 | 8 | 9 | 0 | 0 | 1 | 35 | 8 | 0 |
| proof.target_resolved[outros] |  | 44 | 8 | 9 | 0 | 0 | 1 | 35 | 8 | 0 |
| region.no_new_criteria |  | 44 | 39 | 37 | 2 | 0 | 0 | 5 | 37 | 0 |
| region.no_new_passive |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.entities_preserved |  | 44 | 11 | 11 | 0 | 0 | 0 | 33 | 11 | 0 |
| signal.possible_category_narrowed |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| signal.possible_invented_agent |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.possible_invented_obligation |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| struct.docx | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| struct.not_refused | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.list_rule |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.markup | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.not_inflated |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.paragraphs | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| verdict.sem_veto |  | 44 | 0 | 0 | 0 | 0 | 0 | 44 | 0 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 44 | 0 | 0 | 0 | 0 | 0 | 44 | 0 | 0 |

- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l8022.txt#3160-3546, planalto-leis__1989-1994-l8018.txt#1399-1591 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l8022.txt#3160-3546, planalto-leis__1989-1994-l8018.txt#1399-1591 · fracas: —
- **region.no_new_criteria** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110, planalto-leis__1989-1994-l8018.txt#1399-1591 · fracas: —

## probe

| verificação | obrig. | itens | 2.5·r1 por rodada | 2.5·r2 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.parse |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.stop |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| probe.agrees |  | 27 | 26 | 26 | 0 | 0 | 0 | 1 | 26 | 0 |
| probe.no_contradiction |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |

## Barreiras obrigatórias

Nenhuma regressão forte nas verificações obrigatórias.

## 2.5·r1 × 2.5·r3

Maioria 2/3 em cada braço quando há 3 rodadas; com uma rodada por braço, a maioria é a própria rodada. Colunas por rodada: itens em que a verificação passou em cada rodada, na ordem das rodadas.

Viradas de veredito em rewrite: 2.5·r1 0/157 (0.0%) · 2.5·r3 0/157 (0.0%). Acima de 5%: investigação obrigatória, não reprovação.

## rewrite

| verificação | obrig. | itens | 2.5·r1 por rodada | 2.5·r3 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.parse | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.stop | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.condicao |  | 157 | 123 | 125 | 0 | 0 | 2 | 32 | 123 | 0 |
| fid.marker.excecao |  | 157 | 153 | 153 | 0 | 0 | 0 | 4 | 153 | 0 |
| fid.marker.negacao |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.obrigacao |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.marker.permissao |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.proibicao |  | 157 | 154 | 154 | 0 | 0 | 0 | 3 | 154 | 0 |
| fid.refs | sim | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.relations |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.values | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| label.kept |  | 139 | 139 | 139 | 0 | 0 | 0 | 0 | 139 | 0 |
| proof.dates_preserved | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_invented_first_person | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_new_findings |  | 157 | 130 | 131 | 1 | 0 | 2 | 25 | 129 | 0 |
| proof.no_new_jargon |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.numbers_preserved | sim | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| proof.region_improved |  | 157 | 130 | 131 | 1 | 0 | 2 | 25 | 129 | 0 |
| proof.target_resolved |  | 157 | 71 | 71 | 1 | 0 | 1 | 85 | 70 | 0 |
| proof.target_resolved[long_sentence] |  | 154 | 69 | 69 | 1 | 0 | 1 | 84 | 68 | 0 |
| proof.target_resolved[outros] |  | 3 | 2 | 2 | 0 | 0 | 0 | 1 | 2 | 0 |
| region.no_new_criteria |  | 157 | 115 | 114 | 1 | 0 | 0 | 42 | 114 | 0 |
| region.no_new_passive |  | 157 | 119 | 119 | 0 | 0 | 0 | 38 | 119 | 0 |
| signal.entities_preserved |  | 157 | 129 | 128 | 1 | 0 | 0 | 28 | 128 | 0 |
| signal.possible_category_narrowed |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| signal.possible_invented_agent |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| signal.possible_invented_obligation |  | 157 | 136 | 136 | 0 | 0 | 0 | 21 | 136 | 0 |
| struct.docx | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| struct.not_refused | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.list_rule |  | 157 | 151 | 150 | 1 | 0 | 0 | 6 | 150 | 0 |
| style.markup | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.not_inflated |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| style.paragraphs | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| verdict.sem_veto |  | 157 | 69 | 69 | 1 | 0 | 1 | 87 | 68 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 157 | 129 | 130 | 1 | 0 | 2 | 26 | 128 | 0 |

- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —
- **proof.target_resolved** — regressões: planalto-leis__1989-1994-l8022.txt#847-1071 · fracas: —
- **proof.target_resolved[long_sentence]** — regressões: planalto-leis__1989-1994-l8022.txt#847-1071 · fracas: —
- **region.no_new_criteria** — regressões: planalto-leis__1989-1994-l7994.txt#1483-1748 · fracas: —
- **signal.entities_preserved** — regressões: planalto-leis__1989-1994-l7994.txt#1483-1748 · fracas: —
- **style.list_rule** — regressões: planalto-leis__1989-1994-l7999.txt#4547-4898 · fracas: —
- **verdict.sem_veto** — regressões: planalto-leis__1989-1994-l8022.txt#847-1071 · fracas: —
- **verdict.sem_veto_exceto_comprimento** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —

## directed

| verificação | obrig. | itens | 2.5·r1 por rodada | 2.5·r3 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.parse | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.stop | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| directed.kept_passive_verbatim |  | 44 | 9 | 10 | 0 | 0 | 1 | 34 | 9 | 0 |
| fid.marker.condicao |  | 44 | 34 | 35 | 0 | 0 | 1 | 9 | 34 | 0 |
| fid.marker.excecao |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.negacao |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.obrigacao |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.permissao |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.proibicao |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| fid.refs | sim | 44 | 13 | 14 | 0 | 0 | 1 | 30 | 13 | 0 |
| fid.relations |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.values | sim | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| label.kept |  | 42 | 1 | 1 | 0 | 0 | 0 | 41 | 1 | 0 |
| proof.dates_preserved | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.directed_findings_resolved |  | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| proof.no_invented_first_person | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.no_new_findings |  | 44 | 28 | 25 | 3 | 0 | 0 | 16 | 25 | 0 |
| proof.no_new_jargon |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.numbers_preserved | sim | 44 | 11 | 12 | 0 | 0 | 1 | 32 | 11 | 0 |
| proof.region_improved |  | 44 | 28 | 25 | 3 | 0 | 0 | 16 | 25 | 0 |
| proof.target_resolved |  | 44 | 8 | 8 | 0 | 0 | 0 | 36 | 8 | 0 |
| proof.target_resolved[outros] |  | 44 | 8 | 8 | 0 | 0 | 0 | 36 | 8 | 0 |
| region.no_new_criteria |  | 44 | 39 | 38 | 1 | 0 | 0 | 5 | 38 | 0 |
| region.no_new_passive |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.entities_preserved |  | 44 | 11 | 11 | 0 | 0 | 0 | 33 | 11 | 0 |
| signal.possible_category_narrowed |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| signal.possible_invented_agent |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.possible_invented_obligation |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| struct.docx | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| struct.not_refused | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.list_rule |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.markup | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.not_inflated |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.paragraphs | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| verdict.sem_veto |  | 44 | 0 | 0 | 0 | 0 | 0 | 44 | 0 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 44 | 0 | 0 | 0 | 0 | 0 | 44 | 0 | 0 |

- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l8022.txt#3160-3546, planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l8018.txt#1399-1591 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l8022.txt#3160-3546, planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l8018.txt#1399-1591 · fracas: —
- **region.no_new_criteria** — regressões: planalto-leis__1989-1994-l8018.txt#1399-1591 · fracas: —

## probe

| verificação | obrig. | itens | 2.5·r1 por rodada | 2.5·r3 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.parse |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.stop |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| probe.agrees |  | 27 | 26 | 26 | 0 | 0 | 0 | 1 | 26 | 0 |
| probe.no_contradiction |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |

## Barreiras obrigatórias

Nenhuma regressão forte nas verificações obrigatórias.

## 2.5·r2 × 2.5·r3

Maioria 2/3 em cada braço quando há 3 rodadas; com uma rodada por braço, a maioria é a própria rodada. Colunas por rodada: itens em que a verificação passou em cada rodada, na ordem das rodadas.

Viradas de veredito em rewrite: 2.5·r2 0/157 (0.0%) · 2.5·r3 0/157 (0.0%). Acima de 5%: investigação obrigatória, não reprovação.

## rewrite

| verificação | obrig. | itens | 2.5·r2 por rodada | 2.5·r3 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.parse | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.stop | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.condicao |  | 157 | 123 | 125 | 1 | 0 | 3 | 31 | 122 | 0 |
| fid.marker.excecao |  | 157 | 152 | 153 | 0 | 0 | 1 | 4 | 152 | 0 |
| fid.marker.negacao |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.obrigacao |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.marker.permissao |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.proibicao |  | 157 | 154 | 154 | 0 | 0 | 0 | 3 | 154 | 0 |
| fid.refs | sim | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.relations |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| fid.values | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| label.kept |  | 139 | 139 | 139 | 0 | 0 | 0 | 0 | 139 | 0 |
| proof.dates_preserved | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_invented_first_person | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_new_findings |  | 157 | 129 | 131 | 1 | 0 | 3 | 25 | 128 | 0 |
| proof.no_new_jargon |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.numbers_preserved | sim | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| proof.region_improved |  | 157 | 129 | 131 | 1 | 0 | 3 | 25 | 128 | 0 |
| proof.target_resolved |  | 157 | 72 | 71 | 2 | 0 | 1 | 84 | 70 | 0 |
| proof.target_resolved[long_sentence] |  | 154 | 70 | 69 | 2 | 0 | 1 | 83 | 68 | 0 |
| proof.target_resolved[outros] |  | 3 | 2 | 2 | 0 | 0 | 0 | 1 | 2 | 0 |
| region.no_new_criteria |  | 157 | 113 | 114 | 1 | 0 | 2 | 42 | 112 | 0 |
| region.no_new_passive |  | 157 | 118 | 119 | 1 | 0 | 2 | 37 | 117 | 0 |
| signal.entities_preserved |  | 157 | 128 | 128 | 1 | 0 | 1 | 28 | 127 | 0 |
| signal.possible_category_narrowed |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| signal.possible_invented_agent |  | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| signal.possible_invented_obligation |  | 157 | 135 | 136 | 0 | 0 | 1 | 21 | 135 | 0 |
| struct.docx | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| struct.not_refused | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.list_rule |  | 157 | 153 | 150 | 3 | 0 | 0 | 4 | 150 | 0 |
| style.markup | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.not_inflated |  | 157 | 156 | 156 | 0 | 0 | 0 | 1 | 156 | 0 |
| style.paragraphs | sim | 157 | 157 | 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| verdict.sem_veto |  | 157 | 70 | 69 | 2 | 0 | 1 | 86 | 68 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 157 | 128 | 130 | 1 | 0 | 3 | 26 | 127 | 0 |

- **fid.marker.condicao** — regressões: planalto-leis__1989-1994-l7994.txt#1017-1174 · fracas: —
- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —
- **proof.target_resolved** — regressões: planalto-leis__1989-1994-l8022.txt#1620-1894, planalto-leis__1989-1994-l8022.txt#847-1071 · fracas: —
- **proof.target_resolved[long_sentence]** — regressões: planalto-leis__1989-1994-l8022.txt#1620-1894, planalto-leis__1989-1994-l8022.txt#847-1071 · fracas: —
- **region.no_new_criteria** — regressões: planalto-leis__1989-1994-l8006.txt#577-877 · fracas: —
- **region.no_new_passive** — regressões: planalto-leis__1989-1994-l8006.txt#577-877 · fracas: —
- **signal.entities_preserved** — regressões: planalto-leis__1989-1994-l8010.txt#2309-2805 · fracas: —
- **style.list_rule** — regressões: planalto-leis__1989-1994-l8010.txt#550-915, planalto-leis__1989-1994-l8010.txt#917-1117, planalto-leis__1989-1994-l7999.txt#4547-4898 · fracas: —
- **verdict.sem_veto** — regressões: planalto-leis__1989-1994-l8022.txt#1620-1894, planalto-leis__1989-1994-l8022.txt#847-1071 · fracas: —
- **verdict.sem_veto_exceto_comprimento** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —

## directed

| verificação | obrig. | itens | 2.5·r2 por rodada | 2.5·r3 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.parse | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.stop | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| directed.kept_passive_verbatim |  | 44 | 10 | 10 | 0 | 0 | 0 | 34 | 10 | 0 |
| fid.marker.condicao |  | 44 | 34 | 35 | 0 | 0 | 1 | 9 | 34 | 0 |
| fid.marker.excecao |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.negacao |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.obrigacao |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.permissao |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.proibicao |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| fid.refs | sim | 44 | 14 | 14 | 0 | 0 | 0 | 30 | 14 | 0 |
| fid.relations |  | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.values | sim | 44 | 43 | 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| label.kept |  | 42 | 1 | 1 | 0 | 0 | 0 | 41 | 1 | 0 |
| proof.dates_preserved | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.directed_findings_resolved |  | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| proof.no_invented_first_person | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.no_new_findings |  | 44 | 26 | 25 | 1 | 0 | 0 | 18 | 25 | 0 |
| proof.no_new_jargon |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.numbers_preserved | sim | 44 | 12 | 12 | 0 | 0 | 0 | 32 | 12 | 0 |
| proof.region_improved |  | 44 | 26 | 25 | 1 | 0 | 0 | 18 | 25 | 0 |
| proof.target_resolved |  | 44 | 9 | 8 | 1 | 0 | 0 | 35 | 8 | 0 |
| proof.target_resolved[outros] |  | 44 | 9 | 8 | 1 | 0 | 0 | 35 | 8 | 0 |
| region.no_new_criteria |  | 44 | 37 | 38 | 0 | 0 | 1 | 6 | 37 | 0 |
| region.no_new_passive |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.entities_preserved |  | 44 | 11 | 11 | 0 | 0 | 0 | 33 | 11 | 0 |
| signal.possible_category_narrowed |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| signal.possible_invented_agent |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.possible_invented_obligation |  | 44 | 42 | 42 | 0 | 0 | 0 | 2 | 42 | 0 |
| struct.docx | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| struct.not_refused | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.list_rule |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.markup | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.not_inflated |  | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.paragraphs | sim | 44 | 44 | 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| verdict.sem_veto |  | 44 | 0 | 0 | 0 | 0 | 0 | 44 | 0 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 44 | 0 | 0 | 0 | 0 | 0 | 44 | 0 | 0 |

- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l7999.txt#2825-3097 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l7999.txt#2825-3097 · fracas: —
- **proof.target_resolved** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —
- **proof.target_resolved[outros]** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —

## probe

| verificação | obrig. | itens | 2.5·r2 por rodada | 2.5·r3 por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.parse |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.stop |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| probe.agrees |  | 27 | 26 | 26 | 0 | 0 | 0 | 1 | 26 | 0 |
| probe.no_contradiction |  | 27 | 27 | 27 | 0 | 0 | 0 | 0 | 27 | 0 |

## Barreiras obrigatórias

Nenhuma regressão forte nas verificações obrigatórias.

## Viradas nas 3 rodadas do 2.5

- rewrite: 4/157 (2.5%) · planalto-leis__1989-1994-l8022.txt#1620-1894, planalto-leis__1989-1994-l8010.txt#550-915, planalto-leis__1989-1994-l8022.txt#847-1071, planalto-leis__1989-1994-l7999.txt#13979-14415
- directed: 0/44 (0.0%)
- probe: 0/27 (0.0%)
