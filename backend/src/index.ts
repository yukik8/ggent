import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { runQuery } from "./db/memgraph";
import { vectorSearch } from "./db/weaviate";
import ingestRoutes from "./routes/ingest";

const app = new Hono();

app.use("/*", cors());

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

app.get("/ontology/status", async (c) => {
	try {
		const oRes = await runQuery(
			"MATCH (o:OntologyVersion) RETURN o ORDER BY o.generatedAt DESC LIMIT 1",
		);
		if (oRes.records.length === 0) {
			return c.json({ exists: false });
		}
		const obj = oRes.records[0].toObject();
		const node = (obj.o ?? obj) as Record<string, unknown>;
		const props = (node.properties ?? node) as Record<string, unknown>;
		const version = (props.version as string) ?? "";

		const [lRes, eRes] = await Promise.all([
			runQuery(
				`MATCH (:OntologyVersion {version: "${version}"})-[:DEFINES_LABEL]->(l:Label) RETURN count(l) AS c`,
			),
			runQuery(
				`MATCH (:OntologyVersion {version: "${version}"})-[:DEFINES_EDGE]->(e:EdgeType) RETURN count(e) AS c`,
			),
		]);

		const toNum = (v: unknown) =>
			typeof v === "number" ? v : (v as { toNumber?: () => number })?.toNumber?.() ?? 0;

		return c.json({
			exists: true,
			version,
			description: props.description as string,
			questions: props.questions as string[],
			generatedAt: props.generatedAt as string,
			labelCount: toNum(lRes.records[0]?.get("c")),
			edgeCount: toNum(eRes.records[0]?.get("c")),
		});
	} catch {
		return c.json({ exists: false }, 200);
	}
});

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[ggent] listening on http://localhost:${info.port}`);
});
