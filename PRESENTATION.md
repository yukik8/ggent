# ggent — Presentation Draft (v0, Ken)

Working draft for the 3-min pitch + 90-sec demo video. Comment freely, this is a 叩き台.

## Core thesis (everything hangs on these 3 lines)

1. **Vector search finds what sounds similar. Real work connects what gets used together.**
   The graph stores company data as *work-based connections* — a market stat links to a
   pitch win not because the words match, but because the ace used it there.
2. **One pull drags up everything that actually mattered.** A new brief traverses the
   graph vine-style (芋蔓式): similar deals → the judgments that won them → the data
   that backed them.
3. **It doesn't just learn what to know — it learns how to look things up.**
   Every output is scored against the references it pulled (Prediction → brain-record →
   brain-learn). The *way of referencing* — the sense — becomes a company asset.

Killer line: *"A Company Brain that doesn't answer questions — it does the work, and
learns the ace's sense of how to work."*

## 90-second demo video — storyboard

| t | scene | screen | narration (EN) |
|---|---|---|---|
| 0–10 | Problem | pile of docs / dead meeting notes | "A company's best judgment lives in one ace's head. Documents record conclusions — never the *how*." |
| 10–22 | Input = traces | `data/` draft.md vs final.md side-by-side scroll | "So we don't ask her to explain. We mine the traces: 15 proposals, her revisions, the wins and losses." |
| 22–38 | Thesis 1: the graph | frontend GraphView — nodes lighting up along a traversal | "Vector search finds what sounds similar. Real work connects what gets used together. One pull on a new brief drags up every stat, deal and judgment that actually mattered." |
| 38–52 | Thesis 2: learning to reference | terminal: /ace-review writes a Prediction → /brain-record scores → confidence moves | "And every output is scored against the references it pulled. The brain doesn't just learn what to know — it learns how to look things up. That's what sense is." |
| 52–62 | Answer-key reveal | extracted Judgment vs `data/quirks.md` (hidden ground truth) side by side | "We planted her habits as a hidden answer key. The system found them — blind." |
| 62–80 | Payoff | unseen brief → PPT-style before/after comparison (highlights = where each judgment fired) | "A client it has never seen. Left: a generic agent. Right: the same agent with her sense." |
| 80–90 | Close | holdout validation score → logo | "Validated on held-out revisions she actually made. A Company Brain that doesn't answer questions — it does the work." |

Recording notes:
- Record every scene as backup BEFORE the live pitch (demo-death insurance).
- Scene 62–80 asset: `demo/output_comparison.html` (currently on `feature/mapping-ontology`;
  needs re-skinning to Sofia Reyes / quirks A+B / ref-XX citation style).
- Scene 52–62 is the emotional peak — hold the side-by-side for a full 6+ seconds.

## 3-minute pitch skeleton (EN, Ken speaks)

1. **Problem (30s)** — Tacit knowledge: the ace can't explain her own judgment; minutes
   store conclusions. KM and enterprise search both fail because the knowledge was never
   written anywhere.
2. **Insight (30s)** — Don't make experts explain. Mine the *diffs* between junior drafts
   and ace revisions, joined with outcome labels (win/loss/payment). Core thesis lines 1–3.
3. **Live demo / video (90s)** — storyboard above.
4. **Prior work + why us (30s)** — last week's solo prototype: a synthetic customer panel
   caught a strategy-level flaw and the agent rewrote its own strategy from the root
   (fail → conditional on round 2). Ken: inside Japan's largest ad agency — the diff data
   (proposal version histories, win/loss records) exists today, at scale.
5. **Business + global (30s)** — SaaS for agencies first, then any judgment-heavy industry
   (sales, legal, finance). Japan's apprenticeship-style OJT culture = the world's richest
   diff-data reserve. The judgment layer generalizes; the market is global.

## Expected Q&A (crib sheet)

- **vs RAG/Glean?** They retrieve what's written. The knowledge we target was never
  written. We reconstruct it from work traces, then validate it on holdout revisions.
- **Does the mined judgment really match the ace?** Holdout protocol: req-03/06/09 finals
  are hidden from the system; we measure agreement between predicted and actual revisions.
  Philosophy problem → engineering problem.
- **What if the ace is wrong?** We replicate, not exceed. Who to replicate is the
  customer's choice. (Sofia's one loss, req-07, was priced out — the data even shows that.)
- **Where does diff data come from in reality?** Proposal version histories, media-plan
  revisions, pitch win/loss records — standard artifacts in agencies (first-hand testimony).

## Asset checklist (Ken owns)

- [ ] Re-skin `demo/output_comparison.html` to Sofia Reyes + quirks A/B + (ref-XX) style
- [ ] Screen-record: GraphView traversal / skills terminal run / quirks reveal
- [ ] Narration record (Ken) + captions
- [ ] One-pager on phone for networking
