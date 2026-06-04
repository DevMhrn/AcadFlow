# Phase 1 Build Guide — Debashis (M1 + M2)

End-to-end walkthrough: from "I have an n8n trial" to "my half of the workflow runs against 4 test inputs." Built to consume ~30-50 of your 1000 trial executions if you don't make mistakes.

> **Artifacts referenced here live in `/workflow/`, `/prompts/`, `/sample-data/`, and elsewhere in `/docs/`.** Each is a copy-paste-ready file. Paths below are relative to the repository root.

---

## Step 0 — Get n8n cloud set up (10 minutes)

1. Go to **https://n8n.io/cloud/** and start the free trial (no card). You'll get a subdomain like `https://<yourname>.app.n8n.cloud`.
2. Pick a workspace name. **Don't pick your real name** — it ends up in webhook URLs you may share with the team.
3. Verify your trial limits in **Settings → Usage**:
   - 14-day trial
   - 1000 executions cap
   - Unlimited workflows (✅ since April 2026)
4. **Critical**: when you build, click the **"Pin"** icon (📌) on each successful node output. Pinned outputs replay without re-executing upstream nodes — this is how you avoid burning executions while debugging downstream.
5. Invite Gowtham and Navneet under **Settings → Members** (n8n cloud trial allows multi-user; verify on the plan page).

---

## Step 1 — Add credentials (5 minutes)

In **Credentials → Add Credential**, create four:

| Credential | Type | How to get the key |
|---|---|---|
| `acadflow-openai` | OpenAI | platform.openai.com/api-keys |
| `acadflow-anthropic` | Anthropic | console.anthropic.com/settings/keys |
| `acadflow-gemini` | Google Gemini (PaLM) API | aistudio.google.com/app/apikey |
| `acadflow-google-sheets` | Google Sheets OAuth2 | Use n8n's "Sign in with Google" flow |

> **Test each credential** with the "Test" button before building any nodes. A bad key wastes time later.

> **Note for trial users**: n8n cloud handles OAuth callback URLs automatically — no Google Cloud Console setup needed for Sheets/Gmail/Calendar/Docs. The "Sign in with Google" flow inside n8n is enough.

---

## Step 2 — Create the workflow (2 minutes)

1. **Workflows → New** → name it `AcadFlow — Main`.
2. **Settings tab** (top right of editor):
   - Timezone: set to yours (e.g., `Asia/Kolkata`) — affects how `$now` resolves in the Code node.
   - Execution order: `v1`.
   - Save execution data: `Save all` (during build); switch to `Save errors only` after demo to save quota.
3. Save (Cmd+S).

---

## Step 3 — Form Trigger (Contract A input) (10 minutes)

1. Click **`+`** on the canvas → search **`Form Trigger`** (n8n native, NOT "Google Forms").
2. Configure:
   - **Form Title**: `AcadFlow Assignment Intake`
   - **Form Description**: `Submit an assignment brief and we'll plan it for you.`
   - **Response Mode**: `When Last Node Finishes` (so the student sees a confirmation)
   - **Authentication**: `None` (for demo). Add Basic Auth before showing to anyone real.
3. **Form Fields** — add these eight in order:

| Label | Field Type | Required | Notes |
|---|---|---|---|
| Student Email | `email` | ✅ | |
| Course | `text` | ✅ | |
| Assignment Title | `text` | ✅ | |
| Instructions | `textarea` | ✅ | Multi-line; min ~100 chars expected |
| Deadline | `date` | ✅ | n8n returns ISO string |
| Current Progress / Notes | `textarea` | ❌ | Optional |
| Priority | `dropdown` | ❌ | Values: `high`, `medium`, `low` |
| Brief PDF (optional) | `file` | ❌ | `acceptFileTypes: .pdf,.docx` |

4. Click **"Listen for Test Event"** at the top → it gives you a Test URL. Open it in another tab, fill in **Test 1 — low risk** from `sample-data/sample-inputs.json`, submit. You should see the data appear in n8n. **Pin this output** (📌) so we can replay without re-submitting.

---

## Step 4 — PDF extraction branch (optional, 5 minutes — skip on first build)

If you want PDF upload working, add **after the Form Trigger**:

1. **IF node** → `Has PDF?` → condition: `{{ $binary.data }}` exists.
2. TRUE branch → **Extract from File** node → operation `Extract from PDF` → input `$binary.data` → output text into a field.
3. **Set node** → overwrite `Instructions` field with the extracted text.
4. Reconverge both branches with a **Merge** node (Mode: `Append`).

Skip this for the first end-to-end test — use the textarea input only.

---

## Step 5 — Preprocessor Code node (5 minutes)

1. Add a **Code** node after the Form Trigger (or after the Merge if you built PDF parsing).
2. Mode: **Run Once for All Items**. Language: **JavaScript**.
3. Paste the contents of `workflow/code/preprocessor.js` into the code box. **Rename the form field keys at the top** if your Form Trigger labels differ from the defaults in the script.
4. Click **Execute Node**. You should see Contract A — including `submission_id`, `days_remaining`, `is_urgent_lt_48h`, `input_valid`, `validation_errors`. **Pin the output.**

---

## Step 6 — Invalid Input router (3 minutes)

1. Add an **IF** node after Preprocessor → name it `Input Valid?`.
2. Condition: `{{ $json.input_valid }}` `equal` `true`.
3. FALSE branch → wire to a **Gmail** node (or just a Set node placeholder during build):
   - To: `{{ $json.student_email }}`
   - Subject: `AcadFlow couldn't process your submission`
   - Body (Expression): `` Hi,\n\nWe couldn't process your assignment submission. Issues:\n\n• {{ $json.validation_errors.join('\n• ') }}\n\nPlease re-submit with the missing details.\n\n— AcadFlow ``
4. TRUE branch → continues to the rest of the workflow.

For details see `docs/router-and-fallbacks.md` §1.

---

## Step 7 — Google Sheets raw log (5 minutes)

1. Create a new Google Sheet titled `AcadFlow Logs` with two tabs:
   - Tab 1: `submissions_raw` — columns: submission_id, received_at, student_email, course, title, deadline_iso, days_remaining, is_urgent_lt_48h, priority_hint, instructions_raw
   - Tab 2: `submissions_master` — see `router-and-fallbacks.md` §5 for columns
   - Tab 3: `submissions_errors` — submission_id, received_at, error_type, payload
2. In n8n, add a **Google Sheets** node after the IF (TRUE branch):
   - Resource: `Sheet Within Document` → Operation: `Append Row`
   - Document: pick `AcadFlow Logs`
   - Sheet: `submissions_raw`
   - Mapping: `Auto-Map Input Data to Columns` if your sheet headers match; otherwise map each manually.
3. Execute and check the sheet. **Pin the output.**

---

## Step 8 — Agent 1: Requirement Extractor (OpenAI, 10 minutes)

1. Add an **OpenAI** node after the Sheets node.
2. Resource: `Chat`. Operation: **`Generate a Model Response`** (this is the OpenAI Responses API path added in n8n v1.117+).
3. Model: `gpt-4.1-mini` (or `gpt-5-mini` if available in your account).
4. **Output Content Type**: select **`JSON Schema`**.
5. In the schema field, paste the full contents of `workflow/schemas/agent1-extractor-schema.json`.
6. **Messages**:
   - Role `System`: paste the system message from `docs/agent1-extractor-prompt-detailed.md`
   - Role `User`: paste the user message template from the same file
7. Options:
   - Temperature: `0.2`
   - Maximum tokens: `2000`
8. Execute. You should get a clean Contract B JSON. **Pin it.**

> If the OpenAI node version you have doesn't show `JSON Schema` as an option, you're on an older n8n version. Workaround: select `JSON Object` mode and add a system-prompt line "Return a JSON object matching this schema: …" with the schema inlined. Less reliable but works.

---

## Step 9 — Validate Extractor Output (3 minutes)

Add a **Code** node named `Validate Extractor Output` after Agent 1. Paste the snippet from `docs/router-and-fallbacks.md` §2.

Add an **IF** node after it on `{{ $json._extractor_failed }}` `equal` `true` → FALSE branch continues to Agent 2.

---

## Step 10 — Agent 2: Risk Classifier (Gemini, 10 minutes)

Two new nodes here — a parent and two sub-nodes.

1. Add a **Basic LLM Chain** node (search `Basic LLM Chain` — under AI category).
2. On the canvas, the Chain node has three small attachment points underneath: **Chat Model**, **Memory**, **Output Parser**.
3. Click the **Chat Model** dot → add **`Google Gemini Chat Model`** sub-node:
   - Credential: `acadflow-gemini`
   - Model: `models/gemini-2.5-flash` (or whichever Flash variant your key sees in the dropdown)
   - Temperature: `0.1`
4. Click the **Output Parser** dot → add **`Structured Output Parser`** sub-node:
   - Schema Type: **JSON Schema**
   - Paste contents of `workflow/schemas/agent2-classifier-schema.json`
5. Back on the LLM Chain node:
   - **Require Specific Output Format**: ON ✅
   - Prompt source: `Define below`
   - System / User messages: paste from `docs/agent2-classifier-prompt-detailed.md`
6. Execute. You should get Contract C. **Pin it.**

---

## Step 11 — Urgent Override Set node (3 minutes)

Add a **Set** node after the LLM Chain, named `Urgent Override`. Configure the three fields exactly as in `docs/agent2-classifier-prompt-detailed.md` ("Deterministic urgent override" section).

**Loom talking point**: this is THE node that demonstrates "deterministic logic over AI judgment" in the rubric. Don't skip explaining it.

---

## Step 12 — Risk Router (2 minutes)

Add the final **IF** node `Route by Risk` → condition `{{ $json.risk_level }}` `equal` `high`.

- TRUE → leave dangling (Navneet wires here).
- FALSE → leave dangling (Gowtham wires here).

For the demo before Gowtham/Navneet finish, wire both branches to placeholder Set nodes so you can prove your half works end-to-end with all 4 test inputs.

---

## Step 13 — Run the four test cases (15 minutes)

1. Open the Form's Test URL.
2. Submit **Test 1** (low risk). Watch executions appear at `Executions` tab. Verify:
   - Preprocessor: `days_remaining ≈ 14`, `is_urgent_lt_48h = false`, `input_valid = true`
   - Extractor: difficulty_score 3–5
   - Classifier: risk_level = "low"
   - Router → FALSE (planning placeholder)
3. **Test 2** (medium). Verify: difficulty 7–9, risk medium, planning route.
4. **Test 3** (urgent). The model might say medium — **Urgent Override must flip it to high**. Verify HITL route fires.
5. **Test 4** (invalid). Should bail at Step 6 with a rejection email + error sheet row.

After all four pass, **export the workflow**:

- Workflow → `…` menu → **Download** → save the JSON to `acadflow-workflow.json` in the repo.
- Take screenshots of the canvas for the README.

---

## Step 14 — What to hand off

Once Steps 13 passes:

- Ping Gowtham: "Agent 2 + Urgent Override + Router are live. Wire Agent 3 into the FALSE branch of `Route by Risk`. Input contract = Set node output (see `docs/agent2-classifier-prompt-detailed.md` + Contract C / Contract B fields merged)."
- Ping Navneet: "TRUE branch is ready for HITL. Input contract = same merged payload."

---

## Common gotchas

- **Wrong field names in Preprocessor**: if your Form Trigger labels differ from the defaults at the top of `preprocessor.js`, the script silently gets empty strings. Always **Execute the Preprocessor** and verify the output values are non-empty before moving on.
- **`$now` undefined**: only available in expressions; in Code nodes use `new Date()` (we use `$now.toISO()` parsed with `new Date()` — works in n8n 1.x).
- **Structured Output Parser silently failing**: if you see `"output": { "output": {...} }` in the chain output, you hit n8n issue #20029. Workaround: switch the parent node from **AI Agent** to **Basic LLM Chain** (which is what this guide uses — should not happen).
- **Trial executions burning fast**: every test submission = 1 execution per node-with-data. With 12 nodes, one full run = ~12 executions. Pin upstream outputs aggressively. Budget: ~50 executions for the entire M1+M2 build.
- **Gemini model not in dropdown**: n8n auto-loads models from your API key. If Flash isn't showing, your key may be on a different Google Cloud project — generate a new one via AI Studio.

---

## Done = checklist

- [ ] All four credentials test green
- [ ] Form Trigger built and a test submission lands in n8n
- [ ] Preprocessor outputs Contract A with correct days_remaining + urgent flag
- [ ] Invalid Input branch sends rejection email + logs to error sheet
- [ ] Sheets raw log row appears for valid submissions
- [ ] Agent 1 returns Contract B matching schema
- [ ] Agent 2 returns Contract C matching schema
- [ ] Urgent Override fires on Test 3 (forces risk_level=high even if model said medium)
- [ ] Risk Router branches correctly on all four test cases
- [ ] Workflow JSON exported to `acadflow-workflow.json`
- [ ] Screenshots of the canvas saved for the README
