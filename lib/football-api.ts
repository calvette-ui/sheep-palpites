import { APP_RELEASE } from "./version";
import { Confidence, Market, MatchAnalysis, Pick } from "./types";

const API_BASE = "https://v3.football.api-sports.io";
const TZ = "America/Sao_Paulo";

const TOP_LEAGUES = new Set([
  39, 140, 135, 78, 61, 2, 3, 71, 94, 88, 203, 307, 848, 253, 262,
  144, 13, 11, 128, 40, 41, 45, 143, 137, 66
]);

type TeamSide = { id: number; name: string; logo?: string };
type Fixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
    venue?: { name?: string | null };
  };
  league: { id: number; name: string; country: string; season: number };
  teams: { home: TeamSide; away: TeamSide };
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
  season: number;
};

type FixtureStatistic = {
  team: { id: number };
  statistics: Array<{
    type: string;
    value: string | number | null;
  }>;
};

const cache = new Map<string, { expires: number; value: unknown }>();

function readCache<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function writeCache(key: string, value: unknown, ttlMs = 6 * 60 * 60 * 1000) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function apiGet<T>(
  path: string,
  params: Record<string, string>,
  apiKey: string
): Promise<ApiResult<T>> {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const cacheKey = url.toString();
  const cached = readCache<ApiResult<T>>(cacheKey);
  if (cached) return cached;

  const response = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
    next: { revalidate: 21600 }
  });

  if (!response.ok) {
    throw new Error(`API-Football HTTP ${response.status} em ${path}`);
  }

  const body = await response.json();

  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(body.errors)}`);
  }

  const result: ApiResult<T> = {
    response: (body.response ?? []) as T[],
    quota: {
      remaining: response.headers.get("x-ratelimit-requests-remaining"),
      limit: response.headers.get("x-ratelimit-requests-limit")
    }
  };

  writeCache(cacheKey, result);
  return result;
}

function getBrazilDate(): string {
  // Monta YYYY-MM-DD explicitamente: alguns runtimes retornam MM/DD/YYYY
  // mesmo com locale en-CA, o que quebrava a data exibida no painel.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function poisson(lambda: number, k: number): number {
  let factorial = 1;
  for (let i = 2; i <= k; i += 1) factorial *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial;
}

/**
 * Resultado do handicap para uma margem observada.
 * +1 = vitória integral, 0 = devolução, -1 = derrota integral.
 * Linhas de quarto são divididas em duas linhas de meio ponto.
 */
function settleAsian(margin: number, line: number): number {
  const isQuarterLine = Math.abs(line * 2 - Math.round(line * 2)) > 1e-8;

  if (!isQuarterLine) {
    const result = margin + line;
    return result > 1e-8 ? 1 : result < -1e-8 ? -1 : 0;
  }

  const lowerLine = Math.floor(line * 2) / 2;
  const upperLine = Math.ceil(line * 2) / 2;

  const settleHalfLine = (halfLine: number) => {
    const result = margin + halfLine;
    return result > 1e-8 ? 1 : result < -1e-8 ? -1 : 0;
  };

  return (settleHalfLine(lowerLine) + settleHalfLine(upperLine)) / 2;
}

function coverProbability(
  favoriteMean: number,
  underdogMean: number,
  handicap: number
): number {
  let probability = 0;

  for (let favoriteGoals = 0; favoriteGoals <= 18; favoriteGoals += 1) {
    const favoriteProbability = poisson(favoriteMean, favoriteGoals);

    for (let underdogGoals = 0; underdogGoals <= 18; underdogGoals += 1) {
      const underdogProbability = poisson(underdogMean, underdogGoals);
      const outcome = settleAsian(
        favoriteGoals - underdogGoals,
        handicap
      );

      if (outcome > 0) {
        probability += favoriteProbability * underdogProbability;
      }
    }
  }

  return Math.max(0, Math.min(1, probability));
}

function getConfidence(
  probability: number,
  sampleQuality: number
): Confidence {
  if (sampleQuality < 0.6) return "Baixa";
  if (probability >= 0.72 && sampleQuality >= 0.9) return "Alta";
  return "Média";
}

function chooseLines(
  favoriteMean: number,
  underdogMean: number,
  market: Market
) {
  const favoriteMax = market === "goals" ? 2 : 5;
  const underdogMax = market === "goals" ? 4.5 : 12;

  let favoriteLine = 0.5;
  let favoriteProbability = 0;
  let favoriteDistance = Number.POSITIVE_INFINITY;

  for (
    let line = 0.5;
    line <= favoriteMax + 1e-8;
    line += 0.25
  ) {
    const probability = coverProbability(
      favoriteMean,
      underdogMean,
      -line
    );
    const distance = Math.abs(probability - 0.65);

    if (distance < favoriteDistance) {
      favoriteDistance = distance;
      favoriteLine = line;
      favoriteProbability = probability;
    }
  }

  let underdogLine = 2;
  let underdogProbability = 0;
  let underdogDistance = Number.POSITIVE_INFINITY;

  for (
    let line = 2;
    line <= underdogMax + 1e-8;
    line += 0.25
  ) {
    const probability = coverProbability(
      underdogMean,
      favoriteMean,
      line
    );
    const distance = Math.abs(probability - 0.9);

    if (distance < underdogDistance) {
      underdogDistance = distance;
      underdogLine = line;
      underdogProbability = probability;
    }
  }

  return {
    favoriteLine,
    favoriteProbability,
    underdogLine,
    underdogProbability
  };
}

function makePicks(
  market: Market,
  home: string,
  away: string,
  homeMean: number,
  awayMean: number,
  quality: number
): Pick[] {
  const homeIsFavorite = homeMean >= awayMean;
  const favorite = homeIsFavorite ? home : away;
  const underdog = homeIsFavorite ? away : home;
  const favoriteMean = homeIsFavorite ? homeMean : awayMean;
  const underdogMean = homeIsFavorite ? awayMean : homeMean;
  const lines = chooseLines(favoriteMean, underdogMean, market);

  const marketName =
    market === "goals"
      ? "gols"
      : market === "corners"
        ? "escanteios"
        : market === "cards"
          ? "cartões"
          : market === "shots"
            ? "finalizações"
            : "chutes no alvo";

  return [
    {
      side: "favorite",
      team: favorite,
      line: -lines.favoriteLine,
      probability: lines.favoriteProbability,
      confidence: getConfidence(lines.favoriteProbability, quality),
      reason: `A projeção de ${marketName} favorece ${favorite}; a linha negativa busca aproximadamente 65% de cobertura.`,
      market
    },
    {
      side: "underdog",
      team: underdog,
      line: lines.underdogLine,
      probability: lines.underdogProbability,
      confidence: getConfidence(lines.underdogProbability, quality),
      reason: `A linha positiva protege ${underdog}; o modelo procura aproximadamente 90% de cobertura, sem garantia de resultado.`,
      market
    }
  ];
}

function getStatValue(
  statistics: FixtureStatistic["statistics"],
  acceptedNames: string[]
): number | null {
  for (const item of statistics ?? []) {
    if (!acceptedNames.includes(item.type) || item.value === null) continue;

    const value =
      typeof item.value === "number"
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

function getFixtureForTeam(
  fixture: Fixture,
  teamId: number,
  season: number
): RecentTeamGame | null {
  const homeGoals = fixture.goals.home;
  const awayGoals = fixture.goals.away;

  if (homeGoals === null || awayGoals === null) return null;

  if (teamId === fixture.teams.home.id) {
    return {
      fixtureId: fixture.fixture.id,
      teamId,
      scored: homeGoals,
      conceded: awayGoals,
      season
    };
  }

  if (teamId === fixture.teams.away.id) {
    return {
      fixtureId: fixture.fixture.id,
      teamId,
      scored: awayGoals,
      conceded: homeGoals,
      season
    };
  }

  return null;
}

async function getRecentGames(
  teamId: number,
  requestedSeason: number,
  apiKey: string
): Promise<RecentTeamGame[]> {
  // A chave gratuita da API-Football pode bloquear a temporada atual.
  // Tentamos a temporada solicitada e, se bloqueada, apenas temporadas
  // históricas explicitamente liberadas pela própria mensagem da API.
  const seasonsToTry = Array.from(
    new Set([requestedSeason, 2024, 2023, 2022])
  );

  let lastError: unknown;

  for (const season of seasonsToTry) {
    try {
      // O parâmetro "last" não é aceito em alguns planos gratuitos.
      // Buscamos a temporada por intervalo de datas e selecionamos os
      // cinco jogos concluídos mais recentes localmente.
      const result = await apiGet<Fixture>(
        "/fixtures",
        {
          team: String(teamId),
          season: String(season),
          from: `${season}-01-01`,
          to: `${season}-12-31`,
          status: "FT",
          timezone: TZ
        },
        apiKey
      );

      return result.response
        .filter((fixture) => fixture.fixture?.status?.short === "FT")
        .sort((a, b) =>
          new Date(b.fixture.date).getTime() -
          new Date(a.fixture.date).getTime()
        )
        .slice(0, 5)
        .map((fixture) => getFixtureForTeam(fixture, teamId, season))
        .filter((game): game is RecentTeamGame => game !== null);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      // Só tenta temporada antiga quando a API indica bloqueio de plano.
      if (!message.toLowerCase().includes("free plans do not have access")) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Não foi possível consultar temporadas disponíveis na API-Football.");
}

async function getFixtureStatistics(
  fixtureId: number,
  apiKey: string
): Promise<FixtureStatistic[]> {
  // IMPORTANTE: o tipo genérico é FixtureStatistic, não FixtureStatistic[].
  // apiGet já transforma a resposta da API em uma lista T[].
  const result = await apiGet<FixtureStatistic>(
    "/fixtures/statistics",
    { fixture: String(fixtureId) },
    apiKey
  );

  return result.response;
}

function getTeamMarketAverage(
  rows: FixtureStatistic[],
  teamId: number,
  market: Exclude<Market, "goals">
): { average: number | null; sample: number } {
  const values: number[] = [];

  for (const row of rows) {
    if (row.team?.id !== teamId) continue;

    if (market === "cards") {
      const yellow = getStatValue(row.statistics, ["Yellow Cards"]);
      const red = getStatValue(row.statistics, ["Red Cards"]);

      if (yellow !== null || red !== null) {
        values.push((yellow ?? 0) + (red ?? 0));
      }
      continue;
    }

    const value = getStatValue(row.statistics, STAT_NAMES[market]);
    if (value !== null) values.push(value);
  }

  return {
    average: mean(values),
    sample: values.length
  };
}

function sortFixtures(a: Fixture, b: Fixture): number {
  const score = (fixture: Fixture) =>
    TOP_LEAGUES.has(fixture.league.id) ? 1 : 0;

  return (
    score(b) - score(a) ||
    a.fixture.date.localeCompare(b.fixture.date)
  );
}

export async function getTodayAnalysis() {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error(
      "Variável API_FOOTBALL_KEY não encontrada na configuração da Vercel."
    );
  }

  const date = getBrazilDate();

  const fixturesResult = await apiGet<Fixture>(
    "/fixtures",
    { date, timezone: TZ },
    apiKey
  );

  const allFixtures = fixturesResult.response
    .filter(
      (fixture) =>
        fixture.teams?.home?.id && fixture.teams?.away?.id
    )
    .sort(sortFixtures);

  const maxMatches = Math.max(
    1,
    Math.min(3, Number(process.env.MAX_MATCHES_TO_ANALYZE || 2))
  );

  const selectedFixtures = allFixtures.slice(0, maxMatches);
  const analyses: MatchAnalysis[] = [];

  // Cada valor do Map é uma lista plana de estatísticas dos dois times.
  const statsByFixture = new Map<number, FixtureStatistic[]>();

  for (const fixture of selectedFixtures) {
    const season =
      fixture.league.season || Number(date.slice(0, 4));

    const [homeRecent, awayRecent] = await Promise.all([
      getRecentGames(fixture.teams.home.id, season, apiKey),
      getRecentGames(fixture.teams.away.id, season, apiKey)
    ]);

    const recentFixtureIds = Array.from(
      new Set([
        ...homeRecent.map((game) => game.fixtureId),
        ...awayRecent.map((game) => game.fixtureId)
      ])
    );

    for (const fixtureId of recentFixtureIds) {
      if (!statsByFixture.has(fixtureId)) {
        const statistics = await getFixtureStatistics(
          fixtureId,
          apiKey
        );
        statsByFixture.set(fixtureId, statistics);
      }
    }

    const homeGoals = mean(homeRecent.map((game) => game.scored));
    const awayGoals = mean(awayRecent.map((game) => game.scored));
    const homeConceded = mean(homeRecent.map((game) => game.conceded));
    const awayConceded = mean(awayRecent.map((game) => game.conceded));

    const expectedHome = Math.max(
      0.15,
      ((homeGoals ?? 1.25) + (awayConceded ?? 1.25)) / 2
    );

    const expectedAway = Math.max(
      0.15,
      ((awayGoals ?? 1.0) + (homeConceded ?? 1.0)) / 2
    );

    const qualityBase = Math.min(
      1,
      Math.min(homeRecent.length, awayRecent.length) / 5
    );
    const requestedSeason = fixture.league.season || Number(date.slice(0, 4));
    const usedHistoricalFallback = [...homeRecent, ...awayRecent].some(
      (game) => game.season !== requestedSeason
    );
    // Dados de 2022–2024 não devem receber confiança média/alta em jogos atuais.
    const quality = usedHistoricalFallback ? qualityBase * 0.35 : qualityBase;
    const historicalNotice = usedHistoricalFallback
      ? " ATENÇÃO: plano da API bloqueou a temporada atual; foram usados dados históricos de 2022–2024, com confiança reduzida."
      : "";

    const markets = {} as MatchAnalysis["markets"];

    markets.goals = {
      home: expectedHome,
      away: expectedAway,
      picks: makePicks(
        "goals",
        fixture.teams.home.name,
        fixture.teams.away.name,
        expectedHome,
        expectedAway,
        quality
      ),
      available: homeRecent.length >= 3 && awayRecent.length >= 3,
      sampleHome: homeRecent.length,
      sampleAway: awayRecent.length,
      note:
        "Projeção própria baseada em gols marcados e sofridos nos últimos cinco jogos; não é xG oficial." +
        historicalNotice
    };

    const nonGoalMarkets: Array<Exclude<Market, "goals">> = [
      "corners",
      "cards",
      "shots",
      "shots_on_target"
    ];

    for (const market of nonGoalMarkets) {
      // flatMap garante FixtureStatistic[], não FixtureStatistic[][].
      const homeRows: FixtureStatistic[] = homeRecent.flatMap(
        (game) => statsByFixture.get(game.fixtureId) ?? []
      );

      const awayRows: FixtureStatistic[] = awayRecent.flatMap(
        (game) => statsByFixture.get(game.fixtureId) ?? []
      );

      const homeStats = getTeamMarketAverage(
        homeRows,
        fixture.teams.home.id,
        market
      );

      const awayStats = getTeamMarketAverage(
        awayRows,
        fixture.teams.away.id,
        market
      );

      const available =
        homeStats.sample >= 3 &&
        awayStats.sample >= 3 &&
        homeStats.average !== null &&
        awayStats.average !== null;

      const homeMean = homeStats.average ?? 0;
      const awayMean = awayStats.average ?? 0;

      markets[market] = {
        home: homeMean,
        away: awayMean,
        picks: available
          ? makePicks(
              market,
              fixture.teams.home.name,
              fixture.teams.away.name,
              homeMean,
              awayMean,
              quality
            )
          : [],
        available,
        sampleHome: homeStats.sample,
        sampleAway: awayStats.sample,
        note: available
          ? `Médias calculadas em ${homeStats.sample} jogos do mandante e ${awayStats.sample} do visitante.${historicalNotice}`
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

  return {
    date,
    timezone: TZ,
    matches: analyses,
    totalFixtures: allFixtures.length,
    quota: fixturesResult.quota,
    message:
      allFixtures.length === 0
        ? "A API-Football não retornou partidas para a data consultada."
        : "Dados consultados na API-Football. Mercados sem amostra mínima não recebem palpites.",
    release: APP_RELEASE
  };
}
