import { describe, expect, it } from "vitest";
import { scoreArticle } from "../lib/scoring";
import type { ArticleRecord } from "../lib/types";

function article(overrides: Partial<ArticleRecord>): ArticleRecord {
  return {
    id: "a",
    sourceId: "test",
    sourceName: "Test Source",
    sourceUrl: "https://example.com/feed",
    publisherUrl: "https://example.com",
    title: "City advances sewer inspection program after repeated overflows",
    url: "https://example.com/story",
    publishedAt: new Date().toISOString(),
    excerpt: "The municipal utility will use inspection data to prioritize sanitary sewer rehabilitation.",
    contentText: "The city public works department is responding to sanitary sewer overflows with CCTV inspection, asset management, CIPP rehabilitation, and capital planning.",
    topicTags: [],
    geographyTags: [],
    imageCandidates: [],
    relevanceScore: 0,
    relevanceReasons: [],
    sourceNotes: [],
    fetchedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("scoreArticle", () => {
  it("prioritizes municipal wastewater and contractor relevance", () => {
    const scored = scoreArticle(article({}));

    expect(scored.relevanceScore).toBeGreaterThan(80);
    expect(scored.relevanceReasons.map((reason) => reason.label)).toContain("Collection system relevance");
    expect(scored.relevanceReasons.map((reason) => reason.label)).toContain("Contractor and engineering relevance");
  });

  it("penalizes generic drinking-water stories without wastewater signal", () => {
    const scored = scoreArticle(
      article({
        title: "State announces drinking water lead service line plan",
        excerpt: "The program focuses on potable water and lead service line replacement.",
        contentText: "The plan addresses drinking water sampling and lead service line inventories."
      })
    );

    expect(scored.relevanceReasons.some((reason) => reason.label.includes("Penalty"))).toBe(true);
  });
});
