import { NextResponse } from "next/server";
import { getMatches } from "@/lib/provider";
export async function GET() {
  const result=await getMatches();
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
}
