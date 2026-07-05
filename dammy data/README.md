# Dummy Data — Marketing Agency "Company Brain"

Synthetic corporate data for the mapping/extraction pipeline. English, text-only.
Owner: Ken. Spec source: PRODUCT_OVERVIEW.md §6.

## What's in here

```
dammy data/
  README.md            <- this file
  dataset.json         <- ALL nodes + edges, pre-structured (fallback: ingest directly, skip mapping LLM)
  docs/
    briefs/            <- 6 client requirement briefs (R1..R6)
    presentations/     <- proposal decks as markdown. v1_draft = junior's version, v2_final = ace-revised
  holdout/             <- ace's final revisions for R2 & R5. DO NOT ingest into the graph.
                          Used to validate extracted skills: AI predicts the revision, compare against these.
```

## The cast

| ID | Name | Role | Level |
|---|---|---|---|
| P1 | Ayaka Sato | Executive Strategy Director | **ACE** (pitch win rate 78%) |
| P2 | Kenji Mori | Senior Planner | mid (win rate 45%) |
| P3 | Riku Tanaka | Planner, 2nd year | junior |
| P4 | Hana Yamamoto | Planner, 1st year | junior |

All belong to Team T1 "Strategic Planning Team 3".

## Clients & requirements

| Req | Client | Ask | Outcome of good plan |
|---|---|---|---|
| R1 | C1 Hoshino Beverage | Launch canned craft latte "KURO Latte" | WON, paid |
| R2 | C1 Hoshino Beverage | Relaunch oat yogurt "OatVita" | WON, paid — **HOLDOUT** |
| R3 | C2 Sakura Mobility | Grow e-scooter subscription "Glide" | WON, paid |
| R4 | C2 Sakura Mobility | Awareness for compact EV "Hana EV" | WON, paid |
| R5 | C3 Aozora Financial | Downloads for first-investor app "Tsumiki" | WON, paid — **HOLDOUT** |
| R6 | C3 Aozora Financial | Account openings for SME bank "Aozora Biz" | WON, paid |

Each requirement has TWO presentations:
- **good**: junior draft (v1) + ace revision (v2) → client selected it, paid. The v1→v2 diff is the gold.
- **bad**: draft shipped without ace review (ace was on another account) → rejected/lost.

## The ace's hidden judgment (what extraction should find)

Ayaka Sato's revisions apply THREE consistent, never-written-down rules.
These are deliberately planted in every v1→v2 diff:

1. **Problem-first restructure** — juniors open with "The Big Idea". She reorders every deck to open
   with a quantified diagnosis of the client's business problem and a one-line problem statement.
   The idea survives, but demoted to a consequence of the diagnosis.
2. **Evidence discipline** — every claim gets a number (market size, benchmark, KPI target with a
   figure). Adjectives without evidence are deleted. Adds a "sources" block citing reference data.
3. **Target narrowing** — juniors target everyone ("all adults 20-49"). She cuts to ONE primary
   segment and explicitly logs which segments were dropped and why (a "Who we are NOT targeting" section).

Bad plans (rejected ones) violate all three: idea-first, adjective-heavy, catch-all targeting.
Client rejection feedback in `dataset.json` mirrors this ("generic", "no evidence", "who is this for?").

## Holdout protocol (validation)

R2 and R5 v2_final files live in `holdout/`, NOT in `docs/presentations/`, and are flagged
`"holdout": true` in dataset.json. Ingest their v1 drafts only. To score an extracted skill:
give the AI the v1 draft + the skill file, let it produce a revision, measure agreement with
the holdout file (structure order / numbers added / segments dropped).

## Graph mapping hints (matches PRODUCT_OVERVIEW §3)

- Person -[belongs_to]-> Team / Person -[did {version}]-> Presentation
- Client -[has]-> Requirement -[fulfilled_by]-> Presentation
- Presentation -[used]-> Strategy / -[referenced]-> ReferenceData / -[evaluated_as]-> Evaluation
- Client -[targets]-> Persona
- Keep full doc text OUT of nodes: store `doc_path` + summary only (paths are relative to this folder).
