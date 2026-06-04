Agentic Workflow Design and n8n Demo

Submission Type Individual submission
Output Required Video demo(Google drive URL) + workflow

summary(Github readMe) + contribution note if part of a
group project

Tool n8n workflow, using agentic practices and concepts

taught in class

Expected Complexity Meaningful multi-step workflow; group projects should
include multiple agents or clearly separated agentic roles

Evaluation Criteria ● Problem-to-workflow mapping
● workflow logic and structure
● AI vs deterministic steps
● practical usefulness, explanation and
understanding

1. Assignment Brief
Your task is to identify a real-world problem, frame it clearly, break it down into a meaningful workflow, and
implement a working n8n(or similar low code workflow tool) demo that uses agentic practices.
The goal is not to create a simple chatbot. The goal is to demonstrate that you can think like an AI product
builder:
● Define the problem
● Design the workflow
● Decide where AI should be used
● Keep deterministic control where needed
● Explain the system clearly
Your final submission must include a Loom video walkthrough showing your workflow demo and explaining
the design decisions behind it.
2. Learning Objectives
● Frame a real-world problem into a structured, AI-solvable workflow.
● Decompose a problem into meaningful steps, branches, tools, and outputs.
● Apply agentic design concepts such as role definition, task decomposition, tool use, routing, human
approval, and structured outputs.
● Distinguish between AI reasoning steps and deterministic control logic.
● Communicate the workflow clearly through a short technical demo.

Agentic Workflow Design and n8n Demo Assignment

3. What You Need to Build
Task Component Expectation
Select a problem Choose a practical problem where an AI workflow can
create real value. It can be from education, campus
operations, placement, productivity, customer support,
research, finance, HR, student services, startup
operations, or any realistic domain.

Frame the problem statement Write a clear problem statement: who is the user, what
pain point are you solving, why does it matter, and what
output should the workflow produce?

Break it into workflow steps Define the input, processing steps, AI reasoning steps,
deterministic rules, decision branches, tools/integrations,
and final output.

Build in n8n Create a working n8n workflow. The workflow should
have multiple meaningful nodes and should not be only a
single AI prompt call.

Use agentic practices Use concepts from class such as agent roles, tool use,
routing, structured outputs, human-in-the-loop review,
validation, branching, and fallback/error handling where
relevant.

Record a Loom demo Record a short demo explaining the problem, workflow,
key nodes, where AI is used, where deterministic logic is
used, and how the output is useful.

4. Individual Submission Requirement
This is an individual submission. Every student must submit their own Loom video and explanation, even if
the underlying workflow was developed as part of a group project.
If you are using a group project, your submission must clearly explain your individual contribution. You
should specifically mention:
● which part of the workflow you designed or built
● which nodes, agents, prompts, integrations, or branches you contributed to
● how your part connects with the overall system
● what decisions you made and why
For group projects, the problem should be complex enough to justify multiple contributors. A strong group
workflow should ideally include multiple agentic roles, clear decomposition, multiple branches, or meaningful
integrations.

Agentic Workflow Design and n8n Demo Assignment

5. Suggested Problem Areas
Area Example Ideas
Student / Campus Assignment helper with teacher approval, event query
router, campus support ticket triage, lost-and-found
assistant.

Placement / Career JD-resume fit analyzer, mock interview workflow,
portfolio review workflow, job application tracker.
Startup / Product Startup idea validator, customer feedback summarizer,
MVP feature prioritizer, founder task planner.
Research / Learning Research paper summarizer with verification, learning
roadmap generator, resource recommendation workflow.
Operations / Business Lead triage, invoice/document review, customer support
escalation, meeting summary and action tracker.
Personal Productivity Email/task prioritizer, study planner, goal tracker,

document-to-action workflow.

You may choose a different problem as long as it is practical, clear, and suitable for a workflow-based AI
system.
6. Agentic Practices to Demonstrate
● Clear role or responsibility for each AI step, for example extractor, classifier, reviewer, planner, or
recommender.
● Structured inputs and outputs, preferably JSON-like or schema-based outputs where possible.
● Tool or integration usage, such as forms, Google Sheets, email, database, HTTP request, document
parser, or external API.
● Branching/routing logic based on workflow state or AI output.
● Deterministic checks for validation, thresholds, fit categories, approval status, or routing decisions.
● Human-in-the-loop review for high-impact or risky outputs where appropriate.
● Fallback handling for missing input, incomplete output, or failed tool calls.
7. Submission Deliverables
Deliverable Details
Loom video 5-8 minutes recommended. Show the working n8n
workflow, explain the problem, and run through one
sample input/output.

Problem statement A short written description of the user, pain point,

workflow goal, and expected output.

Agentic Workflow Design and n8n Demo Assignment

Workflow explanation Briefly explain the major workflow steps, AI nodes,
deterministic nodes, branches, and final output.
Contribution note Required for students using a group project. Clearly

state your individual contribution.

Github Repo Screenshots, exported n8n workflow JSON, sample

input/output, and a README

8. Suggested Loom Video Structure
Time What to Cover
0:00-0:45 Introduce the problem and target user.
0:45-1:30 Explain the problem-to-workflow breakdown.
1:30-3:30 Walk through the n8n workflow nodes and connections.
3:30-5:30 Run the workflow with sample input and show the output.
5:30-7:00 Explain where AI is used, where deterministic logic is

used, and why.

7:00-8:00 Mention limitations, improvements, and your contribution

if applicable.

9. Grading Criteria
Criterion What Will Be Judged Suggested Weight
Problem-to-workflow mapping Does the student clearly frame the
problem and break it into meaningful
workflow steps instead of treating it
as one prompt?

20%

Workflow logic and structure Are the nodes, branches, routing,
and sequence logically designed,
readable, and functional?

20%

Use of AI vs deterministic steps Is AI used where reasoning,
extraction, summarization,
classification, or planning is needed,
while deterministic logic handles
control, validation, routing, and
thresholds?

20%

Practical usefulness Does the workflow solve a realistic
problem and produce a usable
output?

20%

Explanation and understanding Can the student clearly explain what
the workflow does, why each major
20%

Agentic Workflow Design and n8n Demo Assignment

step exists, and what their
contribution was?