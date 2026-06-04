# AcadFlow — Architecture

System architecture, data contracts between agents, and the AI-vs-deterministic split.

> For team task assignments and build schedule, see [`plan.md`](plan.md).
> For Debashis's step-by-step Phase 1 build, see [`phase1-build-guide.md`](phase1-build-guide.md).

---

## 1. Design Principles

1. **Specialized agents, not one super-prompt.** Each AI step does exactly one thing and outputs to a strict JSON schema.
2. **Provider-by-strength.** OpenAI for schema-strict extraction, Gemini Flash for cheap classification, Claude for reasoning and prose. Each model used where it benchmarks highest.
3. **Deterministic logic owns safety.** Date math, validation, urgency overrides, and routing live in Code/Set/IF nodes — not in prompts. Models advise; deterministic rules decide.
4. **Structured contracts between every node.** Six named JSON contracts (A–F) flow through the workflow. No node consumes raw model text downstream.
5. **Human-in-the-loop for high-stakes only.** Low/medium risk auto-completes; high risk pauses for a real human (the professor) before continuing.
6. **Graceful degradation.** Invalid input bounces. Malformed AI output bounces. Timeout on HITL → safe default.

---

## 2. Node Topology

```
[ Form Trigger ] ─► [ Preprocessor (Code) ] ─► [ IF: Input Valid? ]
                                                      │
                                              false ──┴── true
                                                │         │
                                  [ Gmail: reject ]  [ Sheets: log raw ]
                                  [ Sheets: error ]       │
                                                          ▼
                                          [ Agent 1: Extractor (OpenAI) ]
                                                          │
                                          [ Validate Extractor Output (Code) ]
                                                          │
                                                [ IF: _extractor_failed? ]
                                                          │
                                                false ────┴──── true
                                                  │              │
                                                  ▼     [ Gmail: review needed ]
                                  [ Agent 2: Classifier (Gemini) ]
                                                  │
                                  [ Urgent Override (Set) ]   ← deterministic
                                                  │
                                          [ IF: Route by Risk ]
                                                  │
                                  ┌─────────────┴─────────────┐
                                  │ high                       │ medium/low
                                  ▼                            ▼
                  [ HITL Branch ]                  [ Planning Branch ]
                  ├ Wait (webhook resume)          ├ Agent 3: Planner (Claude)
                  ├ Gmail: prof approval           └ Agent 4: Content Gen (Claude)
                  ├ Limit Wait Time: 24h
                  └ Switch on decision                          │
                                  │                             │
                                  └──────────┬──────────────────┘
                                             ▼
                                  [ Merge → Final Assembler ]
                                  ├ Google Docs: full doc
                                  ├ Google Calendar: events
                                  ├ Sheets: master row update
                                  └ Gmail: student notification
```

---

## 3. Data Contracts (A–F)

Every connection between agents flows through one of these contracts. They're versioned in this doc and in the per-agent schema files under `workflow/schemas/`.

### Contract A — Preprocessor output (after Form Trigger)

```json
{
  "submission_id": "uuid-v4",
  "student_email": "string",
  "course": "string",
  "title": "string",
  "instructions_raw": "string",
  "deadline_iso": "ISO-8601 timestamp",
  "current_progress_notes": "string",
  "priority_hint": "high|medium|low|null",
  "days_remaining": "integer",
  "is_urgent_lt_48h": "boolean",
  "input_valid": "boolean",
  "validation_errors": ["string"],
  "received_at": "ISO-8601 timestamp"
}
```

Produced by `workflow/code/preprocessor.js`.

### Contract B — Agent 1 (Requirement Extractor) output

Schema: [`workflow/schemas/agent1-extractor-schema.json`](../workflow/schemas/agent1-extractor-schema.json)

```json
{
  "objectives": ["string"],
  "deliverables": ["string"],
  "grading_rubric": [{"criterion": "string", "weight_pct": 0-100}],
  "technical_requirements": ["string"],
  "estimated_hours": 1-200,
  "difficulty_score": 1-10,
  "keywords": ["string"]
}
```

### Contract C — Agent 2 (Risk Classifier) output

Schema: [`workflow/schemas/agent2-classifier-schema.json`](../workflow/schemas/agent2-classifier-schema.json)

```json
{
  "risk_level": "high|medium|low",
  "risk_score": "0.0-1.0",
  "reasons": ["short phrase"],
  "needs_human_review": "boolean"
}
```

> The Urgent Override Set node mutates this contract in place: `risk_level=high`, `needs_human_review=true`, `reasons` appended with `"deterministic override: deadline under 48h"` whenever `is_urgent_lt_48h=true`.

### Contract D — Agent 3 (Planner) output

```json
{
  "plan": [
    {"day_offset": 0, "task": "string", "hours": 1-12, "deliverable_link": "string|null"}
  ],
  "resources": [{"title": "string", "url": "string|null", "type": "video|book|article|tool"}],
  "total_estimated_hours": "number"
}
```

### Contract E — Agent 4 (Content Generator) output

```json
{
  "outline": [{"section": "string", "bullets": ["string"]}],
  "starter_draft_markdown": "string",
  "disclaimer": "AI-generated content for reference only. The student must rewrite, expand, and verify all claims before submission."
}
```

### Contract F — Assembler input

All of A + B + C + D + E + HITL decision (if applicable), merged on `submission_id`.

---

## 4. AI vs Deterministic — explicit split

| Concern | Owner | Why |
|---|---|---|
| Date math (`days_remaining`, `is_urgent_lt_48h`) | **Deterministic** (Code node) | Math is math. Models hallucinate dates. |
| Input validation (email format, required fields) | **Deterministic** (Code node) | Cheap, reliable, no token cost. |
| Requirement extraction (objectives, deliverables, rubric) | **AI** (OpenAI Agent 1) | Natural language understanding is the model's strength. |
| Risk assessment (qualitative judgment) | **AI** (Gemini Agent 2) | Multi-factor judgment is a reasoning task. |
| Urgent override (deadline < 48h → force high risk) | **Deterministic** (Set node) | Safety rule — must never depend on model agreement. |
| Risk-based routing | **Deterministic** (IF node) | One field → one branch. No reasoning needed. |
| Day-by-day plan generation | **AI** (Claude Agent 3) | Open-ended planning requires reasoning. |
| Plan-fits-deadline check | **Deterministic** (Code node) | Sum of `hours` ≤ window * 8 — arithmetic, not judgment. |
| Outline + starter draft generation | **AI** (Claude Agent 4) | Creative writing — model is the right tool. |
| Disclaimer attachment | **Deterministic** (Schema enforced) | Compliance can't be optional. |
| Doc/Calendar/Sheet creation | **Deterministic** (n8n native nodes) | API calls, not reasoning. |
| HITL approval decision | **Human** (Wait node webhook) | High-stakes call belongs to the professor. |
| HITL timeout fallback (24h → auto-approve with caveat) | **Deterministic** (Limit Wait Time) | Workflow must always terminate. |

This split is the core rubric story — call it out in the Loom.

---

## 5. Failure modes & fallbacks

| Failure | Detection | Fallback |
|---|---|---|
| Invalid form input | `input_valid=false` in Preprocessor | Email student with errors, log to error sheet, halt |
| AI returns malformed JSON (rare with response_format) | Code-node key check after each agent | Email Debashis with raw output for manual review |
| Plan exceeds deadline window | Code-node sum check after Agent 3 | One re-prompt; if still failing, flag for review |
| Google API failure (Doc/Sheet/Calendar) | Node error workflow | Retry once → on second failure, email team + log |
| HITL professor doesn't respond in 24h | Wait node `Limit Wait Time` | Resume with `decision=auto_approved_timeout`, flag in Sheet |
| n8n trial execution cap hit | n8n shows error in execution log | Switch to "Save errors only" execution data setting; budget runs |

---

## 6. Why these particular models (June 2026)

- **GPT-4.1 mini / GPT-5-class** — 98.7% structured output compliance (highest in 2026 benchmarks). `response_format: json_schema` removes the entire "model returned malformed JSON" failure class for Agent 1.
- **Gemini 2.5 Flash** — fastest and cheapest tier for the classification task. Saves trial executions. Multimodal-capable for future PDF-direct expansion.
- **Claude Sonnet 4.6** — strongest on reasoning (HLE 49% vs Gemini Flash 18.8%) and on long-form structured writing. Right tool for both planning and prose.

Sources: [LM Council Jun 2026 benchmarks](https://lmcouncil.ai/benchmarks), [BenchLM Sonnet 4.6 vs Gemini 2.5 Pro](https://benchlm.ai/compare/claude-sonnet-4-6-vs-gemini-2-5-pro).
