#!/usr/bin/env node
// Seed loader — writes dummy data into Memgraph (via backend /cypher) and
// mirrors text-bearing nodes into Weaviate (dual-write rule, agent/SCHEMA.md).
// Usage:  node seed/load.mjs           # requires backend on :3001, weaviate on :8080
//         node seed/load.mjs --wipe    # DETACH DELETE everything first (seed data only tool!)
// Idempotent: all graph writes are MERGE; Weaviate objects use deterministic UUIDs.

import { createHash } from "node:crypto";

const API = process.env.GGENT_API ?? "http://localhost:3001";
const WEAVIATE = process.env.WEAVIATE_URL ?? "http://localhost:8080";

// ---------------------------------------------------------------- seed data

const clients = [
  { id: "cli-aeonmart", title: "AeonMart", industry: "retail" },
  { id: "cli-hoshino-bev", title: "Hoshino Beverage", industry: "beverage" },
  { id: "cli-sakura-cosme", title: "Sakura Cosmetics", industry: "cosmetics" },
  { id: "cli-tokai-auto", title: "Tokai Motors", industry: "automotive" },
  { id: "cli-fittech", title: "FitTech (fitness app)", industry: "app" },
  { id: "cli-yamato-fin", title: "Yamato Financial", industry: "finance" },
];

const attributes = [
  { id: "attr-seg-f50-affluent", kind: "segment", value: "women 50s, household income 8M+" },
  { id: "attr-seg-f20-30-sns", kind: "segment", value: "women 20-30, SNS-native" },
  { id: "attr-seg-m30-40-family", kind: "segment", value: "men 30-40 with kids" },
  { id: "attr-seg-broad-f2040", kind: "segment", value: "all women 20-40" },
  { id: "attr-goal-awareness", kind: "goal", value: "brand awareness" },
  { id: "attr-goal-sales", kind: "goal", value: "sales promotion" },
  { id: "attr-goal-launch", kind: "goal", value: "new product launch" },
  { id: "attr-del-tvcm", kind: "deliverable", value: "TV commercial plan" },
  { id: "attr-del-digital", kind: "deliverable", value: "digital video campaign" },
  { id: "attr-ind-retail", kind: "industry", value: "retail" },
  { id: "attr-ind-beverage", kind: "industry", value: "beverage" },
  { id: "attr-ind-cosmetics", kind: "industry", value: "cosmetics" },
  { id: "attr-budget-large", kind: "budget", value: "large (TV-capable)" },
  { id: "attr-budget-mid", kind: "budget", value: "mid (digital-first)" },
];

const dataNodes = [
  { id: "data-survey-f50-media", title: "F50 media habits survey (Mar 2026)", summary: "n=500. Women 50s: TV 58% daily, TikTok 41% via family, trust in expert endorsement high.", source: "in-house panel" },
  { id: "data-retail-price-sens", title: "Retail shopper price sensitivity study", summary: "n=1200. Retail shoppers rank price justification #1 decision factor; ROI framing lifts intent +18%.", source: "syndicated" },
  { id: "data-genz-sns-trends", title: "Gen-Z SNS trend tracker (Q1 2026)", summary: "Short-form video completion peaks at 12s hooks; creator collab outperforms brand-voice 2.3x.", source: "in-house social listening" },
  { id: "data-family-auto", title: "Family car buyer journey study", summary: "n=800. Fathers 30-40: safety narrative beats spec sheets; dealership visit driven by spouse approval.", source: "syndicated" },
];

// requirements: attribute overlap is deliberate (see PATTERNS.md)
const requirements = [
  { id: "req-aeonmart-2026-01", title: "AeonMart PB awareness (Jan 2026)", client: "cli-aeonmart",
    raw: "AeonMart wants awareness for its premium private brand among affluent women in their 50s. TV budget available.",
    attrs: ["attr-seg-f50-affluent", "attr-goal-awareness", "attr-del-tvcm", "attr-ind-retail", "attr-budget-large"] },
  { id: "req-aeonmart-2026-05", title: "AeonMart seasonal sales push (May 2026)", client: "cli-aeonmart",
    raw: "Summer sales promotion for AeonMart fresh food line, family shoppers, digital-first.",
    attrs: ["attr-seg-m30-40-family", "attr-goal-sales", "attr-del-digital", "attr-ind-retail", "attr-budget-mid"] },
  { id: "req-hoshino-2026-02", title: "Hoshino sugar-free tea launch (Feb 2026)", client: "cli-hoshino-bev",
    raw: "Launch campaign for a new sugar-free tea targeting women in their 50s. TV commercial requested.",
    attrs: ["attr-seg-f50-affluent", "attr-goal-launch", "attr-del-tvcm", "attr-ind-beverage", "attr-budget-large"] },
  { id: "req-sakura-2026-03", title: "Sakura serum digital campaign (Mar 2026)", client: "cli-sakura-cosme",
    raw: "Digital video campaign for a premium serum, SNS-native women 20-30.",
    attrs: ["attr-seg-f20-30-sns", "attr-goal-awareness", "attr-del-digital", "attr-ind-cosmetics", "attr-budget-mid"] },
  { id: "req-sakura-2026-06", title: "Sakura summer line (Jun 2026)", client: "cli-sakura-cosme",
    raw: "Summer skincare line launch, women 20-30, digital video.",
    attrs: ["attr-seg-f20-30-sns", "attr-goal-launch", "attr-del-digital", "attr-ind-cosmetics", "attr-budget-mid"] },
  { id: "req-tokai-2026-02", title: "Tokai family SUV campaign (Feb 2026)", client: "cli-tokai-auto",
    raw: "TV commercial plan for the new family SUV, fathers in their 30s-40s.",
    attrs: ["attr-seg-m30-40-family", "attr-goal-launch", "attr-del-tvcm", "attr-budget-large"] },
  { id: "req-fittech-2026-04", title: "FitTech spring acquisition (Apr 2026)", client: "cli-fittech",
    raw: "User acquisition video campaign, broad target of all women 20-40.",
    attrs: ["attr-seg-broad-f2040", "attr-goal-sales", "attr-del-digital", "attr-budget-mid"] },
  { id: "req-yamato-2026-04", title: "Yamato NISA awareness (Apr 2026)", client: "cli-yamato-fin",
    raw: "Awareness campaign for NISA accounts, men 30-40 with families.",
    attrs: ["attr-seg-m30-40-family", "attr-goal-awareness", "attr-del-digital", "attr-budget-mid"] },
];

// presentations: REVISED_TO pairs embody P1 (insight-first edit).
const presentations = [
  // AeonMart Jan — pair + success (P1, P2, P4)
  { id: "pres-aeonmart-2026-01-draft", req: "req-aeonmart-2026-01", client: "cli-aeonmart", version: "draft",
    title: "AeonMart PB — first draft",
    summary: "Opens with product lineup and PB quality specs. Target described broadly. ROI table in appendix.",
    revisedTo: "pres-aeonmart-2026-01-final" },
  { id: "pres-aeonmart-2026-01-final", req: "req-aeonmart-2026-01", client: "cli-aeonmart", version: "final",
    title: "AeonMart PB — final (ace revision)",
    summary: "Slide 1 states the target insight: affluent F50 buy PB as self-reward, not thrift. ROI justification moved to slide 3. Expert-endorsement TV creative.",
    backedBy: ["data-survey-f50-media", "data-retail-price-sens"] },
  // AeonMart May — final only, success (P2, P4)
  { id: "pres-aeonmart-2026-05-final", req: "req-aeonmart-2026-05", client: "cli-aeonmart", version: "final",
    title: "AeonMart summer push — final",
    summary: "Slide 1 insight: family shoppers plan weekend baskets Wednesday night. Price-per-meal ROI framing on slide 2. Digital video flight.",
    backedBy: ["data-retail-price-sens"] },
  // Hoshino — pair + success (P1, P4)
  { id: "pres-hoshino-2026-02-draft", req: "req-hoshino-2026-02", client: "cli-hoshino-bev", version: "draft",
    title: "Hoshino tea — first draft",
    summary: "Leads with product features: zero sugar, new brewing tech, package design options.",
    revisedTo: "pres-hoshino-2026-02-final" },
  { id: "pres-hoshino-2026-02-final", req: "req-hoshino-2026-02", client: "cli-hoshino-bev", version: "final",
    title: "Hoshino tea — final (ace revision)",
    summary: "Slide 1 insight: F50 choose unsweetened tea for health rituals shared with spouse. One persona, one habit moment. TV creative anchored on the ritual.",
    backedBy: ["data-survey-f50-media"] },
  // Sakura Mar — final only, success (P4)
  { id: "pres-sakura-2026-03-final", req: "req-sakura-2026-03", client: "cli-sakura-cosme", version: "final",
    title: "Sakura serum — final",
    summary: "Slide 1 insight: SNS-native 20s treat serum reviews as social currency. Creator-collab short-form with 12s hook.",
    backedBy: ["data-genz-sns-trends"] },
  // Sakura Jun — insight-first but FAILED for content reason (contradiction case for P1)
  { id: "pres-sakura-2026-06-final", req: "req-sakura-2026-06", client: "cli-sakura-cosme", version: "final",
    title: "Sakura summer line — final",
    summary: "Slide 1 insight: summer skincare is about repair after sun. Creator collab plan.",
    backedBy: ["data-genz-sns-trends"] },
  // Tokai — pair, but lost on price (attribution trap)
  { id: "pres-tokai-2026-02-draft", req: "req-tokai-2026-02", client: "cli-tokai-auto", version: "draft",
    title: "Tokai SUV — first draft",
    summary: "Spec-sheet led: engine, safety ratings list, price positioning.",
    revisedTo: "pres-tokai-2026-02-final" },
  { id: "pres-tokai-2026-02-final", req: "req-tokai-2026-02", client: "cli-tokai-auto", version: "final",
    title: "Tokai SUV — final (ace revision)",
    summary: "Slide 1 insight: fathers buy the family's approval, not the car. Safety-narrative TV creative around a weekend trip.",
    backedBy: ["data-family-auto"] },
  // FitTech — broad target, no data backing, FAIL (P3, P4)
  { id: "pres-fittech-2026-04-final", req: "req-fittech-2026-04", client: "cli-fittech", version: "final",
    title: "FitTech acquisition — final",
    summary: "Broad appeal montage across all women 20-40, feature-led app walkthrough, no research citations." },
  // Yamato — lost to incumbent (attribution trap)
  { id: "pres-yamato-2026-04-final", req: "req-yamato-2026-04", client: "cli-yamato-fin", version: "final",
    title: "Yamato NISA — final",
    summary: "Slide 1 insight: fathers see investing as family duty. Explainer video series.",
    backedBy: ["data-family-auto"] },
];

const outcomes = [
  { id: "out-aeonmart-2026-01", pres: "pres-aeonmart-2026-01-final", result: "success",
    title: "AeonMart PB pitch result", created: "2026-02-10",
    reason: "Client praised leading with the self-reward insight and the early ROI justification." },
  { id: "out-aeonmart-2026-05", pres: "pres-aeonmart-2026-05-final", result: "success",
    title: "AeonMart summer pitch result", created: "2026-05-28",
    reason: "Price-per-meal framing matched the buying committee's internal metric." },
  { id: "out-hoshino-2026-02", pres: "pres-hoshino-2026-02-final", result: "success",
    title: "Hoshino tea pitch result", created: "2026-03-05",
    reason: "The single-persona ritual story differentiated us from two competitors who led with product specs." },
  { id: "out-sakura-2026-03", pres: "pres-sakura-2026-03-final", result: "success",
    title: "Sakura serum pitch result", created: "2026-04-01",
    reason: "Creator-collab plan grounded in the SNS trend data won over the CMO." },
  { id: "out-sakura-2026-06", pres: "pres-sakura-2026-06-final", result: "fail",
    title: "Sakura summer pitch result", created: "2026-06-20",
    reason: "Our repair-after-sun insight contradicted the client's own consumer research (prevention mindset)." },
  { id: "out-tokai-2026-02", pres: "pres-tokai-2026-02-final", result: "fail",
    title: "Tokai SUV pitch result", created: "2026-03-15",
    reason: "Lost on price after the client's budget was cut mid-competition." }, // attribution trap
  { id: "out-fittech-2026-04", pres: "pres-fittech-2026-04-final", result: "fail",
    title: "FitTech pitch result", created: "2026-05-02",
    reason: "Client said the target felt generic and the plan cited no research." },
  { id: "out-yamato-2026-04", pres: "pres-yamato-2026-04-final", result: "fail",
    title: "Yamato NISA pitch result", created: "2026-05-10",
    reason: "Incumbent agency relationship; brief was effectively decided beforehand." }, // attribution trap
];

// ---------------------------------------------------------------- helpers

async function cypher(query, params = {}) {
  const res = await fetch(`${API}/cypher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) throw new Error(`/cypher ${res.status}: ${await res.text()}`);
  return res.json();
}

function uuidFromGid(gid) {
  const h = createHash("sha1").update(`ggent:${gid}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function weaviateUpsert(cls, gid, text) {
  const id = uuidFromGid(gid);
  const body = JSON.stringify({ class: cls, id, properties: { gid, text } });
  let res = await fetch(`${WEAVIATE}/v1/objects`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  if (res.status === 422) { // already exists → replace
    res = await fetch(`${WEAVIATE}/v1/objects/${cls}/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body,
    });
  }
  if (!res.ok) throw new Error(`weaviate ${cls}/${gid} ${res.status}: ${await res.text()}`);
}

// ---------------------------------------------------------------- load

const wipe = process.argv.includes("--wipe");
if (wipe) {
  console.log("wiping graph…");
  await cypher("MATCH (n) DETACH DELETE n");
}

let vectorOk = 0, vectorFail = 0;
const mirror = async (cls, gid, text) => {
  try { await weaviateUpsert(cls, gid, text); vectorOk++; }
  catch (e) { vectorFail++; if (vectorFail === 1) console.warn(`  (weaviate mirror failing: ${e.message})`); }
};

console.log("clients…");
for (const c of clients)
  await cypher("MERGE (n:Client {id: $id}) SET n.title = $title, n.industry = $industry, n.created = '2026-01-01'", c);

console.log("attributes…");
for (const a of attributes)
  await cypher("MERGE (n:Attribute {id: $id}) SET n.title = $value, n.kind = $kind, n.value = $value, n.created = '2026-01-01'", a);

console.log("data…");
for (const d of dataNodes) {
  await cypher("MERGE (n:Data {id: $id}) SET n.title = $title, n.summary = $summary, n.source = $source, n.created = '2026-03-01'", d);
  await mirror("Data", d.id, `${d.title}. ${d.summary}`);
}

console.log("requirements…");
for (const r of requirements) {
  await cypher("MERGE (n:Requirement {id: $id}) SET n.title = $title, n.raw = $raw, n.created = '2026-01-15'", r);
  await cypher("MATCH (r:Requirement {id: $id}) MATCH (c:Client {id: $client}) MERGE (r)-[:FROM_CLIENT]->(c)", r);
  for (const attr of r.attrs)
    await cypher("MATCH (r:Requirement {id: $id}) MATCH (a:Attribute {id: $attr}) MERGE (r)-[:HAS_ATTRIBUTE]->(a)", { id: r.id, attr });
  await mirror("Requirement", r.id, r.raw);
}

console.log("presentations…");
for (const p of presentations) {
  await cypher("MERGE (n:Presentation {id: $id}) SET n.title = $title, n.summary = $summary, n.version = $version, n.created = '2026-02-01'", p);
  await cypher("MATCH (p:Presentation {id: $id}) MATCH (r:Requirement {id: $req}) MERGE (r)-[:ANSWERED_BY]->(p)", p);
  await cypher("MATCH (p:Presentation {id: $id}) MATCH (c:Client {id: $client}) MERGE (p)-[:FOR_CLIENT]->(c)", p);
  for (const d of p.backedBy ?? [])
    await cypher("MATCH (p:Presentation {id: $id}) MATCH (d:Data {id: $d}) MERGE (p)-[:BACKED_BY]->(d)", { id: p.id, d });
  if (p.revisedTo)
    await cypher("MATCH (a:Presentation {id: $id}) MATCH (b:Presentation {id: $to}) MERGE (a)-[:REVISED_TO]->(b)", { id: p.id, to: p.revisedTo });
  await mirror("Presentation", p.id, `${p.title}. ${p.summary}`);
}

console.log("outcomes…");
for (const o of outcomes) {
  await cypher("MERGE (n:Outcome {id: $id}) SET n.title = $title, n.result = $result, n.reason = $reason, n.created = $created", o);
  await cypher("MATCH (o:Outcome {id: $id}) MATCH (p:Presentation {id: $pres}) MERGE (p)-[:RESULTED_IN]->(o)", o);
}

const counts = await cypher("MATCH (n) RETURN labels(n)[0] AS label, count(*) AS c ORDER BY label");
console.log("\nseeded:", JSON.stringify(counts));
console.log(`weaviate mirror: ${vectorOk} ok, ${vectorFail} failed${vectorFail ? " (set OPENAI_API_KEY in .env and recreate containers)" : ""}`);
