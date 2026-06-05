const baseUrl = process.env.FLOW_BRIEF_BASE_URL || "http://localhost:3000";
const force = process.argv.includes("--force") ? "?force=1" : "";

const response = await fetch(`${baseUrl}/api/brief${force}`);
if (!response.ok) {
  console.error(`Morning brief failed: HTTP ${response.status}`);
  process.exit(1);
}

const brief = await response.json();
console.log(`Flow Brief ${brief.runDate}`);
console.log(`Sources: ${brief.sourceCount}`);
console.log(`Articles: ${brief.articleCount}`);
for (const [index, article] of brief.shortlist.entries()) {
  console.log(`${index + 1}. [${article.relevanceScore}] ${article.title} - ${article.sourceName}`);
}

if (brief.warnings?.length) {
  console.log("\nWarnings:");
  for (const warning of brief.warnings) console.log(`- ${warning}`);
}
