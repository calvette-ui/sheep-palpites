"use client";
import { useEffect,useMemo,useState } from "react";
import { Activity,CalendarDays,ChartNoAxesCombined,ChevronRight,ShieldCheck,Target } from "lucide-react";
import SheepLogo from "./SheepLogo";
import { MARKET_LABELS,Market,Match } from "@/lib/types";
const markets:Market[]=["goals","corners","cards","shots","shots_on_target"];
const icons:Record<Market,string>={goals:"⚽",corners:"🚩",cards:"🟨",shots:"🎯",shots_on_target:"🥅"};
function line(v:number){return (v>0?"+":"")+v.toFixed(2).replace(".",",").replace(/,00$/,"").replace(/0$/,"");}
export default function Dashboard({initial}:{initial:Match[]}) {
 const [matches,setMatches]=useState(initial),[market,setMarket]=useState<Market>("goals"),[mode,setMode]=useState("Todas");
 useEffect(()=>{fetch("/api/matches").then(r=>r.json()).then(d=>{if(d.matches?.length)setMatches(d.matches)}).catch(()=>{});},[]);
 const visible=useMemo(()=>matches.filter(m=>mode==="Todas"||m.status===mode.toLowerCase()),[matches,mode]);
 return <main className="container">
  <header className="topbar"><a className="brand" href="/"><SheepLogo/><span><b>SHEEP <i>PALPITES</i></b><small>INTELIGÊNCIA EM HANDICAPS</small></span></a><nav><a href="/methodology">Metodologia</a><a href="/history">Histórico</a><a href="/admin">Administração</a></nav><span className="demo-pill">● AMBIENTE DEMO</span></header>
  <section className="hero"><div><div className="eyebrow">ANÁLISE QUANTITATIVA ESPORTIVA</div><h1>Não é chute.<br/>É <em>leitura de jogo.</em></h1><p>Uma central de análise focada em handicaps: compare a linha negativa do favorito com a proteção positiva do azarão, mercado por mercado.</p><div className="hero-note"><ShieldCheck size={16}/> Método transparente. Dados identificados. Sem promessas de lucro.</div></div><div className="hero-mascot"><SheepLogo large/><b>SEU ANALISTA DE CONFIANÇA</b><small>🐏 SHEEP PALPITES</small></div></section>
  <section className="stats"><div><Activity/><small>PARTIDAS NA TELA</small><strong>{visible.length.toString().padStart(2,"0")}</strong></div><div><Target/><small>MERCADOS DE HANDICAP</small><strong>05</strong></div><div><ChartNoAxesCombined/><small>PALPITES POR MERCADO</small><strong>02</strong></div><div><CalendarDays/><small>FONTE DE DADOS</small><strong className="demo-text">DEMO</strong></div></section>
  <section className="section-head"><div><div className="eyebrow">CENTRAL DE MERCADOS</div><h2>Partidas em análise</h2><p>Escolha o tipo de handicap para consultar os dois lados da linha.</p></div><span className="demo-pill">DADOS ILUSTRATIVOS</span></section>
  <div className="market-tabs">{markets.map(m=><button key={m} className={market===m?"active":""} onClick={()=>setMarket(m)}>{icons[m]} {MARKET_LABELS[m]}</button>)}</div>
  <div className="filters"><span>Exibição</span><button className={mode==="Todas"?"selected":""} onClick={()=>setMode("Todas")}>Todas</button><button className={mode==="Demo"?"selected":""} onClick={()=>setMode("Demo")}>Demonstração</button></div>
  <section className="match-grid">{visible.map(match=><article className="match-card" key={match.id}><div className="match-meta"><span>{match.league}</span><b>{match.kickoff}</b></div><div className="teams"><b>{match.home}</b><span>VS</span><b>{match.away}</b></div><div className="expected"><span>{market==="goals"?"xG estimado":"Média projetada"}</span><b>{match.expected.home.toFixed(2)} — {match.expected.away.toFixed(2)}</b></div><div className="pick-grid">{match.picks[market].map((p,i)=><div className={`pick ${i===1?"protected":""}`} key={p.side}><small>{i===0?"🎯 FAVORITO · HANDICAP":"🛡 AZARÃO · PROTEGIDO"}</small><strong>{p.team} {line(p.line)}</strong><span>Probabilidade estimada: {(p.probability*100).toFixed(0)}%</span><label>{p.confidence.toUpperCase()} CONFIANÇA</label><p>{p.reason}</p></div>)}</div><a className="details" href={`/history?match=${match.id}`}>Detalhes e regras de liquidação <ChevronRight size={15}/></a></article>)}</section>
  <aside className="disclaimer"><b>⚠ Ambiente de demonstração — não são palpites ao vivo.</b><br/>Os confrontos, médias, linhas e probabilidades são ilustrativos. A integração com uma API esportiva e a validação do modelo precisam ser concluídas antes de exibir análises reais. Probabilidades não garantem resultados ou lucro. Conteúdo para maiores de 18 anos; pratique o jogo responsável.</aside>
  <footer>🐏 SHEEP PALPITES · INTELIGÊNCIA EM HANDICAPS <span>© {new Date().getFullYear()}</span></footer>
 </main>
}
