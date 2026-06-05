export type SourceType = "rss" | "atom";

export type SourceDefinition = {
  id: string;
  name: string;
  url: string;
  homepage: string;
  type: SourceType;
  topics: string[];
  reliability: number;
};

export type ImageCandidate = {
  url: string;
  source: "feed" | "article-meta" | "manual-brief";
  alt?: string;
  credit?: string;
};

export type RelevanceReason = {
  label: string;
  score: number;
  evidence: string[];
};

export type ArticleRecord = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  publisherUrl: string;
  title: string;
  url: string;
  publishedAt?: string;
  excerpt: string;
  contentText: string;
  author?: string;
  topicTags: string[];
  geographyTags: string[];
  imageCandidates: ImageCandidate[];
  relevanceScore: number;
  relevanceReasons: RelevanceReason[];
  sourceNotes: string[];
  fetchedAt: string;
};

export type DailyBrief = {
  runDate: string;
  generatedAt: string;
  sourceCount: number;
  articleCount: number;
  shortlist: ArticleRecord[];
  warnings: string[];
};

export type QualityFlag = {
  kind: "ai-pattern" | "unsupported-claim" | "tone" | "specificity";
  phrase: string;
  suggestion: string;
};

export type ContentPackage = {
  article: ArticleRecord;
  generatedAt: string;
  model: string;
  packagePath: string;
  blog: {
    title: string;
    slug: string;
    dek: string;
    body: string;
    metaDescription: string;
    tags: string[];
  };
  linkedin: {
    text: string;
    headlineOptions: string[];
  };
  insights: {
    whyThisMatters: string[];
    operationalTakeaways: string[];
    sourceEvidence: string[];
  };
  imageBrief: {
    preferredSourceImage?: ImageCandidate | null;
    originalImagePrompt: string;
    altText: string;
    usageNotes: string[];
  };
  quality: {
    flags: QualityFlag[];
    rewriteNotes: string[];
  };
  files: string[];
};

export type GenerateRequest = {
  article: ArticleRecord;
};
