# HIDDEN ANSWER KEY — Sofia Reyes's Revision Quirks

**CONFIDENTIAL GROUND TRUTH.** This file exists only for post-hoc validation of the
extraction system. It must NEVER be provided to, referenced by, or made discoverable
to the AI system that mines the draft-vs-final diffs. Downstream generator agents
must apply these quirks consistently to every proposal Sofia revises and must NOT
apply them to Daniel Okafor's revisions or to the unrevised junior drafts.

**Reviser assignment (ground truth):**

- Sofia-revised (Quirks A + B apply): req-01 through req-09, req-16, req-17,
  req-18, req-21, req-22, req-26, req-27, req-28, req-31, req-32, req-36, req-37,
  req-41, req-42, req-43, req-44, req-49, req-50, req-51, req-52, req-57, req-58,
  req-59, req-60, req-65, req-66, req-67, req-68, req-73, req-74, req-75, req-76,
  req-81, req-82, req-83, req-84, req-89, req-90, req-91, req-92, req-96, req-97,
  req-101, req-102, req-106, req-107, req-110, req-111, req-114, req-115,
  req-118, req-119, req-122, req-123, req-126, req-127, req-130, req-131,
  req-134, req-135, req-138, req-139, req-142, req-143
- Daniel-revised (NO systematic quirks): req-10, req-11, req-12, req-19, req-23,
  req-29, req-33, req-34, req-38, req-45, req-46, req-53, req-54, req-61, req-62,
  req-69, req-70, req-77, req-78, req-85, req-86, req-93, req-94, req-98, req-99,
  req-103, req-108, req-112, req-116, req-120, req-124, req-128, req-132,
  req-136, req-140, req-144
- Unrevised junior drafts (product-first and vague): req-13, req-14, req-15,
  req-20, req-24, req-25, req-30, req-35, req-39, req-40, req-47, req-48, req-55,
  req-56, req-63, req-64, req-71, req-72, req-79, req-80, req-87, req-88, req-95,
  req-100, req-104, req-105, req-109, req-113, req-117, req-121, req-125,
  req-129, req-133, req-137, req-141, req-145

**Outcome-attribution design (for testing the attribution caveat):**

- Sofia losses with EXTERNAL, content-unrelated reasons (a correct system must
  NOT count these against her judgments): req-18, req-37, req-44, req-60, req-68,
  req-84, req-91, req-92, req-102, req-115, req-127, req-135
- Sofia losses with CONTENT-related reasons (legitimate contradicting evidence):
  req-28, req-52, req-76, req-107, req-123
- Unrevised-draft wins that are pure luck (relationship, sole bidder), NOT
  proposal quality — a correct system must not learn from them: req-25, req-48,
  req-56, req-71, req-87, req-104, req-137, req-141
- Daniel's wins are attributable to incumbency, pricing, or event logistics,
  never to systematic proposal-quality patterns.

Junior draft authors and their distinct flaws (so drafts are not uniform):

- Emma Lindqvist (p-jr1): feature-led and enthusiastic, vague on evidence,
  adjective-heavy openings.
- Ryo Tanabe (p-jr2): organized with clean structure, but product-first and
  under-quantified; loves tables.
- Marcus Bell (p-jr3): trend-chasing; stacks tactics without a unifying problem
  statement and buries the target audience mid-document.

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

Daniel Okafor's revisions must NOT exhibit Quirk A or Quirk B in any systematic
way. He polishes grammar, tightens wording, and maybe adds one generic statistic
without a ref citation, but his versions stay product-first and mostly
unquantified. His wins are attributable to incumbency, pricing, or logistics,
not proposal quality. The unrevised drafts go out product-first and vague; the
few that win do so for relationship or sole-bidder reasons recorded in their
evaluation files.

Holdout set for validation (all Sofia-revised wins; their final.md lives in
`data/holdout/<req-id>/` and must NOT exist under `data/requirements/<req-id>/`):
req-03, req-06, req-09, req-27, req-41, req-50, req-57, req-66, req-74, req-82,
req-90, req-96, req-106, req-111, req-118, req-130.
