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
  expectedFavorite: number;
  expectedUnderdog: number;
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
  venue?: string;
  expectedGoals: { home: number; away: number };
  markets: Record<Market, { home: number; away: number; picks: Pick[]; available: boolean; note?: string }>;
  dataQuality: number;
};
export type ApiResponse = {
  mode: "live" | "demo" | "error";
  date: string;
  timezone: string;
  matches: MatchAnalysis[];
  message: string;
  quota?: { remaining: string | null; limit: string | null };
};
export const MARKET_LABELS: Record<Market,string> = {
  goals:"Handicap de gols", corners:"Handicap de escanteios",
  cards:"Handicap de cartões", shots:"Handicap de finalizações",
  shots_on_target:"Handicap de chutes no alvo"
};
export const MARKETS: Market[] = ["goals","corners","cards","shots","shots_on_target"];
