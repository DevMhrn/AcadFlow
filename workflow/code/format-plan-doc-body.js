// AcadFlow — Format Plan Doc Body (Code node, mode: "Run Once for All Items")
// Owner: Debashis (built during M3+M4 integration; lives in the Final Assembler chain)
//
// Wired between `Final Doc - Create Plan Doc` and `Final Doc - Populate Plan Content`.
// Reads from upstream named nodes (extractor, plan validator, content generator, doc create)
// and produces TWO formatted outputs the downstream nodes consume:
//
//   1. doc_body         — plain-text body for the Google Doc (sectioned, no JSON dumps, no meta)
//   2. email_body_html  — full HTML email for the student notification (table + button)
//
// Critical design points:
//   - Meta (risk_level, risk_score, _extractor_failed, classifier_used) is NEVER included in the
//     doc — those stay in the master sheet for audit/logs.
//   - Handles both wrapped and flat Agent 4 outputs ({output: {...}} vs flat).
//   - Defaults every field, so the workflow never produces a Doc with literal "undefined" strings.

const upstream = $('Validate and Merge Extractor Output').first().json;
const planData = $('Validate Plan Fits Deadline').first().json;
const docData = $('Final Doc - Create Plan Doc').first().json;
const contentRaw = $('Agent 4 - Content Generator').first().json;
const contentObj = (contentRaw && contentRaw.output && typeof contentRaw.output === 'object') ? contentRaw.output : (contentRaw || {});

const outline = Array.isArray(contentObj.outline) ? contentObj.outline : [];
const draft = (typeof contentObj.starter_draft_markdown === 'string' && contentObj.starter_draft_markdown.length > 0)
  ? contentObj.starter_draft_markdown
  : '(no draft generated)';
const disclaimer = (typeof contentObj.disclaimer === 'string' && contentObj.disclaimer.length > 0)
  ? contentObj.disclaimer
  : 'AI-generated content for reference only. The student must rewrite, expand, and verify all claims before submission.';

const plan = Array.isArray(planData.plan) ? planData.plan : [];
const resources = Array.isArray(planData.resources) ? planData.resources : [];

const objectives = Array.isArray(upstream.objectives) ? upstream.objectives : [];
const deliverables = Array.isArray(upstream.deliverables) ? upstream.deliverables : [];
const techReqs = Array.isArray(upstream.technical_requirements) ? upstream.technical_requirements : [];
const rubric = Array.isArray(upstream.grading_rubric) ? upstream.grading_rubric : [];

// --------------------------------------------------------------------
// doc_body — plain text for Google Doc
// --------------------------------------------------------------------
const lines = [];
lines.push(upstream.title || 'Assignment');
lines.push(upstream.course || '');
lines.push('');
lines.push('Deadline: ' + (upstream.deadline_iso || 'N/A'));
lines.push('Days remaining: ' + (upstream.days_remaining != null ? upstream.days_remaining : 0));
lines.push('Estimated work: ' + (upstream.estimated_hours != null ? upstream.estimated_hours : 'N/A') + ' hours');
lines.push('Difficulty: ' + (upstream.difficulty_score != null ? upstream.difficulty_score : 'N/A') + ' / 10');
lines.push('');

lines.push('====== OBJECTIVES ======');
if (objectives.length === 0) { lines.push('(none extracted)'); }
else { objectives.forEach(function (o) { lines.push('- ' + o); }); }
lines.push('');

lines.push('====== DELIVERABLES ======');
if (deliverables.length === 0) { lines.push('(none extracted)'); }
else { deliverables.forEach(function (d) { lines.push('- ' + d); }); }
lines.push('');

lines.push('====== TECHNICAL REQUIREMENTS ======');
if (techReqs.length === 0) { lines.push('(none specified)'); }
else { techReqs.forEach(function (t) { lines.push('- ' + t); }); }
lines.push('');

lines.push('====== GRADING RUBRIC ======');
if (rubric.length === 0) { lines.push('(none specified)'); }
else { rubric.forEach(function (r) { lines.push('- ' + r.criterion + ' - ' + r.weight_pct + '%'); }); }
lines.push('');

const totalPlanned = planData._plan_total_hours != null ? planData._plan_total_hours : 0;
lines.push('====== YOUR DAY-BY-DAY PLAN (' + totalPlanned + ' total hours) ======');
if (plan.length === 0) {
  lines.push('(no plan generated)');
} else {
  plan.forEach(function (t) {
    const day = t.day_offset === 0 ? 'TODAY' : 'Day +' + t.day_offset;
    lines.push(day + ' (' + (t.hours || 0) + 'h): ' + t.task);
  });
}
lines.push('');

lines.push('====== RESOURCES ======');
if (resources.length === 0) {
  lines.push('(none suggested)');
} else {
  resources.forEach(function (r) {
    const urlPart = r.url ? ' - ' + r.url : '';
    lines.push('- ' + r.title + ' [' + r.type + ']' + urlPart);
  });
}
lines.push('');

lines.push('====== OUTLINE ======');
if (outline.length === 0) {
  lines.push('(no outline generated)');
} else {
  outline.forEach(function (s) {
    lines.push(s.section + ':');
    const bullets = Array.isArray(s.bullets) ? s.bullets : [];
    bullets.forEach(function (b) { lines.push('  - ' + b); });
  });
}
lines.push('');

lines.push('====== STARTER DRAFT ======');
lines.push(draft);
lines.push('');

lines.push('====== DISCLAIMER ======');
lines.push(disclaimer);

const doc_body = lines.join('\n');

// --------------------------------------------------------------------
// email_body_html — styled HTML for the student notification
// --------------------------------------------------------------------
const docId = docData && docData.id ? docData.id : '';
const docUrl = 'https://docs.google.com/document/d/' + docId;

let planRowsHtml = '';
plan.forEach(function (t) {
  const day = t.day_offset === 0 ? 'Today' : 'Day +' + t.day_offset;
  planRowsHtml += '<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;"><b>' + day + '</b></td>'
    + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">' + t.task + '</td>'
    + '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">' + (t.hours || 0) + 'h</td></tr>';
});
if (planRowsHtml === '') {
  planRowsHtml = '<tr><td colspan="3" style="padding:8px 12px;color:#a0aec0;">No plan generated</td></tr>';
}

let resourcesHtml = '';
resources.forEach(function (r) {
  const link = r.url ? '<a href="' + r.url + '">' + r.title + '</a>' : r.title;
  resourcesHtml += '<li style="margin-bottom:4px;">' + link + ' <span style="color:#718096;font-size:13px;">(' + r.type + ')</span></li>';
});
if (resourcesHtml === '') {
  resourcesHtml = '<li style="color:#a0aec0;">No resources suggested</li>';
}

const email_body_html = '<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:640px;color:#2d3748;line-height:1.5;">' +
  '<h2 style="color:#2c5282;margin-bottom:8px;border-bottom:2px solid #3182ce;padding-bottom:8px;">Your AcadFlow Plan is Ready</h2>' +
  '<p>Hi,</p>' +
  '<p>Your plan for <b>' + (upstream.title || 'your assignment') + '</b> (' + (upstream.course || '') + ') is ready.</p>' +
  '<table style="border-collapse:collapse;margin:16px 0;font-size:14px;background:#f7fafc;border-radius:6px;overflow:hidden;"><tbody>' +
  '<tr><td style="padding:8px 16px;color:#4a5568;">Deadline</td><td style="padding:8px 16px;font-weight:600;">' + (upstream.deadline_iso || 'N/A') + '</td></tr>' +
  '<tr><td style="padding:8px 16px;color:#4a5568;">Days remaining</td><td style="padding:8px 16px;font-weight:600;">' + (upstream.days_remaining != null ? upstream.days_remaining : 0) + '</td></tr>' +
  '<tr><td style="padding:8px 16px;color:#4a5568;">Estimated work</td><td style="padding:8px 16px;font-weight:600;">' + (upstream.estimated_hours != null ? upstream.estimated_hours : 'N/A') + 'h (planned: ' + totalPlanned + 'h)</td></tr>' +
  '</tbody></table>' +
  '<h3 style="color:#2c5282;margin-top:24px;">Your Day-by-Day Plan</h3>' +
  '<table style="border-collapse:collapse;width:100%;font-size:14px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">' +
  '<thead><tr style="background:#edf2f7;"><th style="padding:10px 12px;text-align:left;color:#4a5568;font-weight:600;">When</th><th style="padding:10px 12px;text-align:left;color:#4a5568;font-weight:600;">Task</th><th style="padding:10px 12px;text-align:right;color:#4a5568;font-weight:600;">Hours</th></tr></thead>' +
  '<tbody>' + planRowsHtml + '</tbody></table>' +
  '<h3 style="color:#2c5282;margin-top:24px;">Resources</h3>' +
  '<ul style="font-size:14px;padding-left:20px;">' + resourcesHtml + '</ul>' +
  '<p style="margin-top:32px;text-align:center;"><a href="' + docUrl + '" style="background:#3182ce;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Open Your Full Plan Doc</a></p>' +
  '<p style="font-size:12px;color:#718096;margin-top:32px;font-style:italic;border-top:1px solid #e2e8f0;padding-top:16px;">' + disclaimer + '</p>' +
  '<p style="font-size:12px;color:#a0aec0;margin-top:8px;">- AcadFlow</p>' +
  '</div>';

const inputItem = $input.first().json || {};
return [{
  json: Object.assign({}, inputItem, {
    doc_body: doc_body,
    email_body_html: email_body_html,
    doc_url: docUrl,
  }),
}];
