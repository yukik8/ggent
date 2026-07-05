---
name: brain-learn
description: The learning engine that updates the brain's winning patterns (Judgments) from outcomes (success/fail). Pass an outcome id for an incremental update, or --full-scan for a global pass. Normally invoked automatically by brain-record. Trigger examples: "learn from this", "update judgments", "full scan".
---

# brain-learn — judgment extraction & update

Role: method A. Mines generalizable rules (Judgments) from the graph's
success/fail signal and moves confidence up or down based on evidence.
**Never scan the whole graph** — the default is an incremental update that
looks only at the neighborhood of the outcome it was given.

## Mode selection

- args contain an outcome id → **incremental update mode**
- args contain `--full-scan` → **global reconciliation mode**

## Incremental update mode

1. **Read the contract**: `agent/SCHEMA.md` (especially the judgment lifecycle).

2. **Fetch the neighborhood**: traverse depth 2-3 from the outcome:
   ```cypher
   MATCH (o:Outcome {id: $outId})<-[:RESULTED_IN]-(p:Presentation)
   OPTIONAL MATCH (p)-[:BACKED_BY]->(d:Data)
   OPTIONAL MATCH (p)-[:FOR_CLIENT]->(c:Client)
   OPTIONAL MATCH (req:Requirement)-[:ANSWERED_BY]->(p)
   OPTIONAL MATCH (req)-[:HAS_ATTRIBUTE]->(a:Attribute)
   OPTIONAL MATCH (draft:Presentation)-[:REVISED_TO]->(p)
   RETURN o, p, collect(DISTINCT d), c, req, collect(DISTINCT a), draft
   ```
   The draft→final diff (REVISED_TO) is the richest evidence — what the ace
   changed lives there.

3. **Attribution check**: read `o.reason`. If the reason is unrelated to the
   content of the materials (price, relationships, timing, etc.),
   **do not update any judgment** — report that and stop.

4. **Match against existing judgments**: fetch active judgments whose scope
   fits the neighborhood:
   ```cypher
   MATCH (j:Judgment {status: 'active'})
   WHERE j.scope = 'global' OR j.scope = 'client:' + $clientId OR j.scope = 'industry:' + $industry
   RETURN j
   ```
   Additionally pull semantically similar judgments via `POST /vector-search`
   (type: Judgment) against the neighborhood's content.
   Classify each judgment as **supported / contradicted / unrelated** by this
   outcome.

5. **Write the updates** (per SCHEMA.md rules):
   - supported: `confidence +0.1` (cap 0.95) + a `SUPPORTED_BY` edge
   - contradicted: `confidence -0.2` + a `CONTRADICTED_BY` edge;
     if `< 0.3`, set `status: 'contradicted'`
   - If brain-record passed prediction scoring results, apply them under the
     same rules (judgments behind a correct prediction count as supported;
     behind a wrong one, contradicted).

6. **Extract new judgments**: if there is a pattern existing judgments can't
   explain, create one.
   - Generalize `statement` into "condition → action → result" form
     (e.g. "In competitive pitches for retail clients, present the target
     insight on slide 1").
   - Limit `scope` to what the evidence covers. Never `global` from a single
     piece of evidence.
   - `confidence: 0.5`, with `DERIVED_FROM` edges to all evidence nodes.
   - Don't forget the dual write (upsert into Weaviate's Judgment collection).
   - **Extract fail-derived anti-patterns as equals** ("do not do X" is also
     a judgment).

7. **Report**: list updated judgments (id / change / reason) and new judgments.

## Global reconciliation mode (--full-scan)

Recovers cross-cutting patterns that incremental updates can't see.
Intended as a weekly batch.

1. Fetch all outcomes and judgments; look for patterns spanning multiple
   clients/deals (e.g. skewed success rates among requirements sharing an
   Attribute).
2. Recompute each judgment's confidence from its evidence edge counts; fix
   any drift.
3. Re-evaluate `contradicted` judgments — restore to `active` if later
   evidence justifies it.
4. Merge near-duplicate judgments (same rule at different scopes merges into
   the wider scope).
5. Include every change in the report.
