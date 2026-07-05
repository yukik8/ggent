# Graph Schema Contract (v2 — Memgraph/Weaviate)

This is the contract between the AI agents (writers) and the UI / strategy
queries (readers). Memgraph is schemaless — nothing here is enforced by the
DB. What's listed as CORE is guaranteed by convention; everything else is
open (see "Open periphery").

## Core node labels

Every node MUST have: `id` (unique slug, e.g. `presentation/client-x-final`),
`title`, `date` (ISO). Label-specific required props:

| Label          | Required props                          | Notes |
|----------------|------------------------------------------|-------|
| `Requirement`  | `client_name`, `goal`                    | the brief |
| `Presentation` | `stage` (`draft` \| `final`)             | a deck / proposal |
| `Client`       | —                                        | |
| `Data`         | `source_kind` (`survey` \| `social` \| …) | research assets |
| `Outcome`      | `result` (`success` \| `fail`), `reason` | dated — feeds trends |
| `Judgment`     | `confidence` (0–1), `status` (`active` \| `contradicted` \| `retired`), `rule` (one-line statement) | the learned asset |

## Core edge types

| Edge                | From → To                  |
|---------------------|----------------------------|
| `ANSWERED_BY`       | Requirement → Presentation |
| `FOR_CLIENT`        | Requirement/Presentation → Client |
| `REVISED_TO`        | Presentation(draft) → Presentation(final) |
| `BACKED_BY`         | Presentation → Data        |
| `RESULTED_IN`       | Presentation → Outcome     |
| `DERIVED_FROM`      | Judgment → evidence node   |

## Open periphery (do not close this)

- Agents MAY create additional labels, edge types, and properties beyond the
  core. The ontology is expected to grow — that is a feature, not schema drift.
- Readers MUST NOT assume the lists above are exhaustive.
- **UI requirement:** render unknown node labels generically (gray node,
  label text) and unknown edges as thin gray lines. The demo must never
  break because an agent invented a type.

## Weaviate mirror (semantic layer)

Each text-bearing node is mirrored as one Weaviate object so vector hits can
be joined back to the graph:

```json
{ "nodeId": "<same as Memgraph id>", "label": "Presentation", "text": "<content>" }
```

Collection per label (`Presentation`, `Data`, `Requirement`, `Judgment`).
Writer agents must write BOTH stores in one operation; `nodeId` is the join key.

## Canonical queries (readers rely on these shapes)

Win-pattern mining (global skill):
```cypher
MATCH (p:Presentation)-[:RESULTED_IN]->(o:Outcome)
OPTIONAL MATCH (p)-[:BACKED_BY]->(d:Data)
RETURN p.id, o.result, o.reason, collect(d.id)
```

Provenance trail for a judgment (slide evidence panel):
```cypher
MATCH (j:Judgment {id: $id})-[:DERIVED_FROM]->(e)
RETURN j.rule, j.confidence, collect({id: e.id, title: e.title})
```

Client precedents (local/red-branch context):
```cypher
MATCH (c:Client {id: $client})<-[:FOR_CLIENT]-(p:Presentation)-[:RESULTED_IN]->(o:Outcome)
RETURN p.id, p.title, o.result, o.reason ORDER BY p.date DESC
```

## Rules

1. Writers always set explicit label + `id` + `title` + `date`.
2. `id` is immutable; all cross-store references use it.
3. New outcome landing on a node triggers re-evaluation ONLY of judgments
   within 2–3 hops (local update — never full rescan).
4. The generated strategy is written back as a `Presentation` node with no
   `Outcome` yet — the loop closes when its result arrives.
