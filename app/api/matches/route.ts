import { NextResponse } from "next/server";
import { getTodayAnalysis } from "@/lib/football-api";
export const dynamic="force-dynamic";
export async function GET(){
 try {
  const data=await getTodayAnalysis();
  return NextResponse.json({mode:"live",...data},{headers:{"Cache-Control":"s-maxage=1800, stale-while-revalidate=3600"}});
 } catch(error) {
  const message=error instanceof Error?error.message:"Falha ao consultar a API esportiva.";
  return NextResponse.json({mode:"error",date:new Date().toISOString(),timezone:"America/Sao_Paulo",matches:[],message},{status:200,headers:{"Cache-Control":"no-store"}});
 }
}
