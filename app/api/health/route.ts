import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({ok:true,app:"Sheep Palpites",apiKeyConfigured:Boolean(process.env.API_FOOTBALL_KEY),timezone:"America/Sao_Paulo"});}
