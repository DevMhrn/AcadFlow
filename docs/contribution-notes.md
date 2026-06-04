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

> *(Navneet to fill in after Phase 1 + 4 build.)*

**What I built:**
- Built the **HITL branch** for high-risk assignments:
  - **Wait node** in "On Webhook Call" mode that generates a unique resume URL.
  - **Gmail node** sending the professor a summary email with HTML approve/reject links pointing to the resume URL — eliminates email-reply parsing entirely.
  - **Limit Wait Time = 24h** for the timeout fallback (resume with `decision=auto_approved_timeout`).
  - **Switch node** routing post-resume by decision (`approve` / `needs_changes` / `auto_approved_timeout`).
- Built the **Final Assembler** that runs after both branches converge:
  - **Google Docs node** — creates a doc per submission with sections for requirements, risk assessment, plan, outline, draft, and (if HITL) professor feedback.
  - **Google Calendar node** — creates one calendar event per task in the plan, mapping `day_offset` to actual dates.
  - **Google Sheets node** — updates the `submissions_master` row with final doc/calendar links and status.
  - **Gmail node** — sends the student a final notification with everything linked.
- Built the **error-handling layer** around all Google API nodes — retry once, then email the team + log to `submissions_errors` sheet.

**Why webhook approval (not email parsing):**
- Email-reply parsing is fragile (signatures, threading, formatting). The Wait node's webhook resume mode generates a deterministic URL — one click = one structured decision.

**How my part connects:**
- Upstream: Either Debashis's HITL branch or Gowtham's Planning branch.
- Output: External (Doc, Calendar, Sheet, student email).
