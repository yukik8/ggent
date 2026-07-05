# HIDDEN ANSWER KEY — Sofia Reyes's Revision Quirks

**CONFIDENTIAL GROUND TRUTH.** This file exists only for post-hoc validation of the
extraction system. It must NEVER be provided to, referenced by, or made discoverable
to the AI system that mines the draft-vs-final diffs. Downstream generator agents
must apply these quirks consistently to every proposal Sofia revises
(req-01 through req-09) and must NOT apply them to Daniel Okafor's revisions
(req-10 through req-12) or to the unrevised junior drafts (req-13 through req-15).

---

## QUIRK A — "Problem-first restructure"

### The rule
Junior drafts always open with the product and its features ("Introducing X, which
does A, B, and C..."). Sofia always rewrites the opening so the FIRST thing the
client reads is THEIR OWN BUSINESS PROBLEM, stated plainly and specifically
(declining category share, aging customer base, low repeat rate, high first-order
churn, empty shoulder-season hotel rooms, long sales cycles, etc.). She then
reorders the body so every tactic section explicitly maps back to that named
problem with connective phrasing ("Because the core problem is X, this tactic
does Y"). The proposal reads as problem → diagnosis → solution, never
product → features → audience.

### Concrete before/after example (style reference, req-01 flavor)

**BEFORE (junior draft opening):**
> Introducing Sunbrook Crisps Bold Batch, an exciting new spicy flavor line.
> Bold Batch comes in three heat levels, uses real chili blends, and features
> eye-catching new packaging that will stand out on shelf. Our campaign will
> bring this bold new product to young snack lovers everywhere.

**AFTER (Sofia's final opening):**
> Sunbrook has a recognition problem, not a product problem. Only 27% of snack
> buyers aged 18-34 can name a preferred mid-market crisp brand unprompted, and
> private label has taken five share points from brands like Sunbrook since 2021
> (ref-01). Bold Batch is our answer to that specific problem: a launch built to
> make Sunbrook the mid-market crisp young buyers CAN name. Every tactic below
> is selected for its ability to move unaided recall, not just trial.

Note the structural signature: (1) problem stated in the first sentence,
(2) product introduced only as the answer to the problem, (3) an explicit promise
that tactics map back to the problem, which the revised body then delivers on
section by section.

---

## QUIRK B — "Quantify every claim"

### The rule
Sofia never lets a key claim stand without a number. Every market claim, audience
claim, and channel-choice justification in her final version carries a specific
figure pulled VERBATIM from the reference stubs in `world.json`, cited inline in
the form `(ref-03)`. Junior drafts make the same claims but vaguely
("many young consumers...", "social media is very effective...",
"the market is growing fast..."). Sofia does not invent numbers, she only uses
stats that exist in ref-01 through ref-08, quoted exactly.

### Concrete before/after example (style reference, req-03 flavor)

**BEFORE (junior draft claim):**
> Many young commuters are interested in e-bikes but find them expensive.
> Social media is a great way to reach them, and short videos perform
> especially well with this audience.

**AFTER (Sofia's final claim):**
> 68% of urban commuters aged 25-40 say upfront price is the main barrier to
> buying an e-bike (ref-03), which is exactly the barrier the $89/month
> subscription bundle removes. We reach them with short-form video because 71%
> of Gen-Z respondents discover new brands primarily through short-form video
> (ref-07), and Reels inventory is efficient at a $9.40 average CPM (ref-06).

Note the signature: same underlying claims as the draft, but each one now carries
an exact stat + inline `(ref-XX)` citation, and each number is tied to a specific
decision in the plan (price point, channel choice).

---

## What Sofia deliberately does NOT change

To keep the draft-vs-final diffs clean and attributable to the two quirks above,
Sofia leaves the following untouched in every revision:

1. **Budget totals** — the total budgetUSD and its top-level allocation stay
   exactly as the junior wrote them.
2. **The client's chosen channels** — she never adds or removes channels; she only
   adds quantified justification for the channels already in the draft.
3. **Overall campaign concept** — the creative idea, campaign name, and big
   activation the junior proposed survive intact. She reframes and evidences;
   she does not re-ideate.
4. **Timeline and price point** — dates and pricing carry over verbatim from the
   requirement and the draft.

Daniel Okafor's revisions (req-10, req-11, req-12) must NOT exhibit Quirk A or
Quirk B in any systematic way. He polishes grammar, tightens wording, and maybe
adds one generic statistic without a ref citation, but his versions stay
product-first and mostly unquantified. His single win (req-12) is attributable
to an incumbent relationship, not proposal quality. The unrevised drafts
(req-13, req-14, req-15) go out product-first and vague, and all lose.

Holdout set for validation: req-03, req-06, req-09 (all Sofia-revised wins).
