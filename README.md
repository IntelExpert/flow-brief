# Flow Brief

Daily editorial workstation for water and wastewater industry news.

Flow Brief pulls industry sources, ranks the five most relevant articles for municipal owners, engineering firms, and contractors, then builds a local content package for a selected article. The package includes a blog draft, company LinkedIn draft, image brief, source summary, quality report, and a Codex-ready posting prompt.

## Stack

- Next.js App Router
- TypeScript
- Local JSON cache in `.flow-brief`
- Local generated packages in `output`
- OpenAI Responses API when `OPENAI_API_KEY` is configured
- Deterministic local fallback when no API key is configured

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
FLOW_BRIEF_BASE_URL=http://localhost:3000
```

`OPENAI_MODEL` can be changed without touching code. The app uses `gpt-5.5` as the default quality model and falls back to local template generation when no API key is present.

## Daily Run

The UI refresh button calls `/api/brief?force=1`.

For a terminal-triggered run against a running server:

```bash
npm run brief:morning
npm run brief:morning -- --force
```

## Output

Selecting an article and building a package writes:

```text
output/YYYY-MM-DD/article-slug/
  article-summary.json
  blog.md
  linkedin.md
  image-brief.md
  codex-prompt.md
  posting-runbook.md
  quality-report.json
```

The app does not publish directly. The runbook and prompt files are designed for a later authenticated workflow using whatever CMS, browser, LinkedIn, or MCP tools are available in that session.

## Checks

```bash
npm run type-check
npm run test
npm run build
```
