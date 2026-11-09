import { Confidence, Market, Pick } from "./types";

const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));
const poissonPmf = (k:number,lambda:number) => {
  let f=1; for(let i=2;i<=k;i++) f*=i;
  return Math.exp(-lambda)*Math.pow(lambda,k)/f;
};
function distribution(lambda:number, cap=16) {
  return Array.from({length:cap+1},(_,k)=>poissonPmf(k,lambda));
}
function coverProbability(fav:number,dog:number,line:number) {
  const a=distribution(fav), b=distribution(dog);
  let p=0;
  for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) {
    const margin=i-j+line;
    if(margin>0) p+=a[i]*b[j];
    else if(margin===0) p+=a[i]*b[j]*0.5;
  }
  return clamp(p,0.01,0.99);
}
function asianLineForProbability(fav:number,dog:number,target:number,min:number,max:number,step=0.25) {
  let best=min,bestDiff=Infinity,bestP=0;
  for(let line=min;line<=max+1e-9;line+=step) {
    const p=coverProbability(fav,dog,line);
    const d=Math.abs(p-target);
    if(d<bestDiff){best=line;bestDiff=d;bestP=p;}
  }
  return {line:best,probability:bestP};
}
function confidence(p:number, dataQuality:number):Confidence {
  if(dataQuality<0.55) return "Baixa";
  if(p>=0.68 && dataQuality>=0.8) return "Alta";
  return "Média";
}
export function buildPicks(market:Market, home:string, away:string, homeMean:number, awayMean:number, quality=0.35):Pick[] {
  const homeFav=homeMean>=awayMean;
  const fav=homeFav?home:away, dog=homeFav?away:home;
  const favMean=homeFav?homeMean:awayMean, dogMean=homeFav?awayMean:homeMean;
  const diff=favMean-dogMean;
  const goals=market==="goals";
  const favRange=goals?[-2,-0.5]:[-8,-0.5];
  const dogRange=goals?[2,4.5]:[2,12];
  const favLine=asianLineForProbability(favMean,dogMean,0.65,favRange[0],favRange[1]);
  const dogLine=asianLineForProbability(dogMean+diff,dogMean,0.90,dogRange[0],dogRange[1]);
  const p1=clamp(favLine.probability,0.01,0.99), p2=clamp(dogLine.probability,0.01,0.99);
  const marketName=market==="goals"?"gols":market==="corners"?"escanteios":market==="cards"?"cartões":market==="shots"?"finalizações":"chutes no alvo";
  return [
    {side:"favorite",team:fav,line:-Math.abs(favLine.line),probability:p1,confidence:confidence(p1,quality),market,reason:`A projeção de ${marketName} favorece ${fav}; a linha foi escolhida pela probabilidade estimada de cobertura.`},
    {side:"underdog",team:dog,line:Math.abs(dogLine.line),probability:p2,confidence:confidence(p2,quality),market,reason:`A linha positiva protege ${dog} contra uma diferença ampla na projeção de ${marketName}.`}
  ];
}
