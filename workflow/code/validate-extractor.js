// AcadFlow — Validate and Merge Extractor Output (Code node, mode: "Run Once for All Items")
// Owner: Debashis (M1)
//
// Runs after Agent 1 (Information Extractor). This is the *defensive* version that:
//   1. Handles both shapes the Information Extractor can emit — flat fields at the top level,
//      OR wrapped in an "output" key (depends on n8n version + model behavior).
//   2. Only flags TRULY critical fields (objectives, deliverables, estimated_hours) as failure.
//      Optional fields (grading_rubric, technical_requirements, keywords) get safe defaults
//      instead of halting the workflow.
//   3. Pulls upstream Contract A from the Preprocessor so the downstream chain has it merged.
//   4. Adds defensive defaults so Agent 3 / 4 never crash on undefined access.
//
// This is the live version deployed in the n8n workflow (qoIO1YYIDt8Qn2XQ).

const upstream = $('Preprocessor - Validate and Compute').first().json;
const out = [];

for (const item of $input.all()) {
  // Handle both shapes: flat ({objectives, deliverables, ...}) or wrapped ({output: {...}})
  const raw = item.json || {};
  const extracted = (raw.output && typeof raw.output === 'object' && !Array.isArray(raw.output)) ? raw.output : raw;

  // Only the TRULY critical fields trigger manual review.
  // grading_rubric / technical_requirements / keywords are nice-to-have but absence shouldn't halt the workflow.
  const critical = ['objectives', 'deliverables', 'estimated_hours'];
  const missing = critical.filter((k) => {
    const v = extracted[k];
    if (v === undefined || v === null) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });

  // Defensive defaults for optional fields so downstream Agent 3 doesn't break on undefined access.
  const safe = {
    objectives: Array.isArray(extracted.objectives) ? extracted.objectives : [],
    deliverables: Array.isArray(extracted.deliverables) ? extracted.deliverables : [],
    grading_rubric: Array.isArray(extracted.grading_rubric) ? extracted.grading_rubric : [],
    technical_requirements: Array.isArray(extracted.technical_requirements) ? extracted.technical_requirements : [],
    estimated_hours: typeof extracted.estimated_hours === 'number' ? extracted.estimated_hours : 8,
    difficulty_score: typeof extracted.difficulty_score === 'number' ? extracted.difficulty_score : 5,
    keywords: Array.isArray(extracted.keywords) ? extracted.keywords : [],
  };

  out.push({
    json: {
      ...upstream,
      ...safe,
      _extractor_failed: missing.length > 0,
      _missing_keys: missing,
      _extractor_raw_shape: raw.output ? 'wrapped' : 'flat',
    },
  });
}

return out;
