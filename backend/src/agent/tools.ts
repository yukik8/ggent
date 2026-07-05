import { z } from "zod";
import { tool, DynamicStructuredTool } from "@langchain/core/tools";
import { runQuery } from "../db/memgraph";
import { ensureCollection, insertObjects } from "../db/weaviate";
import { WEAVIATE_MIRROR_LABELS } from "./baseOntology";
import type { Ontology } from "./schemas";

function safeLabel(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "");
}
function safeRel(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "").toUpperCase();
}

export interface AgentContext {
  ontology: Ontology;
  ontologyChanged: boolean;
  nodeCounts: Record<string, number>;
  edgeCount: number;
  vectorized: Record<string, number>;
  errors: string[];
}

export function createContext(ontology: Ontology): AgentContext {
  return {
    ontology: JSON.parse(JSON.stringify(ontology)) as Ontology,
    ontologyChanged: false,
    nodeCounts: {},
    edgeCount: 0,
    vectorized: {},
    errors: [],
  };
}

function vectorizePropsFor(label: string, ontology: Ontology): string[] {
  const lbl = ontology.labels.find((l) => l.name === label);
  return lbl?.vectorizeProperties ?? [];
}

async function mirrorToWeaviate(
  label: string,
  row: Record<string, unknown>,
  ontology: Ontology,
  ctx: AgentContext,
): Promise<void> {
  if (!WEAVIATE_MIRROR_LABELS.has(label)) return;
  const vecProps = vectorizePropsFor(label, ontology);
  if (vecProps.length === 0) return;
  try {
    await ensureCollection(label);
    const text = vecProps
      .map((p) => String(row[p] ?? ""))
      .join("\n\n")
      .trim();
    await insertObjects(label, [
      { nodeId: String(row.id), label, text },
    ]);
    ctx.vectorized[label] = (ctx.vectorized[label] ?? 0) + 1;
  } catch (err) {
    ctx.errors.push(
      `mirrorToWeaviate(${label},${row.id}): ${(err as Error).message}`,
    );
  }
}

export function buildTools(ctx: AgentContext): DynamicStructuredTool[] {
  const createNode = tool(
    async (args): Promise<string> => {
      const lbl = safeLabel(args.label);
      if (!lbl) return `ERROR: invalid label "${args.label}"`;
      if (!args.id) return `ERROR: id is required`;
      const row: Record<string, unknown> = {
        id: args.id,
        title: args.title,
        date: args.date,
        ...args.properties,
      };
      try {
        await runQuery(
          `MERGE (n:${lbl} {id: $id}) SET n += $props`,
          { id: args.id, props: row },
        );
        await mirrorToWeaviate(args.label, row, ctx.ontology, ctx);
        ctx.nodeCounts[args.label] =
          (ctx.nodeCounts[args.label] ?? 0) + 1;
        return `created ${args.label} "${args.id}"`;
      } catch (err) {
        const msg = `${(err as Error).message}`;
        ctx.errors.push(msg);
        return `ERROR creating ${args.label} "${args.id}": ${msg}`;
      }
    },
    {
      name: "create_node",
      description:
        "Upsert a single node. Label must be a PascalCase label from the ontology. Always set id, title, date. Other label-specific props go in properties.",
      schema: z.object({
        label: z
          .string()
          .describe("PascalCase label name, e.g. Presentation"),
        id: z
          .string()
          .describe("Unique stable slug id, e.g. presentation/acme-final"),
        title: z
          .string()
          .describe("Short human-readable title"),
        date: z
          .string()
          .describe("ISO date YYYY-MM-DD"),
        properties: z
          .record(z.unknown())
          .optional()
          .default({})
          .describe("Other label-specific properties as key:value pairs"),
      }),
    },
  );

  const createEdge = tool(
    async (args): Promise<string> => {
      const fLbl = safeLabel(args.fromLabel);
      const tLbl = safeLabel(args.toLabel);
      const rel = safeRel(args.type);
      if (!fLbl || !tLbl || !rel)
        return `ERROR: invalid label/edge names`;
      try {
        await runQuery(
          `MATCH (a:${fLbl} {id: $fromId})
           MATCH (b:${tLbl} {id: $toId})
           MERGE (a)-[r:${rel}]->(b)
           SET r += $props`,
          {
            fromId: args.fromId,
            toId: args.toId,
            props: args.properties ?? {},
          },
        );
        ctx.edgeCount += 1;
        return `linked (${args.fromLabel}:${args.fromId})-[:${args.type}]->(${args.toLabel}:${args.toId})`;
      } catch (err) {
        const msg = `${(err as Error).message}`;
        ctx.errors.push(msg);
        return `ERROR creating edge ${args.type}: ${msg}`;
      }
    },
    {
      name: "create_edge",
      description:
        "Upsert a single edge linking two existing nodes. Nodes must already exist. Edge type is UPPER_SNAKE_CASE.",
      schema: z.object({
        fromLabel: z.string().describe("PascalCase label of the source node"),
        fromId: z.string().describe("id of the source node"),
        type: z.string().describe("Edge type, e.g. RESULTED_IN"),
        toLabel: z.string().describe("PascalCase label of the target node"),
        toId: z.string().describe("id of the target node"),
        properties: z
          .record(z.unknown())
          .optional()
          .default({})
          .describe("Optional edge properties"),
      }),
    },
  );

  const addLabel = tool(
    async (args): Promise<string> => {
      const lbl = safeLabel(args.name);
      if (!lbl) return `ERROR: invalid label name`;
      try {
        await runQuery(
          `CREATE CONSTRAINT ON (n:${lbl}) ASSERT n.id IS UNIQUE;`,
        );
      } catch (err) {
        const msg = (err as Error).message;
        if (!/already exists|already defined|unique constraint/i.test(msg)) {
          ctx.errors.push(`addLabel ${lbl}: ${msg}`);
        }
      }
      ctx.ontology.labels.push({
        name: args.name,
        description: args.description,
        properties: [
          {
            name: "id",
            type: "string",
            description: "Unique slug id.",
            vectorize: false,
          },
          {
            name: "title",
            type: "string",
            description: "Short title.",
            vectorize: false,
          },
          {
            name: "date",
            type: "datetime",
            description: "ISO date.",
            vectorize: false,
          },
        ],
        vectorizeProperties: args.vectorizeProperties ?? [],
      });
      ctx.ontologyChanged = true;
      return `added label "${args.name}" to ontology`;
    },
    {
      name: "add_label",
      description:
        "Add a new label to the ontology. Use only when documents reveal a genuinely new entity type. New label always gets id, title, date as base properties.",
      schema: z.object({
        name: z
          .string()
          .describe("PascalCase label name, e.g. CampaignBrief"),
        description: z
          .string()
          .describe("What this label represents"),
        vectorizeProperties: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Property names for Weaviate embedding"),
      }),
    },
  );

  const finish = tool(
    async (args): Promise<string> => {
      return `Summary: ${args.message}. All done — stop calling tools now.`;
    },
    {
      name: "finish",
      description:
        "Call this ONCE when you have created all nodes and edges. Provide a short one-sentence summary of what was ingested.",
      schema: z.object({
        message: z
          .string()
          .describe("A one-sentence summary of what was built"),
      }),
    },
  );

  return [createNode, createEdge, addLabel, finish];
}