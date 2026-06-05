import type { ArticleRecord, ContentPackage } from "./types";
import { antiAiChecklist, analyzeDraft, buildRewriteNotes } from "./writing-guard";
import { markdownEscape, slugify, splitSentences, truncate } from "./text";

const defaultModel = "gpt-5.5";

export async function generateContentPackage(article: ArticleRecord): Promise<ContentPackage> {
  const generatedAt = new Date().toISOString();
  const model = process.env.OPENAI_MODEL || defaultModel;

  let contentPackage = process.env.OPENAI_API_KEY
    ? await generateWithOpenAI(article, model, generatedAt).catch((error) => fallbackPackage(article, model, generatedAt, [
        `OpenAI generation failed: ${error instanceof Error ? error.message : "unknown error"}. Fallback copy was generated locally.`
      ]))
    : fallbackPackage(article, model, generatedAt, ["OPENAI_API_KEY is not set. Fallback copy was generated locally."]);

  const combined = `${contentPackage.blog.title}\n${contentPackage.blog.dek}\n${contentPackage.blog.body}\n${contentPackage.linkedin.text}`;
  const flags = analyzeDraft(combined);
  contentPackage = {
    ...contentPackage,
    quality: {
      flags,
      rewriteNotes: [...contentPackage.quality.rewriteNotes, ...buildRewriteNotes(flags)]
    }
  };

  return contentPackage;
}

async function generateWithOpenAI(article: ArticleRecord, model: string, generatedAt: string): Promise<ContentPackage> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "high" },
      input: [
        {
          role: "system",
          content:
            "You are an editor for a water infrastructure technology company. Produce source-grounded, specific, plain-spoken copy for municipal utilities, contractors, and engineering firms."
        },
        {
          role: "user",
          content: buildGenerationPrompt(article)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "flow_brief_content_package",
          strict: true,
          schema: packageSchema()
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${truncate(errorText, 240)}`);
  }

  const data = await response.json();
  const outputText = extractOutputText(data);
  const parsed = JSON.parse(outputText) as Omit<ContentPackage, "article" | "generatedAt" | "model" | "packagePath" | "files">;

  return {
    ...parsed,
    article,
    generatedAt,
    model,
    packagePath: "",
    files: []
  };
}

function buildGenerationPrompt(article: ArticleRecord): string {
  const evidence = sourceEvidence(article).join("\n- ");
  return `Create a blog draft, company LinkedIn post, insight notes, and image brief for this article.

Article title: ${article.title}
Source: ${article.sourceName}
URL: ${article.url}
Published: ${article.publishedAt ?? "Unknown"}

Relevant source excerpts:
- ${evidence}

Audience:
- Municipal utilities and public works teams
- Engineering firms
- Inspection, rehab, and construction contractors

Editorial stance:
- Passionate about clean water infrastructure without sounding promotional.
- Compassionate toward utility staff, field crews, public budgets, ratepayers, and contractors.
- Insightful about operations, procurement, compliance, capital planning, risk, and inspection quality.
- Do not overstate what the article proves.

${antiAiChecklist()}

Output rules:
- Return valid JSON only.
- Blog body should be 700 to 950 words.
- LinkedIn post should be 130 to 220 words.
- Include source-supported claims only.
- Do not use hashtags by default.
- Make the image prompt editorial and infrastructure-specific, not abstract.
- Use plain punctuation and avoid em dashes.`;
}

function fallbackPackage(article: ArticleRecord, model: string, generatedAt: string, rewriteNotes: string[]): ContentPackage {
  const slug = slugify(article.title);
  const evidence = sourceEvidence(article);
  const topReasons = article.relevanceReasons.slice(0, 4);
  const whyThisMatters = topReasons.length
    ? topReasons.map((reason) => `${reason.label}: ${reason.evidence.slice(0, 3).join(", ")}`)
    : ["The article connects to wastewater operations, capital planning, or public infrastructure risk."];
  const operationalTakeaways = buildTakeaways(article);
  const dek = truncate(`A closer look at why ${article.sourceName}'s reporting matters for utilities, contractors, and the people who rely on sewer systems that rarely get attention until something breaks.`, 220);
  const title = sharpenTitle(article.title);

  const body = `The useful way to read this story is not as another infrastructure headline. It is a reminder that water and wastewater work lives in the gap between public expectations and the physical condition of assets underground.

${markdownEscape(article.sourceName)} reports on "${markdownEscape(article.title)}." The details matter because they point back to a familiar reality for utilities and contractors: decisions about inspection, repair, funding, and risk rarely arrive in a clean sequence. They stack up at the same time. A city may be trying to reduce failures, keep rates defensible, respond to regulators, manage contractors, and explain the work to residents who only see the system when it disrupts daily life.

That is why this article is worth saving. The strongest signal is not just the headline. It is the operational pressure underneath it. ${sentenceFromReason(topReasons[0])} For public owners, that pressure usually turns into hard prioritization. Which assets need attention first? Which defects are urgent, and which are noise? Which projects deserve scarce capital this year, and which can safely wait?

Contractors and engineers see the same pressure from the other side. Better information changes the quality of the work before construction begins. When inspection data is thin, late, inconsistent, or trapped in formats that are hard to compare, every downstream decision gets more expensive. Scopes get fuzzier. Rehab recommendations are harder to defend. Field crews inherit uncertainty that should have been resolved earlier.

The public-service angle is easy to miss. Most people do not think about wastewater infrastructure until there is an overflow, a backup, a road closure, a rate increase, or a consent order. Utility teams live with that asymmetry every day. They are expected to keep invisible systems reliable while competing for attention against projects the public can actually see.

The practical lesson is simple: the industry needs cleaner ways to turn field evidence into decisions. Not more dashboards for their own sake. Not more vague promises about data. What helps is trustworthy condition information that can be reviewed, compared, questioned, and tied back to the assets that crews and contractors actually touch.

For teams watching this space, the article is a useful prompt for three questions. First, where are inspection findings still too slow or inconsistent to influence planning? Second, where are cities asking contractors to price uncertainty that better asset data could reduce? Third, where could clearer evidence help public officials explain why sewer work deserves funding before a failure makes the case for them?

Those questions are not abstract. They are how collection systems become more resilient in the real world: one better inspection, one cleaner recommendation, one more defensible capital decision at a time.`;

  const linkedin = `A useful wastewater story is rarely just about one project, rule, or technology.

This one from ${article.sourceName} is worth reading because it points to a bigger pressure across the industry: utilities, engineers, and contractors are being asked to make better infrastructure decisions with limited time, uneven data, and public attention that usually arrives after something fails.

The part that matters is practical. Better inspection evidence does not just make reports cleaner. It changes how cities prioritize work, how engineers defend recommendations, how contractors price risk, and how public officials explain investments that most residents never see.

That is the quiet work behind reliable wastewater systems. The industry does not need more vague talk about innovation. It needs clearer evidence, earlier decisions, and tools that respect the complexity field teams already carry.

Source: ${article.url}`;

  const preferredSourceImage = article.imageCandidates[0];

  return {
    article,
    generatedAt,
    model,
    packagePath: "",
    files: [],
    blog: {
      title,
      slug,
      dek,
      body,
      metaDescription: truncate(`Why ${article.sourceName}'s reporting on ${article.title} matters for wastewater utilities, engineering firms, and contractors.`, 155),
      tags: ["wastewater", "infrastructure", "asset management", "inspection"].concat(article.topicTags.slice(0, 4))
    },
    linkedin: {
      text: linkedin,
      headlineOptions: [
        "Why better sewer evidence matters before a failure",
        "The quiet pressure behind wastewater infrastructure decisions",
        "What this water industry story says about inspection, risk, and public trust"
      ]
    },
    insights: {
      whyThisMatters,
      operationalTakeaways,
      sourceEvidence: evidence
    },
    imageBrief: {
      preferredSourceImage,
      originalImagePrompt: `Editorial photograph for a water infrastructure industry article: municipal wastewater field crew reviewing sewer inspection footage beside a utility truck near a manhole, realistic public works setting, overcast morning light, no logos, no staged smiles, documentary style, high detail.`,
      altText: `Wastewater infrastructure team reviewing sewer inspection information for asset planning.`,
      usageNotes: [
        preferredSourceImage ? "Verify source image rights before reuse." : "No source image was found. Generate or source an original editorial image.",
        "Avoid generic pipes, stock business handshakes, or abstract AI imagery.",
        "Prefer field context: inspection monitors, manholes, utility trucks, maps, or public works settings."
      ]
    },
    quality: {
      flags: [],
      rewriteNotes
    }
  };
}

function sourceEvidence(article: ArticleRecord): string[] {
  const sentences = splitSentences(`${article.excerpt} ${article.contentText}`);
  const useful = sentences.filter((sentence) => sentence.length > 45 && sentence.length < 260).slice(0, 8);
  return useful.length ? useful : [article.excerpt || article.title];
}

function buildTakeaways(article: ArticleRecord): string[] {
  const reasons = article.relevanceReasons.map((reason) => reason.label);
  return [
    reasons.includes("Collection system relevance")
      ? "Collection-system stories should be evaluated for asset-condition and overflow-risk implications."
      : "Look for the asset-management decision hiding beneath the headline.",
    reasons.includes("Contractor and engineering relevance")
      ? "Contractors and engineers benefit when inspection evidence is clearer before scope and pricing decisions."
      : "Better source evidence can reduce uncertainty before project planning starts.",
    reasons.includes("Regulatory or funding pressure")
      ? "Funding and compliance pressure make defensible prioritization more valuable."
      : "Public owners need plain explanations for why underground work deserves attention before failures occur."
  ];
}

function sharpenTitle(title: string): string {
  if (title.length <= 74) return title;
  return `${title.slice(0, 70).trim()}...`;
}

function sentenceFromReason(reason?: { label: string; evidence: string[] }): string {
  if (!reason) return "The story ties back to the daily work of maintaining assets that sit out of public view.";
  return `The article carries a ${reason.label.toLowerCase()} signal through details such as ${reason.evidence.slice(0, 3).join(", ")}.`;
}

function extractOutputText(data: unknown): string {
  const record = data as { output_text?: string; output?: Array<{ content?: Array<{ text?: string; type?: string }> }> };
  if (typeof record.output_text === "string") return record.output_text;

  const text = record.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((value): value is string => typeof value === "string" && value.length > 0);

  if (!text) throw new Error("No text output returned.");
  return text;
}

function packageSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["blog", "linkedin", "insights", "imageBrief", "quality"],
    properties: {
      blog: {
        type: "object",
        additionalProperties: false,
        required: ["title", "slug", "dek", "body", "metaDescription", "tags"],
        properties: {
          title: { type: "string" },
          slug: { type: "string" },
          dek: { type: "string" },
          body: { type: "string" },
          metaDescription: { type: "string" },
          tags: { type: "array", items: { type: "string" } }
        }
      },
      linkedin: {
        type: "object",
        additionalProperties: false,
        required: ["text", "headlineOptions"],
        properties: {
          text: { type: "string" },
          headlineOptions: { type: "array", items: { type: "string" } }
        }
      },
      insights: {
        type: "object",
        additionalProperties: false,
        required: ["whyThisMatters", "operationalTakeaways", "sourceEvidence"],
        properties: {
          whyThisMatters: { type: "array", items: { type: "string" } },
          operationalTakeaways: { type: "array", items: { type: "string" } },
          sourceEvidence: { type: "array", items: { type: "string" } }
        }
      },
      imageBrief: {
        type: "object",
        additionalProperties: false,
        required: ["originalImagePrompt", "altText", "usageNotes"],
        properties: {
          preferredSourceImage: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["url", "source"],
                properties: {
                  url: { type: "string" },
                  source: { type: "string", enum: ["feed", "article-meta", "manual-brief"] },
                  alt: { type: "string" },
                  credit: { type: "string" }
                }
              },
              { type: "null" }
            ]
          },
          originalImagePrompt: { type: "string" },
          altText: { type: "string" },
          usageNotes: { type: "array", items: { type: "string" } }
        }
      },
      quality: {
        type: "object",
        additionalProperties: false,
        required: ["flags", "rewriteNotes"],
        properties: {
          flags: { type: "array", items: { type: "object", additionalProperties: true } },
          rewriteNotes: { type: "array", items: { type: "string" } }
        }
      }
    }
  };
}
