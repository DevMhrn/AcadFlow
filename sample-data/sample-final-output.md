# AcadFlow — Sample Final Output

This is an illustrative example of what the workflow produces for a real submission. The fields below correspond exactly to what gets written into the Google Doc, Calendar, and Sheet at the end of the workflow.

> Input: `sample-data/sample-assignment-input.txt` (Raft consensus implementation)
> Date the workflow ran: 2026-06-04
> Risk classification: medium · Route: planning · No HITL

---

## Document — `CS 340 — Distributed Systems — Raft Consensus Implementation — Plan`

### 1. Requirements Summary (from Agent 1)

**Objectives**
- Demonstrate understanding of the Raft consensus algorithm.
- Implement core protocol mechanics (election, replication, safety) from scratch.
- Justify implementation trade-offs in writing.

**Deliverables**
- Git repo with source code in Go 1.22+ or Rust 1.78+.
- README.md with build/run instructions.
- Unit tests covering leader election, log append, 3-node replication.
- 1-page design document.
- Zipped submission to course portal.

**Grading Rubric**
| Criterion | Weight |
|---|---|
| Correctness on test cluster | 40% |
| Test coverage | 25% |
| Design document clarity | 20% |
| Code quality | 15% |

**Estimated hours:** 22 · **Difficulty:** 8/10

**Keywords:** raft consensus, leader election, log replication, distributed systems, fault tolerance, RPC, append entries

---

### 2. Risk Assessment (from Agent 2)

**Risk level:** medium · **Score:** 0.55

**Reasons**
- 5-day window for ~22 hours of work — feasible but tight
- High difficulty (8/10) with novel concepts
- No prior code written; only paper read

**Needs human review:** false

---

### 3. Day-by-day Plan (from Agent 3)

| Day | Task | Hours |
|---|---|---|
| Today (Day 0) | Set up project skeleton in Go/Rust; bootstrap CI for tests; outline module structure (state, RPC, log, server) | 3 |
| Day 1 | Implement RequestVote RPC and randomized election timeouts; unit test on a single node | 4 |
| Day 2 | Implement AppendEntries RPC and log replication; test on 3-node in-memory cluster | 5 |
| Day 3 | Add safety invariants (term checks, commit index logic); write 4-5 unit tests covering the spec's known edge cases | 5 |
| Day 4 | Write 1-page design doc; clean up code; ensure README runs from scratch; zip and submit | 5 |

**Total planned:** 22 hours

**Resources**
- Article: "In Search of an Understandable Consensus Algorithm" (Ongaro & Ousterhout, 2014) — the canonical paper
- Video: "Designing for Understandability: The Raft Algorithm" — Stanford talk by Diego Ongaro
- Tool: TLA+ Toolbox (optional, for verifying your safety invariants)

---

### 4. Outline + Starter Draft (from Agent 4)

**Outline — Design Document**

1. **Problem & Scope**
   - What Raft solves; what this implementation does and does not cover
2. **Architecture**
   - Module breakdown (server, RPC layer, log, state machine)
3. **Key Trade-offs**
   - Why these timeout ranges; why this log compaction strategy (if any)
   - Concurrency model: goroutines vs threads; lock granularity
4. **Testing Strategy**
   - Which scenarios were covered; which were omitted and why
5. **Known Limitations**
   - What this would need before being production-grade

**Starter Draft (first ~400 words)**

> ## Raft Consensus — Design Document
>
> ### 1. Problem & Scope
>
> Distributed systems that need a single source of truth — replicated state machines, distributed locks, configuration stores — must agree on the order of operations even when some servers fail. Paxos solved this problem first, but its complexity made implementations rare. The Raft algorithm (Ongaro and Ousterhout, 2014) was designed for understandability without sacrificing correctness, and is the basis for systems like etcd, Consul, and CockroachDB.
>
> This implementation covers the core Raft protocol on a 3-node cluster: leader election with randomized timeouts, log replication via AppendEntries, and the safety properties needed to guarantee that committed entries are never lost. It does NOT cover log compaction, membership changes, or client linearizability — these are well-defined extensions that would be the next milestone. [CITE: original Raft paper §5 for the parts we cover; §6-7 for what we don't.]
>
> ### 2. Architecture
>
> The system is structured into four modules:
>
> - **Server**: the top-level Raft node, holding current term, log, and role state (Follower / Candidate / Leader).
> - **RPC**: an abstraction over the network layer exposing `RequestVote` and `AppendEntries` calls. [STUDENT TO EXPAND: describe whether you used gRPC, raw TCP, or in-memory channels for tests.]
> - **Log**: an ordered, persistent (or in-memory, for tests) sequence of entries, each tagged with the term in which it was added.
> - **State Machine**: a pluggable interface for applying committed entries. The default implementation is a simple key-value store, but anything implementing `Apply(entry) error` works.
>
> [STUDENT TO EXPAND: include a diagram here. ASCII or draw.io.]
>
> ### 3. Key Trade-offs
>
> [STUDENT TO EXPAND: describe at least two explicit trade-offs you made. Examples: timeout range tuning (longer = more stable but slower failover); whether to persist log to disk in this milestone or only memory; lock granularity (one big mutex vs per-state); whether AppendEntries batches multiple entries or sends one at a time.]

**Disclaimer:** *AI-generated content for reference only. The student must rewrite, expand, and verify all claims before submission.*

---

### 5. Calendar Events Created

| Event | Date | Duration |
|---|---|---|
| Raft — Project skeleton + CI | Today | 3h |
| Raft — RequestVote RPC | +1 day | 4h |
| Raft — AppendEntries + log replication | +2 days | 5h |
| Raft — Safety invariants + tests | +3 days | 5h |
| Raft — Design doc + submission | +4 days | 5h |

### 6. Student Notification Email

```
Subject: Your AcadFlow plan for "Raft Consensus Implementation" is ready

Hi,

Your plan for the Raft assignment (CS 340) is ready. Quick summary:

  • Risk: medium (5-day window, ~22h of work)
  • Plan: 5 calendar events created, one per day
  • Doc with full plan + starter draft: <google-doc-link>
  • Calendar: <calendar-link>

Read the disclaimer in the doc — the starter draft is a jumping-off
point, not a finished submission. Rewrite in your own voice and verify
every claim.

Good luck.
— AcadFlow
```
