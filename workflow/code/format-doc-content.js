// AcadFlow — Format Document Content (Code node, mode: "Run Once for All Items")
// Owner: Navneet (M4)
//
// Formats the entire Contract F payload (which contains Contracts A, B, C, D, E and HITL decision feedback)
// into a clean, readable text document. The output 'doc_content' is then written into the Google Doc.

const out = [];

for (const item of $input.all()) {
  const data = item.json;
  
  const course = data.course || 'Unknown Course';
  const title = data.title || 'Untitled Assignment';
  const receivedAt = data.received_at || new Date().toISOString();
  
  const objectives = Array.isArray(data.objectives) ? data.objectives : [];
  const deliverables = Array.isArray(data.deliverables) ? data.deliverables : [];
  const gradingRubric = Array.isArray(data.grading_rubric) ? data.grading_rubric : [];
  const techRequirements = Array.isArray(data.technical_requirements) ? data.technical_requirements : [];
  const estHours = data.estimated_hours || 0;
  const difficulty = data.difficulty_score || 0;
  
  const riskLevel = data.risk_level || 'low';
  const riskScore = data.risk_score || 0;
  const reasons = Array.isArray(data.reasons) ? data.reasons : [];
  
  const plan = Array.isArray(data.plan) ? data.plan : [];
  const resources = Array.isArray(data.resources) ? data.resources : [];
  const totalEstHours = data.total_estimated_hours || estHours;
  
  const outline = Array.isArray(data.outline) ? data.outline : [];
  const draft = data.starter_draft_markdown || '';
  const disclaimer = data.disclaimer || 'AI-generated content for reference only.';
  
  // HITL details
  const decision = data.decision;
  const profFeedback = data.professor_feedback;

  let body = "";
  body += `========================================================================\n`;
  body += `ACADFLOW ASSIGNMENT STUDY PLAN & STARTER KIT\n`;
  body += `Course: ${course}\n`;
  body += `Assignment: ${title}\n`;
  body += `Generated At: ${receivedAt}\n`;
  body += `========================================================================\n\n`;

  body += `1. ASSIGNMENT REQUIREMENTS SUMMARY\n`;
  body += `----------------------------------\n`;
  if (objectives.length > 0) {
    body += `Objectives:\n`;
    objectives.forEach(o => body += `  - ${o}\n`);
  }
  if (deliverables.length > 0) {
    body += `\nDeliverables:\n`;
    deliverables.forEach(d => body += `  - ${d}\n`);
  }
  if (gradingRubric.length > 0) {
    body += `\nGrading Rubric:\n`;
    gradingRubric.forEach(r => body += `  - ${r.criterion}: ${r.weight_pct}%\n`);
  }
  if (techRequirements.length > 0) {
    body += `\nTechnical Requirements:\n`;
    techRequirements.forEach(t => body += `  - ${t}\n`);
  }
  body += `\nEstimated Effort: ${estHours} hours\n`;
  body += `Difficulty Score: ${difficulty}/10\n\n`;

  body += `2. RISK & COMPLEXITY CLASSIFICATION\n`;
  body += `------------------------------------\n`;
  body += `Risk Level: ${riskLevel.toUpperCase()}\n`;
  body += `Risk Score: ${riskScore.toFixed(2)}\n`;
  if (reasons.length > 0) {
    body += `Reasons Flagged:\n`;
    reasons.forEach(r => body += `  - ${r}\n`);
  }
  body += `\n`;

  if (decision) {
    body += `HUMAN-IN-THE-LOOP REVIEW DETAILS\n`;
    body += `--------------------------------\n`;
    body += `Review Status: ${decision.toUpperCase()}\n`;
    body += `Professor/TA Feedback:\n`;
    body += `${profFeedback || 'No direct notes provided.'}\n\n`;
  }

  body += `3. DAY-BY-DAY STUDY PLAN\n`;
  body += `------------------------\n`;
  if (plan.length > 0) {
    plan.forEach(t => {
      body += `Day ${t.day_offset}: ${t.task} (${t.hours} hours)\n`;
    });
  } else {
    body += `No study plan items generated.\n`;
  }
  body += `\nTotal Plan Hours: ${totalEstHours} hours\n\n`;

  if (resources.length > 0) {
    body += `STUDY RESOURCES\n`;
    body += `---------------\n`;
    resources.forEach(r => {
      body += `  - [${r.type.toUpperCase()}] ${r.title}${r.url ? ` (${r.url})` : ''}\n`);
    });
    body += `\n`;
  }

  body += `4. STARTER OUTLINE & STARTER DRAFT\n`;
  body += `----------------------------------\n`;
  if (outline.length > 0) {
    body += `Outline:\n`;
    outline.forEach(sec => {
      body += `  Section: ${sec.section}\n`;
      if (Array.isArray(sec.bullets)) {
        sec.bullets.forEach(b => body += `    - ${b}\n`);
      }
    });
    body += `\n`;
  }
  
  if (draft) {
    body += `Starter Draft:\n`;
    body += `${draft}\n\n`;
  }

  body += `------------------------------------------------------------------------\n`;
  body += `DISCLAIMER:\n`;
  body += `${disclaimer}\n`;
  body += `========================================================================\n`;

  out.push({
    json: {
      ...data,
      doc_content: body
    }
  });
}

return out;
