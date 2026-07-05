---
name: brain-record
description: Record a presentation's result (won/lost, success/fail) and its reason into the brain, and immediately run learning (brain-learn incremental update). Trigger examples: "record the result for Client X", "we won/lost, record it", "the pitch result is in".
---

# brain-record — result recording & immediate learning

Role: writer + learning trigger. One command delivers "the brain learns the
moment an outcome is recorded".

## Steps

1. **Read the contract**: read `agent/SCHEMA.md`.

2. **Identify the target**: determine which presentation this result belongs to.
   List candidates via `MATCH (p:Presentation) RETURN p.id, p.title`; ask the
   user if ambiguous.
   If the presentation itself isn't registered yet, MERGE the Presentation
   node (and its ANSWERED_BY / FOR_CLIENT / BACKED_BY edges) first, then
   continue.

3. **Record the Outcome**:
   - Pin down `result` (success | fail) and `reason`. **Always elicit the
     reason or extract it from the source text** — an outcome without a
     reason is unusable for learning (attribution problem).
   - MERGE the Outcome node and create
     `(Presentation)-[:RESULTED_IN]->(Outcome)`.

   ```cypher
   MERGE (o:Outcome {id: $id})
     SET o.title = $title, o.result = $result, o.reason = $reason, o.created = $created
   WITH o
   MATCH (p:Presentation {id: $presId})
   MERGE (p)-[:RESULTED_IN]->(o)
   ```

4. **Score the prediction**: check for a Prediction node (`scored: false`)
   on this requirement:
   ```cypher
   MATCH (pred:Prediction {scored: false})-[:ABOUT]->(:Requirement)-[:ANSWERED_BY]->(p:Presentation {id: $presId})
   MATCH (pred)-[:BASED_ON]->(j:Judgment)
   RETURN pred, collect(j.id) AS judgments
   ```
   If present, compare the prediction against the actual result, identify
   which judgments were right/wrong, and update to `scored: true`. Hand the
   scoring results to brain-learn in the next step.

5. **Immediate learning**: invoke `brain-learn` via the Skill tool.
   Pass the outcome id (and scoring results, if any) as args. It runs in
   incremental update mode.

6. **Report**: list the recorded outcome, the scored prediction, and the
   judgments brain-learn updated/created.
