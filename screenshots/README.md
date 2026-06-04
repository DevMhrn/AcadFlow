# Screenshots

Drop screenshots here as the build progresses. They get embedded in the main README and shown in the Loom video.

## Required for submission

| # | Filename | What to capture |
|---|---|---|
| 01 | `01-trigger-form.png` | The n8n native Form Trigger as rendered to students — all 7-8 fields visible |
| 02 | `02-full-workflow.png` | Whole canvas zoomed out — Form Trigger → Preprocessor → IF → Sheets → Agent 1 → Agent 2 → Override → Router → both branches → Final Assembler |
| 03 | `03-preprocessor-output.png` | Preprocessor Code node's output panel showing Contract A with `days_remaining`, `is_urgent_lt_48h`, `validation_errors` |
| 04 | `04-agent1-extractor.png` | Agent 1 (OpenAI) node config — JSON Schema response_format visible + an example output matching Contract B |
| 05 | `05-agent2-classifier-chain.png` | Agent 2 (Basic LLM Chain) with its Gemini Chat Model sub-node and Structured Output Parser sub-node attached |
| 06 | `06-urgent-override.png` | The Set node config that forces `risk_level=high` when `is_urgent_lt_48h=true` — this is the rubric's "AI vs deterministic" moneyshot |
| 07 | `07-risk-router-if.png` | The IF node config showing the `risk_level == 'high'` condition + both output branches |
| 08 | `08-hitl-email-and-wait.png` | The Gmail node body with HTML approve/reject links + the Wait node's "On Webhook Call" config |
| 09 | `09-final-google-doc.png` | The final assembled Google Doc for a sample submission |
| 10 | `10-calendar-events.png` | Google Calendar showing the day-by-day events created by the workflow |
| 11 | `11-master-sheet.png` | The `submissions_master` sheet with rows for each test case |
| 12 | `12-execution-log.png` | n8n's Executions tab showing a green-checked end-to-end run |

## Naming convention

`NN-short-description.png` — numeric prefix sorts them; lowercase + hyphens for the rest. PNGs only, max ~1MB each.
