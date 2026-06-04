// AcadFlow — Preprocessor (Code node, mode: "Run Once for All Items", language: JavaScript)
// Owner: Debashis (M1)
//
// Reads raw Form Trigger output, normalizes it into Contract A.
// Computes days_remaining, is_urgent_lt_48h, validates inputs, generates submission_id.
// On invalid input, sets input_valid = false so the next IF node can route to the rejection branch.
//
// IMPORTANT: This is the live version deployed in the n8n workflow (qoIO1YYIDt8Qn2XQ).
// Uses Math.random for UUID generation because n8n's sandboxed Code node does NOT expose
// the Web Crypto API (no crypto.getRandomValues). Math.random is fine for a submission_id
// that's correlation-only, not security-critical.

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isNonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.floor(Math.random() * 16);
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

const out = [];
for (const item of $input.all()) {
  const j = item.json;
  const student_email = ((j['Student Email'] || j.student_email || '') + '').trim();
  const course = ((j['Course'] || j.course || '') + '').trim();
  const title = ((j['Assignment Title'] || j.title || '') + '').trim();
  const instructions_raw = ((j['Instructions'] || j.instructions_raw || '') + '').trim();
  const current_progress_notes = ((j['Current Progress / Notes'] || j.current_progress_notes || '') + '').trim();
  const priority_hint = j['Priority'] || j.priority_hint || null;
  const deadlineInput = j['Deadline'] || j.deadline_iso;

  const now = new Date();
  const deadline = deadlineInput ? new Date(deadlineInput) : null;
  const deadlineValid = deadline instanceof Date && !isNaN(deadline.getTime()) && deadline.getTime() > now.getTime();

  const msPerDay = 1000 * 60 * 60 * 24;
  const days_remaining = deadlineValid
    ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / msPerDay))
    : null;
  const is_urgent_lt_48h = deadlineValid
    ? (deadline.getTime() - now.getTime()) < (48 * 60 * 60 * 1000)
    : false;

  const errors = [];
  if (!isEmail(student_email)) errors.push('Invalid or missing student_email');
  if (!isNonEmpty(course)) errors.push('Missing course');
  if (!isNonEmpty(title)) errors.push('Missing assignment title');
  if (!isNonEmpty(instructions_raw)) errors.push('Missing instructions');
  if (!deadlineValid) errors.push('Deadline must be a valid future date');

  const input_valid = errors.length === 0;

  out.push({
    json: {
      submission_id: uuid(),
      student_email,
      course,
      title,
      instructions_raw,
      current_progress_notes,
      deadline_iso: deadlineValid ? deadline.toISOString() : null,
      priority_hint: priority_hint && ['high', 'medium', 'low'].includes(priority_hint) ? priority_hint : null,
      days_remaining,
      is_urgent_lt_48h,
      input_valid,
      validation_errors: errors,
      received_at: now.toISOString(),
    },
  });
}

return out;
