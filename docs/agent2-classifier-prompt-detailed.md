# Agent 2 — Risk & Complexity Classifier (System Prompt)

**Provider:** Google Gemini (2.5 / 3.5 Flash)
**Node type:** LLM Chain (Basic Chain) → Chat Model sub-node = **Google Gemini Chat Model**, attached → Structured Output Parser sub-node = paste `agent2-classifier-schema.json` as JSON Schema
**Temperature:** `0.1` (in Gemini sub-node)

> **Important n8n step**: in the LLM Chain node, enable **"Require Specific Output Format"** so the Structured Output Parser is honored. Remove any "return JSON" instructions from the system prompt — the parser handles that.

---

## System message

```
You are an Academic Advisor evaluating the risk of a college assignment for a single student. Your role is to flag work that is at risk of being late, low-quality, or both — so the system can route it to professor review before the student starts wasting time on the wrong direction.

You assess risk based on four signals:
1. Time pressure — days_remaining vs estimated_hours. Fewer than ~1.5 hours of usable time per remaining day = high pressure.
2. Difficulty — difficulty_score (1-10) from the extractor. 8+ is high difficulty.
3. Stakes — count of grading_rubric items and total weight. More criteria = more ways to lose points.
4. Student readiness — current_progress_notes. Empty notes = no head start.

Risk levels:
- "high": serious chance of late submission OR low quality without intervention. Flag for professor review.
- "medium": completable, but the student should follow a tight plan.
- "low": straightforward, on a normal cadence.

Be calibrated, not alarmist. A 14-day window for a 6-hour reflection essay is "low" risk even if difficulty is moderate. A 3-day window for 20-hour research report is "high" regardless of difficulty.

Return reasons as short noun phrases ("tight 3-day window", "8 rubric criteria", "no prior progress"), not full sentences.

Set needs_human_review = true whenever risk_level = "high".
```

## User message (template)

```
Course: {{ $json.course }}
Assignment Title: {{ $json.title }}
Days remaining: {{ $json.days_remaining }}
Priority hint from student: {{ $json.priority_hint }}

Extractor output:
- objectives: {{ JSON.stringify($json.objectives) }}
- deliverables: {{ JSON.stringify($json.deliverables) }}
- estimated_hours: {{ $json.estimated_hours }}
- difficulty_score: {{ $json.difficulty_score }}
- grading_rubric: {{ JSON.stringify($json.grading_rubric) }}
- technical_requirements: {{ JSON.stringify($json.technical_requirements) }}

Student's current progress notes: {{ $json.current_progress_notes }}

Assess the risk per the schema.
```

---

## Deterministic urgent override (Set node, placed AFTER the LLM Chain)

Add a **Set node** named `Urgent Override` immediately after Agent 2. This guarantees urgent deadlines always route to HITL, regardless of the AI's judgment.

Set values (use Expression mode):

| Field | Value |
|---|---|
| `risk_level` | `{{ $json.is_urgent_lt_48h ? 'high' : $json.risk_level }}` |
| `needs_human_review` | `{{ $json.is_urgent_lt_48h ? true : $json.needs_human_review }}` |
| `reasons` | `{{ $json.is_urgent_lt_48h ? [...$json.reasons, 'deterministic override: deadline under 48h'] : $json.reasons }}` |

> **Why:** The brief explicitly grades on "AI vs deterministic steps". Safety-critical rules (urgent deadlines) must NOT depend on the model — a deterministic override is exactly the pattern the rubric rewards. Call this out explicitly in the Loom.

---

## Why these choices

- **Gemini Flash**: classification is a tiny job — Flash is the cheapest tier, saves your 1000-execution trial budget. Multimodal-capable for future PDF expansion.
- **Temp 0.1**: classification needs near-deterministic output.
- **Structured Output Parser** (not native JSON mode): Gemini's structured output story is less mature than OpenAI's; the LangChain parser is the n8n-canonical way to enforce shape across providers.
