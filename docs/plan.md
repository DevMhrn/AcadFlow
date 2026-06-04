# AcadFlow — Team Build Plan

**Group (3 members):**
- **Debashis** — M1 (Input + Requirement Extractor) + M2 (Risk Classifier + Routing)
- **Gowtham** — M3 (Planner + Content Generator)
- **Navneet** — M4 (HITL + Final Assembler + Integrations)

**Model allocation (each agent uses the provider it's actually best at — this is itself a rubric talking point):**

| Agent | Provider / Model | Why this provider | n8n node setup |
|---|---|---|---|
| **Agent 1 — Requirement Extractor** | **OpenAI** (gpt-4o-mini deployed; gpt-5-mini once available) | Highest structured-output compliance in 2026 benchmarks (~98.7%); JSON Schema `response_format` is a hard contract, no retries needed. Extraction is the most schema-critical step. | OpenAI node → "Generate a Model Response" → `response_format = JSON Schema` (paste Contract B schema) |
| **Agent 2 — Risk Classifier** | **Gemini** (2.5 / 3.5 Flash) | Tiny classification job — Flash is fast and cheap, perfect for saving execution budget on the 1000-exec trial. | AI Agent (LLM Chain mode) + Google Gemini Chat Model sub-node + Structured Output Parser (Contract C) |
| **Agent 3 — Personalized Planner** | **Claude Sonnet 4.6** | Claude leads on complex reasoning and nuanced instruction-following — planning needs deadline math, hour balancing, realistic resource picks. Sonnet's structured-output compliance is solid (~97.3%). | LLM Chain + Anthropic Chat Model sub-node + Structured Output Parser (Contract D) |
| **Agent 4 — Content Generator** | **Claude Sonnet 4.6** | Best prose quality; strongest at structured writing (outline + draft) with disclaimer compliance. | LLM Chain + Anthropic Chat Model sub-node + Structured Output Parser (Contract E) |

> **Why not use AI Agent node everywhere?** The AI Agent + Structured Output Parser pair has the known double-`output`-key nesting bug (n8n issue #20029). Use the simpler **LLM Chain** (Basic Chain) node for pure extraction/classification — no tool-calling, no nesting bug, same Chat Model sub-node interface. Reserve the full AI Agent node for cases where the model needs to *call tools*, which we don't in this workflow.

---

**Stack (verified Nov–Jun 2026):**
- **n8n cloud trial** — 14 days, **1000 executions cap**, unlimited workflows (workspace deleted on expiry; you get 90 days to export). Budget executions carefully during testing.
- **Trigger: n8n native Form Trigger** (NOT a "Google Forms trigger" — n8n has no native Google Forms trigger node). The native Form Trigger supports `file` field type with `acceptFileTypes: ".pdf,.docx"` and `multipleFiles: true/false`, so PDF assignment briefs upload directly. Alt path: Google Form + Apps Script `onFormSubmit` → POST to n8n Webhook URL.
- **AI providers — all three available, allocated by strength**:
  - **OpenAI**: native n8n OpenAI node, supports JSON Schema response_format (v1.117.0+). Used for Agent 1.
  - **Anthropic (Claude)**: native n8n Anthropic Chat Model sub-node. Models auto-load from API. Used for Agents 3 & 4. Pair with LLM Chain + Structured Output Parser for JSON output.
  - **Google Gemini**: native n8n Google Gemini Chat Model sub-node. Models auto-load from API. Supports multimodal (could read PDF directly if needed). Used for Agent 2.
  - The OpenAI node uses native JSON Schema response_format; Claude and Gemini get structured output via the LangChain Structured Output Parser sub-node. Both paths are reliable as of n8n 1.117+.
- **Google integrations: native nodes exist** for Sheets, Calendar, Gmail, Docs, and Drive — all OAuth2-based, no HTTP Request workarounds needed.
- **HITL: Wait node** with "On Webhook Call" resume mode — generates a unique resume URL we can email/embed; supports `Limit Wait Time` for the 24h timeout fallback.

---

## 0. Build Strategy

Build the **spine first**, then layer. Order:

1. End-to-end skeleton: Form → Preprocessor → Agent 1 → log to Sheet. (Debashis, ~Day 1)
2. Add Agent 2 + IF routing. (Debashis, Day 2)
3. Add Agent 3 + Agent 4 on the low/medium-risk branch. (Gowtham, Day 2–3)
4. Add HITL email + Wait node on high-risk branch. (Navneet, Day 3)
5. Final Assembler (Doc + Calendar + Sheet update + student email). (Navneet, Day 3–4)
6. Error/fallback paths + polish. (All, Day 4)
7. Loom recording + README + JSON export. (All, Day 5)

Each member works on their slice in the **same shared n8n workflow** (n8n cloud supports collaboration) or each builds in their own workspace and merges via JSON export/import at integration points.

---

## 1. Shared Data Contracts (THE most important thing)

These JSON shapes flow between members' nodes. Lock them before coding so handoffs don't break.

### Contract A: Form Input → Preprocessor output (Debashis → Debashis)
```json
{
  "student_email": "string",
  "course": "string",
  "title": "string",
  "instructions_raw": "string",
  "deadline_iso": "2026-06-15T23:59:00Z",
  "current_progress_notes": "string",
  "priority_hint": "high|medium|low|null",
  "days_remaining": 11,
  "is_urgent_lt_48h": false,
  "input_valid": true,
  "submission_id": "uuid"
}
```

### Contract B: Agent 1 (Requirement Extractor) output (Debashis → Debashis + downstream)
```json
{
  "objectives": ["string"],
  "deliverables": ["string"],
  "grading_rubric": [{"criterion": "string", "weight_pct": 30}],
  "technical_requirements": ["string"],
  "estimated_hours": 12,
  "difficulty_score": 7,
  "keywords": ["string"]
}
```

### Contract C: Agent 2 (Risk Classifier) output (Debashis → routing)
```json
{
  "risk_level": "high|medium|low",
  "risk_score": 0.78,
  "reasons": ["short deadline", "high difficulty"],
  "needs_human_review": true
}
```

### Contract D: Agent 3 (Planner) output (Gowtham → Navneet)
```json
{
  "plan": [
    {"day_offset": 0, "task": "Read brief + gather sources", "hours": 2, "deliverable_link": null}
  ],
  "resources": [{"title": "string", "url": "string", "type": "video|book|article|tool"}],
  "total_estimated_hours": 12
}
```

### Contract E: Agent 4 (Content Generator) output (Gowtham → Navneet)
```json
{
  "outline": [{"section": "string", "bullets": ["string"]}],
  "starter_draft_markdown": "string",
  "disclaimer": "AI-generated content for reference only."
}
```

### Contract F: Assembler input (Navneet consumes everything via Merge node)
All of A + B + C + D + E merged on `submission_id`.

---

## 2. Debashis — M1 + M2 (Input → Extractor → Classifier → Routing)

### Deliverables
1. **n8n native Form Trigger** with fields matching Contract A. Use field types: `text` (course, title), `textarea` (instructions_raw, current_progress_notes), `date` (deadline), `email` (student_email), `dropdown` (priority_hint: high/medium/low), `file` with `acceptFileTypes: ".pdf,.docx"` (instructions_pdf, optional). Alt: webhook URL exposed for testing with curl/Postman.
2. **Preprocessor (Code node, JS)**:
   - Parse `deadline_iso` → compute `days_remaining`, `is_urgent_lt_48h`.
   - Validate non-empty `instructions_raw`, valid email, future date.
   - Generate `submission_id` (uuid).
   - Set `input_valid` flag; if false, route to "Invalid Input" branch (email student with what's missing).
4. **Google Sheets node**: append raw input row to `submissions_raw` sheet.
5. **PDF parsing branch (if file uploaded)**: Extract from File node → text into `instructions_raw` (overrides empty raw). Native to n8n.
6. **Agent 1: Requirement Extractor** — **OpenAI gpt-4o-mini** (deployed; upgrade to gpt-5-mini once available):
   - Information Extractor node + OpenAI Chat Model sub-node. `schemaType: 'manual'`, paste Contract B schema as JSON string into `inputSchema`.
   - System role: "Senior Teaching Assistant who extracts structured assignment requirements."
   - Temperature 0.2 (low for extraction).
   - Output is guaranteed to match Contract B exactly — no retries, no parsing.
7. **Agent 2: Risk Classifier** — **Gemini 2.5/3.5 Flash**:
   - LLM Chain (Basic Chain) node + Google Gemini Chat Model sub-node + Structured Output Parser sub-node (paste Contract C as JSON example).
   - System role: "Academic Advisor evaluating assignment risk."
   - Inputs: difficulty_score, estimated_hours, days_remaining, priority_hint.
   - Output: Contract C.
   - **Deterministic override**: in a Set node *after* the chain, if `is_urgent_lt_48h == true` then force `risk_level = "high"` and append "urgent deadline (<48h)" to `reasons`. AI alone is not trustworthy for safety rules.
   - Why Gemini Flash here: classification is tiny, Flash is the cheapest token tier, conserves the 1000-execution trial budget.
8. **IF node (router)**:
   - `risk_level == "high"` → output to HITL branch (Navneet's input).
   - `risk_level in [medium, low]` → output to Planning branch (Gowtham's input).
9. **Fallback**: Since JSON Schema response_format guarantees shape, malformed JSON is rare — but still add a Code node check on required keys; on failure, route to "Manual Review Needed" path (email Debashis with the raw output).

### Debashis's contribution note bullets
- Designed Form schema and the data contract for all downstream agents.
- Built deterministic preprocessor (date math, validation, urgency override).
- Wrote system prompts and JSON schemas for Agent 1 (Extractor) and Agent 2 (Classifier).
- Implemented risk-based IF routing and the urgent-deadline safety override.

---

## 3. Gowtham — M3 (Planner + Content Generator)

### Deliverables
1. **Agent 3: Personalized Planner** — **Claude Sonnet 4.6** (LLM Chain + Anthropic Chat Model sub-node + Structured Output Parser):
   - System role: "Academic Coach building a day-by-day execution plan."
   - Inputs: Contract B (extractor output) + days_remaining + estimated_hours.
   - Output: Contract D. Days must fit within `days_remaining` and total hours must be within ±20% of `estimated_hours`.
   - Add a small Code node after to validate the plan fits the deadline; if not, re-prompt once or flag for review.
2. **Agent 4: Content Generator** — **Claude Sonnet 4.6** (LLM Chain + Anthropic Chat Model sub-node + Structured Output Parser):
   - System role: "Subject Matter Helper producing a starter outline and draft."
   - Inputs: Contract B + deliverables type (essay/report/code).
   - Output: Contract E. Always include the disclaimer string.
   - Temperature 0.7 (higher for generative).
3. **Merge node**: combine D + E + upstream B/C into one payload before handing off to Navneet.
4. **Branching by deliverable type** (optional polish): if `deliverables` contains "code", route through a code-specific prompt variant.

### Gowtham's contribution note bullets
- Built the Planner agent with day-by-day deliverable scheduling that respects the deadline.
- Built the Content Generator agent with type-aware prompting (essay vs report vs code).
- Used **Claude Sonnet 4.6** on both agents (best prose + reasoning) to demonstrate provider-by-strength multi-model agent design.

---

## 4. Navneet — M4 (HITL + Final Assembler + Integrations)

### Deliverables
1. **HITL Email branch** (high-risk path):
   - **Wait node** in "On Webhook Call" mode → generates a unique resume URL like `https://<workspace>.app.n8n.cloud/webhook-waiting/<execution-id>`. Capture this URL into the email body.
   - **Gmail node**: send professor/TA an email with summary (course, title, deliverables, risk reasons) and two buttons (HTML links) — one hitting `<resume-url>?decision=approve` and one `<resume-url>?decision=needs_changes&notes=...`. Easier than parsing email replies.
   - **Limit Wait Time**: 24h → on timeout, resume with `decision = "auto_approved_timeout"` flag.
   - After resume, Switch node routes by decision; merge professor feedback into the payload and rejoin the main flow.
2. **Final Assembler** (after both branches converge):
   - **Google Docs node**: create a new doc named `[Course] - [Title] - Plan` with sections: Requirements summary (from B), Risk assessment (from C), Day-by-day plan (from D), Outline + Starter draft (from E), Professor feedback (if HITL).
   - **Google Calendar node**: loop over `plan[]` and create one event per task with `day_offset` mapped to actual date.
   - **Google Sheets node**: append a row to `submissions_master` sheet with submission_id, status, risk_level, doc_link, calendar_link, completion_pct (0 initially).
3. **Student notification**:
   - **Gmail node**: send student a final email with Doc link, Calendar link, plan summary, and disclaimer.
4. **Error handling**:
   - Wrap Google API nodes in error workflow → retry once → on second failure, email Debashis + log error row to `errors` sheet.

### Navneet's contribution note bullets
- Built the human-in-the-loop email + Wait + timeout fallback flow for high-risk assignments.
- Implemented the Final Assembler that composes the Google Doc, populates Calendar events, and updates the master tracker.
- Built the error handling / retry layer around all Google API integrations.

---

## 5. Integration Schedule

| Day | Debashis | Gowtham | Navneet |
|-----|------|---------|---------|
| 1 | Form + Preprocessor + Agent 1 + Sheet log | Draft Agent 3 & 4 prompts on paper | Set up Google Workspace API creds in n8n, create empty Doc/Sheet templates |
| 2 | Agent 2 + IF router + urgent override | Build Agent 3 (Planner), validate plan-fits-deadline | Build Final Assembler skeleton (Doc + Sheet append) |
| 3 | Hand off Contract B+C to Gowtham; help debug | Build Agent 4 (Content Generator), Merge node | Build HITL branch (email + Wait + timeout) |
| 4 | All — wire branches together end-to-end, test 3 sample inputs (low/medium/high risk), add error fallbacks |
| 5 | All — record individual Looms, write README, export workflow JSON, push to GitHub |

---

## 6. Sample Test Cases (run all three before recording)

1. **Low risk**: 14 days out, simple 2-page reflection essay. Expect: planning branch, full plan + draft, no professor email.
2. **Medium risk**: 5 days out, moderate research report. Expect: planning branch with tighter schedule.
3. **High risk**: 36 hours out, complex coding assignment with rubric. Expect: urgent override → HITL → email to professor → wait → assemble.
4. **Invalid input**: missing deadline. Expect: rejected at preprocessor, student gets "fix your input" email.

---

## 7. Submission Checklist (per the brief)

Each member submits **individually**:
- [ ] Loom video (5–8 min) walking through the workflow, problem framing, AI-vs-deterministic, sample input/output, individual contribution.
- [ ] Problem statement (use `docs/acadflow-design.md` §2 verbatim, plus 1 paragraph on your contribution).
- [ ] Workflow explanation (1 page, your slice + how it connects).
- [ ] Contribution note (use the bullets above for your member section).
- [ ] GitHub repo containing:
  - [ ] README with screenshots of the workflow canvas
  - [ ] Exported n8n workflow JSON
  - [ ] Sample input JSON + expected output JSON for all 4 test cases
  - [ ] `docs/plan.md` (this file) + `docs/acadflow-design.md` + `docs/requirement.md`

---

## 8. Open Decisions to Lock Day 1

- **AI provider(s):** **RESOLVED — Hybrid by strength**: OpenAI for Agent 1 (extraction), Gemini Flash for Agent 2 (classification), Claude Sonnet 4.6 for Agents 3 & 4 (planning + writing). All three credentials required in n8n. See Model Allocation table at top of file.
- **Trigger:** n8n native Form Trigger (recommended — supports PDF upload natively, no Google Apps Script needed) vs Google Form + Apps Script webhook. Native Form is simpler and demoable.
- **Storage of submission state:** single Master Google Sheet is enough; no Postgres needed for the demo.
- **Professor approval mechanism:** **Wait node "On Webhook Call" with HTML approve/reject links in the email** (recommended — verified pattern; works without email-reply parsing or polling). 24h `Limit Wait Time` for the timeout fallback.

---

## 9. Verified Against n8n Documentation (June 2026)

- ✅ n8n native **Form Trigger** node exists; supports `file` field type with `acceptFileTypes` filter (PDF/DOCX).
- ✅ n8n has **no native Google Forms trigger** — use native Form Trigger or Google Apps Script → Webhook.
- ✅ OpenAI node (v1.117.0+) supports **JSON Schema response_format** for guaranteed structured output.
- ⚠️ AI Agent node + Structured Output Parser sub-node has a known double-`output`-key nesting bug (n8n GitHub #20029). For pure structured extraction (our case), prefer the OpenAI Chat node with JSON Schema response_format directly.
- ✅ Wait node "On Webhook Call" mode generates a unique resume URL; supports `Limit Wait Time` for timeout fallback. Confirmed pattern for HITL approvals.
- ✅ Native nodes exist for Google Sheets, Calendar, Gmail, Drive, Docs. All OAuth2.
- ⚠️ n8n cloud trial: **14 days, 1000 executions**, unlimited workflows. Workspace auto-deletes on expiry; 90-day window to export your workflows. → Be frugal with test runs; use the n8n "Pin Data" feature to avoid re-executing upstream nodes while debugging downstream.
