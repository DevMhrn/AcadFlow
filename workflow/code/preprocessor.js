// AcadFlow — Preprocessor (Code node, mode: "Run Once for All Items", language: JavaScript)
// Owner: Debashis (M1)
//
// Reads raw Form Trigger output, normalizes it into Contract A.
// Computes days_remaining, is_urgent_lt_48h, validates inputs, generates submission_id.
// On invalid input, sets input_valid = false so the next IF node can route to the rejection branch.

const item = $input.first().json;

// --- helpers -----------------------------------------------------------------
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isNonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

// UUID v4 without external deps
const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
  const v = c === 'x' ? r : (r & 0x3) | 0x8;
  return v.toString(16);
});

// --- read form fields (rename keys here if your Form Trigger field labels differ) ---
const student_email = (item['Student Email'] || item.student_email || '').trim();
const course = (item['Course'] || item.course || '').trim();
const title = (item['Assignment Title'] || item.title || '').trim();
const instructions_raw = (item['Instructions'] || item.instructions_raw || '').trim();
const current_progress_notes = (item['Current Progress / Notes'] || item.current_progress_notes || '').trim();
const priority_hint = (item['Priority'] || item.priority_hint || null);
const deadlineInput = item['Deadline'] || item.deadline_iso;

// --- deadline math -----------------------------------------------------------
const now = new Date($now.toISO()); // n8n provides $now to keep the workflow deterministic on resume
const deadline = deadlineInput ? new Date(deadlineInput) : null;
const deadlineValid = deadline instanceof Date && !isNaN(deadline.getTime()) && deadline.getTime() > now.getTime();

const msPerDay = 1000 * 60 * 60 * 24;
const days_remaining = deadlineValid
  ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / msPerDay))
  : null;
const is_urgent_lt_48h = deadlineValid
  ? (deadline.getTime() - now.getTime()) < (48 * 60 * 60 * 1000)
  : false;

// --- validation --------------------------------------------------------------
const errors = [];
if (!isEmail(student_email)) errors.push('Invalid or missing student_email');
if (!isNonEmpty(course)) errors.push('Missing course');
if (!isNonEmpty(title)) errors.push('Missing assignment title');
if (!isNonEmpty(instructions_raw)) errors.push('Missing instructions (raw text or PDF parse failed)');
if (!deadlineValid) errors.push('Deadline must be a valid future date');

const input_valid = errors.length === 0;

// --- build Contract A --------------------------------------------------------
return [{
  json: {
    submission_id: uuid(),
    student_email,
    course,
    title,
    instructions_raw,
    deadline_iso: deadlineValid ? deadline.toISOString() : null,
    current_progress_notes,
    priority_hint: priority_hint && ['high', 'medium', 'low'].includes(priority_hint) ? priority_hint : null,
    days_remaining,
    is_urgent_lt_48h,
    input_valid,
    validation_errors: errors,
    received_at: now.toISOString(),
  }
}];
