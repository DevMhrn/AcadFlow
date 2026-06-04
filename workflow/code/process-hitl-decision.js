// AcadFlow — Process HITL Decision (Code node, mode: "Run Once for All Items")
// Owner: Navneet (M4)
//
// Runs after the Wait node resumes. It recovers the upstream payload (Contracts A + B + C)
// from the HITL branch entry and reads the decision and comments/notes passed via the webhook
// query parameters. If the webhook wasn't called (24h timeout), it falls back to auto-approval.

const upstream = $('HITL Branch Entry (Navneet wires here)').first().json;

const out = [];

for (const item of $input.all()) {
  const waitOutput = item.json;
  
  let decision = 'auto_approved_timeout';
  let feedback = 'Automatically approved after 24h timeout.';
  
  // If the Wait node was resumed via a webhook query call:
  if (waitOutput.query && waitOutput.query.decision) {
    decision = waitOutput.query.decision;
    feedback = waitOutput.query.notes || '';
  }
  
  out.push({
    json: {
      ...upstream,
      decision,
      professor_feedback: feedback,
      route: 'hitl',
      _hitl_complete: true
    }
  });
}

return out;
