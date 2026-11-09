import { APP_RELEASE } from "./version";
import { Confidence, Market, MatchAnalysis, Pick } from "./types";

const API_BASE = "https://v3.football.api-sports.io";
const TZ = "America/Sao_Paulo";
const TOP_LEAGUES = new Set([39, 140, 135, 78, 61, 2, 3, 71, 94, 88, 203, 307, 848, 253, 262, 144, 13, 11, 128, 40, 41, 45, 143, 137, 66]);

type Fixture = {
  fixture: { id: number; date: string; status: { short: string }; venue?: { name?: string | null } };
  league: { id: number; name: string; country: string; season: number };
  teams: { home: { id: number; name: string; logo?: string }; away: { id: number; name: string; logo?: string } };
  goals: { home: number | null; away: number | null };
};

type ApiResult<T> = {
  response: T[];
  quota: { remaining: string | null; limit: string | null };
};

type RecentTeamGame = {
  fixtureId: number;
  teamId: number;
  scored: number;
  conceded: number;
};

const cache = new Map<string, { expires: number; value: unknown }>();

function readCache<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  if (hit) cache.delete(key);
  return undefined;
}
function writeCache(key: string, value: unknown, ttlMs = 6 * 60 * 60 * 1000) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function apiGet<T>(path: string, params: Record<string, string>, apiKey: string): Promise<ApiResult<T>> {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const cacheKey = url.toString();
  const cached = readCache<ApiResult<T>>(cacheKey);
  if (cached) return cached;

  const response = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 21600 }
  });
  if (!response.ok) throw new Error(`API-Football HTTP ${response.status} em ${path}`);
  const body = await response.json();
  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(body.errors)}`);
  }
  const result: ApiResult<T> = {
    response: body.response ?? [],
    quota: {
      remaining: response.headers.get("x-ratelimit-requests-remaining"),
      limit: response.headers.get("x-ratelimit-requests-limit")
    }
  };
  writeCache(cacheKey, result);
  return result;
}

function brDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function poisson(lambda: number, k: number): number {
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial;
}

function asianSettlement(margin: number, line: number): number {
  const isQuarter = Math.abs(line * 2 - Math.round(line * 2)) > 1e-8;
  if (!isQuarter) {
    const result = margin + line;
    return result > 1e-8 ? 1 : result < -1e-8 ? -1 : 0;
  }
  const lower = Math.floor(line * 2) / 2;
  const upper = Math.ceil(line * 2) / 2;
  const settle = (l: number) => {
    const result = margin + l;
    return result > 1e-8 ? 1 : result < -1e-8 ? -1 : 0;
  };
  return (settle(lower) + settle(upper)) / 2;
}

function coverProbability(favoriteMean: number, underdogMean: number, handicap: number): number {
  let cover = 0;
  // handicap is expressed from the selected team's perspective.
  for (let fav = 0; fav <= 18; fav++) {
    const pf = poisson(favoriteMean, fav);
    for (let dog = 0; dog <= 18; dog++) {
      const pd = poisson(underdogMean, dog);
      const outcome = asianSettlement(fav - dog, handicap);
      if (outcome > 0) cover += pf * pd;
    }
  }
  return Math.max(0, Math.min(1, cover));
}

function confidence(probability: number, sampleQuality: number): Confidence {
  if (sampleQuality < 0.6) return "Baixa";
  if (probability >= 0.72 && sampleQuality >= 0.9) return "Alta";
  return "Média";
}

function chooseLines(favMean: number, dogMean: number, market: Market) {
  const favoriteMax = market === "goals" ? 2 : 5;
  const dogMax = market === "goals" ? 4.5 : 12;
  let favoriteLine = 0.5;
  let favoriteProbability = 0;
  let favoriteDistance = Infinity;
  for (let line = 0.5; line <= favoriteMax; line += 0.25) {
    const p = coverProbability(favMean, dogMean, -line);
    const distance = Math.abs(p - 0.65);
    if (distance < favoriteDistance) {
      favoriteDistance = distance;
      favoriteLine = line;
      favoriteProbability = p;
    }
  }

  let underdogLine = 2;
  let underdogProbability = 0;
  let underdogDistance = Infinity;
  for (let line = 2; line <= dogMax; line += 0.25) {
    const p = coverProbability(dogMean, favMean, line);
    const distance = Math.abs(p - 0.90);
    if (distance < underdogDistance) {
      underdogDistance = distance;
      underdogLine = line;
      underdogProbability = p;
    }
  }
  return { favoriteLine, favoriteProbability, underdogLine, underdogProbability };
}

function makePicks(
  market: Market, home: string, away: string, homeMean: number, awayMean: number, quality: number
): Pick[] {
  const homeIsFavorite = homeMean >= awayMean;
  const favorite = homeIsFavorite ? home : away;
  const underdog = homeIsFavorite ? away : home;
  const favoriteMean = homeIsFavorite ? homeMean : awayMean;
  const underdogMean = homeIsFavorite ? awayMean : homeMean;
  const lines = chooseLines(favoriteMean, underdogMean, market);
  const label = market === "goals" ? "gols" :
    market === "corners" ? "escanteios" :
    market === "cards" ? "cartões" :
    market === "shots" ? "finalizações" : "chutes no alvo";

  return [
    {
      side: "favorite", team: favorite, line: -lines.favoriteLine,
      probability: lines.favoriteProbability,
      confidence: confidence(lines.favoriteProbability, quality),
      reason: `A projeção de ${label} favorece ${favorite}; a linha negativa busca aproximadamente 65% de cobertura.`,
      market
    },
    {
      side: "underdog", team: underdog, line: lines.underdogLine,
      probability: lines.underdogProbability,
      confidence: confidence(lines.underdogProbability, quality),
      reason: `A linha positiva protege ${underdog}; o modelo procura aproximadamente 90% de cobertura, sem garantia de resultado.`,
      market
    }
  ];
}

function statValue(stats: Array<{ type: string; value: string | number | null }>, names: string[]): number | null {
  for (const item of stats ?? []) {
    if (!names.includes(item.type) || item.value === null) continue;
    const value = typeof item.value === "number"
      ? item.value
      : Number(String(item.value).replace("%", ""));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

const STAT_NAMES: Record<Exclude<Market, "goals">, string[]> = {
  corners: ["Corner Kicks"],
  cards: ["Yellow Cards", "Red Cards"],
  shots: ["Total Shots"],
  shots_on_target: ["Shots on Goal"]
};

function fixtureForTeam(fixture: Fixture, teamId: number): RecentTeamGame | null {
  const homeId = fixture.teams.home.id;
  const awayId = fixture.teams.away.id;
  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;
  if (homeGoals === null || awayGoals === null) return null;
  if (teamId === homeId) return {
    fixtureId: fixture.fixture.id, teamId, scored: homeGoals, conceded: awayGoals
  };
  if (teamId === awayId) return {
    fixtureId: fixture.fixture.id, teamId, scored: awayGoals, conceded: homeGoals
  };
  return null;
}

async function recentGames(teamId: number, season: number, apiKey: string): Promise<RecentTeamGame[]> {
  const result = await apiGet<Fixture>("/fixtures", {
    team: String(teamId), last: "5", season: String(season), status: "FT", timezone: TZ
  }, apiKey);
  return result.response
    .map(fixture => fixtureForTeam(fixture, teamId))
    .filter((game): game is RecentTeamGame => game !== null);
}

async function fixtureStats(fixtureId: number, apiKey: string) {
  const result = await apiGet<Array<{ team: { id: number }; statistics: Array<{ type: string; value: string | number | null }> }>>(
    "/fixtures/statistics", { fixture: String(fixtureId) }, apiKey
  );
  return result.response;
}

function avgStatsForTeam(
  rows: Array<{ team: { id: number }; statistics: Array<{ type: string; value: string | number | null }> }>,
  teamId: number,
  market: Exclude<Market, "goals">
) {
  const values: number[] = [];
  for (const row of rows) {
    if (row.team?.id !== teamId) continue;
    const value = statValue(row.statistics, STAT_NAMES[market]);
    if (value !== null) {
      // Cards are total bookings; count yellow + red when both are provided.
      if (market === "cards") {
        const yellow = statValue(row.statistics, ["Yellow Cards"]) ?? 0;
        const red = statValue(row.statistics, ["Red Cards"]) ?? 0;
        values.push(yellow + red);
      } else {
        values.push(value);
      }
    }
  }
  return { average: mean(values), sample: values.length };
}

function sortFixtures(a: Fixture, b: Fixture) {
  const score = (f: Fixture) => TOP_LEAGUES.has(f.league.id) ? 1 : 0;
  return score(b) - score(a) || a.fixture.date.localeCompare(b.fixture.date);
}

export async function getTodayAnalysis() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("Variável API_FOOTBALL_KEY não encontrada na configuração da Vercel.");

  const date = brDate();
  const fixturesResult = await apiGet<Fixture>("/fixtures", { date, timezone: TZ }, apiKey);
  const allFixtures = fixturesResult.response
    .filter(f => f.teams?.home?.id && f.teams?.away?.id)
    .sort(sortFixtures);

  const maxMatches = Math.max(1, Math.min(3, Number(process.env.MAX_MATCHES_TO_ANALYZE || 2)));
  const selected = allFixtures.slice(0, maxMatches);
  const analyses: MatchAnalysis[] = [];
  const statsByFixture = new Map<number, Awaited<ReturnType<typeof fixtureStats>>>();

  for (const fixture of selected) {
    const season = fixture.league.season || Number(date.slice(0, 4));
    const [homeRecent, awayRecent] = await Promise.all([
      recentGames(fixture.teams.home.id, season, apiKey),
      recentGames(fixture.teams.away.id, season, apiKey)
    ]);

    const recentIds = Array.from(new Set([...homeRecent, ...awayRecent].map(g => g.fixtureId)));
    for (const id of recentIds) {
      if (!statsByFixture.has(id)) {
        statsByFixture.set(id, await fixtureStats(id, apiKey));
      }
    }

    const homeGoals = mean(homeRecent.map(g => g.scored));
    const awayGoals = mean(awayRecent.map(g => g.scored));
    const homeConceded = mean(homeRecent.map(g => g.conceded));
    const awayConceded = mean(awayRecent.map(g => g.conceded));

    const expectedHome = Math.max(0.15, ((homeGoals ?? 1.25) + (awayConceded ?? 1.25)) / 2);
    const expectedAway = Math.max(0.15, ((awayGoals ?? 1.0) + (homeConceded ?? 1.0)) / 2);

    const allRecent = [...homeRecent, ...awayRecent];
    const quality = Math.min(1, Math.min(homeRecent.length, awayRecent.length) / 5);
    const markets = {} as MatchAnalysis["markets"];

    markets.goals = {
      home: expectedHome, away: expectedAway,
      picks: makePicks("goals", fixture.teams.home.name, fixture.teams.away.name, expectedHome, expectedAway, quality),
      available: homeRecent.length >= 3 && awayRecent.length >= 3,
      sampleHome: homeRecent.length, sampleAway: awayRecent.length,
      note: "Projeção própria de gols baseada nos gols marcados e sofridos nos últimos cinco jogos; não é xG oficial."
    };

    const nonGoalMarkets: Array<Exclude<Market, "goals">> = ["corners", "cards", "shots", "shots_on_target"];
    for (const market of nonGoalMarkets) {
      const homeRows = homeRecent.map(g => statsByFixture.get(g.fixtureId) ?? []).flat();
      const awayRows = awayRecent.map(g => statsByFixture.get(g.fixtureId) ?? []).flat();
      const homeStats = avgStatsForTeam(homeRows, fixture.teams.home.id, market);
      const awayStats = avgStatsForTeam(awayRows, fixture.teams.away.id, market);
      const available = homeStats.sample >= 3 && awayStats.sample >= 3 &&
        homeStats.average !== null && awayStats.average !== null;
      const homeMean = homeStats.average ?? 0;
      const awayMean = awayStats.average ?? 0;
      markets[market] = {
        home: homeMean, away: awayMean,
        picks: available ? makePicks(market, fixture.teams.home.name, fixture.teams.away.name, homeMean, awayMean, quality) : [],
        available,
        sampleHome: homeStats.sample,
        sampleAway: awayStats.sample,
        note: available
          ? `Médias calculadas em ${homeStats.sample} jogos do mandante e ${awayStats.sample} do visitante.`
          : "A API não retornou pelo menos três amostras válidas para cada equipe; palpites ocultados."
      };
    }

    analyses.push({
      id: fixture.fixture.id,
      home: fixture.teams.home.name,
      away: fixture.teams.away.name,
      homeLogo: fixture.teams.home.logo,
      awayLogo: fixture.teams.away.logo,
      league: fixture.league.name,
      country: fixture.league.country,
      kickoff: fixture.fixture.date,
      status: fixture.fixture.status.short,
      markets,
      dataQuality: quality
    });
  }

  const quota = fixturesResult.quota;
  return {
    date,
    timezone: TZ,
    matches: analyses,
    totalFixtures: allFixtures.length,
    quota,
    message: allFixtures.length === 0
      ? "A API-Football não retornou partidas para a data consultada."
      : "Dados consultados na API-Football. Mercados sem amostra mínima não recebem palpites.",
    release: APP_RELEASE
  };
}
