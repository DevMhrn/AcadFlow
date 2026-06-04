// AcadFlow — Classifier Error Fallback (Code node, mode: "Run Once for All Items")
// Owner: Debashis (M2)
//
// This node fires when Agent 2 (Risk Classifier chain + parser) errors out — typically when Gemini
// returns malformed JSON the Structured Output Parser can't validate even after the autoFix retry.
//
// Instead of halting the workflow or surfacing "classifier failed - using fallback" to the professor,
// this node computes a real, actionable risk classification *deterministically* from the same
// signals the AI was looking at. The professor email gets meaningful reasons either way.
//
// Wired as: Agent 2 error output (sourceIndex: 1) → this node → Urgent Override.
// The Urgent Override doesn't care which path produced the {output: {...}} payload.

const upstream = $('Validate and Merge Extractor Output').first().json;
const days = Number(upstream.days_remaining) || 0;
const hours = Number(upstream.estimated_hours) || 0;
const difficulty = Number(upstream.difficulty_score) || 5;
const hasProgress = typeof upstream.current_progress_notes === 'string' && upstream.current_progress_notes.trim().length > 0;
const isUrgent = upstream.is_urgent_lt_48h === true;

const reasons = [];

// Time pressure signal — always emits one bucket label
if (days <= 1) {
  reasons.push('extreme time pressure (' + days + ' day remaining)');
} else if (days <= 3) {
  reasons.push('tight deadline (' + days + ' days remaining)');
} else if (days <= 7) {
  reasons.push('moderate timeline (' + days + ' days)');
} else {
  reasons.push('comfortable timeline (' + days + ' days)');
}

// Workload-to-time ratio — only emits when something's notable
if (days > 0 && hours > days * 10) {
  reasons.push('workload is severe for the window (' + hours + 'h in ' + days + ' days)');
} else if (days > 0 && hours > days * 6) {
  reasons.push('workload is high for the window (' + hours + 'h in ' + days + ' days)');
} else if (hours >= 25) {
  reasons.push('substantial total workload (' + hours + 'h)');
}

// Difficulty — emits at the extremes only
if (difficulty >= 8) {
  reasons.push('high difficulty (' + difficulty + '/10)');
} else if (difficulty <= 3) {
  reasons.push('low difficulty (' + difficulty + '/10)');
}

// Student readiness — always emits one of the two
if (!hasProgress) {
  reasons.push('no prior progress reported');
} else {
  reasons.push('student has reported some prior progress');
}

// Compute risk level deterministically — multi-signal triage
let risk_level = 'medium';
let risk_score = 0.5;

if (isUrgent || days <= 1 || (days > 0 && hours > days * 12) || difficulty >= 9) {
  risk_level = 'high';
  risk_score = 0.85;
} else if ((days <= 3 && hours >= 12 && !hasProgress) || (days <= 5 && difficulty >= 8)) {
  risk_level = 'high';
  risk_score = 0.75;
} else if (days >= 10 && hours <= 8 && difficulty <= 5) {
  risk_level = 'low';
  risk_score = 0.2;
} else if (days >= 7 && hours <= 12 && difficulty <= 6) {
  risk_level = 'low';
  risk_score = 0.3;
}

const inputItem = $input.first().json || {};
return [{
  json: Object.assign({}, inputItem, {
    output: {
      risk_level: risk_level,
      risk_score: risk_score,
      reasons: reasons,
      needs_human_review: risk_level === 'high',
    },
    _classifier_used: 'deterministic_fallback',
  }),
}];
