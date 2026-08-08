# flow-brief — Agent Notes

> Portable rulebook for any AI coding agent (Claude Code, Codex, …) working in this repo.
> **Facts, not procedures.**

## Read first
1. **Platform hub — https://github.com/SiteScan-Build/sitescan-platform** — shared rules, vocabulary,
   design system, voice. **The hub wins on any shared rule** — and voice/tone matters more here than
   anywhere else, because this repo generates published copy.
2. [`README.md`](README.md) — setup and stack.
3. Voice + tone source of truth: https://github.com/SiteScan-Build/sitescan-brand →
   `08-voice-and-tone.md`.

## ⚠️ Repo ownership
Lives at **https://github.com/IntelExpert/flow-brief** — the older `IntelExpert` org, not
`SiteScan-Build`. Consolidation is flagged in the hub atlas but not actioned.

## What this is
A **daily editorial workstation for water and wastewater industry news** — an internal tool, not a
customer-facing product. It pulls industry sources, ranks the five most relevant articles for
municipal owners / engineering firms / contractors, then builds a local content package for a chosen
article: blog draft, company LinkedIn draft, image brief, source summary, quality report, and a
posting prompt.

## Stack
Next.js (App Router) + TypeScript. **No database** — a local JSON cache in `.flow-brief/` and
generated packages in `output/`. Uses the **OpenAI Responses API** when `OPENAI_API_KEY` is set, with
a **deterministic local fallback** when it isn't. Vitest for tests. npm.

```
app/         routes
components/  UI
lib/         ranking, source pulls, generation
scripts/     helpers
tests/       vitest
.flow-brief/ local JSON cache (not source)
output/      generated content packages (not source)
```

## Run it
```
npm install
cp .env.example .env.local     # OPENAI_API_KEY optional — omit to use the deterministic fallback
npm run dev                    # http://localhost:3000
```
Never commit `.env.local`. **`.flow-brief/` and `output/` are working artifacts** — don't treat their
contents as source, and don't commit generated packages.

## Hard rules — this repo writes things we publish
- **Never fabricate.** No invented statistics, quotes, dates, incidents, or sources. Every factual
  claim in a draft must trace to a real pulled article. A plausible-sounding invented number in a
  LinkedIn post about a real utility is the worst failure mode this tool has.
- **Attribute honestly.** Summaries link the source; drafts never present someone else's reporting as
  original.
- **Never say "job"** — platform vocabulary rule.
- **No emoji, no pill badges, no fabricated metrics, no AI-isms** in generated copy. Plain, credible
  language for municipal buyers. This is the brand voice rule and it applies to *output*, not just
  the UI.
- **Drafts are drafts.** Output is for a human to review before anything is published — don't add
  auto-posting.
- **No local machine paths** in committed files.

## Note on the model provider
This repo calls **OpenAI**, not Claude — deliberate and pre-existing. Don't migrate it as a
side effect of other work.
