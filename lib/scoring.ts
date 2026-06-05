import type { ArticleRecord, RelevanceReason, SourceDefinition } from "./types";
import { sourceRegistry } from "./sources";
import { uniqueValues } from "./text";

type KeywordGroup = {
  label: string;
  score: number;
  keywords: string[];
};

const keywordGroups: KeywordGroup[] = [
  {
    label: "Collection system relevance",
    score: 34,
    keywords: ["sewer", "collection system", "sanitary sewer", "cso", "sso", "overflow", "infiltration", "inflow", "manhole", "force main", "lateral"]
  },
  {
    label: "Municipal owner signal",
    score: 24,
    keywords: ["municipal", "city", "public works", "utility", "utilities", "ratepayer", "council", "capital improvement", "cip", "consent decree"]
  },
  {
    label: "Contractor and engineering relevance",
    score: 22,
    keywords: ["contractor", "engineering", "bid", "procurement", "rehabilitation", "trenchless", "cipp", "inspection", "condition assessment", "asset management"]
  },
  {
    label: "Regulatory or funding pressure",
    score: 20,
    keywords: ["epa", "npdes", "compliance", "permit", "srff", "wifia", "grant", "loan", "funding", "federal", "state revolving fund"]
  },
  {
    label: "Operational pain",
    score: 18,
    keywords: ["backup", "failure", "emergency", "aging infrastructure", "deferred maintenance", "capacity", "resilience", "risk", "storm", "flooding"]
  },
  {
    label: "Inspection or intelligence angle",
    score: 16,
    keywords: ["ai", "machine learning", "camera", "video", "inspection", "gis", "digital twin", "sensor", "data", "predictive"]
  },
  {
    label: "Public impact",
    score: 12,
    keywords: ["public health", "water quality", "community", "service disruption", "environment", "river", "basement", "neighborhood"]
  },
  {
    label: "Wastewater core",
    score: 10,
    keywords: ["wastewater", "clean water", "treatment plant", "biosolids", "pretreatment", "effluent", "influent"]
  }
];

const genericWaterOnly = ["drinking water", "potable", "lead service line", "pfas", "desalination"];
const geographyHints = [
  "california",
  "texas",
  "florida",
  "midwest",
  "missouri",
  "kansas",
  "illinois",
  "georgia",
  "north carolina",
  "south carolina",
  "arizona",
  "colorado"
];

export function scoreArticles(articles: ArticleRecord[]): ArticleRecord[] {
  const sourceById = new Map<string, SourceDefinition>(sourceRegistry.map((source) => [source.id, source]));
  return articles.map((article) => scoreArticle(article, sourceById.get(article.sourceId)));
}

export function scoreArticle(article: ArticleRecord, source?: SourceDefinition): ArticleRecord {
  const haystack = `${article.title} ${article.excerpt} ${article.contentText}`.toLowerCase();
  const reasons: RelevanceReason[] = [];
  const topicTags = new Set(article.topicTags);
  let score = Math.round((source?.reliability ?? 0.75) * 10);

  for (const group of keywordGroups) {
    const evidence = group.keywords.filter((keyword) => haystack.includes(keyword));
    if (evidence.length) {
      const capped = Math.min(group.score, Math.ceil(group.score * (evidence.length / 3)));
      score += capped;
      reasons.push({ label: group.label, score: capped, evidence: evidence.slice(0, 6) });
      topicTags.add(group.label.toLowerCase().replaceAll(" ", "-"));
    }
  }

  const recencyScore = getRecencyScore(article.publishedAt);
  if (recencyScore > 0) {
    score += recencyScore;
    reasons.push({ label: "Fresh enough for a morning brief", score: recencyScore, evidence: [article.publishedAt ?? "recent feed item"] });
  }

  const hasWastewaterSignal = ["wastewater", "sewer", "collection", "overflow", "rehabilitation", "cipp", "inspection"].some((keyword) =>
    haystack.includes(keyword)
  );
  const isGenericWater = genericWaterOnly.some((keyword) => haystack.includes(keyword));
  if (isGenericWater && !hasWastewaterSignal) {
    score -= 16;
    reasons.push({ label: "Penalty: weak wastewater connection", score: -16, evidence: ["water topic without sewer or wastewater signal"] });
  }

  const geographyTags = uniqueValues(geographyHints.filter((hint) => haystack.includes(hint)));

  return {
    ...article,
    topicTags: uniqueValues(Array.from(topicTags)),
    geographyTags,
    relevanceScore: Math.max(0, score),
    relevanceReasons: reasons.sort((a, b) => b.score - a.score)
  };
}

function getRecencyScore(publishedAt?: string): number {
  if (!publishedAt) return 3;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 2;

  const ageHours = (Date.now() - date.getTime()) / 1000 / 60 / 60;
  if (ageHours <= 36) return 12;
  if (ageHours <= 72) return 9;
  if (ageHours <= 168) return 6;
  if (ageHours <= 336) return 3;
  return 0;
}
