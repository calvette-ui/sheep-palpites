/**
 * SHEEP PALPITES 2.0
 * Camada de compatibilidade para componentes da versão anterior.
 *
 * A fonte oficial de partidas é a API-Football.
 * Não utiliza partidas demonstrativas nem dados fictícios.
 */

import { getTodayAnalysis } from "./football-api";
import type { MatchAnalysis } from "./types";

// Compatibilidade temporária com arquivos antigos que importavam Match.
export type Match = MatchAnalysis;

export type MatchesResult = {
  matches: Match[];
  mode: "live";
  message: string;
  date: string;
  totalFixtures: number;
};

/**
 * Mantém a assinatura getMatches() para qualquer componente antigo
 * que ainda dependa de lib/provider.ts.
 */
export async function getMatches(): Promise<MatchesResult> {
  const analysis = await getTodayAnalysis();

  return {
    matches: analysis.matches,
    mode: "live",
    message: analysis.message,
    date: analysis.date,
    totalFixtures: analysis.totalFixtures
  };
}
