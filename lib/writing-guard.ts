import type { QualityFlag } from "./types";

const aiPatterns = [
  "in today's fast-paced world",
  "game changer",
  "revolutionize",
  "cutting-edge",
  "leveraging",
  "unlock",
  "seamlessly",
  "at the end of the day",
  "more than ever",
  "it is important to note",
  "as we navigate",
  "transform the way",
  "pave the way",
  "in conclusion",
  "key takeaways",
  "delve",
  "robust solution",
  "paradigm shift",
  "empower",
  "unprecedented"
];

const vagueClaims = [
  "improve efficiency",
  "drive innovation",
  "enhance operations",
  "optimize resources",
  "better outcomes",
  "future of"
];

export function analyzeDraft(text: string): QualityFlag[] {
  const lower = text.toLowerCase();
  const flags: QualityFlag[] = [];

  for (const phrase of aiPatterns) {
    if (lower.includes(phrase)) {
      flags.push({
        kind: "ai-pattern",
        phrase,
        suggestion: "Replace with a concrete sentence tied to the article and utility operations."
      });
    }
  }

  for (const phrase of vagueClaims) {
    if (lower.includes(phrase)) {
      flags.push({
        kind: "specificity",
        phrase,
        suggestion: "Name the operational, financial, compliance, or public-service mechanism."
      });
    }
  }

  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  for (const paragraph of paragraphs) {
    if (paragraph.length > 900) {
      flags.push({
        kind: "tone",
        phrase: paragraph.slice(0, 80),
        suggestion: "Break this into shorter paragraphs with one claim per paragraph."
      });
    }
  }

  return flags;
}

export function buildRewriteNotes(flags: QualityFlag[]): string[] {
  if (!flags.length) {
    return ["No stock AI-writing patterns were detected by the local checker."];
  }

  return [
    "Resolve flagged stock phrases before posting.",
    "Prefer concrete nouns from the source article over abstract claims.",
    "Keep the human point of view: field crews, utility managers, ratepayers, and contractors."
  ];
}

export function antiAiChecklist(): string {
  return `Avoid stock AI prose:
- No padded scene-setting like "in today's fast-paced world."
- No generic thought-leadership claims unless the article proves them.
- No invented trend framing.
- No unsupported certainty.
- No repetitive paragraph rhythm.
- No glossy adjectives where a concrete mechanism would do more work.
- Write like a careful operator explaining why the article matters to another operator.`;
}
