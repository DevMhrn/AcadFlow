# AcadFlow — Intelligent Student Assignment Manager

An **n8n-based, multi-agent agentic workflow** that turns a messy assignment brief into a personalized execution plan, a starter draft, calendar events, and (when needed) a professor-approval loop — all within minutes of a student submitting a form.

Built as a group project for the **Agentic Workflow Design and n8n Demo** course assignment.

---

## Problem Statement

College students juggle 4–8 assignments simultaneously across different courses. They struggle to understand complex assignment requirements, build realistic plans, manage deadlines, and get timely feedback from professors. This leads to last-minute submissions, lower-quality work, increased stress, and missed learning opportunities.

**Target user:** Undergraduate and postgraduate students, especially in technical or management programs.

**What AcadFlow does:** Automatically analyzes any new assignment, creates a personalized day-by-day execution plan, generates starter content, intelligently seeks early professor feedback for high-stakes work, and delivers a complete actionable package (Google Doc + Calendar events + Sheet log + email) — all within minutes.

---

## Features

- **Multi-agent architecture** — 4 specialized AI agents, each with a clear role and structured output contract.
- **Provider-by-strength model allocation** — OpenAI for schema-strict extraction, Gemini Flash for cheap fast classification, Claude Sonnet 4.6 for reasoning and prose.
- **Deterministic safety overrides** — urgent deadlines force human review regardless of AI judgment.
- **Risk-based routing** — high-risk assignments go through a professor approval loop; low/medium risk go straight to planning.
- **Human-in-the-loop** — Wait node + Gmail approve/reject links pause the workflow until a real human signs off.
- **Native integrations** — Google Forms (via n8n's Form Trigger with PDF upload), Sheets, Docs, Calendar, Gmail. All OAuth2, no glue code.
- **Validated structured outputs** — every AI step has a JSON schema; downstream nodes never see malformed data.
- **Graceful fallbacks** — invalid input bounces back to the student; malformed AI output bounces to a manual review queue.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Workflow engine | **n8n** (cloud trial, native nodes only) |
| AI providers | **OpenAI** (gpt-4o-mini), **Anthropic** (Claude Sonnet 4.6), **Google** (Gemini 2.5 Flash) |
| Integrations | Google Forms (via n8n Form Trigger) · Google Sheets · Google Docs · Google Calendar · Gmail |
| Document parsing | n8n native PDF Extract |

---

## Workflow Overview

```
┌──────────────┐
│ Form Trigger │  Student submits course, deadline, instructions, optional PDF
└──────┬───────┘
       ▼
┌──────────────────┐
│   Preprocessor   │  Date math · validation · uuid · urgent flag  (deterministic)
│   (Code node)    │
└──────┬───────────┘
       ▼
   ┌───────────┐ no   ┌─────────────────────────┐
   │ Input OK? │─────►│ Reject + email student   │
   └─────┬─────┘      └─────────────────────────┘
         │ yes
         ▼
┌────────────────────────┐
│ Agent 1 — Extractor    │  OpenAI · JSON Schema response_format  (Contract B)
│ (Senior TA)            │
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ Agent 2 — Classifier   │  Gemini Flash · LLM Chain + parser  (Contract C)
│ (Academic Advisor)     │
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ Urgent Override (Set)  │  is_urgent_lt_48h → force risk=high   (deterministic)
└────────┬───────────────┘
         ▼
   ┌───────────┐  high   ┌────────────────────────────┐
   │ Risk      │────────►│ HITL: Wait + Gmail approve │
   │ Router    │         │ links + 24h timeout         │
   └─────┬─────┘         └────────┬───────────────────┘
         │ medium/low             │
         ▼                        │
┌────────────────────────┐        │
│ Agent 3 — Planner      │◄───────┘ (after approval merges back in)
│ (Claude Sonnet 4.6)    │
└────────┬───────────────┘
         ▼
┌────────────────────────┐
│ Agent 4 — Content Gen  │  Claude Sonnet 4.6 · outline + draft  (Contract E)
└────────┬───────────────┘
         ▼
┌────────────────────────────────────────────────┐
│ Final Assembler                                │
│  ├─ Google Doc (full plan + draft)             │
│  ├─ Google Calendar events (one per task)      │
│  ├─ Master Sheet row                           │
│  └─ Student notification email                 │
└────────────────────────────────────────────────┘
```

Full architecture, data contracts, and per-node config: see [`docs/architecture.md`](docs/architecture.md) and [`docs/plan.md`](docs/plan.md).

---

## Agent Roles

| # | Agent | Role | Provider / Model | Output contract |
|---|---|---|---|---|
| 1 | **Requirement Extractor** | Senior Teaching Assistant — parses brief into structured requirements | OpenAI GPT-4o mini | [Contract B](docs/plan.md#contract-b) |
| 2 | **Risk & Complexity Classifier** | Academic Advisor — assesses time-pressure × difficulty × stakes × readiness | Gemini 2.5 Flash | [Contract C](docs/plan.md#contract-c) |
| 3 | **Personalized Planner** | Academic Coach — day-by-day execution plan within the deadline | Claude Sonnet 4.6 | [Contract D](docs/plan.md#contract-d) |
| 4 | **Content Generator** | Subject Matter Helper — outline + starter draft + mandatory disclaimer | Claude Sonnet 4.6 | [Contract E](docs/plan.md#contract-e) |

System prompts live in [`prompts/`](prompts/). JSON schemas live in [`workflow/schemas/`](workflow/schemas/).

---

## How to Use

> Full step-by-step build instructions for Phase 1 (M1+M2): [`docs/phase1-build-guide.md`](docs/phase1-build-guide.md).

1. **Sign in to n8n cloud** (or self-host). Free trial: https://n8n.io/cloud/
2. **Import the workflow** — `Workflows → Import from File` → `workflow/acadflow-main-workflow.json`. (Exported after the team finishes Phase 1.)
3. **Configure credentials** — create four credentials in n8n with the names from [`workflow/credentials-example.json`](workflow/credentials-example.json):
   - `acadflow-openai` (OpenAI API)
   - `acadflow-anthropic` (Anthropic API)
   - `acadflow-gemini` (Google Gemini / AI Studio API)
   - `acadflow-google` (Google OAuth2 for Sheets/Docs/Calendar/Gmail)
4. **Set up the Google Sheet** — create a spreadsheet `AcadFlow Logs` with three tabs: `submissions_raw`, `submissions_master`, `submissions_errors`. Column names listed in [`docs/router-and-fallbacks.md`](docs/router-and-fallbacks.md).
5. **Activate the workflow** — the Form Trigger gives you a public URL students can use.
6. **Submit a test** — paste any fixture from [`sample-data/sample-inputs.json`](sample-data/sample-inputs.json) into the form.

---

## Sample Demo

Loom video walkthrough: **(link goes here once recorded)**

Screenshots: see [`screenshots/`](screenshots/) — workflow canvas, branch close-ups, sample output Doc, Calendar events, professor approval email.

Sample inputs and expected outputs: [`sample-data/`](sample-data/).

---

## Team Contributions

| Member | Responsibility | Key nodes / components |
|---|---|---|
| **Debashis** | Input + Preprocessing + Agents 1 & 2 + Routing (M1 + M2) | Form Trigger, Preprocessor Code node, Agent 1 (OpenAI Extractor), Agent 2 (Gemini Classifier), Urgent Override, Risk Router IF |
| **Gowtham** | Planning + Content Generation (M3) | Agent 3 (Claude Planner), Agent 4 (Claude Content Generator), Merge node |
| **Navneet** | Human-in-the-Loop + Final Assembler + Integrations (M4) | Wait node HITL, Gmail approve/reject flow, Final Assembler, Google Docs / Calendar / Sheets / Gmail outputs |

Detailed individual contribution notes: [`docs/contribution-notes.md`](docs/contribution-notes.md).

---

## Project Structure

```
AcadFlow-Intelligent-Assignment-Manager/
├── README.md                       # This file
├── LICENSE                         # MIT
├── .gitignore
│
├── workflow/                       # n8n workflow artifacts
│   ├── acadflow-main-workflow.json # Exported workflow (after Phase 1 build)
│   ├── credentials-example.json    # Credential names + types (NEVER commit real keys)
│   ├── code/
│   │   └── preprocessor.js         # JS body for the Preprocessor Code node
│   └── schemas/
│       ├── agent1-extractor-schema.json   # Contract B
│       └── agent2-classifier-schema.json  # Contract C
│
├── prompts/                        # Clean system prompts per agent
│   ├── agent1-requirement-extractor.txt
│   ├── agent2-risk-classifier.txt
│   ├── agent3-planner.txt
│   └── agent4-content-generator.txt
│
├── docs/                           # Detailed documentation
│   ├── architecture.md             # System architecture + data contracts
│   ├── plan.md                     # Full team build plan
│   ├── phase1-build-guide.md       # Step-by-step build guide (Debashis)
│   ├── acadflow-design.md          # Original design spec
│   ├── requirement.md              # Assignment brief
│   ├── agent-prompts.md            # Index of all prompts
│   ├── router-and-fallbacks.md     # IF/fallback node specs
│   ├── agent1-extractor-prompt-detailed.md
│   ├── agent2-classifier-prompt-detailed.md
│   ├── contribution-notes.md       # Per-member contribution
│   └── limitations-future-work.md
│
├── sample-data/                    # Test fixtures
│   ├── sample-inputs.json          # 4 test cases (low/med/high/invalid)
│   ├── sample-assignment-input.txt # Plain-text brief example
│   └── sample-final-output.md      # What a finished plan looks like
│
├── screenshots/                    # For README + Loom (filled during build)
│   └── README.md                   # Inventory of expected screenshots
│
└── integrations/                   # Diagrams and external integration docs
    ├── workflow-diagram.drawio     # Editable workflow diagram (TBD)
    └── README.md
```

---

## Limitations & Future Work

See [`docs/limitations-future-work.md`](docs/limitations-future-work.md) for the full list. Quick highlights:

- AI-generated content is for reference only — students must rewrite in their own voice.
- HITL email approval relies on the professor clicking a link; no email-reply parsing yet.
- Single-student scope; group projects would need teammate task assignment.
- n8n cloud trial cap (1000 executions) limits demo-scale stress testing.

---

## License

MIT — see [`LICENSE`](LICENSE).

---

*Group project · Agentic Workflow Design and n8n Demo · 2026*
