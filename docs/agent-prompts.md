# Agent Prompts — Index

Clean, copy-paste versions of every system + user prompt used in AcadFlow live under [`/prompts/`](../prompts/). This file is just the index plus context.

| Agent | Provider | Prompt file | Schema file | Owner | Detailed notes |
|---|---|---|---|---|---|
| **1. Requirement Extractor** | OpenAI GPT-4o mini | [`prompts/agent1-requirement-extractor.txt`](../prompts/agent1-requirement-extractor.txt) | [`workflow/schemas/agent1-extractor-schema.json`](../workflow/schemas/agent1-extractor-schema.json) | Debashis | [`agent1-extractor-prompt-detailed.md`](agent1-extractor-prompt-detailed.md) |
| **2. Risk & Complexity Classifier** | Gemini 2.5 Flash | [`prompts/agent2-risk-classifier.txt`](../prompts/agent2-risk-classifier.txt) | [`workflow/schemas/agent2-classifier-schema.json`](../workflow/schemas/agent2-classifier-schema.json) | Debashis | [`agent2-classifier-prompt-detailed.md`](agent2-classifier-prompt-detailed.md) |
| **3. Personalized Planner** | Claude Sonnet 4.6 | [`prompts/agent3-planner.txt`](../prompts/agent3-planner.txt) | `workflow/schemas/agent3-planner-schema.json` *(TBD — Gowtham)* | Gowtham | TBD |
| **4. Content Generator** | Claude Sonnet 4.6 | [`prompts/agent4-content-generator.txt`](../prompts/agent4-content-generator.txt) | `workflow/schemas/agent4-content-schema.json` *(TBD — Gowtham)* | Gowtham | TBD |

---

## Prompting Conventions

These conventions are followed across all four agents:

1. **System message defines the role.** "You are a Senior Teaching Assistant" — not "Act as" or "Pretend to be." Direct framing performs better in benchmarks.
2. **No "return JSON" instructions in the prompt itself.** The `response_format` (OpenAI) or Structured Output Parser (Gemini/Claude) enforces schema. Redundant instructions sometimes confuse the model into wrapping output in extra strings.
3. **User message is a template.** Filled from upstream node output via n8n expressions like `{{ $json.field }}`. Keeps the prompts portable.
4. **"Make inferences, don't refuse"** — added explicitly to Agents 1, 3, 4. Real student submissions are messy; refusing breaks the workflow.
5. **Few-shot examples are deliberately omitted.** Schemas + clear instructions are enough on modern frontier models, and examples eat tokens.
6. **Temperatures:**
   - Extraction & classification: 0.1–0.2 (near-deterministic)
   - Planning: 0.4 (some flexibility for resource suggestions)
   - Content generation: 0.7 (genuine creativity)

---

## How to Update a Prompt

1. Edit the `.txt` file under `/prompts/`.
2. Update the corresponding detailed `.md` in `/docs/` if context changed.
3. Open the workflow in n8n, paste the new system + user text into the agent node, save.
4. Test with the relevant fixture from [`sample-data/sample-inputs.json`](../sample-data/sample-inputs.json).
5. Commit the prompt change with a message like `prompt(agent2): tighten risk calibration for short essays`.
