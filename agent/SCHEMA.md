# Brain Schema Contract (v2 — Memgraph + Weaviate)

This file is the API contract between the agent-side skills (writers/readers)
and the backend. Skills MUST read this file before touching the graph.
Do not invent labels, edges, or property names that are not listed here.

## Stores

| Store | Role | Access |
|---|---|---|
| Memgraph | graph store (structure & provenance) | `POST http://localhost:3001/cypher` `{query, params}` |
| Weaviate | semantic search (finding connection candidates) | `POST http://localhost:3001/vector-search` `{type, query, limit}` |
| Memgraph Lab | graph visualization (for the demo) | http://localhost:3000 |

## Node labels and properties

Required properties on every node: `id` (see convention below), `title`,
`created` (YYYY-MM-DD)

| Label | id prefix | Additional properties |
|---|---|---|
| `Client` | `cli-` | `industry` |
| `Requirement` | `req-` | `raw` (original text) |
| `Presentation` | `pres-` | `summary`, `version`: `draft` \| `final` |
| `Data` | `data-` | `summary`, `source` |
| `Outcome` | `out-` | `result`: `success` \| `fail`, `reason` (one line, based on client feedback) |
| `Judgment` | `jdg-` | `statement` (rule text), `confidence` (0.0-1.0), `status`: `active` \| `contradicted` \| `retired`, `scope` (applicability: `global` / `client:cli-x` / `industry:retail` etc.) |
| `Attribute` | `attr-` | `kind`: `segment` \| `industry` \| `goal` \| `deliverable` \| `budget` \| `timing` \| `other`, `value` |
| `Prediction` | `pred-` | `expects` (predicted success/fail + one-line rationale), `risks` (anticipated failure reasons), `scored` (bool, initially false) |

ids are kebab-case: e.g. `req-clientx-2026-07`, `jdg-insight-first`,
`attr-segment-f50-500`

## Edge types (do not create any others)

```
(Requirement)-[:FROM_CLIENT]->(Client)
(Requirement)-[:ANSWERED_BY]->(Presentation)
(Requirement)-[:HAS_ATTRIBUTE]->(Attribute)      ← method B: the "red branches"
(Presentation)-[:FOR_CLIENT]->(Client)
(Presentation)-[:RESULTED_IN]->(Outcome)
(Presentation)-[:BACKED_BY]->(Data)
(Presentation)-[:REVISED_TO]->(Presentation)      ← draft → final
(Data)-[:ABOUT]->(Attribute)
(Judgment)-[:DERIVED_FROM]->(any node)            ← the provenance chain
(Judgment)-[:SUPPORTED_BY]->(Outcome)             ← supporting evidence
(Judgment)-[:CONTRADICTED_BY]->(Outcome)          ← contradicting evidence
(Prediction)-[:ABOUT]->(Requirement)
(Prediction)-[:BASED_ON]->(Judgment)
```

## Judgment lifecycle (managed by /brain-learn)

- On creation: `confidence: 0.5`, `status: active`. Always attach at least
  one `DERIVED_FROM` edge.
- Each supporting Outcome: `confidence +0.1` (cap 0.95) + a `SUPPORTED_BY` edge.
- Each contradicting Outcome: `confidence -0.2` + a `CONTRADICTED_BY` edge.
- When `confidence < 0.3`: set `status: contradicted`. Revival only via
  full-scan re-evaluation.
- Always set `scope`. Do not use `global` unless there is real evidence the
  rule generalizes unconditionally.
- Attribution caveat: if an Outcome's `reason` is unrelated to the content of
  the materials (price, relationships, timing, etc.), do NOT use that Outcome
  as evidence for any judgment (no edges).

## Dual-write rule

Text-bearing nodes (`Requirement`, `Judgment`, `Data`, `Presentation`) are
upserted into the same-named Weaviate collection at the same time as the
Memgraph MERGE. The Weaviate object carries
`{ gid: <graph id>, text: <searchable text> }`.
`gid` is the bridge from a search hit back to graph traversal.

- If `POST /node` is implemented, use it (writes both stores in one request).
- If it returns 404, write via `POST /cypher` only and state explicitly in
  your response that the vector index is out of sync.

## Backend requirements (not yet implemented)

1. `POST /node` — body: `{ label, id, props, text? }`. MERGE into Memgraph;
   if `text` is present, upsert into the label's Weaviate collection with `gid`.
2. Ensure on startup: create the `Requirement` / `Judgment` / `Data` /
   `Presentation` collections in Weaviate if they don't exist.

## Rules

1. Always create nodes with `MERGE` (on id). Never `CREATE` — duplicate nodes
   poison the graph.
2. When a skill cites a judgment in its output, always cite by `id` and show
   its `DERIVED_FROM` targets as well (the provenance chain is the core of
   the demo).
3. Skills never run destructive Cypher (`DETACH DELETE` etc.).
4. Back up the `mg_data` volume before the demo.
