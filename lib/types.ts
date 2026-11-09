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
export type MarketProjection = {
  home: number;
  away: number;
  picks: Pick[];
  available: boolean;
  sampleHome: number;
  sampleAway: number;
  note: string;
};
export type MatchAnalysis = {
  id: number;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  country: string;
  kickoff: string;
  status: string;
  markets: Record<Market, MarketProjection>;
  dataQuality: number;
};
export type ApiResponse = {
  mode: "live" | "error";
  date: string;
  timezone: string;
  matches: MatchAnalysis[];
  message: string;
  release: string;
  buildId: string;
  quota?: { remaining: string | null; limit: string | null };
};
export const MARKETS: Market[] = ["goals", "corners", "cards", "shots", "shots_on_target"];
export const MARKET_LABELS: Record<Market, string> = {
  goals: "Handicap de gols",
  corners: "Handicap de escanteios",
  cards: "Handicap de cartões",
  shots: "Handicap de finalizações",
  shots_on_target: "Handicap de chutes no alvo"
};
