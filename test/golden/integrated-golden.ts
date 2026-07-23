export type IntegratedCriterion =
  | "long_sentence"
  | "passive_voice"
  | "nominalization"
  | "nominalizacao_encadeada"
  | "jargon"
  | "mais_que_perfeito_sintetico"
  | "gerundismo"
  | "adverbio_mente_denso"
  | "redundancia"
  | "perifrase_inflada"
  | "paragraph_length"
  | "prose_enumeration"
  | "mesoclise"
  | "dupla_negacao"
  | "subordinacao_densa"
  | "leitor_terceira_pessoa"
  | "salto_de_nivel_titulo"
  | "long_heading"
  | "single_item_list"
  | "heading_body_mismatch";

export interface ExpectedFinding {
  criterion: IntegratedCriterion;
  severity: "info" | "warning" | "error";
  start: number;
  end: number;
  spanText: string;
  requiresHuman: boolean;
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
        { criterion: "nominalizacao_encadeada", severity: "info", start: 28, end: 37, spanText: "avaliação", requiresHuman: true },
        { criterion: "nominalizacao_encadeada", severity: "info", start: 125, end: 136, spanText: "deliberação", requiresHuman: true },
        { criterion: "nominalizacao_encadeada", severity: "info", start: 173, end: 195, spanText: "entrega dos documentos", requiresHuman: true },
      ],
      metrics: { words: 29, sentences: 1 },
    },
    notes:
      "Não dispara nominalização com verbo-suporte ('avaliação' vem de 'pela', não de verbo leve) nem passiva ('apresentadas' é relativa reduzida sem 'ser') — precisão sobre recall, correto por design. A nominalização SEM verbo-suporte (ADR-051) dispara: densidade (3 substantivos de ação na frase) marca 'avaliação' e 'deliberação'; 'entrega dos documentos' é cadeia fraca (elo só por sufixo) — tudo info, requiresHuman.",
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
    id: "nominalizacao_mapeamento_unico",
    description: "duas nominalizações verbo-leve com mapeamento único (requiresHuman false, sem sugestão — ADR-054)",
    text: "É preciso fazer a análise de documentos. Também convém realizar o pagamento da taxa.",
    expected: {
      findings: [
        { criterion: "nominalization", severity: "warning", start: 10, end: 25, spanText: "fazer a análise", requiresHuman: false },
        { criterion: "nominalization", severity: "warning", start: 55, end: 75, spanText: "realizar o pagamento", requiresHuman: false },
        { criterion: "nominalizacao_encadeada", severity: "info", start: 18, end: 39, spanText: "análise de documentos", requiresHuman: true },
      ],
      metrics: { words: 14, sentences: 2 },
    },
    notes:
      "Desde o ADR-054 a engine não compõe troca: o span cobre só o núcleo verbo-leve+determinante+nominalização, e o verbo-base ('analisar', 'pagar') vai em meta/justification como informação. Sobreposição deliberada com a cadeia fraca do ADR-051 ('análise de documentos'), que só marca. 'pagamento da taxa' não encadeia ('taxa' sem sufixo deverbal).",
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
        { criterion: "nominalization", severity: "warning", start: 50, end: 69, spanText: "fazer a verificação", requiresHuman: false },
        { criterion: "nominalizacao_encadeada", severity: "info", start: 58, end: 84, spanText: "verificação dos documentos", requiresHuman: true },
        { criterion: "jargon", severity: "warning", start: 85, end: 97, spanText: "supracitados", requiresHuman: false, suggestion: "citados acima" },
        { criterion: "jargon", severity: "warning", start: 117, end: 127, spanText: "em sede de", requiresHuman: false, suggestion: "no âmbito de" },
      ],
      metrics: { words: 29, sentences: 1 },
    },
    notes:
      "'fazer a verificação' tem mapeamento único (verificar) → requiresHuman false; sem sugestão composta (ADR-054). long_sentence é 'warning' (29 palavras, entre 20 e 30).",
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
        { criterion: "nominalization", severity: "warning", start: 76, end: 91, spanText: "fazer a análise", requiresHuman: false },
      ],
      metrics: { words: 19, sentences: 1 },
    },
    notes: "19 palavras — abaixo do limiar de 20, então NÃO é frase longa, apesar de densa. 'fazer a análise' → mapeamento único (analisar), requiresHuman false; sem sugestão composta (ADR-054).",
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
  {
    id: "subordinacao_densa_tres_conectivos",
    description: "três locuções subordinativas encadeadas numa frase (densidade ≥3)",
    text: "Para que o pedido avance, desde que haja verba, uma vez que o setor aprove, o processo segue.",
    expected: {
      findings: [
        {
          criterion: "subordinacao_densa",
          severity: "warning",
          start: 0,
          end: 93,
          spanText: "Para que o pedido avance, desde que haja verba, uma vez que o setor aprove, o processo segue.",
          requiresHuman: true,
        },
      ],
      metrics: { words: 18, sentences: 1 },
    },
    notes:
      "conta 'para que' + 'desde que' + 'uma vez que' = 3 conectivos inequívocos; o alvo é a frase (passage). Só este finding.",
  },
  {
    id: "leitor_terceira_pessoa_obrigacao",
    description: "leitor nomeado em 3ª pessoa (sujeito) recebendo uma obrigação",
    text: "O interessado deverá apresentar os documentos.",
    expected: {
      findings: [
        {
          criterion: "leitor_terceira_pessoa",
          severity: "info",
          start: 0,
          end: 20,
          spanText: "O interessado deverá",
          requiresHuman: true,
        },
      ],
      metrics: { words: 6, sentences: 1 },
    },
    notes:
      "sujeito ('O interessado') + verbo deôntico ('deverá') em janela local → fala SOBRE o leitor. info, requiresHuman, sem sugestão.",
  },
];
