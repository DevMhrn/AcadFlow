# Router + Fallback Paths (M2 Tail)

## 1. Invalid-Input branch (early exit)

Place an **IF node** named `Input Valid?` immediately after the Preprocessor Code node.

**Condition:** `{{ $json.input_valid }}` equals (boolean) `true`

- **TRUE branch** → continue to Google Sheets log → Agent 1
- **FALSE branch** → Gmail node:
  - To: `{{ $json.student_email }}` (only send if email itself was valid; otherwise route to error sheet)
  - Subject: `AcadFlow couldn't process your submission`
  - Body: `Hi,\n\nWe couldn't process your assignment submission. Issues:\n\n{{ $json.validation_errors.join('\n• ') }}\n\nPlease re-submit with the missing details.\n\n— AcadFlow`
- Also append a row to a `submissions_errors` Google Sheet for debugging.

---

## 2. Schema-guard after Agent 1

Even with JSON Schema response_format, defend against the unlikely case of a tool error. Add a **Code node** named `Validate Extractor Output` between Agent 1 and Agent 2:

```js
const o = $input.first().json;
const required = ['objectives','deliverables','grading_rubric','technical_requirements','estimated_hours','difficulty_score','keywords'];
const missing = required.filter(k => o[k] === undefined || o[k] === null);
if (missing.length) {
  return [{ json: { ...o, _extractor_failed: true, _missing_keys: missing } }];
}
return [{ json: { ...o, _extractor_failed: false } }];
```

Follow with an **IF node** on `_extractor_failed`:
- TRUE → Gmail node to Debashis with the raw output + submission_id for manual review
- FALSE → continue to Agent 2

---

## 3. Risk-based router (the main IF)

After the Urgent Override Set node, place the **IF node** named `Route by Risk`:

**Condition:** `{{ $json.risk_level }}` equals (string) `high`

- **TRUE branch** → HITL path (Navneet's input)
- **FALSE branch** → Planning path (Gowtham's input)

Use a **Switch node** instead if you later want a third path for medium-priority assignments — but for the demo, binary IF is enough.

---

## 4. Branch-merge guarantee

Both HITL and Planning branches must eventually feed Navneet's Final Assembler via a **Merge node** in "Pass-through" or "Combine" mode (configure with Gowtham + Navneet once their nodes exist).

---

## 5. Master log row (Sheets node, after the router)

Append one row to a `submissions_master` Google Sheet with these columns so the team can audit every run:

| submission_id | received_at | student_email | course | title | days_remaining | risk_level | route | doc_link | status |

`route` = `'hitl'` or `'planning'` (set this in a Set node on each branch).
`doc_link` / `status` start blank and get patched by Navneet's Final Assembler.
