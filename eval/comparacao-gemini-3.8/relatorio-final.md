# Comparação final: gemini-2.5-flash × gemini-3.8-flash·low

Pelo protocolo pré-registrado em `eval/comparacao-gemini-3.8/protocolo.md`. Maioria 2/3 em cada braço; os resultados de cada rodada estão ao lado. Nada aqui é aprovação de texto: veto é a taxa de propostas barradas pelo verificador determinístico.

## Barreiras obrigatórias

- Regressões fortes em verificações obrigatórias: **rewrite/proof.numbers_preserved** (planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l7999.txt#7709-8169)
- Regressões fracas (item instável na base, investigação): nenhuma
- Sonda do candidato nos pisos (recall ≥ 0,6, precisão ≥ 0,7, sem autocontradição) em cada rodada: r1 sim · r2 sim · r3 sim
- Viradas acima de 5% no candidato (investigação obrigatória, não reprovação): **rewrite** 12.7%, **directed** 15.9%

## Operação e custo

| braço | suíte | rodada | n | ok | erros | tentativas ≠200 | finishReason | ilegíveis | entrada méd. | saída méd. / máx. | raciocínio soma / máx. | latência p50 / p95 / máx. (ms) | US$ |
|---|---|---|--:|--:|--:|--:|---|--:|--:|--:|--:|--:|--:|
| gemini-2.5-flash | rewrite | r1 | 157 | 157 | 0 | 0 | STOP=157 | 0 | 6479 | 84 / 225 | 0 / 0 | 1130 / 1772 / 2325 | 0.3380 |
| gemini-2.5-flash | rewrite | r2 | 157 | 157 | 0 | 0 | STOP=157 | 0 | 6479 | 84 / 225 | 0 / 0 | 1078 / 1649 / 2497 | 0.3380 |
| gemini-2.5-flash | rewrite | r3 | 157 | 157 | 0 | 0 | STOP=157 | 0 | 6479 | 84 / 224 | 0 / 0 | 1110 / 1678 / 2451 | 0.3381 |
| gemini-2.5-flash | directed | r1 | 44 | 44 | 0 | 0 | STOP=44 | 0 | 3343 | 90 / 220 | 0 / 0 | 1078 / 1828 / 2098 | 0.0540 |
| gemini-2.5-flash | directed | r2 | 44 | 44 | 0 | 0 | STOP=44 | 0 | 3343 | 89 / 220 | 0 / 0 | 1004 / 1576 / 3099 | 0.0539 |
| gemini-2.5-flash | directed | r3 | 44 | 44 | 0 | 0 | STOP=44 | 0 | 3343 | 90 / 220 | 0 / 0 | 1067 / 1613 / 1709 | 0.0540 |
| gemini-2.5-flash | probe | r1 | 27 | 27 | 0 | 0 | STOP=27 | 0 | 391 | 77 / 177 | 0 / 0 | 912 / 1713 / 2672 | 0.0083 |
| gemini-2.5-flash | probe | r2 | 27 | 27 | 0 | 0 | STOP=27 | 0 | 391 | 77 / 177 | 0 / 0 | 827 / 1286 / 1326 | 0.0084 |
| gemini-2.5-flash | probe | r3 | 27 | 27 | 0 | 0 | STOP=27 | 0 | 391 | 77 / 177 | 0 / 0 | 938 / 2089 / 2854 | 0.0083 |
| gemini-3.8-flash·low | rewrite | r1 | 157 | 157 | 0 | 0 | STOP=157 | 0 | 6479 | 78 / 223 | 0 / 0 | 1307 / 2422 / 5205 | 0.8091 |
| gemini-3.8-flash·low | rewrite | r2 | 157 | 157 | 0 | 0 | STOP=157 | 0 | 6479 | 78 / 223 | 0 / 0 | 1328 / 3432 / 8939 | 0.8090 |
| gemini-3.8-flash·low | rewrite | r3 | 157 | 157 | 0 | 0 | STOP=157 | 0 | 6479 | 78 / 223 | 1318 / 1318 | 1276 / 4234 / 7006 | 0.8138 |
| gemini-3.8-flash·low | directed | r1 | 44 | 44 | 0 | 0 | STOP=44 | 0 | 3343 | 88 / 225 | 0 / 0 | 1264 / 2672 / 3676 | 0.1249 |
| gemini-3.8-flash·low | directed | r2 | 44 | 44 | 0 | 0 | STOP=44 | 0 | 3343 | 87 / 221 | 0 / 0 | 1142 / 1638 / 4516 | 0.1246 |
| gemini-3.8-flash·low | directed | r3 | 44 | 44 | 0 | 0 | STOP=44 | 0 | 3343 | 87 / 226 | 0 / 0 | 1183 / 6650 / 11035 | 0.1247 |
| gemini-3.8-flash·low | probe | r1 | 27 | 27 | 0 | 0 | STOP=27 | 0 | 391 | 81 / 180 | 0 / 0 | 1006 / 1615 / 1716 | 0.0162 |
| gemini-3.8-flash·low | probe | r2 | 27 | 27 | 0 | 0 | STOP=27 | 0 | 391 | 81 / 171 | 0 / 0 | 1041 / 2150 / 2168 | 0.0161 |
| gemini-3.8-flash·low | probe | r3 | 27 | 27 | 0 | 0 | STOP=27 | 0 | 391 | 81 / 180 | 0 / 0 | 1237 / 4705 / 6139 | 0.0161 |

Custo total gravado: gemini-2.5-flash US$ 1.2012 · gemini-3.8-flash·low US$ 2.8545.

## Veto em três camadas (itens vetados por rodada)

| suíte | camada | gemini-2.5-flash r1 / r2 / r3 | gemini-3.8-flash·low r1 / r2 / r3 |
|---|---|---|---|
| rewrite | veredito de produção | 88 (56.1%) / 87 (55.4%) / 88 (56.1%) | 125 (79.6%) / 130 (82.8%) / 130 (82.8%) |
| rewrite | target_resolved em long_sentence | 85 (55.2%) / 84 (54.5%) / 85 (55.2%) | 123 (79.9%) / 128 (83.1%) / 129 (83.8%) |
| rewrite | veto sem o target_resolved de long_sentence | 28 (17.8%) / 29 (18.5%) / 27 (17.2%) | 24 (15.3%) / 19 (12.1%) / 21 (13.4%) |
| directed | veredito de produção | 44 (100.0%) / 44 (100.0%) / 44 (100.0%) | 29 (65.9%) / 30 (68.2%) / 28 (63.6%) |
| directed | veto sem o target_resolved de long_sentence | 44 (100.0%) / 44 (100.0%) / 44 (100.0%) | 29 (65.9%) / 30 (68.2%) / 28 (63.6%) |

## Sonda (probe@1)

| braço | rodada | TP | FN | FP | TN | recall | precisão | acurácia | autocontradições | discordâncias |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|---|
| gemini-2.5-flash | r1 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | casos-nao-enumerados |
| gemini-2.5-flash | r2 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | casos-nao-enumerados |
| gemini-2.5-flash | r3 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | casos-nao-enumerados |
| gemini-2.5-flash | maioria | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | casos-nao-enumerados |
| gemini-3.8-flash·low | r1 | 5 | 1 | 1 | 20 | 0.83 | 0.83 | 0.93 | 0 | carga-integracao, casos-nao-enumerados |
| gemini-3.8-flash·low | r2 | 5 | 1 | 1 | 20 | 0.83 | 0.83 | 0.93 | 0 | carga-integracao, casos-nao-enumerados |
| gemini-3.8-flash·low | r3 | 5 | 1 | 0 | 21 | 0.83 | 1.00 | 0.96 | 0 | casos-nao-enumerados |
| gemini-3.8-flash·low | maioria | 5 | 1 | 1 | 20 | 0.83 | 0.83 | 0.93 | 0 | carga-integracao, casos-nao-enumerados |

Mesmo sinal nas 3 rodadas: gemini-2.5-flash 27/27 · gemini-3.8-flash·low 26/27.

## Estabilidade entre rodadas

| suíte | braço | itens sem veredito unânime | texto idêntico nas 3 rodadas |
|---|---|--:|--:|
| rewrite | gemini-2.5-flash | 4/157 (2.5%) | 87/157 (55.4%) |
| rewrite | gemini-3.8-flash·low | 20/157 (12.7%) | 14/157 (8.9%) |
| directed | gemini-2.5-flash | 0/44 (0.0%) | 28/44 (63.6%) |
| directed | gemini-3.8-flash·low | 7/44 (15.9%) | 4/44 (9.1%) |
| probe | gemini-2.5-flash | 0/27 (0.0%) | 22/27 (81.5%) |
| probe | gemini-3.8-flash·low | 1/27 (3.7%) | 19/27 (70.4%) |

Itens instáveis no candidato (rewrite): planalto-leis__1989-1994-l8014.txt#707-1117, planalto-leis__1989-1994-l8017.txt#519-834, planalto-leis__1989-1994-l8018.txt#2384-2568, planalto-leis__1989-1994-l8018.txt#1399-1591, planalto-leis__1989-1994-l7994.txt#1750-1953, planalto-leis__1989-1994-l8006.txt#1491-1726, planalto-leis__1989-1994-l8013.txt#2951-3143, planalto-leis__1989-1994-l8016.txt#190-393, planalto-leis__1989-1994-l8000.txt#2823-3088, planalto-leis__1989-1994-l8010.txt#3509-3673, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l8010.txt#4249-4431, planalto-leis__1989-1994-l8000.txt#6726-6932, planalto-leis__1989-1994-l8000.txt#7974-8185, planalto-leis__1989-1994-l7999.txt#11878-12132, planalto-leis__1989-1994-l8000.txt#8557-8781, planalto-leis__1989-1994-l8000.txt#1654-1824, planalto-leis__1989-1994-l7999.txt#486-671, planalto-leis__1989-1994-l8000.txt#3806-4056, planalto-leis__1989-1994-l7999.txt#12397-12589
Itens instáveis no candidato (directed): planalto-leis__1989-1994-l7993.txt#635-1110, planalto-leis__1989-1994-l8000.txt#1399-1652, planalto-leis__1989-1994-l8022.txt#2118-2346, planalto-leis__1989-1994-l8013.txt#2951-3143, planalto-leis__1989-1994-l8018.txt#2084-2382, planalto-leis__1989-1994-l8000.txt#6505-6724, planalto-leis__1989-1994-l7999.txt#19236-19390
Itens instáveis no candidato (probe): carga-integracao

A referência de ruído do 2.5 contra ele mesmo está em `aa-2.5.md`.

## Classificação por item e verificação

Maioria 2/3 em cada braço quando há 3 rodadas; com uma rodada por braço, a maioria é a própria rodada. Colunas por rodada: itens em que a verificação passou em cada rodada, na ordem das rodadas.

Viradas de veredito em rewrite: gemini-2.5-flash 4/157 (2.5%) · gemini-3.8-flash·low 20/157 (12.7%). Acima de 5%: investigação obrigatória, não reprovação.

### rewrite

| verificação | obrig. | itens | gemini-2.5-flash por rodada | gemini-3.8-flash·low por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.parse | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| contract.stop | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.condicao |  | 157 | 123 / 123 / 125 | 125 / 125 / 127 | 5 | 1 | 8 | 26 | 117 | 0 |
| fid.marker.excecao |  | 157 | 153 / 152 / 153 | 154 / 155 / 154 | 0 | 0 | 1 | 3 | 153 | 0 |
| fid.marker.negacao |  | 157 | 157 / 157 / 157 | 157 / 155 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.obrigacao |  | 157 | 156 / 156 / 156 | 155 / 155 / 155 | 2 | 0 | 1 | 0 | 154 | 0 |
| fid.marker.permissao |  | 157 | 157 / 157 / 157 | 157 / 156 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| fid.marker.proibicao |  | 157 | 154 / 154 / 154 | 155 / 155 / 155 | 0 | 0 | 1 | 2 | 154 | 0 |
| fid.refs | sim | 157 | 156 / 156 / 156 | 157 / 157 / 157 | 0 | 0 | 1 | 0 | 156 | 0 |
| fid.relations |  | 157 | 156 / 156 / 156 | 157 / 157 / 157 | 0 | 0 | 1 | 0 | 156 | 0 |
| fid.values | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| label.kept |  | 139 | 106 / 105 / 107 | 101 / 101 / 101 | 4 | 1 | 0 | 33 | 101 | 0 |
| proof.dates_preserved | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_invented_first_person | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.no_new_findings |  | 157 | 130 / 129 / 131 | 136 / 141 / 139 | 9 | 1 | 20 | 7 | 120 | 0 |
| proof.no_new_jargon |  | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| proof.numbers_preserved | sim | 157 | 156 / 156 / 156 | 155 / 155 / 155 | 2 | 0 | 1 | 0 | 154 | 0 |
| proof.region_improved |  | 157 | 130 / 129 / 131 | 136 / 141 / 139 | 9 | 1 | 20 | 7 | 120 | 0 |
| proof.target_resolved |  | 157 | 71 / 72 / 71 | 33 / 28 / 27 | 47 | 3 | 6 | 79 | 22 | 0 |
| proof.target_resolved[long_sentence] |  | 154 | 69 / 70 / 69 | 31 / 26 / 25 | 47 | 3 | 6 | 78 | 20 | 0 |
| proof.target_resolved[outros] |  | 3 | 2 / 2 / 2 | 2 / 2 / 2 | 0 | 0 | 0 | 1 | 2 | 0 |
| region.no_new_criteria |  | 157 | 115 / 113 / 114 | 138 / 142 / 139 | 6 | 1 | 34 | 9 | 107 | 0 |
| region.no_new_passive |  | 157 | 119 / 118 / 119 | 145 / 144 / 144 | 2 | 0 | 30 | 8 | 117 | 0 |
| signal.entities_preserved |  | 157 | 129 / 128 / 128 | 127 / 127 / 129 | 10 | 0 | 12 | 17 | 118 | 0 |
| signal.possible_category_narrowed |  | 157 | 156 / 156 / 156 | 157 / 157 / 157 | 0 | 0 | 1 | 0 | 156 | 0 |
| signal.possible_invented_agent |  | 157 | 157 / 157 / 157 | 156 / 157 / 156 | 0 | 0 | 0 | 0 | 157 | 0 |
| signal.possible_invented_obligation |  | 157 | 136 / 135 / 136 | 149 / 149 / 150 | 4 | 0 | 18 | 3 | 132 | 0 |
| struct.docx | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| struct.not_refused | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.list_rule |  | 157 | 151 / 153 / 150 | 157 / 157 / 157 | 0 | 0 | 6 | 0 | 151 | 0 |
| style.markup | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| style.not_inflated |  | 157 | 156 / 156 / 156 | 157 / 157 / 157 | 0 | 0 | 1 | 0 | 156 | 0 |
| style.paragraphs | sim | 157 | 157 / 157 / 157 | 157 / 157 / 157 | 0 | 0 | 0 | 0 | 157 | 0 |
| verdict.sem_veto |  | 157 | 69 / 70 / 69 | 32 / 27 / 27 | 45 | 3 | 6 | 81 | 22 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 157 | 129 / 128 / 130 | 133 / 138 / 136 | 11 | 1 | 20 | 8 | 117 | 0 |

- **fid.marker.condicao** — regressões: planalto-leis__1989-1994-l7999.txt#18995-19234, planalto-leis__1989-1994-l8010.txt#1857-2307, planalto-leis__1989-1994-l8000.txt#396-624, planalto-leis__1989-1994-l8010.txt#2807-3249, planalto-leis__1989-1994-l8022.txt#2635-2861 · fracas: planalto-leis__1989-1994-l8014.txt#707-1117
- **fid.marker.obrigacao** — regressões: planalto-leis__1989-1994-l8002.txt#1007-1258, planalto-leis__1989-1994-l8022.txt#2118-2346 · fracas: —
- **label.kept** — regressões: planalto-leis__1989-1994-l7992.txt#322-529, planalto-leis__1989-1994-l7999.txt#12897-13485, planalto-leis__1989-1994-l7999.txt#18169-18432, planalto-leis__1989-1994-l7999.txt#15585-15840 · fracas: planalto-leis__1989-1994-l7999.txt#8770-8955
- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l8006.txt#577-877, planalto-leis__1989-1994-l7999.txt#4949-5595, planalto-leis__1989-1994-l7999.txt#12897-13485, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l7999.txt#7268-7453, planalto-leis__1989-1994-l7999.txt#13979-14415, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#14417-14692, planalto-leis__1989-1994-l7999.txt#16688-17089 · fracas: planalto-leis__1989-1994-l7993.txt#635-1110
- **proof.numbers_preserved** — regressões: planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l7999.txt#7709-8169 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l8006.txt#577-877, planalto-leis__1989-1994-l7999.txt#4949-5595, planalto-leis__1989-1994-l7999.txt#12897-13485, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l7999.txt#7268-7453, planalto-leis__1989-1994-l7999.txt#13979-14415, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#14417-14692, planalto-leis__1989-1994-l7999.txt#16688-17089 · fracas: planalto-leis__1989-1994-l7993.txt#635-1110
- **proof.target_resolved** — regressões: planalto-leis__1989-1994-l8006.txt#879-1050, planalto-leis__1989-1994-l8014.txt#325-604, planalto-leis__1989-1994-l8017.txt#237-517, planalto-leis__1989-1994-l7993.txt#114-275, planalto-leis__1989-1994-l8000.txt#1399-1652, planalto-leis__1989-1994-l8006.txt#296-575, planalto-leis__1989-1994-l8007.txt#248-527, planalto-leis__1989-1994-l8017.txt#519-834, planalto-leis__1989-1994-l8018.txt#2384-2568, planalto-leis__1989-1994-l7992.txt#653-809, planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l8000.txt#1826-2128, planalto-leis__1989-1994-l8006.txt#577-877, planalto-leis__1989-1994-l8018.txt#965-1302, planalto-leis__1989-1994-l7999.txt#4949-5595, planalto-leis__1989-1994-l8002.txt#774-1005, planalto-leis__1989-1994-l8006.txt#1052-1311, planalto-leis__1989-1994-l7994.txt#1750-1953, planalto-leis__1989-1994-l8000.txt#779-1094, planalto-leis__1989-1994-l8010.txt#269-548, planalto-leis__1989-1994-l8016.txt#395-675, planalto-leis__1989-1994-l8018.txt#236-516, planalto-leis__1989-1994-l8022.txt#2863-3158, planalto-leis__1989-1994-l8013.txt#160-373, planalto-leis__1989-1994-l8022.txt#3548-3728, planalto-leis__1989-1994-l7999.txt#17833-18167, planalto-leis__1989-1994-l8000.txt#4501-4775, planalto-leis__1989-1994-l8013.txt#375-655, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l8013.txt#1554-1818, planalto-leis__1989-1994-l8022.txt#1896-2116, planalto-leis__1989-1994-l7999.txt#8436-8586, planalto-leis__1989-1994-l8000.txt#7974-8185, planalto-leis__1989-1994-l7999.txt#11878-12132, planalto-leis__1989-1994-l8000.txt#8557-8781, planalto-leis__1989-1994-l7999.txt#15180-15503, planalto-leis__1989-1994-l7999.txt#18169-18432, planalto-leis__1989-1994-l8000.txt#2658-2821, planalto-leis__1989-1994-l8000.txt#3206-3384, planalto-leis__1989-1994-l7999.txt#19236-19390, planalto-leis__1989-1994-l8000.txt#3626-3804, planalto-leis__1989-1994-l8000.txt#3806-4056, planalto-leis__1989-1994-l7999.txt#673-879, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#6877-7100, planalto-leis__1989-1994-l7999.txt#14417-14692, planalto-leis__1989-1994-l7999.txt#19534-19833 · fracas: planalto-leis__1989-1994-l8010.txt#550-915, planalto-leis__1989-1994-l8022.txt#847-1071, planalto-leis__1989-1994-l7999.txt#13979-14415
- **proof.target_resolved[long_sentence]** — regressões: planalto-leis__1989-1994-l8006.txt#879-1050, planalto-leis__1989-1994-l8014.txt#325-604, planalto-leis__1989-1994-l8017.txt#237-517, planalto-leis__1989-1994-l7993.txt#114-275, planalto-leis__1989-1994-l8000.txt#1399-1652, planalto-leis__1989-1994-l8006.txt#296-575, planalto-leis__1989-1994-l8007.txt#248-527, planalto-leis__1989-1994-l8017.txt#519-834, planalto-leis__1989-1994-l8018.txt#2384-2568, planalto-leis__1989-1994-l7992.txt#653-809, planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l8000.txt#1826-2128, planalto-leis__1989-1994-l8006.txt#577-877, planalto-leis__1989-1994-l8018.txt#965-1302, planalto-leis__1989-1994-l7999.txt#4949-5595, planalto-leis__1989-1994-l8002.txt#774-1005, planalto-leis__1989-1994-l8006.txt#1052-1311, planalto-leis__1989-1994-l7994.txt#1750-1953, planalto-leis__1989-1994-l8000.txt#779-1094, planalto-leis__1989-1994-l8010.txt#269-548, planalto-leis__1989-1994-l8016.txt#395-675, planalto-leis__1989-1994-l8018.txt#236-516, planalto-leis__1989-1994-l8022.txt#2863-3158, planalto-leis__1989-1994-l8013.txt#160-373, planalto-leis__1989-1994-l8022.txt#3548-3728, planalto-leis__1989-1994-l7999.txt#17833-18167, planalto-leis__1989-1994-l8000.txt#4501-4775, planalto-leis__1989-1994-l8013.txt#375-655, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l8013.txt#1554-1818, planalto-leis__1989-1994-l8022.txt#1896-2116, planalto-leis__1989-1994-l7999.txt#8436-8586, planalto-leis__1989-1994-l8000.txt#7974-8185, planalto-leis__1989-1994-l7999.txt#11878-12132, planalto-leis__1989-1994-l8000.txt#8557-8781, planalto-leis__1989-1994-l7999.txt#15180-15503, planalto-leis__1989-1994-l7999.txt#18169-18432, planalto-leis__1989-1994-l8000.txt#2658-2821, planalto-leis__1989-1994-l8000.txt#3206-3384, planalto-leis__1989-1994-l7999.txt#19236-19390, planalto-leis__1989-1994-l8000.txt#3626-3804, planalto-leis__1989-1994-l8000.txt#3806-4056, planalto-leis__1989-1994-l7999.txt#673-879, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#6877-7100, planalto-leis__1989-1994-l7999.txt#14417-14692, planalto-leis__1989-1994-l7999.txt#19534-19833 · fracas: planalto-leis__1989-1994-l8010.txt#550-915, planalto-leis__1989-1994-l8022.txt#847-1071, planalto-leis__1989-1994-l7999.txt#13979-14415
- **region.no_new_criteria** — regressões: planalto-leis__1989-1994-l8000.txt#1399-1652, planalto-leis__1989-1994-l8022.txt#1620-1894, planalto-leis__1989-1994-l7999.txt#7268-7453, planalto-leis__1989-1994-l8000.txt#6505-6724, planalto-leis__1989-1994-l7999.txt#12397-12589, planalto-leis__1989-1994-l7999.txt#16688-17089 · fracas: planalto-leis__1989-1994-l7999.txt#1352-1632
- **region.no_new_passive** — regressões: planalto-leis__1989-1994-l7999.txt#7268-7453, planalto-leis__1989-1994-l7999.txt#16688-17089 · fracas: —
- **signal.entities_preserved** — regressões: planalto-leis__1989-1994-l7992.txt#322-529, planalto-leis__1989-1994-l7993.txt#635-1110, planalto-leis__1989-1994-l8007.txt#529-1098, planalto-leis__1989-1994-l8022.txt#3160-3546, planalto-leis__1989-1994-l8013.txt#1820-2166, planalto-leis__1989-1994-l8016.txt#1680-2057, planalto-leis__1989-1994-l8022.txt#1620-1894, planalto-leis__1989-1994-l8013.txt#2608-2949, planalto-leis__1989-1994-l7994.txt#694-858, planalto-leis__1989-1994-l8016.txt#395-675 · fracas: —
- **signal.possible_invented_obligation** — regressões: planalto-leis__1989-1994-l8013.txt#1223-1552, planalto-leis__1989-1994-l8010.txt#4249-4431, planalto-leis__1989-1994-l8000.txt#1654-1824, planalto-leis__1989-1994-l7999.txt#12397-12589 · fracas: —
- **verdict.sem_veto** — regressões: planalto-leis__1989-1994-l8006.txt#879-1050, planalto-leis__1989-1994-l8014.txt#325-604, planalto-leis__1989-1994-l8017.txt#237-517, planalto-leis__1989-1994-l7993.txt#114-275, planalto-leis__1989-1994-l8000.txt#1399-1652, planalto-leis__1989-1994-l8006.txt#296-575, planalto-leis__1989-1994-l8007.txt#248-527, planalto-leis__1989-1994-l8017.txt#519-834, planalto-leis__1989-1994-l7992.txt#653-809, planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l8000.txt#1826-2128, planalto-leis__1989-1994-l8006.txt#577-877, planalto-leis__1989-1994-l8018.txt#965-1302, planalto-leis__1989-1994-l7999.txt#4949-5595, planalto-leis__1989-1994-l8002.txt#774-1005, planalto-leis__1989-1994-l8006.txt#1052-1311, planalto-leis__1989-1994-l7994.txt#1750-1953, planalto-leis__1989-1994-l8000.txt#779-1094, planalto-leis__1989-1994-l8010.txt#269-548, planalto-leis__1989-1994-l8016.txt#395-675, planalto-leis__1989-1994-l8018.txt#236-516, planalto-leis__1989-1994-l8022.txt#2863-3158, planalto-leis__1989-1994-l8013.txt#160-373, planalto-leis__1989-1994-l8022.txt#3548-3728, planalto-leis__1989-1994-l7999.txt#17833-18167, planalto-leis__1989-1994-l8000.txt#4501-4775, planalto-leis__1989-1994-l8013.txt#375-655, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l8022.txt#1896-2116, planalto-leis__1989-1994-l7999.txt#8436-8586, planalto-leis__1989-1994-l8000.txt#7974-8185, planalto-leis__1989-1994-l7999.txt#11878-12132, planalto-leis__1989-1994-l8000.txt#8557-8781, planalto-leis__1989-1994-l7999.txt#15180-15503, planalto-leis__1989-1994-l7999.txt#18169-18432, planalto-leis__1989-1994-l8000.txt#2658-2821, planalto-leis__1989-1994-l8000.txt#3206-3384, planalto-leis__1989-1994-l7999.txt#19236-19390, planalto-leis__1989-1994-l8000.txt#3626-3804, planalto-leis__1989-1994-l8000.txt#3806-4056, planalto-leis__1989-1994-l7999.txt#673-879, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#6877-7100, planalto-leis__1989-1994-l7999.txt#14417-14692, planalto-leis__1989-1994-l7999.txt#19534-19833 · fracas: planalto-leis__1989-1994-l8010.txt#550-915, planalto-leis__1989-1994-l8022.txt#847-1071, planalto-leis__1989-1994-l7999.txt#13979-14415
- **verdict.sem_veto_exceto_comprimento** — regressões: planalto-leis__1989-1994-l7999.txt#2825-3097, planalto-leis__1989-1994-l8006.txt#577-877, planalto-leis__1989-1994-l7999.txt#4949-5595, planalto-leis__1989-1994-l7999.txt#7709-8169, planalto-leis__1989-1994-l7999.txt#12897-13485, planalto-leis__1989-1994-l8000.txt#6177-6503, planalto-leis__1989-1994-l7999.txt#7268-7453, planalto-leis__1989-1994-l7999.txt#13979-14415, planalto-leis__1989-1994-l7999.txt#1352-1632, planalto-leis__1989-1994-l7999.txt#14417-14692, planalto-leis__1989-1994-l7999.txt#16688-17089 · fracas: planalto-leis__1989-1994-l7993.txt#635-1110

### directed

| verificação | obrig. | itens | gemini-2.5-flash por rodada | gemini-3.8-flash·low por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.parse | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| contract.stop | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| directed.kept_passive_verbatim |  | 44 | 9 / 10 / 10 | 31 / 33 / 32 | 0 | 0 | 21 | 13 | 10 | 0 |
| fid.marker.condicao |  | 44 | 34 / 34 / 35 | 33 / 35 / 33 | 1 | 0 | 0 | 10 | 33 | 0 |
| fid.marker.excecao |  | 44 | 43 / 43 / 43 | 43 / 43 / 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.marker.negacao |  | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.obrigacao |  | 44 | 43 / 43 / 43 | 44 / 43 / 44 | 0 | 0 | 1 | 0 | 43 | 0 |
| fid.marker.permissao |  | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| fid.marker.proibicao |  | 44 | 42 / 42 / 42 | 43 / 43 / 43 | 0 | 0 | 1 | 1 | 42 | 0 |
| fid.refs | sim | 44 | 13 / 14 / 14 | 37 / 36 / 35 | 0 | 0 | 23 | 7 | 14 | 0 |
| fid.relations |  | 44 | 43 / 43 / 43 | 43 / 43 / 43 | 0 | 0 | 0 | 1 | 43 | 0 |
| fid.values | sim | 44 | 43 / 43 / 43 | 44 / 44 / 44 | 0 | 0 | 1 | 0 | 43 | 0 |
| label.kept |  | 42 | 1 / 1 / 1 | 24 / 23 / 24 | 0 | 0 | 23 | 18 | 1 | 0 |
| proof.dates_preserved | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.directed_findings_resolved |  | 1 | 1 / 1 / 1 | 1 / 1 / 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| proof.no_invented_first_person | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.no_new_findings |  | 44 | 28 / 26 / 25 | 33 / 33 / 32 | 2 | 0 | 9 | 9 | 24 | 0 |
| proof.no_new_jargon |  | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| proof.numbers_preserved | sim | 44 | 11 / 12 / 12 | 37 / 36 / 36 | 0 | 0 | 25 | 7 | 12 | 0 |
| proof.region_improved |  | 44 | 28 / 26 / 25 | 33 / 33 / 32 | 2 | 0 | 9 | 9 | 24 | 0 |
| proof.target_resolved |  | 44 | 8 / 9 / 8 | 18 / 21 / 19 | 2 | 0 | 13 | 23 | 6 | 0 |
| proof.target_resolved[outros] |  | 44 | 8 / 9 / 8 | 18 / 21 / 19 | 2 | 0 | 13 | 23 | 6 | 0 |
| region.no_new_criteria |  | 44 | 39 / 37 / 38 | 43 / 42 / 43 | 0 | 0 | 5 | 1 | 38 | 0 |
| region.no_new_passive |  | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.entities_preserved |  | 44 | 11 / 11 / 11 | 31 / 31 / 29 | 0 | 0 | 20 | 13 | 11 | 0 |
| signal.possible_category_narrowed |  | 44 | 42 / 42 / 42 | 44 / 43 / 44 | 0 | 0 | 2 | 0 | 42 | 0 |
| signal.possible_invented_agent |  | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| signal.possible_invented_obligation |  | 44 | 42 / 42 / 42 | 37 / 36 / 39 | 6 | 0 | 1 | 1 | 36 | 0 |
| struct.docx | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| struct.not_refused | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.list_rule |  | 44 | 44 / 44 / 44 | 43 / 43 / 43 | 1 | 0 | 0 | 0 | 43 | 0 |
| style.markup | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.not_inflated |  | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| style.paragraphs | sim | 44 | 44 / 44 / 44 | 44 / 44 / 44 | 0 | 0 | 0 | 0 | 44 | 0 |
| verdict.sem_veto |  | 44 | 0 / 0 / 0 | 15 / 14 / 16 | 0 | 0 | 16 | 28 | 0 | 0 |
| verdict.sem_veto_exceto_comprimento |  | 44 | 0 / 0 / 0 | 15 / 14 / 16 | 0 | 0 | 16 | 28 | 0 | 0 |

- **fid.marker.condicao** — regressões: planalto-leis__1989-1994-l8016.txt#2059-2437 · fracas: —
- **proof.no_new_findings** — regressões: planalto-leis__1989-1994-l8018.txt#965-1302, planalto-leis__1989-1994-l7999.txt#15180-15503 · fracas: —
- **proof.region_improved** — regressões: planalto-leis__1989-1994-l8018.txt#965-1302, planalto-leis__1989-1994-l7999.txt#15180-15503 · fracas: —
- **proof.target_resolved** — regressões: planalto-leis__1989-1994-l7994.txt#445-692, planalto-leis__1989-1994-l7999.txt#18995-19234 · fracas: —
- **proof.target_resolved[outros]** — regressões: planalto-leis__1989-1994-l7994.txt#445-692, planalto-leis__1989-1994-l7999.txt#18995-19234 · fracas: —
- **signal.possible_invented_obligation** — regressões: planalto-leis__1989-1994-l8026.txt#821-1182, planalto-leis__1989-1994-l7999.txt#2654-2823, planalto-leis__1989-1994-l8013.txt#1223-1552, planalto-leis__1989-1994-l8016.txt#677-1149, planalto-leis__1989-1994-l7999.txt#7709-8169, planalto-leis__1989-1994-l7999.txt#17465-17831 · fracas: —
- **style.list_rule** — regressões: planalto-leis__1989-1994-l7993.txt#635-1110 · fracas: —

### probe

| verificação | obrig. | itens | gemini-2.5-flash por rodada | gemini-3.8-flash·low por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |
|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|
| contract.ok |  | 27 | 27 / 27 / 27 | 27 / 27 / 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.parse |  | 27 | 27 / 27 / 27 | 27 / 27 / 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| contract.stop |  | 27 | 27 / 27 / 27 | 27 / 27 / 27 | 0 | 0 | 0 | 0 | 27 | 0 |
| probe.agrees |  | 27 | 26 / 26 / 26 | 25 / 25 / 26 | 1 | 0 | 0 | 1 | 25 | 0 |
| probe.no_contradiction |  | 27 | 27 / 27 / 27 | 27 / 27 / 27 | 0 | 0 | 0 | 0 | 27 | 0 |

- **probe.agrees** — regressões: carga-integracao · fracas: —

### Barreiras obrigatórias

Regressões fortes em verificações obrigatórias: rewrite/proof.numbers_preserved (2).


## Leitura humana

30 blocos em `leitura-cega.md`, estratificados por regressões, melhoras e sinais, completados por controles. A chave fica em arquivo separado. Esta leitura é do autor e não foi feita aqui.
