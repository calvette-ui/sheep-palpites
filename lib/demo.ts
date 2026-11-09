import { Match, Market } from "./types";
import { buildPicks } from "./engine";
const raw = [
 {id:"demo-1",home:"Aurora FC",away:"Atlético Vale",league:"Liga demonstrativa",kickoff:"19:00",means:{goals:[1.72,.88],corners:[6.2,4.1],cards:[2.1,2.7],shots:[14,9],shots_on_target:[5.2,3.1]}},
 {id:"demo-2",home:"Northbridge",away:"Real Porto",league:"Liga demonstrativa",kickoff:"20:30",means:{goals:[1.48,1.02],corners:[5.8,5.1],cards:[2.4,2.2],shots:[12,11],shots_on_target:[4.1,3.8]}},
 {id:"demo-3",home:"União Central",away:"Esportivo Azul",league:"Copa demonstrativa",kickoff:"22:00",means:{goals:[2.05,.72],corners:[7.1,3.8],cards:[1.8,3.0],shots:[16,7],shots_on_target:[6.4,2.5]}}
] as const;
const markets:Market[]=["goals","corners","cards","shots","shots_on_target"];
export const demoMatches:Match[] = raw.map(g=>{
 const expected={home:g.means.goals[0],away:g.means.goals[1]};
 const picks={} as Match["picks"];
 markets.forEach(m=>{const [h,a]=g.means[m];picks[m]=buildPicks(m,g.home,g.away,h,a,0.35);});
 return {id:g.id,home:g.home,away:g.away,league:g.league,kickoff:g.kickoff,status:"demo",stats:{},expected,picks};
});
