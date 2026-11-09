import { Match } from "./types";
import { demoMatches } from "./demo";

export async function getMatches():Promise<{matches:Match[];mode:"demo"|"live";message:string}> {
  const key=process.env.API_FOOTBALL_KEY;
  if(!key || process.env.ENABLE_LIVE_DATA!=="true") {
    return {matches:demoMatches,mode:"demo",message:"Dados ilustrativos. Configure uma API esportiva e valide a cobertura antes de ativar dados ao vivo."};
  }
  // Integração real deliberadamente não finge estar pronta: API-Football endpoints,
  // plano contratado e cobertura de estatísticas precisam ser verificados para cada liga.
  return {matches:[],mode:"demo",message:"A chave foi detectada, mas o adaptador de partidas ainda precisa ser configurado e validado. Nenhum dado ao vivo foi inventado."};
}
