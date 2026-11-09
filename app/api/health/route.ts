import { NextResponse } from "next/server";
export async function GET() {
 return NextResponse.json({ok:true,app:"Sheep Palpites",liveDataEnabled:process.env.ENABLE_LIVE_DATA==="true",apiKeyConfigured:Boolean(process.env.API_FOOTBALL_KEY)});
}
