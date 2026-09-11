import type { AnalysisLocaleId } from "../locale/active";

export const SAMPLE_TEXT = `Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo destinado à verificação das condições supracitadas exigidas para a concessão do benefício, e a decisão foi comunicada ao interessado no processo.

É preciso fazer a verificação dos requisitos antes do prazo final. Doravante, o requerimento supramencionado será apreciado pela autoridade responsável, sem prejuízo de eventual recurso.

As contas foram aprovadas. O pagamento da taxa deve ser feito na hipótese de deferimento.`;

export const SAMPLE_TEXT_EN = `We have received your application for the benefit, and after reviewing the documents you sent together with the form that was filed at the regional office last month, we need more information before a decision can be made.

Please send a copy of your lease. Send a recent utility bill too. Mr. Lee at the regional office can help. Call him on weekdays. He answers most calls the same day. Forms sent by mail take longer. Forms sent online arrive at once. We keep your file open for thirty days. After that, you must apply again.

Applicants shall make an application to the SSA within 30 days. Bring these documents: a photo ID, proof of address, and your lease.

The deadline is March 31.`;

export const SAMPLES: Record<AnalysisLocaleId, string> = {
  "pt-BR": SAMPLE_TEXT,
  "en-US": SAMPLE_TEXT_EN,
};
