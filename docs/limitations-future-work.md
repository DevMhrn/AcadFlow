# Limitations & Future Work

Honest accounting of what AcadFlow does NOT do today, and what we'd build next given more time.

---

## Current Limitations

### 1. AI-generated content is reference-only
- The Content Generator (Agent 4) produces an outline and ~300-600 words of starter draft with `[STUDENT TO EXPAND]` placeholders. The disclaimer is schema-enforced on every run.
- Students who submit AI output verbatim violate most academic integrity policies. The workflow does not — and cannot — police this.

### 2. HITL approval depends on a click, not a reply
- The professor must click an HTML link in the email. We chose this over email-reply parsing because parsing is fragile (signatures, threading, formats), but it does mean:
  - Plain-text-only mail clients won't render the buttons cleanly.
  - The professor can't add nuanced feedback unless they follow the second link (`?decision=needs_changes&notes=...`) and we'd want to make the notes UX better — currently it's a URL param.

### 3. Single-student scope
- Each submission is one student × one assignment. Real student life is one student × N assignments, and group projects add teammates with task assignment, dependency tracking, and shared docs. AcadFlow is the personal-coach layer, not the project-management layer.

### 4. No learning/memory across submissions
- Every submission is treated as fresh. The workflow doesn't know "you said you'd do the reading last Tuesday and didn't." A future Memory sub-node + per-student state in the Master Sheet would let the Planner adjust based on follow-through.

### 5. Trial-tier execution cap
- The n8n cloud trial caps at 1000 executions. One full run = ~12 executions. Stress testing (100+ submissions) requires upgrading to Starter ($20/mo) or self-hosting via Docker.

### 6. English-only assumption in prompts
- All four agent prompts are English. Multilingual extension would require either per-language prompt variants or a translation pre/post step. The grading rubric extraction is most language-sensitive.

### 7. No human review of Agent 3/4 output
- The HITL loop only fires for high-risk *assignments* (the model's plan + draft go straight to the student). A future "review before sending to student" toggle would help when stakes are mixed.

### 8. PDF parsing is text-only
- n8n's native PDF Extract pulls text. Image-based PDFs (scanned briefs, screenshots) need OCR — would require a Tesseract or Vision API addition.

### 9. No analytics layer
- The Master Sheet logs each submission but there's no dashboard. A Looker Studio / Streamlit view would let students see their completion rate, average difficulty, time-to-submit trends.

### 10. Cold-start credential cost
- A team adopting AcadFlow needs four API keys (OpenAI, Anthropic, Gemini, Google OAuth). For a single user that's $$10-20/mo of recurring API spend depending on volume. Could be consolidated to one provider at the cost of model-mismatch quality.

---

## Future Work — What We'd Build Next

### Near-term (a week each)

- **Student dashboard**: per-student page showing all open assignments, their plans, completion %, upcoming deadlines.
- **Daily nudge**: cron-triggered workflow that emails the student each morning with that day's planned tasks.
- **Plan adherence tracking**: simple check-in form ("did you complete yesterday's tasks?") that updates the Master Sheet.
- **Group project mode**: when 2+ students submit the same assignment ID, route to a teammate task-assignment agent (Agent 5).

### Mid-term (a month each)

- **LMS integration**: instead of a Form, scrape upcoming assignments from Canvas / Moodle / Google Classroom on a schedule.
- **Adaptive difficulty calibration**: track actual vs estimated hours per student → calibrate Agent 1's `estimated_hours` to that student over time.
- **Resource verification**: have an Agent 5 actually fetch and validate the URLs Agent 3 suggests, replacing dead links.
- **Voice intake**: Twilio / Whisper integration to dictate an assignment brief instead of typing.

### Long-term (a quarter each)

- **Multi-model A/B testing**: shadow-run two model providers on the same submission, compare downstream student outcomes, route to whichever is winning.
- **Department-wide deployment**: per-course customization (rubric templates, professor preferences), single sign-on, FERPA-compliant logging.
- **Anti-overdependence guardrails**: detect when a student is repeatedly submitting AI-drafted content verbatim and intervene — the disclaimer alone isn't enough.

---

## What We Intentionally Did NOT Build

Listed here so reviewers know these omissions were deliberate, not oversights:

- **Authentication on the Form Trigger** — out of scope for a demo; would add Basic Auth before any real deployment.
- **Email reply parsing for HITL** — chose the cleaner webhook-resume pattern.
- **Database persistence (Postgres)** — Google Sheet is enough for the demo. Postgres would be the first thing to add at scale.
- **A full UI** — n8n's Form is enough. A React/Next.js front-end would be the next layer.
- **Tool-calling AI Agents** — the Basic LLM Chain pattern is more reliable for pure extraction. Tool-calling agents are warranted if we later add live web search / resource verification.
