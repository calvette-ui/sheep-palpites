import { MatchAnalysis, Market, Pick, Confidence } from "./types";

const BASE = "https://v3.football.api-sports.io";
type AnyObj = Record<string, any>;
type Fixture = {
  fixture: { id:number; date:string; status:{short:string}; venue?:{name?:string|null} };
  league: { name:string; country:string; id:number; season:number };
  teams: { home:{id:number;name:string;logo?:string}; away:{id:number;name:string;logo?:string} };
  goals: {home:number|null;away:number|null};
};
const TOP_LEAGUES = new Set([39,140,135,78,61,2,3,71,94,88,203,307,848,253,262,144,13,11,128,40,41,45,143,137,66]);
const MARKET_STAT_KEYS: Record<Exclude<Market,"goals">,string[]> = {
  corners:["Corner Kicks"],
  cards:["Yellow Cards","Red Cards"],
  shots:["Total Shots"],
  shots_on_target:["Shots on Goal"]
};
const memoryCache = new Map<string,{until:number;value:any}>();
function cacheGet<T>(key:string):T|undefined { const v=memoryCache.get(key); if(v && v.until>Date.now()) return v.value as T; return undefined; }
function cacheSet(key:string,value:any,ttl=6*60*60*1000){memoryCache.set(key,{value,until:Date.now()+ttl});}
async function api(path:string, params:Record<string,string>, key:string) {
  const url=new URL(BASE+path); Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  const cacheKey=url.toString(); const cached=cacheGet<any>(cacheKey); if(cached) return cached;
  const res=await fetch(url.toString(),{headers:{"x-apisports-key":key},next:{revalidate:21600}});
  if(!res.ok) throw new Error(`API-Football respondeu HTTP ${res.status} em ${path}`);
  const body=await res.json();
  if(body.errors && Object.keys(body.errors).length) throw new Error(JSON.stringify(body.errors));
  const result={response:body.response??[],quota:{remaining:res.headers.get("x-ratelimit-requests-remaining"),limit:res.headers.get("x-ratelimit-requests-limit")}};
  cacheSet(cacheKey,result);
  return result;
}
function seasonFor(date:string){return Number(date.slice(0,4));}
function parseStat(stats:any[], names:string[]):number|null {
  for(const s of stats??[]) if(names.includes(s.type)) {
    const n=typeof s.value==="number"?s.value:Number(String(s.value??"").replace("%",""));
    if(Number.isFinite(n)) return n;
  }
  return null;
}
function avg(values:number[]) { return values.length?values.reduce((a,b)=>a+b,0)/values.length:0; }
function poisson(lambda:number,k:number) { let f=1;for(let i=2;i<=k;i++)f*=i;return Math.exp(-lambda)*Math.pow(lambda,k)/f; }
function settleSingle(margin:number,line:number) {
  const v=margin+line;
  if(v>0.000001) return 1;
  if(v< -0.000001) return -1;
  return 0;
}
function asianOutcome(margin:number,line:number) {
  const rounded=Math.round(line*4)/4;
  if(Math.abs(rounded*2-Math.round(rounded*2))<1e-8) return settleSingle(margin,rounded);
  const low=Math.floor(rounded*2)/2, high=Math.ceil(rounded*2)/2;
  return (settleSingle(margin,low)+settleSingle(margin,high))/2;
}
function coverProb(favMean:number,dogMean:number,line:number) {
  let win=0,push=0,loss=0;
  for(let f=0;f<=35;f++) for(let d=0;d<=35;d++) {
    const p=poisson(favMean,f)*poisson(dogMean,d);
    const result=asianOutcome(f-d,line);
    if(result>0) win+=p; else if(result<0) loss+=p; else push+=p;
  }
  // Coverage chance counts a full or half win; pushes are not counted as wins.
  return Math.min(.995,Math.max(.005,win));
}
function bestLine(favMean:number,dogMean:number,target:number,min:number,max:number,ascending:boolean) {
  let best=min,bestP=0,bestDistance=Infinity;
  const steps=Math.round((max-min)*4);
  for(let i=0;i<=steps;i++) {
    const abs=min+i*.25;
    const p=coverProb(favMean,dogMean,ascending?abs:-abs);
    const dist=Math.abs(p-target);
    if(dist<bestDistance){best=abs;bestP=p;bestDistance=dist;}
  }
  return {line:best,probability:bestP};
}
function conf(p:number,quality:number):Confidence {
  if(quality<.55) return "Baixa";
  if(p>=.68 && quality>=.78) return "Alta";
  return "Média";
}
function makePicks(market:Market,home:string,away:string,homeMean:number,awayMean:number,quality:number):Pick[] {
  const homeFav=homeMean>=awayMean;
  const fav=homeFav?home:away, dog=homeFav?away:home;
  const fm=homeFav?homeMean:awayMean, dm=homeFav?awayMean:homeMean;
  const diff=Math.max(0,fm-dm);
  const favBounds=market==="goals"?[.5,2]:[.5,4];
  const dogBounds=market==="goals"?[2,4.5]:[2,9];
  const f=bestLine(fm,dm,.65,favBounds[0],favBounds[1],false);
  // Positive handicap is evaluated from the underdog's point of view.
  const d=bestLine(dm,fm,.90,dogBounds[0],dogBounds[1],true);
  const marketPt=market==="goals"?"gols":market==="corners"?"escanteios":market==="cards"?"cartões":market==="shots"?"finalizações":"chutes no alvo";
  return [
    {side:"favorite",team:fav,line:-f.line,probability:f.probability,confidence:conf(f.probability,quality),reason:`A projeção de ${marketPt} favorece ${fav}; a linha negativa foi selecionada para buscar cobertura próxima de 65%.`,market,expectedFavorite:fm,expectedUnderdog:dm},
    {side:"underdog",team:dog,line:d.line,probability:d.probability,confidence:conf(d.probability,quality),reason:`A linha positiva oferece proteção ao ${dog}; a seleção busca aproximadamente 90% de probabilidade de cobertura, sem tratar isso como garantia.`,market,expectedFavorite:fm,expectedUnderdog:dm}
  ];
}
function pickMean(statsRows:any[],teamId:number,market:Exclude<Market,"goals">) {
  const key=MARKET_STAT_KEYS[market];
  const vals:number[]=[];
  for(const row of statsRows) {
    const team=row.team?.id===teamId;
    if(!team) continue;
    const value=parseStat(row.statistics,key);
    if(value!==null) vals.push(value);
  }
  return vals.length?avg(vals):null;
}
async function teamRecentStats(teamId:number,season:number,key:string) {
  const result=await api("/fixtures",{team:String(teamId),last:"5",season:String(season),status:"FT",timezone:"America/Sao_Paulo"},key);
  const ids=(result.response as Fixture[]).map(f=>f.fixture.id).filter(Boolean);
  // Statistics endpoint is one request per historical fixture; keep the sample to five.
  const results=await Promise.all(ids.map(id=>api("/fixtures/statistics",{fixture:String(id)},key)));
  return results.flatMap(r=>r.response);
}
function goalsForAgainst(fixtures:Fixture[],teamId:number) {
  const scored:number[]=[]; const conceded:number[]=[];
  for(const f of fixtures) {
    const isHome=f.teams.home.id===teamId;
    const own=isHome?f.goals.home:f.goals.away;
    const rival=isHome?f.goals.away:f.goals.home;
    if(typeof own==="number" && typeof rival==="number") { scored.push(own); conceded.push(rival); }
  }
  return {scored:avg(scored),conceded:avg(conceded),sample:scored.length};
}
function fixtureSort(a:Fixture,b:Fixture) {
  const score=(x:Fixture)=> (TOP_LEAGUES.has(x.league.id)?100:0) + (x.league.id===2||x.league.id===3?15:0);
  return score(b)-score(a) || a.fixture.date.localeCompare(b.fixture.date);
}
export async function getTodayAnalysis() {
  const key=process.env.API_FOOTBALL_KEY;
  if(!key) throw new Error("A variável API_FOOTBALL_KEY não está configurada na Vercel.");
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const fixturesResult=await api("/fixtures",{date,timezone:"America/Sao_Paulo"},key);
  const fixtures=(fixturesResult.response as Fixture[]).filter(f=>f.teams?.home?.id && f.teams?.away?.id).sort(fixtureSort);
  const max=Math.max(1,Math.min(5,Number(process.env.MAX_MATCHES_TO_ANALYZE||3)));
  const selected=fixtures.slice(0,max);
  const matches:MatchAnalysis[]=[];
  let quota=fixturesResult.quota;
  for(const f of selected) {
    const season=f.league.season || seasonFor(date);
    const [homeRows,awayRows]=await Promise.all([
      teamRecentStats(f.teams.home.id,season,key),
      teamRecentStats(f.teams.away.id,season,key)
    ]);
    const allRows=[...homeRows,...awayRows];
    const homeStats=allRows.filter(r=>r.team?.id===f.teams.home.id);
    const awayStats=allRows.filter(r=>r.team?.id===f.teams.away.id);
    const getAvg=(rows:any[],m:Exclude<Market,"goals">)=>avg(rows.map(r=>parseStat(r.statistics,MARKET_STAT_KEYS[m])).filter((v):v is number=>v!==null));
    const getCount=(rows:any[],m:Exclude<Market,"goals">)=>rows.filter(r=>parseStat(r.statistics,MARKET_STAT_KEYS[m])!==null).length;
    const homeGoalStats=goalsForAgainst(homeRows,f.teams.home.id);
    const awayGoalStats=goalsForAgainst(awayRows,f.teams.away.id);
    const xgh=Math.max(.15,(homeGoalStats.scored+awayGoalStats.conceded)/2);
    const xga=Math.max(.15,(awayGoalStats.scored+homeGoalStats.conceded)/2);
    const quality=Math.min(1,Math.min(homeGoalStats.sample,awayGoalStats.sample)/5);
    const markets={} as MatchAnalysis["markets"];
    const goalsPicks=makePicks("goals",f.teams.home.name,f.teams.away.name,xgh,xga,quality);
    markets.goals={home:xgh,away:xga,picks:goalsPicks,available:homeRows.length>0&&awayRows.length>0,note:"Gols esperados estimados pela média de gols marcados e sofridos nos últimos jogos disponíveis."};
    const marketKeys:Exclude<Market,"goals">[]=["corners","cards","shots","shots_on_target"];
    for(const m of marketKeys) {
      const hm=getAvg(homeStats,m), am=getAvg(awayStats,m);
      const available=getCount(homeStats,m)>=3 && getCount(awayStats,m)>=3 && hm>0 && am>0;
      const fallbackH=m==="corners"?4.5:m==="cards"?2.0:m==="shots"?10:m==="shots_on_target"?3.2:0;
      const fallbackA=fallbackH;
      const h=available?hm:fallbackH, a=available?am:fallbackA;
      const picks=available?makePicks(m,f.teams.home.name,f.teams.away.name,h,a,quality*.85):[];
      markets[m]={home:h,away:a,picks,available,note:available?`Média calculada com ${getCount(homeStats,m)} jogos recentes do mandante e ${getCount(awayStats,m)} do visitante.`:"Dados insuficientes na API para este mercado. Palpites não publicados para evitar estimativas inventadas."};
    }
    matches.push({
      id:f.fixture.id,home:f.teams.home.name,away:f.teams.away.name,homeLogo:f.teams.home.logo,awayLogo:f.teams.away.logo,
      league:f.league.name,country:f.league.country,kickoff:f.fixture.date,status:f.fixture.status.short,venue:f.fixture.venue?.name??undefined,
      expectedGoals:{home:xgh,away:xga},markets,dataQuality:quality
    });
  }
  return {date,timezone:"America/Sao_Paulo",matches,quota:quota,message:fixtures.length===0?"A API não retornou partidas para a data de hoje.":"Partidas reais consultadas na API-Football. Mercados sem amostra suficiente são ocultados.",totalFixtures:fixtures.length};
}
