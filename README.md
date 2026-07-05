# ggent — Company Brain

An organization's learnable graph memory. It ingests proposals, diffs, and outcomes, then discovers *why* you win — so the next pitch is smarter.

## What makes this different

**Self-evolving ontology.** The backend's LLM agent doesn't just populate a fixed schema — it can *extend* the ontology at runtime. It starts from a 6-label base, discovers new entity types from ingested documents via an `add_label` tool, and tracks ontology versions in the graph itself. No humans model the domain; the domain *emerges* from ingestion.

**Graph + vector dual RAG.** Every searchable node is written to both Memgraph (for structure traversal and provenance) and Weaviate (for semantic similarity). A shared `gid` bridges the two. Cypher walks the graph for precedent chains; vector search finds semantically close Judgments. Results are merged by confidence score — structure and meaning, together.

**Provenance chains are the output.** Every recommendation cites a traceable chain of node ids back to the evidence that produced it. No black box.

**Prediction scoring loop.** `ace-review` writes a Prediction into the graph → when the real result lands, `brain-record` scores it against the prediction → `brain-learn` updates Judgment confidence. Supporting outcomes push confidence up; contradicting ones pull it down. Judgments that led to right predictions strengthen; wrong ones decay.

## How it works

```
          ┌──────────────┐
          │  ace-review   │  strategy planning — reads graph, writes Prediction
          └──────┬───────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│Memgraph│  │ Weaviate │  │ skills   │
│ :7687  │  │  :8080   │  │ pipeline │
│ graph  │◄─┤ vector   │  │   .claude│
│ store  │  │ store    │  │ /skills/ │
└────────┘  └──────────┘  └──────────┘
     │            │              │
     └────────────┴──────────────┘
                  │
         ┌────────▼────────┐
         │  brain-record   │  record outcome → trigger learning
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │  brain-learn    │  update Judgment confidence
         └────────┬────────┘
                  │
    ┌─────────────▼─────────────┐
    │  next ace-review is       │
    │  smarter (higher conf.)   │
    └───────────────────────────┘
```

## The Judgment lifecycle

Judgments are extracted patterns — "Problem-first decks win," "Quantify every claim" — each carrying a confidence score (0–1) and a full provenance chain back to the presentations and outcomes that produced them. Confidence starts at 0.5; each supporting outcome adds +0.1, each contradiction subtracts -0.2. Below 0.3 they retire.

## Quick start

```bash
# Infrastructure (Memgraph + Weaviate)
docker compose up -d

# Backend (Hono, :3001)
npm run dev -w backend

# Frontend (SvelteKit)
npm run dev -w frontend
```

Requires `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` in `.env`.

## Stack

| layer | tech |
|---|---|
| graph db | Memgraph (Bolt, Cypher) |
| vector db | Weaviate (text2vec-openai) |
| backend | Hono + LangChain + DeepSeek |
| frontend | SvelteKit + Cytoscape |
| orchestration | Claude Code skills (`.claude/skills/`) |

## Schema

Node labels, edge types, and the dual-write rule are defined in [`agent/SCHEMA.md`](agent/SCHEMA.md). That file is the contract — all agents read it before touching the graph.
