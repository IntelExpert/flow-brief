import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const outputRoot = path.join(process.cwd(), "output");
  try {
    const dates = await readdir(outputRoot);
    const packages = [];
    for (const date of dates.sort().reverse()) {
      const dateDir = path.join(outputRoot, date);
      const slugs = await readdir(dateDir);
      for (const slug of slugs) {
        const summaryPath = path.join(dateDir, slug, "article-summary.json");
        const summary = JSON.parse(await readFile(summaryPath, "utf8")) as { title: string; sourceName: string; url: string };
        packages.push({
          date,
          slug,
          title: summary.title,
          sourceName: summary.sourceName,
          url: summary.url,
          path: path.join(dateDir, slug)
        });
      }
    }
    return NextResponse.json({ packages });
  } catch {
    return NextResponse.json({ packages: [] });
  }
}
