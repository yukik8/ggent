import "dotenv/config";
import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { runQuery } from "./db/memgraph";
import { vectorSearch } from "./db/weaviate";
import ingestRoutes from "./routes/ingest";

const app = new Hono();

app.route("/ingest", ingestRoutes);

// demo UI (self-contained, same-origin so /cypher needs no CORS)
const UI_PATH = new URL("../../ui/index.html", import.meta.url);
app.get("/ui", (c) => c.html(readFileSync(UI_PATH, "utf8")));

const COMPARE_PATH = new URL("../../ui/compare.html", import.meta.url);
app.get("/compare", (c) => c.html(readFileSync(COMPARE_PATH, "utf8")));
const SLIDES_PATH = new URL("../../ui/slides.html", import.meta.url);
app.get("/slides", (c) => c.html(readFileSync(SLIDES_PATH, "utf8")));
app.get("/demo/slides", (c) =>
  c.json(JSON.parse(readFileSync(new URL("../../demo/slides.json", import.meta.url), "utf8"))));
app.get("/demo/:side", (c) => {
  const side = c.req.param("side").replace(/[^a-z]/g, "");
  return c.text(readFileSync(new URL(`../../demo/${side}.md`, import.meta.url), "utf8"));
});

const CypherBody = z.object({
  query: z.string().min(1),
  params: z.record(z.any()).optional(),
});

app.post("/cypher", zValidator("json", CypherBody), async (c) => {
  const { query, params } = c.req.valid("json");
  const result = await runQuery(query, params);
  return c.json(result.records.map((r) => r.toObject()));
});

const VectorBody = z.object({
  type: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(10),
});

app.post("/vector-search", zValidator("json", VectorBody), async (c) => {
  const { type, query, limit } = c.req.valid("json");
  const results = await vectorSearch(type, query, limit);
  return c.json(results);
});

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[ggent] listening on http://localhost:${info.port}`);
});
