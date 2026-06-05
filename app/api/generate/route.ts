import { NextResponse } from "next/server";
import { generateContentPackage } from "@/lib/content-package";
import { writeContentPackage } from "@/lib/storage";
import type { GenerateRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateRequest;

  if (!body.article?.url || !body.article?.title) {
    return NextResponse.json({ error: "A selected article is required." }, { status: 400 });
  }

  const contentPackage = await generateContentPackage(body.article);
  const written = await writeContentPackage(contentPackage);
  return NextResponse.json(written);
}
