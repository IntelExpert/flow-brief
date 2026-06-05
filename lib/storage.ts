import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContentPackage, DailyBrief } from "./types";
import { markdownEscape, slugify, toDateKey } from "./text";

const storeRoot = path.join(process.cwd(), ".flow-brief");
const outputRoot = path.join(process.cwd(), "output");

export async function readDailyBrief(dateKey = toDateKey()): Promise<DailyBrief | null> {
  try {
    const file = await readFile(path.join(storeRoot, `${dateKey}.json`), "utf8");
    return JSON.parse(file) as DailyBrief;
  } catch {
    return null;
  }
}

export async function writeDailyBrief(brief: DailyBrief): Promise<void> {
  await mkdir(storeRoot, { recursive: true });
  await writeFile(path.join(storeRoot, `${brief.runDate}.json`), JSON.stringify(brief, null, 2));
}

export async function writeContentPackage(contentPackage: ContentPackage): Promise<ContentPackage> {
  const dateKey = toDateKey(new Date(contentPackage.generatedAt));
  const slug = contentPackage.blog.slug || slugify(contentPackage.article.title);
  const packageDir = path.join(outputRoot, dateKey, slug);
  await mkdir(packageDir, { recursive: true });
  const packageWithPath = { ...contentPackage, packagePath: packageDir };

  const files = [
    ["article-summary.json", JSON.stringify(packageWithPath.article, null, 2)],
    ["blog.md", renderBlog(packageWithPath)],
    ["linkedin.md", renderLinkedIn(packageWithPath)],
    ["image-brief.md", renderImageBrief(packageWithPath)],
    ["codex-prompt.md", renderCodexPrompt(packageWithPath)],
    ["posting-runbook.md", renderPostingRunbook(packageWithPath)],
    ["quality-report.json", JSON.stringify(packageWithPath.quality, null, 2)]
  ] as const;

  for (const [filename, body] of files) {
    await writeFile(path.join(packageDir, filename), body);
  }

  return {
    ...packageWithPath,
    packagePath: packageDir,
    files: files.map(([filename]) => path.join(packageDir, filename))
  };
}

function renderBlog(contentPackage: ContentPackage): string {
  const { blog, article } = contentPackage;
  return `# ${blog.title}

${blog.dek}

Source: [${article.sourceName}](${article.url})

${blog.body}

## Source Notes

- Publisher: ${article.sourceName}
- Published: ${article.publishedAt ?? "Unknown"}
- Original URL: ${article.url}

## Metadata

- Slug: ${blog.slug}
- Meta description: ${blog.metaDescription}
- Tags: ${blog.tags.join(", ")}
`;
}

function renderLinkedIn(contentPackage: ContentPackage): string {
  return `${contentPackage.linkedin.text}

Source: ${contentPackage.article.url}

Headline options:
${contentPackage.linkedin.headlineOptions.map((headline) => `- ${headline}`).join("\n")}
`;
}

function renderImageBrief(contentPackage: ContentPackage): string {
  const image = contentPackage.imageBrief.preferredSourceImage;
  return `# Image Brief

Preferred source image: ${image?.url ?? "No reusable source image found"}

Alt text:
${contentPackage.imageBrief.altText}

Original image prompt:
${contentPackage.imageBrief.originalImagePrompt}

Usage notes:
${contentPackage.imageBrief.usageNotes.map((note) => `- ${note}`).join("\n")}
`;
}

function renderCodexPrompt(contentPackage: ContentPackage): string {
  return `You are preparing a company blog post and company LinkedIn post from a completed local content package.

Use these local files:
- Blog draft: ${contentPackage.packagePath}/blog.md
- LinkedIn draft: ${contentPackage.packagePath}/linkedin.md
- Image brief: ${contentPackage.packagePath}/image-brief.md
- Article summary: ${contentPackage.packagePath}/article-summary.json
- Quality report: ${contentPackage.packagePath}/quality-report.json

Tasks:
1. Read every file before changing anything.
2. Verify that each factual claim in the drafts is supported by the source article or the article summary.
3. Tighten any sentence that sounds generic, padded, or promotional.
4. If authenticated CMS, browser, LinkedIn, or other MCP tools are available, use them only after confirming the target account and destination.
5. Do not publish directly if the account, destination, image rights, or final approval state is unclear.
6. Keep the final copy grounded, specific, and plain-spoken.

Article:
${markdownEscape(contentPackage.article.title)}
${contentPackage.article.url}
`;
}

function renderPostingRunbook(contentPackage: ContentPackage): string {
  return `# Posting Runbook

## Preflight

- Confirm the source article is still live: ${contentPackage.article.url}
- Confirm image usage rights. Use the original image prompt if source image rights are unclear.
- Read quality-report.json and resolve remaining flags.
- Confirm the destination account before using any publishing tool.

## Blog

- Use blog.md as the base draft.
- Keep the source link visible.
- Use the slug: ${contentPackage.blog.slug}
- Use this meta description: ${contentPackage.blog.metaDescription}

## LinkedIn

- Use linkedin.md as the base draft.
- Keep the tone direct and human.
- Avoid adding hashtags unless there is a specific account convention.

## Image

- Use image-brief.md.
- If generating an original image, keep it editorial and infrastructure-specific.
- Add this alt text: ${contentPackage.imageBrief.altText}
`;
}
