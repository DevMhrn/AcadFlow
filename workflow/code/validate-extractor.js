// AcadFlow — Validate and Merge Extractor Output (Code node, mode: "Run Once for All Items")
// Owner: Debashis (M1)
//
// Runs after Agent 1 (Information Extractor). The Information Extractor outputs the schema fields
// FLAT at the top level of $json (not wrapped in an "output" key — that's only true for chains with
// Structured Output Parser sub-nodes). This Code node:
//   1. Pulls the upstream preprocessor data (Contract A — submission_id, days_remaining, course, etc.)
//      so it doesn't get lost across the AI node boundary.
//   2. Merges it with the extractor's output (Contract B).
//   3. Adds defensive flags (_extractor_failed, _missing_keys) for the downstream IF guard.

const upstream = $('Preprocessor - Validate and Compute').first().json;
const required = ['objectives', 'deliverables', 'grading_rubric', 'technical_requirements', 'estimated_hours', 'difficulty_score', 'keywords'];

const out = [];
for (const item of $input.all()) {
  const extracted = item.json;
  const missing = required.filter((k) => extracted[k] === undefined || extracted[k] === null);

  out.push({
    json: {
      ...upstream,
      ...extracted,
      _extractor_failed: missing.length > 0,
      _missing_keys: missing,
    },
  });
}

return out;
