# Seed data — planted patterns

The dummy data is NOT random. These regularities are deliberately planted so
that /brain-learn can "discover" them and /ace-review can cite them.
When extending the dataset (more volume), preserve these invariants.

## Planted winning patterns (brain-learn should find these)

- **P1 — insight-first wins (global)**: final decks whose summary leads with
  a target insight succeed; drafts lead with product features and get revised.
  Evidence: every REVISED_TO pair embodies this edit.
- **P2 — retail needs ROI early (scope: industry:retail)**: retail-client
  decks with price/ROI justification in the first 3 slides succeed; the one
  without it failed with reason "no price justification".
- **P3 — broad targeting loses (global anti-pattern)**: deals whose segment
  attribute is broad ("all women 20-40") fail with reason "target felt
  generic"; narrow personas succeed.
- **P4 — survey-backed decks win (global, weak)**: successful presentations
  are BACKED_BY at least one Data node; several fails have no BACKED_BY edge.

## Attribution traps (brain-learn must NOT learn from these)

- `out-tokai-2026-02`: fail, reason "lost on price after client budget cut"
  → unrelated to deck content.
- `out-yamato-2026-04`: fail, reason "incumbent agency relationship"
  → unrelated to deck content.

## Contradiction case (confidence must drop when processed)

- `out-sakura-2026-06`: an insight-first deck that FAILED with a
  content-related reason ("insight contradicted client's own research")
  → contradicts P1 once, so P1's confidence takes a -0.2 hit while still
  surviving on net support.

## Attribute reuse rule

Requirements share attributes on purpose. `attr-seg-f50-affluent`,
`attr-goal-awareness`, `attr-ind-retail` each appear on 3+ requirements —
that overlap is what makes the red-branch precedent query return rows.

## What is NOT seeded

`Judgment` and `Prediction` nodes are never seeded — they must be produced
by /brain-learn and /ace-review at runtime. Seeding them would fake the demo.
