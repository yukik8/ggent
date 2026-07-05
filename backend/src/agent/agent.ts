import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { getDeepSeek } from "./deepseek";
import { buildTools, createContext, type AgentContext } from "./tools";
import { BASE_ONTOLOGY } from "./baseOntology";
import { applyOntologyToMemgraph } from "../services/ontology";
import type { Ontology } from "./schemas";

const MAX_ITERATIONS = 60;

function truncate(text: string, max = 10000): string {
  return text.length > max ? `${text.slice(0, max)}\n[...truncated...]` : text;
}

function fileContext(
  fileTexts: { name: string; text: string }[],
): string {
  if (fileTexts.length === 0)
    return "(No files were uploaded. You must SYNTHESIZE a small seed dataset instead.)";
  return fileTexts
    .map(
      (f, i) =>
        `--- FILE ${i + 1}/${fileTexts.length}: ${f.name} ---\n${truncate(
          f.text,
        )}`,
    )
    .join("\n\n");
}

function ontologySummary(o: Ontology): string {
  const labels = o.labels
    .map(
      (l) =>
        `- ${l.name}: ${l.description} | props: ${l.properties
          .map((p) => `${p.name}:${p.type}`)
          .join(", ")} | vectorize: [${l.vectorizeProperties.join(", ")}]`,
    )
    .join("\n");
  const edges = o.edges
    .map((e) => `- (${e.from})-[:${e.type}]->(${e.to})`)
    .join("\n");
  return `LABELS:\n${labels}\n\nEDGES:\n${edges}`;
}

function buildSystemPrompt(
  ontology: Ontology,
  competenceQuestions: string[],
  mode: "synth" | "extract",
): string {
  const common = `You are an autonomous graph-builder agent for a Memgraph property graph + Weaviate vector store.

You have these TOOLS available:
- create_node(label, id, title, date, properties) — upsert a single node. ALWAYS set id, title, date. Put other label-specific props in the properties object.
- create_edge(fromLabel, fromId, type, toLabel, toId, properties?) — link two nodes (create them first). Edge types are UPPER_SNAKE_CASE; only use types from the ontology or ones you add via add_label.
- add_label(name, description, vectorizeProperties) — extend the ontology with a NEW label. Use sparingly; only when documents demand a genuinely new entity type.
- finish() — call ONCE when done, then write a one-line summary and stop.

RULES:
- Create nodes BEFORE edges that reference them.
- Use stable slug ids (lowercase, hyphens, slashes ok), e.g. "presentation/acme-final".
- ALWAYS include id, title, date on every node (date = ISO YYYY-MM-DD).
- For labels flagged with vectorizeProperties, populate those text fields richly — they will be embedded into Weaviate.
- Keep text fields concise: 1-3 sentences. Do NOT generate long prose.
- Call finish() exactly once when finished.`;

  if (mode === "synth") {
    return `${common}

TASK: SYNTHESIZE a small but varied SEED DATASET (no files were uploaded).

Competence questions the data must let us answer:
${competenceQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Ontology:
${ontologySummary(ontology)}

Build a dataset with EXACTLY these counts (no more, no less):
- 3 Client nodes
- 3 Requirement nodes (one per client)
- 6 Presentation nodes (2 per client: one draft, one final)
- 6 Outcome nodes (one per presentation; mix success and fail)
- 6 Data nodes (1 per presentation)
- 3 Judgment nodes (learned rules with confidence 0-1, status="active")

Edges you must create:
- (Requirement)-[:ANSWERED_BY]->(Presentation)
- (Requirement)-[:FOR_CLIENT]->(Client)
- (Presentation)-[:FOR_CLIENT]->(Client)
- (Presentation{stage:"draft"})-[:REVISED_TO]->(Presentation{stage:"final"})
- (Presentation)-[:BACKED_BY]->(Data)
- (Presentation)-[:RESULTED_IN]->(Outcome)
- (Judgment)-[:DERIVED_FROM]->(Presentation)

High-performer signal MUST be visible in the data:
- Some clients/presenters win consistently; others lose.
- Winning presentations cite concrete metrics + case studies.
- Winning presentations are BACKED_BY Data (survey/analytics); losing ones often lack data.
- Judgments authored from winning presentations have higher confidence.

Create every node first, then every edge, then call finish().`;
  }
  return `${common}

TASK: READ the documents below and EXTRACT concrete entities + relationships conforming to the ontology.

Competence questions the graph should answer:
${competenceQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Ontology:
${ontologySummary(ontology)}

Rules for extraction:
- Mint stable slug ids for new entities. If an entity clearly already exists (you'll see existing ids in the conversation), reuse its id so the upsert merges cleanly.
- You MAY call add_label if a document reveals a genuinely new entity type not in the ontology — but prefer existing labels.
- Don't fabricate data that isn't in the documents. If a field is unknown, omit it.
- Create every node first, then every edge, then call finish().`;
}

export interface AgentRunResult {
  context: AgentContext;
  finalMessage: string;
}

export async function runAgent(
  ontology: Ontology,
  competenceQuestions: string[],
  fileTexts: { name: string; text: string }[],
  mode: "synth" | "extract",
): Promise<AgentRunResult> {
  const ctx = createContext(ontology);
  const tools = buildTools(ctx);
  const llm = getDeepSeek();
  const llmWithTools = llm.bindTools(tools);
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const messages: Array<
    SystemMessage | HumanMessage | AIMessage | ToolMessage
  > = [
    new SystemMessage(buildSystemPrompt(ontology, competenceQuestions, mode)),
    new HumanMessage(fileContext(fileTexts)),
  ];

  let finalMessage = "";
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = (await llmWithTools.invoke(messages)) as AIMessage;
    messages.push(response);

    const toolCalls = response.tool_calls ?? [];
    if (toolCalls.length === 0) {
      finalMessage = String(response.content ?? "");
      break;
    }
    for (const tc of toolCalls) {
      const t = toolMap.get(tc.name);
      if (!t) {
        const msg = `ERROR: no tool named "${tc.name}"`;
        ctx.errors.push(msg);
        messages.push(
          new ToolMessage({
            tool_call_id: tc.id ?? "",
            content: msg,
            name: tc.name,
          }),
        );
        continue;
      }
      const result = await t.invoke({
        ...tc.args,
        ...(tc.id ? { tool_call_id: tc.id } : {}),
      });
      const content =
        typeof result === "string"
          ? result
          : (result as { content?: string }).content ?? JSON.stringify(result);
      messages.push(
        new ToolMessage({
          tool_call_id: tc.id ?? "",
          content,
          name: tc.name,
        }),
      );
      if (tc.name === "finish") {
        finalMessage = "(agent called finish)";
        // allow one more iteration for the final assistant message
      }
    }
    // If finish was called, break after allowing the next assistant turn
    if (toolCalls.some((tc) => tc.name === "finish")) {
      const finalResp = (await llmWithTools.invoke(messages)) as AIMessage;
      finalMessage = String(finalResp.content ?? "");
      break;
    }
  }

  if (!finalMessage) finalMessage = "(agent hit iteration limit)";

  // Persist the (possibly evolved) ontology version metadata to Memgraph
  let version = ontology.version;
  if (ctx.ontologyChanged) {
    const n = (parseInt(version.replace(/[^0-9]/g, ""), 10) || 1) + 1;
    version = `marketing-v${n}`;
    ctx.ontology.version = version;
  }
  await applyOntologyToMemgraph(ctx.ontology, competenceQuestions);

  return { context: ctx, finalMessage };
}

export { BASE_ONTOLOGY };