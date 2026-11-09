"use client";
import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Activity, CalendarDays, Target, AlertTriangle, ExternalLink } from "lucide-react";
import SheepLogo from "./SheepLogo";
import { ApiResponse, MARKETS, MARKET_LABELS, Market, MatchAnalysis } from "@/lib/types";

function lineText(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(2).replace(".", ",").replace(/,00$/, "").replace(/0$/, "")}`;
}
function kickoff(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [market, setMarket] = useState<Market>("goals");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const [matchesResponse, healthResponse] = await Promise.all([
        fetch("/api/matches", { cache: "no-store" }),
        fetch("/api/health", { cache: "no-store" })
      ]);
      setData(await matchesResponse.json());
      setHealth(await healthResponse.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  const matches = data?.matches ?? [];

  return <main className="container">
    <header className="topbar">
      <a className="brand" href="/"><SheepLogo/><span><b>SHEEP <i>PALPITES</i></b><small>INTELIGÊNCIA EM HANDICAPS</small></span></a>
      <nav><a href="/methodology">Metodologia</a><a href="/history">Histórico</a></nav>
      <span className={`status ${data?.mode === "live" ? "live" : ""}`}>● {data?.mode === "live" ? "API CONECTADA" : "VERIFICANDO API"}</span>
    </header>

    <section className="hero">
      <div>
        <div className="eyebrow">ANÁLISE QUANTITATIVA ESPORTIVA</div>
        <h1>Não é chute.<br/><em>É leitura de jogo.</em></h1>
        <p>Jogos e estatísticas consultados na API-Football. Cada mercado só recebe palpites quando existe amostra histórica suficiente.</p>
        <div className="hero-note"><ShieldCheck size={16}/> Sem inventar estatísticas. Sem prometer lucro.</div>
      </div>
      <div className="hero-mascot"><SheepLogo large/><b>SEU ANALISTA DE CONFIANÇA</b></div>
    </section>

    <section className="stats">
      <div><CalendarDays/><small>JOGOS ANALISADOS</small><strong>{matches.length}</strong></div>
      <div><Target/><small>MERCADOS</small><strong>05</strong></div>
      <div><Activity/><small>PALPITES POR MERCADO</small><strong>02</strong></div>
      <div><RefreshCw/><small>ATUALIZAÇÃO MANUAL</small><strong>Botão abaixo</strong></div>
    </section>

    <section className="section-head">
      <div><div className="eyebrow">CENTRAL DE MERCADOS</div><h2>Principais partidas do dia</h2>
        <p>{data?.date ? `Data: ${data.date.split("-").reverse().join("/")}` : "Consultando calendário..."} · Horário de Brasília</p>
      </div>
      <button className="refresh" onClick={() => void load()} disabled={loading}>
        <RefreshCw size={15} className={loading ? "spin" : ""}/> Atualizar jogos
      </button>
    </section>

    <div className="market-tabs">
      {MARKETS.map(item => <button key={item} className={market === item ? "active" : ""} onClick={() => setMarket(item)}>
        {item === "goals" ? "⚽" : item === "corners" ? "🚩" : item === "cards" ? "🟨" : item === "shots" ? "🎯" : "🥅"} {MARKET_LABELS[item]}
      </button>)}
    </div>

    {loading && <div className="empty"><RefreshCw className="spin"/> Consultando partidas e estatísticas...</div>}
    {!loading && data?.mode === "error" && <div className="alert"><AlertTriangle/><div><b>Não foi possível concluir a análise</b><p>{data.message}</p><small>Confira API_FOOTBALL_KEY nas variáveis de ambiente e faça novo deploy.</small></div></div>}
    {!loading && data?.mode === "live" && matches.length === 0 && <div className="empty">A API não retornou partidas para hoje. Tente atualizar mais tarde.</div>}
    {!loading && matches.length > 0 && <section className="match-grid">{matches.map(match => <MatchCard key={match.id} match={match} market={market}/>)}</section>}

    {data?.mode === "live" && <div className="api-note">Fonte: API-Football · Fuso: Brasília · {data.message} {data.quota?.remaining ? `Cota restante: ${data.quota.remaining}` : ""}</div>}

    <section className="build-check">
      <div><b>Diagnóstico da versão</b><small>Use este identificador para confirmar se a Vercel publicou o código novo.</small></div>
      <div className="build-values"><span>Release: <b>{health?.release ?? data?.release ?? "carregando"}</b></span><span>Build: <b>{health?.buildId ?? data?.buildId ?? "carregando"}</b></span><span>Chave API: <b>{health?.apiKeyConfigured ? "configurada" : "não detectada"}</b></span></div>
      <a href="/api/health" target="_blank" rel="noreferrer">Abrir diagnóstico <ExternalLink size={13}/></a>
    </section>

    <aside className="disclaimer"><b>Informação estatística, não garantia de resultado.</b><br/>Probabilidades são estimativas do modelo, não odds de casas nem garantia de lucro. Linhas asiáticas podem resultar em meia vitória, meia derrota ou devolução. Conteúdo para maiores de 18 anos; pratique o jogo responsável.</aside>
    <footer>🐏 SHEEP PALPITES · INTELIGÊNCIA EM HANDICAPS <span>{health?.release ?? "SHEEP-2026.11.09-R2"}</span></footer>
  </main>;
}

function MatchCard({ match, market }: { match: MatchAnalysis; market: Market }) {
  const projection = match.markets[market];
  return <article className="match-card">
    <div className="match-meta"><span>{match.league} · {match.country}</span><b>{kickoff(match.kickoff)}</b></div>
    <div className="teams">
      <div>{match.homeLogo && <img src={match.homeLogo} alt=""/>}<b>{match.home}</b></div>
      <span>VS</span>
      <div>{match.awayLogo && <img src={match.awayLogo} alt=""/>}<b>{match.away}</b></div>
    </div>
    <div className="expected"><span>{market === "goals" ? "Gols esperados (modelo)" : "Média por partida"}</span><b>{projection.home.toFixed(2)} — {projection.away.toFixed(2)}</b></div>
    {projection.available && projection.picks.length === 2
      ? <div className="pick-grid">{projection.picks.map((pick, index) => <div className={`pick ${index === 1 ? "protected" : ""}`} key={pick.side}>
          <small>{index === 0 ? "🎯 FAVORITO · HANDICAP" : "🛡 AZARÃO · PROTEGIDO"}</small>
          <strong>{pick.team} {lineText(pick.line)}</strong>
          <span>Probabilidade estimada: {(pick.probability * 100).toFixed(0)}%</span>
          <label>{pick.confidence.toUpperCase()} CONFIANÇA</label>
          <p>{pick.reason}</p>
        </div>)}</div>
      : <div className="market-unavailable"><b>Mercado sem dados suficientes</b><p>{projection.note}</p></div>}
    <div className="match-foot"><span>{match.status}</span><span>Amostra: {Math.round(match.dataQuality * 100)}%</span></div>
  </article>;
}
