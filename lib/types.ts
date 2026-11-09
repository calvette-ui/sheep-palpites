export type Market = "goals" | "corners" | "cards" | "shots" | "shots_on_target";
export type Confidence = "Baixa" | "Média" | "Alta";
export type Pick = {
  side: "favorite" | "underdog";
  team: string;
  line: number;
  probability: number;
  confidence: Confidence;
  reason: string;
  market: Market;
};
export type Match = {
  id: string;
  home: string;
  away: string;
  league: string;
  kickoff: string;
  status: "demo" | "live";
  stats: Record<string, number>;
  expected: { home: number; away: number };
  picks: Record<Market, Pick[]>;
};
export const MARKET_LABELS: Record<Market,string> = {
  goals:"Handicap de gols", corners:"Handicap de escanteios",
  cards:"Handicap de cartões", shots:"Handicap de finalizações",
  shots_on_target:"Handicap de chutes no alvo"
};
