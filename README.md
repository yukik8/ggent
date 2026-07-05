# ggent — the company brain

A brain that turns the "ace's judgment" behind winning sales proposals into a
graph asset owned by the organization. It accumulates past requirements,
presentations, and outcomes in a graph, distills winning patterns
(**Judgments**) from success and failure, and uses them to plan strategy for
new deals.

## Concept

### Learn from artifacts, not from forced verbalization

The AI era has renewed the push for documentation: get your best people to
write down what they know. That approach has three structural problems:

1. **Self-report bias** — aces are often wrong about *why* they win. The real
   winning move and the story they tell about it diverge.
2. **It taxes the ace** — the people whose knowledge matters most are exactly
   the people with the least time to write it down.
3. **It never gets tested** — once written, a best-practice document becomes
   authority. Nothing ever contradicts it, so it can't be corrected.

And underneath all three: some knowledge simply cannot be verbalized on
demand.

ggent inverts the approach. Instead of asking the ace to explain themselves,
it learns from what they actually **produced** — the requirements they
received, the presentations they shipped, and the outcomes those
presentations earned.

To be precise, ggent still verbalizes: a Judgment's `statement` is a
written rule. What changes is **who verbalizes, when, and on what evidence**.
Rules are extracted after the fact, by the agent, from artifacts — and every
Judgment carries a `DERIVED_FROM` provenance chain back to the concrete
presentations and outcomes it came from. Its `confidence` rises with each
supporting outcome and falls with each contradicting one; drop below the
threshold and the rule is demoted to `contradicted`. In other words:

> Not verbalization avoided — self-reported verbalization replaced with
> **evidence-based, falsifiable verbalization**.

A human-written best-practice doc is never falsified. A Judgment is a
hypothesis under permanent test.

### Two search directions, integrated

A single retrieval strategy is not enough. ggent deliberately combines two:

| Direction | Skill | What it yields |
|---|---|---|
| **From the requirement, forward** — decompose a new deal into attributes, connect to similar precedents | `/brain-connect` | Deal-specific insight: "deals that looked like *this* lost for *these* reasons" — the landmines unique to this requirement |
| **From the outcome, backward** — trace wins and losses back through presentations to distill general rules | `/brain-learn` | General winning patterns: reusable Judgments with confidence scores and scopes |

This is case-based reasoning fused with rule induction. Either alone is
weak: precedent search misses on novel deals; general rules step on
deal-specific landmines. `/ace-review` executes the integration — and the
integration is not additive. A high-confidence Judgment whose `scope` doesn't
match the deal is explicitly **rejected and cited as rejected**, which is
itself part of the strategy output.

### The prediction loop: a brain that scores itself

Every `/ace-review` run ends by writing a **Prediction** into the graph —
expected result, rationale, anticipated failure modes — *before* the pitch
happens. When the outcome lands, `/brain-record` scores the prediction and
`/brain-learn` feeds the result back into Judgment confidence.

This is pre-registration. It structurally prevents hindsight bias: the brain
cannot retroactively claim it "knew it all along," because its actual
judgment is timestamped in the graph. The brain continuously verifies its
own hit rate — which is what separates it from a knowledge graph that merely
stores things.

### What it honestly cannot capture

Tacit knowledge that never leaves a trace in an artifact — rapport with a
key decision-maker, delivery in the room — stays out of reach. The schema
treats this honestly rather than pretending otherwise: if an Outcome's
recorded reason is unrelated to the content of the materials (price,
relationships, timing), that Outcome is **excluded as evidence** for any
Judgment. The brain only claims what its evidence can support.

## Architecture

```
[skills (.claude/skills/)]  ← agent layer. All orchestration lives here
        │  curl
        ▼
[backend :3001]  Hono — POST /cypher, POST /vector-search, /ingest, demo UI
        │                │
        ▼                ▼
[Memgraph :7687]   [Weaviate :8080]
 graph store         semantic search
 (Lab UI :3000)     (text2vec-openai; OPENAI_API_KEY required)
```

The backend is a thin proxy. Intelligence lives in the **skill layer** —
Claude Code skills that read and write the graph through the backend.

### Stores

- **Memgraph** — the graph itself: structure and provenance. Every node,
  edge, and confidence score lives here.
- **Weaviate** — semantic search over text-bearing nodes, used to find
  connection candidates. Each object carries a `gid` bridging a search hit
  back to graph traversal (dual-write rule).

### Skill pipeline

| skill | role | invoked by |
|---|---|---|
| `/ace-review` | strategy planning (main entry). Produces a cited strategy brief + slide skeleton + upfront prediction | human. Calls brain-connect internally if the deal isn't in the graph |
| `/brain-connect` | ingest a requirement, decompose into attributes, connect to existing nodes | ace-review, or standalone |
| `/brain-record` | record a result (success/fail) and its reason | human. Calls brain-learn internally |
| `/brain-learn` | extract Judgments, update confidence. `--full-scan` for a global pass | brain-record, or standalone |

The loop:

```
/ace-review writes a Prediction
        ↓  (pitch happens)
/brain-record scores the outcome
        ↓
/brain-learn updates Judgment confidence
        ↓
the next /ace-review is smarter
```

### Graph schema (summary)

The full contract is in [`agent/SCHEMA.md`](agent/SCHEMA.md) — **always read
it before touching the graph**. Node labels: `Client`, `Requirement`,
`Presentation`, `Data`, `Outcome`, `Judgment`, `Attribute`, `Prediction`.

Judgment lifecycle (managed by `/brain-learn`):

- created at `confidence: 0.5`, `status: active`, with at least one
  `DERIVED_FROM` edge
- each supporting Outcome: `+0.1` (cap 0.95) + `SUPPORTED_BY` edge
- each contradicting Outcome: `-0.2` + `CONTRADICTED_BY` edge
- below `0.3`: demoted to `status: contradicted`
- every Judgment has a `scope` (`global` / `client:…` / `industry:…`) —
  `global` requires real evidence of unconditional generalization

## Getting started

```bash
docker compose up -d          # memgraph + weaviate (put OPENAI_API_KEY in .env)
npm run dev -w backend        # API on :3001
```

Demo endpoints once the backend is up:

- `http://localhost:3001/ui` — live graph view
- `http://localhost:3001/compare` — brain-backed vs. generic-AI proposal, side by side
- `http://localhost:3001/slides` — slide skeleton output
- `http://localhost:3000` — Memgraph Lab (raw graph)

Seed data with planted winning patterns lives in [`seed/`](seed/).

## Dev notes

- The schema contract in `agent/SCHEMA.md` is authoritative. Do not invent
  labels or edges outside it. Always `MERGE` on id, never `CREATE`.
- Backend endpoint implementation is owned by the backend team; agent-side
  requirements are in the "Backend requirements" section of `agent/SCHEMA.md`.
- Back up the `mg_data` volume before the demo — raw Cypher is accepted, so
  mistakes can destroy data.
