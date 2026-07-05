import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { runQuery } from "./db/memgraph";
import { vectorSearch } from "./db/weaviate";
import ingestRoutes from "./routes/ingest";

const app = new Hono();

app.route("/ingest", ingestRoutes);

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
