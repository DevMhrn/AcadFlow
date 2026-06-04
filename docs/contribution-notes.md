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

> *(Gowtham to fill in after Phase 1 + 3 build.)*

**What I built:**
- Built **Agent 3 (Personalized Planner)** using Claude Sonnet 4.6 via Basic LLM Chain + Structured Output Parser. Prompt: [`prompts/agent3-planner.txt`](../prompts/agent3-planner.txt). Output schema: Contract D.
- Built a **plan-fits-deadline validator** (Code node) that sums planned hours and verifies `last day_offset ≤ days_remaining - 1`. Re-prompts once if the plan overflows; flags for review otherwise.
- Built **Agent 4 (Content Generator)** using Claude Sonnet 4.6. Prompt: [`prompts/agent4-content-generator.txt`](../prompts/agent4-content-generator.txt). Output schema: Contract E.
- Built the **type-aware prompt variant** that adjusts tone (formal/technical/conversational) and structure (essay/report/code) based on the deliverable type extracted by Agent 1.
- Built the **Merge node** that combines Contracts D + E with upstream B/C before handing off to Navneet's Final Assembler.

**Why I chose Claude Sonnet 4.6 for both:**
- Sonnet 4.6 leads 2026 benchmarks on complex reasoning (needed for realistic day-by-day planning) and on long-form structured writing (needed for the outline + starter draft).
- Picking the strongest provider per task — not "OpenAI for everything" — is itself an agentic design choice worth calling out.

**How my part connects:**
- Upstream: Debashis's IF router (medium/low risk branch) hands off Contracts A + B + C.
- Downstream: Navneet's Final Assembler consumes the merged Contract F.

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
