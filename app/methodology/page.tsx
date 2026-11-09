import Link from "next/link";
export default function Methodology() {
  return <main className="container subpage">
    <Link href="/">← Voltar ao painel</Link><div className="eyebrow">TRANSPARÊNCIA</div><h1>Metodologia</h1>
    <div className="info-card"><h2>Fonte dos dados</h2><p>Partidas e estatísticas são consultadas na API-Football. O sistema seleciona até duas partidas por atualização para respeitar a cota do plano gratuito e consulta os cinco jogos anteriores de cada equipe.</p></div>
    <div className="info-card"><h2>Gols esperados do modelo</h2><p>A projeção combina a média recente de gols marcados pela equipe com a média recente de gols sofridos pelo adversário. É uma estimativa própria, não xG oficial de provedor especializado.</p></div>
    <div className="info-card"><h2>Escanteios, cartões e finalizações</h2><p>As médias usam estatísticas históricas disponíveis na API. Se faltarem pelo menos três amostras válidas por equipe, o mercado fica indisponível em vez de apresentar números inventados.</p></div>
    <div className="info-card"><h2>Handicap asiático</h2><p>Um modelo de Poisson aproxima a distribuição de contagens e calcula a cobertura de linhas em quartos e meios pontos. O modelo é inicial, não calibrado por liga nem validado por backtest. As probabilidades não representam garantia.</p></div>
  </main>;
}
