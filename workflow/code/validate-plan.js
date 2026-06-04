// AcadFlow — Validate Plan (Code node, mode: "Run Once for All Items")
// Owner: Gowtham (M3)
//
// Runs after Agent 3 (Personalized Planner). The Basic LLM Chain + Structured Output Parser
// returns Contract D under $json.output and — like every chainLlm node — drops the upstream
// context (Contracts A + B + C) that Agent 4 and the assembler still need. This Code node mirrors
// Debashis's validate-extractor.js pattern:
//   1. Recovers the upstream payload (A + B + C) from the planning branch entry so it survives
//      the AI node boundary.
//   2. Unwraps Contract D (handles both $json.output and a flat $json).
//   3. Validates the plan fits the deadline and the hour budget, attaching defensive flags
//      (_plan_overflow, _plan_warnings) for the downstream "Plan Overflow?" IF guard.

const upstream = $('Planning Branch Entry (Gowtham wires here)').first().json;

const daysRemaining = Number(upstream.days_remaining);
const estimatedHours = Number(upstream.estimated_hours);

const out = [];
for (const item of $input.all()) {
  const d = item.json.output || item.json; // Contract D
  const plan = Array.isArray(d.plan) ? d.plan : [];
  const resources = Array.isArray(d.resources) ? d.resources : [];

  const plannedHours = plan.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  const lastDayOffset = plan.reduce((max, t) => Math.max(max, Number(t.day_offset) || 0), 0);

  const warnings = [];

  // Rule 1: every task must land before the deadline (leave the deadline day as buffer).
  const fitsDeadline = Number.isFinite(daysRemaining) ? lastDayOffset <= daysRemaining - 1 : true;
  if (!fitsDeadline) {
    warnings.push(`plan runs to day_offset ${lastDayOffset} but only ${daysRemaining - 1} working day(s) remain before the deadline`);
  }

  // Rule 2: total planned hours must stay within +/-20% of the extractor's estimate.
  let hoursInBudget = true;
  if (Number.isFinite(estimatedHours) && estimatedHours > 0) {
    const lower = estimatedHours * 0.8;
    const upper = estimatedHours * 1.2;
    hoursInBudget = plannedHours >= lower && plannedHours <= upper;
    if (!hoursInBudget) {
      warnings.push(`planned ${plannedHours.toFixed(1)}h is outside +/-20% of the ${estimatedHours}h estimate (${lower.toFixed(1)}-${upper.toFixed(1)}h)`);
    }
  }

  // Rule 3: plan must be non-empty.
  if (plan.length === 0) {
    warnings.push('planner returned an empty plan');
  }

  // Deadline overflow / empty plan is a hard failure -> route to "Flag Plan for Review".
  // An out-of-budget hour total is a soft warning only (the plan still fits the deadline).
  const planOverflow = !fitsDeadline || plan.length === 0;

  out.push({
    json: {
      ...upstream, // Contracts A + B + C survive the AI boundary
      plan, // Contract D
      resources,
      total_estimated_hours: Number(d.total_estimated_hours) || Number(plannedHours.toFixed(2)),
      _planned_hours: Number(plannedHours.toFixed(2)),
      _last_day_offset: lastDayOffset,
      _plan_fits_deadline: fitsDeadline,
      _plan_hours_in_budget: hoursInBudget,
      _plan_overflow: planOverflow,
      _plan_warnings: warnings,
    },
  });
}

return out;
