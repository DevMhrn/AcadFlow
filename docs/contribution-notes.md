# Individual Contribution Notes

Per the assignment brief, even within a group project every member submits **individually** with a Loom and a contribution note. This file lists what each member personally built. Each member should copy their section verbatim into their individual submission cover sheet.

---

## Debashis — M1 + M2 (Input, Preprocessing, Extraction, Classification, Routing)

**What I built:**
- Designed the **Form Trigger schema** and the six data contracts (A–F) that flow between every node in the workflow. This contract-first approach is what lets three people work in parallel without integration churn.
- Built the **deterministic Preprocessor Code node** ([`workflow/code/preprocessor.js`](../workflow/code/preprocessor.js)) — handles date math (`days_remaining`, `is_urgent_lt_48h`), input validation (email, required fields, future deadline), UUID generation, and produces Contract A.
- Built **Agent 1 (Requirement Extractor)** using OpenAI GPT-4o mini with JSON Schema `response_format` — guarantees Contract B shape without parsing retries. Prompt: [`prompts/agent1-requirement-extractor.txt`](../prompts/agent1-requirement-extractor.txt).
- Built **Agent 2 (Risk & Complexity Classifier)** using Gemini 2.5 Flash via Basic LLM Chain + Structured Output Parser — chose Flash for the tiny classification task to save trial executions. Prompt: [`prompts/agent2-risk-classifier.txt`](../prompts/agent2-risk-classifier.txt).
- Built the **Urgent Override Set node** — a deterministic safety rule that forces `risk_level=high` whenever `is_urgent_lt_48h=true`, regardless of the AI's judgment. This is the workflow's clearest "AI vs deterministic" demonstration.
- Built the **risk-based IF router** that splits high-risk traffic to the HITL branch and low/medium to the planning branch.
- Built **two fallback paths**: invalid-input rejection (back to student) and malformed-AI-output review (back to me) — see [`router-and-fallbacks.md`](router-and-fallbacks.md).

**Why my decisions:**
- Chose **JSON Schema `response_format`** over JSON mode for Agent 1 because June 2026 benchmarks put OpenAI's structured-output compliance at ~98.7% — highest of the three providers, and Contract B is the most schema-critical step.
- Chose **Basic LLM Chain over AI Agent** for Agent 2 to avoid the known double-`output`-key nesting bug (n8n GitHub issue #20029) that bites the AI Agent + Structured Output Parser combo.
- Made the **urgent override deterministic, not a prompt instruction** — safety rules cannot depend on model agreement; this is the canonical AI-vs-deterministic pattern the rubric rewards.

**How my part connects:**
- Upstream: Form Trigger (student submission).
- Downstream: IF node hands off either to Navneet's HITL branch (high risk) or to Gowtham's Planning branch (medium/low). Output payload matches the merged Contract A + B + C shape.

---

## Gowtham — M3 (Planning + Content Generation)

**What I built** (the planning branch that hangs off Debashis's `Planning Branch Entry` node — 10 nodes total):
- Built **Agent 3 (Personalized Planner)** using Claude Sonnet 4.6 via Basic LLM Chain + Anthropic Chat Model sub-node + Structured Output Parser. Prompt: [`prompts/agent3-planner.txt`](../prompts/agent3-planner.txt). Authored the **Contract D schema** ([`workflow/schemas/agent3-planner-schema.json`](../workflow/schemas/agent3-planner-schema.json)) the parser enforces.
- Built the **plan-fits-deadline validator** ([`workflow/code/validate-plan.js`](../workflow/code/validate-plan.js)) — a deterministic Code node that sums planned hours, checks the last `day_offset ≤ days_remaining - 1`, and verifies the total stays within ±20% of the extractor's `estimated_hours`. It re-attaches the upstream A/B/C context that the LLM-chain boundary drops (same pattern as Debashis's `validate-extractor.js`).
- Built the **`Plan Overflow?` IF router** — on a deadline-overflow / empty plan it routes to a `Flag Plan for Review` node (deterministic guard); otherwise it continues to content generation. (A re-prompt-once loop back to Agent 3 is documented as an option but left off by default to conserve the 1000-execution trial budget.)
- Built **Agent 4 (Content Generator)** using Claude Sonnet 4.6. Prompt: [`prompts/agent4-content-generator.txt`](../prompts/agent4-content-generator.txt). Authored the **Contract E schema** ([`workflow/schemas/agent4-content-schema.json`](../workflow/schemas/agent4-content-schema.json)).
- Built the **type-aware prompt variant** that adjusts tone and structure (essay / report / code / deck) based on the `deliverables` extracted by Agent 1, and enforces the `[STUDENT TO EXPAND: …]` / `[CITE: …]` placeholders so the agent never writes a finished submission.
- Built the **Contract F assembler** ([`workflow/code/merge-plan-content.js`](../workflow/code/merge-plan-content.js)) — merges Contracts D + E with upstream B/C into the single payload Navneet's Final Assembler consumes, keyed by `submission_id`. (Implemented as a Code node rather than an n8n Merge node because it deterministically re-attaches named-node context that the Merge node can't carry across the chainLlm boundary.)
- Added **sample Planner + Content outputs** for the low- and medium-risk test cases: [`sample-data/sample-m3-outputs.json`](../sample-data/sample-m3-outputs.json).

**Why I chose Claude Sonnet 4.6 for both:**
- Sonnet 4.6 leads 2026 benchmarks on complex reasoning (needed for realistic day-by-day planning) and on long-form structured writing (needed for the outline + starter draft).
- Picking the strongest provider per task — not "OpenAI for everything" — is itself an agentic design choice worth calling out.
- The two clearest AI-vs-deterministic moments in my slice: the **plan-fits-deadline validator** and the **Plan Overflow router** are pure code — I don't trust the model to police its own deadline math.

**How my part connects:**
- Upstream: Debashis's IF router (medium/low risk branch) → `Planning Branch Entry` hands off Contracts A + B + C.
- Downstream: Navneet's Final Assembler consumes the assembled Contract F (`route = "planning_complete"`).

---

## Navneet — M4 (Human-in-the-Loop + Final Assembler + Integrations)

**What I built:**
- **Human-in-the-Loop (HITL) Branch for High-Risk Submissions:**
  - Integrated the **Wait node** (`Wait for Professor Approval`) in `webhook` resume mode to pause workflow execution and dynamically generate `{{ $execution.resumeUrl }}`.
  - Configured the **Gmail node** (`Send Professor Approval Email`) to send the professor the high-risk parameters and direct HTML action links (`?decision=approve` or `?decision=needs_changes`).
  - Implemented a 24-hour timeout fallback using the Wait node's built-in limit settings.
  - Developed the **Process HITL Decision** Code node ([`workflow/code/process-hitl-decision.js`](../workflow/code/process-hitl-decision.js)) to parse webhook query parameters and automatically resolve to `auto_approved_timeout` on timeout.
  - Configured a **Switch node** to route the decision: routing approvals/timeouts to the main planning branch, and routing rejections (`needs_changes`) to an automated student notification email and master sheet status update.
- **Robust Multi-Stage Final Assembler:**
  - Developed the **Format Document Content** Code node ([`workflow/code/format-doc-content.js`](../workflow/code/format-doc-content.js)) to compile Contracts A–E and HITL feedback into a single cleanly formatted string.
  - Configured the **Google Docs node** to create a new study plan doc (`Create Google Doc`) and append the structured text content (`Update Doc Content`).
  - Wired parallel downstream branches:
    - **Google Sheets Update:** Patches `submissions_master` with `completed` status and links.
    - **Student Notification:** Emails the student via Gmail containing the Doc link, Calendar link, and plan summary.
    - **Google Calendar Scheduler:** Uses an Item Lists node (`Split Plan Tasks`) to split the plan array into individual items and schedules each task as an event (`Create Calendar Event`) using Luxon date math.
- **Resilience and Error Handling:**
  - Set up **Log Master Row (Initial)** Google Sheets append right after `Urgent Override (Deterministic)` to ensure auditing of all submissions from start to finish.
  - Configured automatic retry-on-failure policies (`retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 5000`) on all 9 Google Sheets, Docs, Calendar, and Gmail nodes to insulate the system from transient API rate limits.

**Why my decisions:**
- Using a **unique webhook resume URL** with query parameters avoids error-prone email reply parsing and guarantees a robust click-to-approve interface.
- Creating the Google Doc and updating it sequentially, followed by **parallel branching** for sheet updates/student email and calendar events, optimizes n8n execution speed.
- Running the `Split Plan Tasks` array split on a parallel path ensures that the student notification email is sent exactly **once** instead of once per calendar event.

**How my part connects:**
- Upstream: Receives the high-risk branch split from Debashis's router or the final planning payload from Gowtham's content generator.
- Downstream: Produces Google Docs, schedules Google Calendar events, updates the Google Sheet audit log, and emails notifications to students and professors.

