import type { ArticleRecord, ImageCandidate, SourceDefinition } from "./types";
import { decodeHtml, normalizeWhitespace, stableHash, stripHtml, truncate } from "./text";

const REQUEST_TIMEOUT_MS = 12_000;

type ParsedFeedItem = {
  title: string;
  url: string;
  publishedAt?: string;
  excerpt: string;
  contentText: string;
  author?: string;
  imageCandidates: ImageCandidate[];
};

export async function fetchSourceArticles(source: SourceDefinition): Promise<{
  articles: ArticleRecord[];
  warning?: string;
}> {
  try {
    const xml = await fetchText(source.url);
    const parsed = parseFeed(xml, source);
    const fetchedAt = new Date().toISOString();

    return {
      articles: parsed.map((item) => ({
        id: stableHash(`${source.id}:${item.url || item.title}`),
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        publisherUrl: source.homepage,
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt,
        excerpt: item.excerpt,
        contentText: item.contentText,
        author: item.author,
        topicTags: source.topics,
        geographyTags: [],
        imageCandidates: item.imageCandidates,
        relevanceScore: 0,
        relevanceReasons: [],
        sourceNotes: [`Fetched from ${source.name}.`],
        fetchedAt
      }))
    };
  } catch (error) {
    return {
      articles: [],
      warning: `${source.name}: ${error instanceof Error ? error.message : "feed fetch failed"}`
    };
  }
}

export async function enrichArticle(article: ArticleRecord): Promise<ArticleRecord> {
  try {
    const html = await fetchText(article.url);
    const metaDescription = extractMeta(html, "description") || extractProperty(html, "og:description");
    const metaImage =
      extractProperty(html, "og:image") ||
      extractProperty(html, "twitter:image") ||
      extractMeta(html, "twitter:image");
    const articleText = extractArticleText(html);
    const sourceNotes = [...article.sourceNotes];

    if (articleText.length > article.contentText.length) {
      sourceNotes.push("Article page text was fetched for stronger source evidence.");
    }

    return {
      ...article,
      excerpt: metaDescription ? truncate(metaDescription, 320) : article.excerpt,
      contentText: articleText.length > article.contentText.length ? articleText : article.contentText,
      imageCandidates: mergeImages(article.imageCandidates, metaImage ? [{ url: absolutize(metaImage, article.url), source: "article-meta" }] : []),
      sourceNotes
    };
  } catch {
    return article;
  }
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FlowBrief/0.1 (+https://sitescan.build)",
        Accept: "application/rss+xml, application/atom+xml, text/xml, text/html"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseFeed(xml: string, source: SourceDefinition): ParsedFeedItem[] {
  const blocks = matchBlocks(xml, "item");
  const atomBlocks = blocks.length ? [] : matchBlocks(xml, "entry");
  const items = blocks.length ? blocks : atomBlocks;

  return items
    .map((block) => parseFeedBlock(block, source.type))
    .filter((item): item is ParsedFeedItem => Boolean(item?.title && item.url));
}

function parseFeedBlock(block: string, type: SourceDefinition["type"]): ParsedFeedItem | null {
  const title = cleanXml(extractTag(block, "title"));
  const link = type === "atom" ? extractAtomLink(block) : cleanXml(extractTag(block, "link"));
  const guid = cleanXml(extractTag(block, "guid"));
  const url = link || (guid.startsWith("http") ? guid : "");
  const publishedAt = cleanXml(extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated"));
  const description = cleanXml(extractTag(block, "description") || extractTag(block, "summary"));
  const content = cleanXml(extractTag(block, "content:encoded") || extractTag(block, "encoded") || extractTag(block, "content"));
  const author = cleanXml(extractTag(block, "dc:creator") || extractTag(block, "author"));
  const contentText = stripHtml(content || description || title);
  const imageCandidates = extractImages(block);

  if (!title || !url) return null;

  return {
    title,
    url,
    publishedAt: publishedAt ? new Date(publishedAt).toString() === "Invalid Date" ? publishedAt : new Date(publishedAt).toISOString() : undefined,
    excerpt: truncate(stripHtml(description || contentText), 320),
    contentText: truncate(contentText, 5000),
    author,
    imageCandidates
  };
}

function matchBlocks(xml: string, tag: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"))).map((match) => match[0]);
}

function extractTag(block: string, tag: string): string {
  const escaped = tag.replace(":", "\\:");
  const direct = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  if (direct?.[1]) return direct[1];

  const localName = tag.includes(":") ? tag.split(":")[1] : tag;
  const namespaced = block.match(new RegExp(`<[a-z0-9_-]+:${localName}[^>]*>([\\s\\S]*?)<\\/[a-z0-9_-]+:${localName}>`, "i"));
  return namespaced?.[1] ?? "";
}

function extractAtomLink(block: string): string {
  const alternate = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  const first = alternate || block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return first?.[1] ?? "";
}

function cleanXml(value: string): string {
  return normalizeWhitespace(decodeHtml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")));
}

function extractImages(block: string): ImageCandidate[] {
  const images: ImageCandidate[] = [];
  for (const pattern of [
    /<media:content[^>]+url=["']([^"']+)["'][^>]*>/gi,
    /<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/gi,
    /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']+["'][^>]*>/gi,
    /<itunes:image[^>]+href=["']([^"']+)["'][^>]*>/gi
  ]) {
    for (const match of block.matchAll(pattern)) {
      if (match[1]) images.push({ url: match[1], source: "feed" });
    }
  }
  return mergeImages(images, []);
}

function extractMeta(html: string, name: string): string {
  const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function extractProperty(html: string, property: string): string {
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"));
  return decodeHtml(match?.[1] ?? "");
}

function extractArticleText(html: string): string {
  const semanticCandidate = [
    html.match(/<article[\s\S]*?<\/article>/i)?.[0],
    html.match(/<main[\s\S]*?<\/main>/i)?.[0],
    html.match(/<(?:div|section)[^>]+class=["'][^"']*(?:entry-content|post-content|article-content|post-body|story-body|single-post-content|td-post-content)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section)>/i)?.[0]
  ]
    .filter((value): value is string => Boolean(value))
    .map(cleanArticleContainer)
    .filter((value) => value.length > 220)
    .sort((a, b) => b.length - a.length)[0];

  if (semanticCandidate) return truncate(semanticCandidate, 9000);

  const paragraphText = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtml(match[1] ?? ""))
    .filter(isUsefulParagraph)
    .slice(0, 28)
    .join(" ");

  return truncate(paragraphText, 9000);
}

function cleanArticleContainer(html: string): string {
  return stripHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<form[\s\S]*?<\/form>/gi, " ")
  );
}

function isUsefulParagraph(paragraph: string): boolean {
  const lower = paragraph.toLowerCase();
  if (paragraph.length < 45) return false;
  if (["leave a reply", "your email address", "recent posts", "advertise", "subscribe", "all rights reserved"].some((term) => lower.includes(term))) {
    return false;
  }
  return true;
}

function mergeImages(current: ImageCandidate[], next: ImageCandidate[]): ImageCandidate[] {
  const byUrl = new Map<string, ImageCandidate>();
  for (const image of [...current, ...next]) {
    if (image.url && !byUrl.has(image.url)) byUrl.set(image.url, image);
  }
  return Array.from(byUrl.values());
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}
