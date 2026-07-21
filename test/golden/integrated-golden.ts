/**
 * Golden set INTEGRADO da Camada 1 — documentos completos passados por `analyze()` de
 * ponta a ponta, distinto dos golden sets por-critério (`test/eval/*-golden.ts`, que
 * exercitam um pass isolado). Cada caso é um texto realista com a expectativa completa
 * do `Diagnostic` observável: findings (critério, severidade, span exato, requiresHuman,
 * sugestão) e as métricas principais.
 *
 * As expectativas são JUÍZO LINGUÍSTICO verificado à mão do que a Camada 1 deve produzir
 * — não uma cópia do que o algoritmo faz. Onde o comportamento atual é uma limitação
 * conhecida e deliberada (ex.: agente de passiva inalcançável por tokens intermediários),
 * o campo `notes` registra isso; a expectativa reflete o comportamento correto-por-design,
 * nunca um bug tolerado silenciosamente.
 *
 * Convenção de offset (ver docs/ARQUITETURA.md §3.2 e ADR-009): `start`/`end` são índices
 * de CODE UNIT UTF-16 sobre `Diagnostic.text`, que é a entrada normalizada em NFC. Todo
 * `end` é exclusivo. `Diagnostic.text.slice(start, end) === span.text` é invariante testado.
 */

export type IntegratedCriterion = "long_sentence" | "passive_voice" | "nominalization" | "jargon";

export interface ExpectedFinding {
  criterion: IntegratedCriterion;
  severity: "info" | "warning" | "error";
  start: number;
  end: number;
  spanText: string;
  requiresHuman: boolean;
  /** ausente = nenhuma sugestão esperada (a asserção exige `suggestion === undefined`) */
  suggestion?: string;
}

export interface GoldenCase {
  id: string;
  description: string;
  text: string;
  expected: {
    findings: readonly ExpectedFinding[];
    metrics: { words: number; sentences: number };
  };
  notes?: string;
}

export const GOLDEN_INTEGRADO: readonly GoldenCase[] = [
  {
    id: "admin_simples_sem_finding",
    description: "texto administrativo simples, sem nenhuma violação",
    text: "A prefeitura abriu as inscrições. O prazo termina em maio. Os documentos vão no site.",
    expected: { findings: [], metrics: { words: 15, sentences: 3 } },
  },
  {
    id: "juridico_com_jargao",
    description: "texto jurídico curto com passiva sem agente e dois termos de jargão",
    text: "O recurso foi negado em sede de apelação. O documento supracitado consta nos autos.",
    expected: {
      findings: [
        { criterion: "passive_voice", severity: "warning", start: 10, end: 20, spanText: "foi negado", requiresHuman: true },
        { criterion: "jargon", severity: "warning", start: 21, end: 31, spanText: "em sede de", requiresHuman: false, suggestion: "no âmbito de" },
        { criterion: "jargon", severity: "warning", start: 54, end: 65, spanText: "supracitado", requiresHuman: false, suggestion: "citado acima" },
      ],
      metrics: { words: 14, sentences: 2 },
    },
  },
  {
    id: "frase_longa",
    description: "frase única acima do limiar de alerta (29 palavras)",
    text: "A comissão responsável pela avaliação das propostas técnicas apresentadas pelos participantes do certame decidiu, após longa deliberação interna, prorrogar o prazo final de entrega dos documentos exigidos no edital.",
    expected: {
      findings: [
        {
          criterion: "long_sentence",
          severity: "warning",
          start: 0,
          end: 215,
          spanText:
            "A comissão responsável pela avaliação das propostas técnicas apresentadas pelos participantes do certame decidiu, após longa deliberação interna, prorrogar o prazo final de entrega dos documentos exigidos no edital.",
          requiresHuman: true,
        },
      ],
      metrics: { words: 29, sentences: 1 },
    },
    notes:
      "Não dispara nominalização ('avaliação' vem de 'pela', não de verbo leve) nem passiva ('apresentadas' é relativa reduzida sem 'ser') — precisão sobre recall, correto por design.",
  },
  {
    id: "voz_passiva_com_e_sem_agente",
    description: "duas passivas: uma com agente explícito (requiresHuman false), outra sem (true)",
    text: "O relatório foi assinado pelo diretor. As contas foram aprovadas.",
    expected: {
      findings: [
        { criterion: "passive_voice", severity: "warning", start: 12, end: 38, spanText: "foi assinado pelo diretor.", requiresHuman: false },
        { criterion: "passive_voice", severity: "warning", start: 49, end: 64, spanText: "foram aprovadas", requiresHuman: true },
      ],
      metrics: { words: 10, sentences: 2 },
    },
    notes: "Passiva nunca gera sugestão (reconjugar para ativa não é mecanicamente seguro — ADR-006).",
  },
  {
    id: "nominalizacao_com_sugestao",
    description: "duas nominalizações verbo-leve com sugestão mecânica segura",
    text: "É preciso fazer a análise de documentos. Também convém realizar o pagamento da taxa.",
    expected: {
      findings: [
        { criterion: "nominalization", severity: "warning", start: 10, end: 39, spanText: "fazer a análise de documentos", requiresHuman: false, suggestion: "analisar documentos" },
        { criterion: "nominalization", severity: "warning", start: 55, end: 83, spanText: "realizar o pagamento da taxa", requiresHuman: false, suggestion: "pagar a taxa" },
      ],
      metrics: { words: 14, sentences: 2 },
    },
  },
  {
    id: "quatro_criterios_span_sobreposto",
    description: "os quatro critérios na mesma frase; o span de long_sentence contém os demais (sem dedup)",
    text: "O pedido foi analisado pela comissão, que decidiu fazer a verificação dos documentos supracitados antes de conceder, em sede de procedimento administrativo, o benefício pleiteado pelo interessado no processo.",
    expected: {
      findings: [
        {
          criterion: "long_sentence",
          severity: "warning",
          start: 0,
          end: 208,
          spanText:
            "O pedido foi analisado pela comissão, que decidiu fazer a verificação dos documentos supracitados antes de conceder, em sede de procedimento administrativo, o benefício pleiteado pelo interessado no processo.",
          requiresHuman: true,
        },
        { criterion: "passive_voice", severity: "warning", start: 9, end: 36, spanText: "foi analisado pela comissão", requiresHuman: false },
        { criterion: "nominalization", severity: "warning", start: 50, end: 69, spanText: "fazer a verificação", requiresHuman: true },
        { criterion: "jargon", severity: "warning", start: 85, end: 97, spanText: "supracitados", requiresHuman: false, suggestion: "citados acima" },
        { criterion: "jargon", severity: "warning", start: 117, end: 127, spanText: "em sede de", requiresHuman: false, suggestion: "no âmbito de" },
      ],
      metrics: { words: 29, sentences: 1 },
    },
    notes:
      "'fazer a verificação' não recebe sugestão: o complemento 'dos documentos supracitados' não é o formato limpo (1 palavra + fim) exigido por ADR-007. long_sentence é 'warning' (29 palavras, entre 20 e 30).",
  },
  {
    id: "multiplas_ocorrencias_jargao",
    description: "quatro ocorrências do mesmo critério (jargão) mais uma passiva",
    text: "Doravante, os prazos mudam. Outrossim, o supracitado edital vale. O documento supramencionado foi juntado.",
    expected: {
      findings: [
        { criterion: "jargon", severity: "warning", start: 0, end: 9, spanText: "Doravante", requiresHuman: false, suggestion: "a partir de agora" },
        { criterion: "jargon", severity: "warning", start: 28, end: 37, spanText: "Outrossim", requiresHuman: false, suggestion: "além disso" },
        { criterion: "jargon", severity: "warning", start: 41, end: 52, spanText: "supracitado", requiresHuman: false, suggestion: "citado acima" },
        { criterion: "jargon", severity: "warning", start: 78, end: 93, spanText: "supramencionado", requiresHuman: false, suggestion: "mencionado acima" },
        { criterion: "passive_voice", severity: "warning", start: 94, end: 105, spanText: "foi juntado", requiresHuman: true },
      ],
      metrics: { words: 14, sentences: 3 },
    },
    notes: "'Doravante'/'Outrossim' capitalizados NÃO são suprimidos: são a primeira palavra da frase (a guarda de nome próprio só age em meio de frase).",
  },
  {
    id: "findings_distintos_mesma_regiao",
    description: "vários critérios distintos na mesma frase, com spans distintos e ordenação estável",
    text: "O relatório supracitado foi assinado, doravante ele vale, e a comissão deve fazer a análise dele conforme o rito.",
    expected: {
      findings: [
        { criterion: "jargon", severity: "warning", start: 12, end: 23, spanText: "supracitado", requiresHuman: false, suggestion: "citado acima" },
        { criterion: "passive_voice", severity: "warning", start: 24, end: 36, spanText: "foi assinado", requiresHuman: true },
        { criterion: "jargon", severity: "warning", start: 38, end: 47, spanText: "doravante", requiresHuman: false, suggestion: "a partir de agora" },
        { criterion: "nominalization", severity: "warning", start: 76, end: 91, spanText: "fazer a análise", requiresHuman: true },
      ],
      metrics: { words: 19, sentences: 1 },
    },
    notes: "19 palavras — abaixo do limiar de 20, então NÃO é frase longa, apesar de densa. 'fazer a análise' + 'dele' não é complemento limpo → sem sugestão.",
  },
  {
    id: "termos_protegidos_por_guardas",
    description: "todas as guardas do jargão ativas: aspas, provável nome próprio, unigrama não cadastrado",
    text: 'O termo "supracitado" aparece. Ele disse que, Outrossim, viria. A empresa tem sede em São Paulo.',
    expected: { findings: [], metrics: { words: 16, sentences: 3 } },
    notes:
      "'supracitado' entre aspas → suprimido; 'Outrossim' capitalizado em meio de frase → suprimido (heurística de nome próprio); 'sede' isolada não está no glossário. Zero findings.",
  },
  {
    id: "casos_fora_de_escopo",
    description: "construções fora de escopo (passiva sintética, 'consoante') ignoradas; jargão em escopo detectado",
    text: "Consoante o disposto, o prazo corre. Vendem-se casas na hipótese de interesse.",
    expected: {
      findings: [
        { criterion: "jargon", severity: "warning", start: 53, end: 67, spanText: "na hipótese de", requiresHuman: true },
      ],
      metrics: { words: 12, sentences: 2 },
    },
    notes:
      "'Consoante' foi deliberadamente omitido do glossário (polissêmico, ADR-008); 'Vendem-se' é passiva sintética, fora de escopo (ADR-006). 'na hipótese de' é detectado mas sem sugestão (context_dependent).",
  },
  {
    id: "unicode_aspas_travessao",
    description: "acentos, travessão, aspas curvas e § — jargão nas aspas curvas é suprimido; passiva detectada",
    text: "A decisão foi publicada — “sem prejuízo de” eventual recurso — conforme o §2º do artigo.",
    expected: {
      findings: [
        { criterion: "passive_voice", severity: "warning", start: 10, end: 23, spanText: "foi publicada", requiresHuman: true },
      ],
      metrics: { words: 14, sentences: 1 },
    },
    notes: "'sem prejuízo de' está entre aspas curvas “ ” → suprimido pela guarda de aspas. Offsets preservados apesar de travessão e §.",
  },
  {
    id: "multiplos_paragrafos",
    description: "três parágrafos separados por linha em branco; offset global preservado",
    text: "Primeiro parágrafo curto.\n\nSegundo parágrafo com o documento supracitado e a análise que se fez.\n\nTerceiro.",
    expected: {
      findings: [
        { criterion: "jargon", severity: "warning", start: 61, end: 72, spanText: "supracitado", requiresHuman: false, suggestion: "citado acima" },
      ],
      metrics: { words: 16, sentences: 3 },
    },
    notes: "'a análise que se fez' não é nominalização verbo-leve (não há verbo leve + determinante + nominalização adjacentes).",
  },
  {
    id: "emoji_antes_do_finding",
    description: "emoji (par surrogate UTF-16) antes de um finding — desloca offsets em 2 code units",
    text: "Tudo certo 😀 mas o documento supracitado precisa de ajuste.",
    expected: {
      findings: [
        { criterion: "jargon", severity: "warning", start: 30, end: 41, spanText: "supracitado", requiresHuman: false, suggestion: "citado acima" },
      ],
      metrics: { words: 9, sentences: 1 },
    },
    notes: "😀 (U+1F600) ocupa 2 code units UTF-16; o span de 'supracitado' reflete esse deslocamento e ainda reconstrói via slice.",
  },
  {
    id: "texto_vazio",
    description: "string vazia — nenhum finding, métricas zeradas, placar com 4 critérios em zero",
    text: "",
    expected: { findings: [], metrics: { words: 0, sentences: 0 } },
  },
  {
    id: "apenas_espacos",
    description: "somente espaços — tratado como vazio para fins de finding e métrica",
    text: "     ",
    expected: { findings: [], metrics: { words: 0, sentences: 0 } },
  },
  {
    id: "curto_e_claro",
    description: "frase curta e clara — nenhum finding",
    text: "O gato dorme.",
    expected: { findings: [], metrics: { words: 3, sentences: 1 } },
  },
  {
    id: "pontuacao_incomum_suportada",
    description: "abreviação, e-mail, URL, parênteses, ponto-e-vírgula, ordinal — tokenizados sem gerar finding",
    text: "O prazo (art. 5º) vale; veja o e-mail contato@exemplo.com.br e o site https://gov.br agora.",
    expected: { findings: [], metrics: { words: 12, sentences: 1 } },
    notes: "e-mail e URL são tokens únicos não-palavra; 'art.' não quebra a frase (abreviação). Zero findings.",
  },
];
