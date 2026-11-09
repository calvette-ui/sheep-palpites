import { NextResponse } from "next/server";
import { APP_RELEASE } from "@/lib/version";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "Sheep Palpites",
    release: APP_RELEASE,
    buildId: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
    environment: process.env.VERCEL_ENV ?? "development",
    apiKeyConfigured: Boolean(process.env.API_FOOTBALL_KEY),
    checkedAt: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store" } });
}
