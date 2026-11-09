import { NextResponse } from "next/server";
import { getTodayAnalysis } from "@/lib/football-api";
import { APP_RELEASE } from "@/lib/version";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export async function GET() {
  try {
    const data = await getTodayAnalysis();
    return NextResponse.json({
      mode: "live",
      ...data,
      release: APP_RELEASE,
      buildId: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar a API.";
    return NextResponse.json({
      mode: "error",
      date: new Date().toISOString(),
      timezone: "America/Sao_Paulo",
      matches: [],
      message,
      release: APP_RELEASE,
      buildId: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local"
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
