# 001 — A cobertura da auditoria depende do recipiente do documento?

> Escrito em 26/08/2026, ao abrir o `docs/experimentos/`. A pergunta nasceu do ADR-083:
> o mapa de cobertura por cláusula reporta o instrumento como se ele fosse o mesmo para
> qualquer entrada. É?
>
> Nada de produção foi alterado. Nenhum detector, limiar, léxico, contrato ou tela.
>
> **Resposta curta:** o recipiente não importa — `.docx` estruturado e `.txt` com marcador
> auditam **idêntico**. O que importa é o texto **declarar** estrutura. Quando não declara,
> quatro critérios ficam impossibilitados de disparar e **o relatório não diz nada**. Isso
> contradiz a recusa nº 6 do README. Ver §5.
>
> Teste que sustenta os números: [`test/structural-coverage.test.ts`](../../test/structural-coverage.test.ts).

---

## 1. O que mede, e o que deliberadamente não mede

|              |                                                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mede**     | se o mesmo conteúdo, apresentado em recipientes diferentes, produz o mesmo conjunto de achados · quais critérios deixam de poder disparar · se a engine consegue distinguir os casos · se o corpus de avaliação exercita essa diferença |
| **Não mede** | se os critérios estruturais estão **corretos** (isso é `test/`) · a frequência disso em documento real — **é o que falta, §7** · qualquer coisa sobre a Camada 2: nada aqui chama modelo                                                |

## 2. Método

Um conteúdo único, com título de nível 1 longo, salto para nível 3, um parágrafo com jargão e passiva, e uma lista de item único — escolhido para acionar critérios estruturais **e** de texto ao mesmo tempo, de modo que a perda seja legível contra um controle que não deve se mover.

Três recipientes, mesma engine, mesma configuração:

| recipiente          | caminho                                               |
| ------------------- | ----------------------------------------------------- |
| `.docx` estruturado | `buildStructuredDocument(blocks)` → `analyzeDocument` |
| `.txt` com marcador | Markdown (`#`, `- `) → `analyze`                      |
| `.txt` em prosa     | mesmas linhas, **sem** marcador → `analyze`           |

Tudo determinístico e offline. Mesmo texto, saída byte-idêntica.

## 3. Resultado

```
.docx estruturado : 6 achados — heading_body_mismatch, jargon, long_heading,
                                passive_voice, salto_de_nivel_titulo, single_item_list
.txt com marcador : 6 achados — (conjunto idêntico ao de cima)
.txt em prosa     : 2 achados — jargon, passive_voice
```

- **O recipiente não é a variável.** `.docx` estruturado e `.txt` marcado produzem o mesmo conjunto de critérios e a mesma contagem. O importador não perde nem inventa nada.
- **A variável é a estrutura declarada.** Em prosa, a perda é exatamente `heading_body_mismatch`, `long_heading`, `salto_de_nivel_titulo`, `single_item_list` — 4 dos 23 critérios, um terço dos achados daquele documento.
- **Não é bug de detector.** Em prosa, `buildDocument` produz `["paragraph"]` e nada mais. Não existe título nem lista para auditar: os quatro critérios não _falham_, eles não têm objeto.
- **A engine já sabe.** `hasStructuralMarkers()` devolve `true` para a versão marcada e `false` para a prosa. A informação existe, é determinística e é barata.

Medição paralela, no corpus de avaliação:

```
golden integrado: 20 casos, 0 com marcador estrutural
```

Nenhum caso do golden integrado declarava estrutura. O corpus que alimenta as asserções semânticas **não exercitava** esses quatro critérios em momento algum — coerente com o `eval/report.json`, que já os classificava honestamente em `unitTestsOnly`.

> **Estado posterior (ADR-084).** Este número foi corrigido no mesmo dia: entrou um caso que declara estrutura, e os quatro critérios migraram de `unitTestsOnly` para `goldenLabelledOnly` no artefato publicado. O `0 de 20` fica registrado como a medição que motivou a correção, não como o estado atual — o teste que sustenta este documento assere o estado de hoje.

## 4. Um resultado que não apareceu, e por que ele importa

Antes deste, testei a hipótese mais óbvia: **a auditoria sobrevive à ida e volta por `.docx`?** Os 20 casos do golden integrado foram exportados com `blocksToDocx`, reimportados com `importDocx` e reanalisados.

```
casos: 20 | idênticos: 20 | divergentes: 0
achados diretos: 37 | achados após ida-e-volta: 37
```

Zero divergência — critério, offsets, severidade, sugestão, tudo preservado. O invariante vale e não era garantido: o teste de ida-e-volta que já existia (`test/docx-export.test.ts`) compara **blocos**, sobre seis fixtures feitas à mão, e não **achados** sobre o corpus. Fica registrado como confirmação, e foi essa confirmação que empurrou a pergunta para o lugar certo: se o recipiente é inócuo, o que sobra como variável é o conteúdo declarar ou não a própria estrutura.

## 5. Conclusão, e o que ela custa

O README lista sete recusas. A sexta é:

> _Report what it did **not** look for · Let a silent absence read as an all-clear._

**Sobre texto em prosa, a ferramenta não cumpre essa recusa.** Ela audita com 19 critérios em vez de 23, relata "nenhum achado" para o Princípio 2 e não distingue _não encontrei_ de _não pude olhar_ — que é exatamente a distinção que o ADR-083 acabou de tornar obrigatória no mapa de cláusulas (`unbuilt` × `out_of_reach`) e que aqui reaparece num terceiro eixo, ainda não tratado: **`unreachable-for-this-document`**.

O custo é direto e cai na cláusula: o mapa credita 4 detectores ao 5.2 (Princípio 2 — o leitor encontra o que precisa). Em prosa, **metade deles não pode disparar** — `long_heading` e `salto_de_nivel_titulo` —, e o mapa continua dizendo `parcial` com os mesmos 4. O relatório de cobertura é estático; a cobertura real é função do documento.

Custa também admitir que o mapa entregue no ADR-083 está incompleto no dia em que nasceu. Preferível a descobrir isso depois de alguém publicar um laudo com ele.

## 6. Correção aplicada — [ADR-084](../decisoes/adr-084-cobertura-condicionada-ao-documento.md)

Os quatro pontos propostos foram implementados:

1. `coverageReport(doc?)` — sem documento, o mapa do instrumento; com documento, o mapa **daquela auditoria**, com `scope` declarado no payload.
2. Estado `unreachable`, sempre derivado do documento e recusado em tempo de tipo **e** de execução se alguém tentar declará-lo na árvore.
3. CLI: as linhas de silêncio vêm **antes** da contagem de achados; o mesmo fato sai em `criteriaWithoutObject` no JSON. App: aviso no slot de alerta sob a contagem, com os rótulos dos critérios, nos dois idiomas.
4. Golden: entrou `estrutura_declarada_titulos_e_lista`. Os quatro critérios saíram de `unitTestsOnly` para `goldenLabelledOnly` no artefato publicado.

A dependência não virou lista fixa no core: cada `Pass` declara `requires: BlockKind[]`, e um teste prova que a declaração é verdadeira em vez de confiar nela.

Deliberadamente **não** implementado: inferir título ou lista de texto em prosa por heurística (linha curta, caixa alta, ausência de ponto final). Adivinhar estrutura é inventar o objeto da auditoria, e um título falso positivo faz `salto_de_nivel_titulo` e `heading_body_mismatch` acusarem defeito num documento que não tem título nenhum. A ferramenta marca, não inventa.

## 7. O que continua em aberto

- **Frequência em documento real.** Sabe-se que a perda é de 4 critérios; não se sabe em que fração dos documentos que chegam a estrutura vem declarada. `.docx` de origem institucional quase sempre declara; texto colado quase nunca. A proporção não foi medida e não dá para inferir do corpus atual, que é 0/20.
- **Efeito sobre `paragraph_length` e `prose_enumeration`.** Ambos disparam em prosa e ambos são creditados ao 5.2. Não foi medido se a segmentação em prosa os torna mais ou menos sensíveis que sobre blocos declarados.
