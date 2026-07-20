/**
 * Registro de passes ativos da Camada 1 (docs/ARQUITETURA.md §2, §9 Fase 1 item 10).
 *
 * A ORDEM aqui só determina a sequência de EXECUÇÃO — nunca a ordem final dos
 * findings, que é sempre recanonizada por `sortFindings` em `analyzer.ts`,
 * independente de como os passes estão listados neste array.
 *
 * Nesta etapa, contém só `sentenceLengthPass` (`long_sentence`). Voz passiva,
 * nominalização e jargão entram aqui quando forem implementados — fora de escopo
 * desta etapa (ver docs/ARQUITETURA.md §9 Fase 1, itens 7–9).
 */
import type { Pass } from "../types";
import { sentenceLengthPass } from "./sentence-length";

export const PASSES: readonly Pass[] = [sentenceLengthPass];
