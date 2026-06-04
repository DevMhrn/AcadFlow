// AcadFlow — Assemble Planning Payload (Code node, mode: "Run Once for All Items")
// Owner: Gowtham (M3)
//
// Final M3 step. Agent 4 (Content Generator) returns Contract E under $json.output and — like every
// chainLlm node — drops the upstream context. This node assembles the single Contract F payload that
// Navneet's Final Assembler consumes (keyed by submission_id) by merging:
//   - Contracts A + B + C + the validated Contract D (pulled from the "Validate Plan" node), and
//   - Contract E (this node's input, straight from Agent 4).
//
// Implemented as a Code node rather than an n8n Merge node for the same reason Debashis used one in
// validate-extractor.js: it deterministically re-attaches named-node context that the AI chain drops,
// which the Merge node can't do reliably across the chainLlm boundary.

const DEFAULT_DISCLAIMER =
  'AI-generated content for reference only. The student must rewrite, expand, and verify all claims before submission.';

const planned = $('Validate Plan').first().json; // A + B + C + D + validation flags

const out = [];
for (const item of $input.all()) {
  const e = item.json.output || item.json; // Contract E

  out.push({
    json: {
      ...planned,
      outline: Array.isArray(e.outline) ? e.outline : [],
      starter_draft_markdown: e.starter_draft_markdown || '',
      disclaimer: e.disclaimer || DEFAULT_DISCLAIMER,
      route: 'planning_complete',
      _m3_complete: true,
    },
  });
}

return out;
