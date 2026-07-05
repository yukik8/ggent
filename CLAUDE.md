# ggent — company brain

A brain that turns the "ace's judgment" in sales proposals into a graph asset
owned by the organization. It accumulates past requirements / presentations /
outcomes in a graph, learns winning patterns (Judgments) from success/fail,
and uses them to plan strategy for new deals.

## Architecture

```
[skills (.claude/skills/)]  ← agent layer. Orchestration lives here
        │  curl
        ▼
[backend :3001]  Hono — POST /cypher, POST /vector-search (planned: POST /node)
        │                │
        ▼                ▼
[Memgraph :7687]   [Weaviate :8080]
 graph store         semantic search
 (Lab UI :3000)     (vectorized via text2vec-openai; OPENAI_API_KEY required)
```

## Contract

**Always read `agent/SCHEMA.md` before reading or writing the graph.**
Node labels, edge types, id conventions, the judgment lifecycle, and the
dual-write rule are all defined there. Do not invent labels or edges outside
the schema.

## Skill pipeline

| skill | role | how it's invoked |
|---|---|---|
| `/ace-review` | strategy planning (main entry) | invoked by a human. If the deal isn't in the graph yet, calls brain-connect internally |
| `/brain-connect` | ingest & connect a requirement into the graph | chained from ace-review, or standalone |
| `/brain-record` | record a result (success/fail) | invoked by a human. Calls brain-learn internally |
| `/brain-learn` | extract judgments & update confidence | chained from brain-record. `--full-scan` for a global pass |

Loop: ace-review writes a Prediction into the graph → when the result lands,
brain-record scores it → brain-learn feeds it into judgment confidence →
the next ace-review is smarter.

## Startup

```bash
docker compose up -d          # memgraph + weaviate (put OPENAI_API_KEY in .env)
npm run dev -w backend        # :3001
```

## Dev notes

- Backend endpoint implementation is owned by the backend team. The agent-side
  requirements are in the "Backend requirements" section of `agent/SCHEMA.md`.
- Back up the `mg_data` volume before the demo (raw Cypher is accepted, so
  mistakes can destroy data).
