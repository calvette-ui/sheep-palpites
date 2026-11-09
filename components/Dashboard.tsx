"use client";
import {useEffect,useState} from "react";
import {RefreshCw,ShieldCheck,Activity,CalendarDays,Target,AlertTriangle} from "lucide-react";
import SheepLogo from "./SheepLogo";
import {ApiResponse,MARKETS,MARKET_LABELS,Market,MatchAnalysis} from "@/lib/types";
function fmtLine(n:number){return (n>0?"+":"")+n.toFixed(2).replace(".",",").replace(/,00$/,"").replace(/0$/,"");}
function time(v:string){return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(v));}
export default function Dashboard(){
 const [data,setData]=useState<ApiResponse|null>(null),[market,setMarket]=useState<Market>("goals"),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await fetch("/api/matches",{cache:"no-store"});const j=await r.json();setData(j);}catch{setData({mode:"error",date:"",timezone:"America/Sao_Paulo",matches:[],message:"Não foi possível consultar o servidor."});}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 const matches=data?.matches??[];
 return <main className="container">
  <header className="topbar"><a className="brand" href="/"><SheepLogo/><span><b>SHEEP <i>PALPITES</i></b><small>INTELIGÊNCIA EM HANDICAPS</small></span></a><nav><a href="/methodology">Metodologia</a><a href="/history">Histórico</a></nav><span className={`status ${data?.mode==="live"?"live":""}`}>● {data?.mode==="live"?"DADOS DA API":"AGUARDANDO DADOS"}</span></header>
  <section className="hero"><div><div className="eyebrow">ANÁLISE QUANTITATIVA ESPORTIVA</div><h1>Não é chute.<br/>É <em>leitura de jogo.</em></h1><p>Partidas consultadas na API-Football e projeções estatísticas por mercado. A plataforma só publica um mercado quando há amostra mínima disponível.</p><div className="hero-note"><ShieldCheck size={16}/> Sem inventar estatísticas. Sem prometer lucro.</div></div><div className="hero-mascot"><SheepLogo large/><b>SEU ANALISTA DE CONFIANÇA</b></div></section>
  <section className="stats"><div><CalendarDays/><small>JOGOS ENCONTRADOS</small><strong>{matches.length}</strong></div><div><Target/><small>MERCADOS</small><strong>05</strong></div><div><Activity/><small>PALPITES POR MERCADO</small><strong>02</strong></div><div><RefreshCw/><small>CACHE DA API</small><strong>6 horas</strong></div></section>
  <section className="section-head"><div><div className="eyebrow">CENTRAL DE MERCADOS</div><h2>Principais partidas do dia</h2><p>{data?.date?`Data: ${data.date.split("-").reverse().join("/")}`:"Consultando calendário..." } · Horário de Brasília</p></div><button className="refresh" onClick={load} disabled={loading}><RefreshCw size={15} className={loading?"spin":""}/> Atualizar</button></section>
  <div className="market-tabs">{MARKETS.map(m=><button key={m} className={market===m?"active":""} onClick={()=>setMarket(m)}>{m==="goals"?"⚽":m==="corners"?"🚩":m==="cards"?"🟨":m==="shots"?"🎯":"🥅"} {MARKET_LABELS[m]}</button>)}</div>
  {loading&&<div className="empty"><RefreshCw className="spin"/> Consultando partidas e estatísticas...</div>}
  {!loading&&data?.mode==="error"&&<div className="alert"><AlertTriangle/><div><b>Não foi possível concluir a análise</b><p>{data.message}</p><small>Confira se API_FOOTBALL_KEY está cadastrada na Vercel e faça um novo deploy.</small></div></div>}
  {!loading&&data?.mode==="live"&&matches.length===0&&<div className="empty">Nenhuma partida retornada pela API para hoje.</div>}
  {!loading&&matches.length>0&&<section className="match-grid">{matches.map(m=><MatchCard key={m.id} match={m} market={market}/>)}</section>}
  {data?.mode==="live"&&<div className="api-note">Fonte: API-Football · Fuso: America/Sao_Paulo · {data.message} {data.quota?.remaining?`Requisições restantes: ${data.quota.remaining}`:""}</div>}
  <aside className="disclaimer"><b>⚠ Informação estatística, não garantia de resultado.</b><br/>As probabilidades são estimativas de modelo, não odds de casas nem garantia de lucro. Mercados sem amostra suficiente são ocultados. Linhas asiáticas podem ter meia vitória, meia derrota ou devolução. Conteúdo para maiores de 18 anos; pratique o jogo responsável.</aside>
  <footer>🐏 SHEEP PALPITES · INTELIGÊNCIA EM HANDICAPS <span>© {new Date().getFullYear()}</span></footer>
 </main>
}
function MatchCard({match,market}:{match:MatchAnalysis;market:Market}){
 const m=match.markets[market];const kickoff=time(match.kickoff);
 return <article className="match-card"><div className="match-meta"><span>{match.league} · {match.country}</span><b>{kickoff}</b></div><div className="teams"><div>{match.homeLogo&&<img src={match.homeLogo} alt="" />}<b>{match.home}</b></div><span>VS</span><div>{match.awayLogo&&<img src={match.awayLogo} alt="" />}<b>{match.away}</b></div></div><div className="expected"><span>{market==="goals"?"Gols esperados (modelo)":"Média por jogo (últimos jogos)"}</span><b>{m.home.toFixed(2)} — {m.away.toFixed(2)}</b></div>
 {m.available&&m.picks.length===2?<div className="pick-grid">{m.picks.map((p,i)=><div className={`pick ${i===1?"protected":""}`} key={p.side}><small>{i===0?"🎯 FAVORITO · HANDICAP":"🛡 AZARÃO · PROTEGIDO"}</small><strong>{p.team} {fmtLine(p.line)}</strong><span>Probabilidade estimada: {(p.probability*100).toFixed(0)}%</span><label>{p.confidence.toUpperCase()} CONFIANÇA</label><p>{p.reason}</p></div>)}</div>:<div className="market-unavailable"><b>Mercado sem dados suficientes</b><p>{m.note??"Não foi possível reunir amostra mínima confiável para este mercado."}</p></div>}
 <div className="match-foot"><span>{match.status}</span><span>Qualidade da amostra: {Math.round(match.dataQuality*100)}%</span></div></article>
}
