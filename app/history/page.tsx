import Link from "next/link";
export default function History() {
  return <main className="container subpage">
    <Link href="/">← Voltar ao painel</Link><div className="eyebrow">HISTÓRICO</div><h1>Histórico de palpites</h1>
    <p>Esta versão ainda não salva palpites nem liquida resultados automaticamente. Não exibimos taxa de acerto fictícia.</p>
    <div className="info-card"><h2>Próxima melhoria</h2><p>Adicionar banco de dados, registrar cada palpite no momento da publicação e liquidar o handicap com resultado oficial para calcular acerto, yield e ROI.</p></div>
  </main>;
}
