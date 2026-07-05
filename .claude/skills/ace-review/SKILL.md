---
name: ace-review
description: Main entry point for planning a proposal strategy for a deal (requirement). Integrates graph precedents and judgments (winning patterns) to produce a cited strategy brief + slide skeleton + upfront prediction. Trigger examples: "plan the strategy for this deal", "draft a proposal", "what would the ace do".
---

# ace-review — strategy planning (reader)

Role: reader. Integrates method B (precedent search) and method A (judgments)
to produce the proposal strategy that maximizes the probability of success.
**Every decision carries provenance (a chain of citations)** — that is the
value of this brain.

## Steps

1. **Read the contract**: `agent/SCHEMA.md`.

2. **Check graph ingestion**: confirm the target requirement exists in the graph:
   `MATCH (r:Requirement {id: $id}) RETURN r`
   **If missing, run `brain-connect` first via the Skill tool**, then continue.

3. **Collect precedents (method B)**: pull precedents through shared Attributes
   on the requirement's red branches:
   ```cypher
   MATCH (r:Requirement {id: $id})-[:HAS_ATTRIBUTE]->(a:Attribute)<-[:HAS_ATTRIBUTE]-(other:Requirement)
   MATCH (other)-[:ANSWERED_BY]->(p:Presentation)-[:RESULTED_IN]->(o:Outcome)
   OPTIONAL MATCH (p)-[:BACKED_BY]->(d:Data)
   RETURN other.id, count(DISTINCT a) AS shared, collect(DISTINCT a.value) AS via,
          p.id, p.summary, o.result, o.reason, collect(DISTINCT d.id) AS data
   ORDER BY shared DESC
   ```
   Always fetch same-client precedents (same `FROM_CLIENT`) separately and
   treat them with top priority.

4. **Collect judgments (method A)**:
   - Fetch active judgments whose scope matches (global + client + industry)
     via Cypher
   - Also fetch semantically similar ones via `POST /vector-search`
     (type: Judgment) against the requirement's raw text
   - Order by `confidence` descending. Never use `contradicted` / `retired`.

5. **Integration — priority is fixed in this order**:
   1. Concrete same-client precedents (successes AND failures)
   2. Judgments with matching scope
   3. Global judgments
   On conflict, the higher tier wins. Keep the rejected lower-tier evidence in
   the output as "not adopted, and why".

6. **Output** — three layers:

   ### A. Strategy brief (the core)
   One block per decision:
   - The decision (what to do / what to avoid)
   - Evidence: cite **explicit id chains** in the form
     `jdg-xxx (confidence 0.8, scope: client:cli-x) ← DERIVED_FROM: pres-yyy, out-zzz`.
     Cite precedents by id the same way.
   - Data to use (Data nodes that precedents were BACKED_BY and that apply here)

   ### B. Slide deck (the final product — write `demo/slides.json`)
   Translate the brief's decisions into an actual deck by writing
   `demo/slides.json` (rendered at `http://localhost:3001/slides`). Schema:
   ```json
   {
     "deck_title": "...", "client": "...", "generated_by": "ace-review <date>",
     "slides": [
       { "n": 1, "title": "...", "bullets": ["..."], "visual_hint": "...",
         "evidence": [ { "id": "jdg-xxx", "confidence": 0.8, "why": "..." } ] }
     ],
     "avoided_risks": [ { "fail_case": "out-xxx", "lesson": "..." } ],
     "prediction": { "id": "pred-xxx", "expects": "...", "risks": "..." }
   }
   ```
   Every slide MUST carry an `evidence` array citing real node ids — the
   evidence rail next to each slide is the product's core claim. Put the
   strategy's decision trace into the bullets, not generic filler.

   ### C. Write the deck and the prediction back to the graph
   First, register the generated deck itself as a Presentation node — this is
   what the future Outcome will attach to, and its `summary` is the evidence
   the next brain-learn run will read:
   ```cypher
   MERGE (p:Presentation {id: $presId})
     SET p.title = $deckTitle, p.summary = $strategySummary,
         p.version = 'final', p.created = $today
   WITH p MATCH (r:Requirement {id: $reqId}) MERGE (r)-[:ANSWERED_BY]->(p)
   WITH p MATCH (c:Client {id: $clientId}) MERGE (p)-[:FOR_CLIENT]->(c)
   ```
   Also `MERGE (p)-[:BACKED_BY]->(d)` for each Data node the deck uses, and
   dual-write the summary to Weaviate's Presentation collection.

   Then the upfront prediction (Prediction node):
   - `expects`: why we predict success (the judgments relied on)
   - `risks`: if this fails, what will have caused it (from similar fail precedents)
   - Create `(pred)-[:ABOUT]->(requirement)` and `(pred)-[:BASED_ON]->(each judgment)`,
     MERGE with `scored: false`. **When the result lands, brain-record scores
     this** — that is what makes confidence updates meaningful learning.

7. **Risk / counter-evidence section**: always end the brief with similar past
   fails (those with `result: 'fail'` from step 3): "cases that failed in this
   situation, and how this proposal avoids the same fate".

## Notes

- Never crash on zero precedents / zero judgments: state explicitly that the
  brain has no precedent, produce a general-knowledge proposal, and register
  the prediction as a low-confidence hypothesis.
- Citations must be ids of real nodes. Never fabricate an id (verify existence
  via Cypher before emitting output).
