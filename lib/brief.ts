import { fetchSourceArticles, enrichArticle } from "./feed";
import { scoreArticle, scoreArticles } from "./scoring";
import { sourceRegistry } from "./sources";
import { readDailyBrief, writeDailyBrief } from "./storage";
import { toDateKey } from "./text";
import type { ArticleRecord, DailyBrief } from "./types";

const ENRICH_LIMIT = 18;

export async function getDailyBrief(options: { force?: boolean } = {}): Promise<DailyBrief> {
  const runDate = toDateKey();
  if (!options.force) {
    const cached = await readDailyBrief(runDate);
    if (cached) return cached;
  }

  const collected = await Promise.all(sourceRegistry.map((source) => fetchSourceArticles(source)));
  const warnings = collected.flatMap((result) => (result.warning ? [result.warning] : []));
  const articles = dedupeArticles(collected.flatMap((result) => result.articles));
  const initiallyScored = scoreArticles(articles).sort((a, b) => b.relevanceScore - a.relevanceScore);
  const enriched = await Promise.all(initiallyScored.slice(0, ENRICH_LIMIT).map((article) => enrichArticle(article)));
  const enrichedById = new Map(enriched.map((article) => [article.id, scoreArticle(article)]));
  const rescored = initiallyScored
    .map((article) => enrichedById.get(article.id) ?? article)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const brief: DailyBrief = {
    runDate,
    generatedAt: new Date().toISOString(),
    sourceCount: sourceRegistry.length,
    articleCount: articles.length,
    shortlist: rescored.slice(0, 5),
    warnings
  };

  await writeDailyBrief(brief);
  return brief;
}

function dedupeArticles(articles: ArticleRecord[]): ArticleRecord[] {
  const byKey = new Map<string, ArticleRecord>();
  for (const article of articles) {
    const key = article.url.replace(/utm_[^=&]+=[^&]+&?/g, "").replace(/[?#].*$/, "").toLowerCase();
    const existing = byKey.get(key);
    if (!existing || article.contentText.length > existing.contentText.length) {
      byKey.set(key, article);
    }
  }
  return Array.from(byKey.values());
}
