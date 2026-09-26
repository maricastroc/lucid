# Protocolo: gemini-2.5-flash × gemini-3.8-flash

Escrito antes de qualquer chamada da bateria do 3.8. Nenhuma regra abaixo é ajustada depois de ver
resultado. Mudança de regra exige nova versão deste arquivo, com data e motivo, antes da rodada que
ela afeta.

## Pergunta

O `gemini-3.8-flash` pode substituir o `gemini-2.5-flash` no Lucid sem piorar o que o Lucid garante?
A comparação mede **o modelo**. Ela não decide nada sobre prompt, verificador ou interface.

## O que fica fixo

- Prompts `rewrite@6`, `directed@4` e `probe@1`, byte a byte (teste sempre ativo em
  `test/eval/baseline/baseline.test.ts`).
- Verificador, régua (`lucidVersion` 0.1.0, `dataHash` a7ae67e2, `configHash` 4c2da7fd), corpus v1 e
  seleção de itens: 157 parágrafos (`rewrite`), 44 com pergunta de agente (`directed`, declaração
  "manter impessoal"), 27 casos da sonda.
- `maxOutputTokens` de produção: 2048 na reescrita, 512 na sonda.
- A sonda fora das suítes de reescrita, como na baseline.

## O que varia

Só o modelo e os parâmetros que o 3.8 exige: sem `temperature` (descontinuado) e `thinkingLevel: "low"`
no lugar de `thinkingBudget: 0` (o 3.8 não desliga o raciocínio). `medium` aparece só no teste de
contrato. Se o teste de contrato mostrar corte por raciocínio em 2048 ou 512, a bateria roda a
configuração de produção **e** uma configuração adaptada declarada antes da bateria, e as duas são
publicadas.

## Braços

| braço     | modelo                                            | rodadas | origem                            |
| --------- | ------------------------------------------------- | ------: | --------------------------------- |
| base      | `gemini-2.5-flash`                                |       3 | `eval/baseline-gemini-2.5-flash/` |
| candidato | `gemini-3.8-flash`, `thinkingLevel: low`          |       3 | a gravar                          |
| opcional  | `gemini-3.5-flash-lite`, `thinkingLevel: minimal` |       3 | só com autorização                |

## Unidade e maioria

A unidade é **item × verificação**. Em cada braço, uma verificação passa no item quando passa em pelo
menos 2 das 3 rodadas. O resultado de cada rodada é sempre publicado ao lado da maioria, para que a
maioria não esconda instabilidade.

| base (maioria) | candidato (maioria) | classe                                                        |
| -------------- | ------------------- | ------------------------------------------------------------- |
| passa, 3 de 3  | falha               | **regressão**                                                 |
| passa, 2 de 3  | falha               | regressão fraca: item instável na base, vai para investigação |
| falha, 3 de 3  | passa               | melhora                                                       |
| falha, 2 de 3  | passa               | melhora fraca                                                 |
| falha          | falha               | **preexistente**: nunca conta contra o candidato              |
| passa          | passa               | igual                                                         |

## Problemas preexistentes, medidos na baseline

Nenhum deles conta como regressão do candidato. Só conta uma piora **no mesmo item**, pela tabela acima.

- `directed@4` vetado em todos os itens. Perde o rótulo `Art./§/inciso` (37 de 38 na rodada 1) e
  reescreve a passiva que o autor mandou manter (intacta em 9 de 44).
- Conflito `rewrite@6` × `target_resolved`: o prompt (ADR-094) permite manter frase longa de uma ideia, e a
  prova bloqueia. 85 de 154 alvos de `long_sentence` reprovam na rodada 1.
- Dividir frase cria achado de voz passiva (38 de 157 na rodada 1), o que derruba `no_new_findings` e
  `region_improved`.
- Lista criada contra a regra do prompt: 4 de 157.
- Sinal de obrigação inventada em 21–22 de 157; possível perda de condição real em 6 de 157.
- Sonda: erra `casos-nao-enumerados` de forma estável.
- Carimbo de produção: proposta `directed@4` sai com `rewrite@6` no `proposerId`.

Nada disso é corrigido durante o experimento. Como as respostas cruas dos dois braços ficam gravadas,
uma correção futura do verificador repontua os dois braços offline, sem chamada nova.

## Barreiras obrigatórias

Zero **regressões** (fortes) nestas verificações, em `rewrite` e `directed`:

- contrato: resposta sem erro, `finishReason = STOP`, JSON legível;
- `numbers_preserved`, `dates_preserved`, `no_invented_first_person`;
- nenhuma referência jurídica perdida, nenhum valor perdido;
- estrutura: nenhum parágrafo perdido, nenhuma marcação vazada, nenhuma recusa no documento
  estruturado, `.docx` sobrevive.

Sonda (só se ela continuar dentro da reescrita): recall ≥ 0,6 e precisão ≥ 0,7 **em cada uma** das 3
rodadas, e nenhuma autocontradição.

Regressão fraca numa verificação obrigatória não reprova sozinha: abre investigação caso a caso.

## Sem barreira: decide-se lendo

- Veto em três camadas: veredito de produção; `target_resolved` separado entre `long_sentence` e os
  demais critérios; veto sem o `target_resolved` de `long_sentence`. Menos reprovação por comprimento só
  conta como melhora se `no_new_findings`, frases curtas criadas e fidelidade não piorarem.
- Sinais de agente, obrigação e categoria; perda de condição; listas contra a regra; passivas criadas.
- `directed@4`: rótulo mantido, passiva mantida, cada prova. Regra: não piorar em nenhum indicador.
- Custo, latência, tokens de raciocínio.
- Leitura cega de ~30 blocos, estratificada entre regressões, melhoras e sinais levantados.

## Viradas

Virada é o veredito de produção de um item mudar entre rodadas do mesmo braço. Na base, a taxa é
medida nas 3 rodadas. **Acima de 5% no candidato, abre-se investigação obrigatória dos casos antes de
qualquer conclusão. Não é barreira automática.**

## Teste A/A

Antes da bateria do 3.8, a mesma máquina de comparação roda rodada contra rodada do próprio 2.5. O que
ela encontrar ali é ruído, e esse ruído é publicado ao lado da comparação real.

## Limites declarados

- O corpus v1 são leis federais: dominado por `long_sentence`, quase sem jargão ou nominalização.
- O caminho com agente declarado (`declared_agent_present`) não é exercitado.
- Temperatura: o 2.5 roda com `temperature: 0`; o 3.8 não aceita controle. A comparação de estabilidade
  mede isso, não o corrige.

## Autorizações

Cada etapa paga exige autorização explícita, com teto. Etapa 2 (teste de contrato): teto US$ 0,10.
Etapa 3 (bateria): só depois dos resultados do teste de contrato.
