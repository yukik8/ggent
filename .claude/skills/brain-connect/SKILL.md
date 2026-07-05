---
name: brain-connect
description: Ingest a new deal/requirement into the brain's graph, decompose it into elements, and connect them to existing nodes (grow the red branches). Trigger examples: "put this deal into the graph", "register this requirement", "a new brief came in". Takes the deal text or a file path as argument.
---

# brain-connect — requirement ingestion & connection

Role: writer. Turns a new requirement into a node, decomposes it into
elements, and connects each element to existing Attribute / Client nodes via
`HAS_ATTRIBUTE` / `FROM_CLIENT`.
These connections (the red branches) are the starting point of
/ace-review's precedent search.

## Steps

1. **Read the contract**: read `agent/SCHEMA.md`. Follow its labels, edges,
   and id conventions.

2. **Decompose**: extract the following from the requirement's raw text
   (skip what's absent):
   - client (who is asking)
   - target segment (e.g. "women in their 50s, income 5M yen")
   - industry
   - goal (awareness / sales promotion / branding…)
   - deliverable (proposal deck / TV CM plan / campaign…)
   - budget, timing

3. **Find connection targets**: for each element, look for existing nodes.
   - First check exact/near matches via Cypher:
     `MATCH (a:Attribute {kind: $kind}) RETURN a.id, a.value`
   - If there are many candidates or likely spelling variants, use
     `POST /vector-search` for semantic search.
   - **Decision rule**: if semantically identical, reuse the existing node
     (e.g. "F50" and "women in their 50s" are the same). Create a new
     Attribute only when genuinely unsure. Node proliferation breaks
     precedent search.

4. **Write**: follow SCHEMA.md's dual-write rule:
   - MERGE the Requirement node (`raw` = full original text) + Weaviate upsert
   - MERGE any new Attributes
   - Create the `FROM_CLIENT` / `HAS_ATTRIBUTE` edges

   ```cypher
   MERGE (r:Requirement {id: $id})
     SET r.title = $title, r.raw = $raw, r.created = $created
   WITH r
   MATCH (a:Attribute {id: $attrId})
   MERGE (r)-[:HAS_ATTRIBUTE]->(a)
   ```

5. **Report**: always output:
   - the id of the created requirement
   - the list of branches created (distinguishing connections to existing
     nodes vs newly created nodes)
   - any past deals now indirectly connected (Requirements one hop away via
     shared Attributes) — this is the "precedents appear the moment it enters
     the graph" money shot

## Notes

- Never connect requirements to each other directly. Connections always go
  through Attribute / Client nodes. Keep similarity explainable as "number of
  shared neighbor nodes".
- All writes use MERGE. Include the executed Cypher verbatim in the response
  (for inspectability).
