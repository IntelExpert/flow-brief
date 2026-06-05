import type { SourceDefinition } from "./types";

export const sourceRegistry: SourceDefinition[] = [
  {
    id: "water-finance-management",
    name: "Water Finance & Management",
    url: "https://waterfm.com/feed/",
    homepage: "https://waterfm.com",
    type: "rss",
    topics: ["funding", "municipal finance", "capital planning"],
    reliability: 0.92
  },
  {
    id: "trenchless-technology",
    name: "Trenchless Technology",
    url: "https://trenchlesstechnology.com/feed/",
    homepage: "https://trenchlesstechnology.com",
    type: "rss",
    topics: ["rehabilitation", "inspection", "contractors"],
    reliability: 0.9
  },
  {
    id: "municipal-sewer-water",
    name: "Municipal Sewer & Water",
    url: "https://www.mswmag.com/rss",
    homepage: "https://www.mswmag.com",
    type: "rss",
    topics: ["municipal sewer", "field crews", "asset maintenance"],
    reliability: 0.88
  },
  {
    id: "epa-water-news",
    name: "EPA Water News",
    url: "https://www.epa.gov/newsreleases/search/rss/subject/water",
    homepage: "https://www.epa.gov/water",
    type: "rss",
    topics: ["regulation", "funding", "compliance"],
    reliability: 0.95
  },
  {
    id: "nacwa",
    name: "NACWA News",
    url: "https://www.nacwa.org/news-publications/news/rss",
    homepage: "https://www.nacwa.org",
    type: "rss",
    topics: ["clean water agencies", "policy", "compliance"],
    reliability: 0.9
  },
  {
    id: "circle-of-blue",
    name: "Circle of Blue",
    url: "https://www.circleofblue.org/feed/",
    homepage: "https://www.circleofblue.org",
    type: "rss",
    topics: ["water policy", "climate resilience", "public impact"],
    reliability: 0.84
  }
];
