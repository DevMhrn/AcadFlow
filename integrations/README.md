# Integrations & Diagrams

This folder holds the editable workflow diagram and notes on the external integrations AcadFlow touches.

## Files

| File | Purpose | Owner |
|---|---|---|
| `workflow-diagram.drawio` | Editable workflow diagram (draw.io / diagrams.net). Export as `workflow-diagram.png` for the README. | Whoever's building the Loom |
| `workflow-diagram.png` | Static PNG of the same — embedded in the main README. | Whoever's building the Loom |

## External Services AcadFlow Talks To

| Service | Used for | Auth | Owner |
|---|---|---|---|
| OpenAI API | Agent 1 (Requirement Extractor) | API key (`acadflow-openai`) | Debashis |
| Anthropic API | Agents 3 + 4 (Planner, Content Generator) | API key (`acadflow-anthropic`) | Gowtham |
| Google Gemini / AI Studio | Agent 2 (Risk Classifier) | API key (`acadflow-gemini`) | Debashis |
| Google Sheets | Master tracker + raw log + error log | OAuth2 (`acadflow-google`) | Navneet |
| Google Docs | Final assembled plan doc | OAuth2 (`acadflow-google`) | Navneet |
| Google Calendar | Day-by-day plan events | OAuth2 (`acadflow-google`) | Navneet |
| Gmail | HITL professor approval + student notification + rejection emails | OAuth2 (`acadflow-google`) | Navneet |

## Diagram Source

The workflow diagram should match the topology in [`docs/architecture.md`](../docs/architecture.md) §2. When the diagram and the architecture doc disagree, the architecture doc is authoritative — update the diagram to match, not the other way around.

## To Create the Diagram

1. Open [draw.io](https://app.diagrams.net/).
2. Use these shapes consistently:
   - **Rounded rectangle**: AI agent (label with provider + model)
   - **Sharp rectangle**: deterministic node (Code, Set, IF, Switch)
   - **Cylinder**: external storage (Sheets, Docs, Calendar)
   - **Envelope**: email node (Gmail)
   - **Diamond**: IF/Switch decision
   - **Hourglass**: Wait node
3. Color-code by owner: Debashis (blue), Gowtham (green), Navneet (orange).
4. Save as `workflow-diagram.drawio` here.
5. Export as PNG at 2x resolution → `workflow-diagram.png`.
6. Reference from the main README's "Workflow Overview" section.
