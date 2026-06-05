import { NextResponse } from "next/server";
import { getDailyBrief } from "@/lib/brief";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const brief = await getDailyBrief({ force });
  return NextResponse.json(brief);
}
