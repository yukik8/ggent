import type { Ontology } from "./schemas";

const P = (
  name: string,
  type: "string" | "integer" | "float" | "boolean" | "datetime" | "stringList",
  description: string,
  vectorize = false,
) => ({ name, type, description, vectorize });

/**
 * Graph Schema Contract v2 — the fixed BASE ontology.
 * Agents MAY extend the periphery, but the core labels/edges are fixed.
 */
export const BASE_ONTOLOGY: Ontology = {
  version: "marketing-v1",
  description:
    "Marketing agency sales-cycle graph: Requirements (briefs) → Presentations → Outcomes, backed by Data, refined into Judgments.",
  labels: [
    {
      name: "Requirement",
      description: "The brief from a client describing what they need.",
      properties: [
        P("id", "string", "Unique slug id."),
        P("title", "string", "Short human-readable title."),
        P("date", "datetime", "ISO date the brief was received."),
        P("client_name", "string", "Name of the requesting client."),
        P("goal", "string", "The business goal / desired outcome.", true),
      ],
      vectorizeProperties: ["title", "goal"],
    },
    {
      name: "Presentation",
      description: "A deck / proposal given to a client.",
      properties: [
        P("id", "string", "Unique slug id."),
        P("title", "string", "Short title of the deck."),
        P("date", "datetime", "ISO date the deck was delivered."),
        P("stage", "string", "draft or final."),
        P("content", "string", "Abstract / slide-by-slide narrative of the deck.", true),
      ],
      vectorizeProperties: ["title", "content"],
    },
    {
      name: "Client",
      description: "A client organization.",
      properties: [
        P("id", "string", "Unique slug id."),
        P("title", "string", "Client name."),
        P("date", "datetime", "ISO date the client was acquired."),
      ],
      vectorizeProperties: ["title"],
    },
    {
      name: "Data",
      description: "Research assets backing a presentation.",
      properties: [
        P("id", "string", "Unique slug id."),
        P("title", "string", "Title of the asset."),
        P("date", "datetime", "ISO date the asset was produced."),
        P("source_kind", "string", "survey | social | analytics | interview | …"),
        P("content", "string", "Text body / summary of the asset.", true),
      ],
      vectorizeProperties: ["title", "content"],
    },
    {
      name: "Outcome",
      description: "Dated result of a presentation; feeds trends.",
      properties: [
        P("id", "string", "Unique slug id."),
        P("title", "string", "Short title."),
        P("date", "datetime", "ISO date the outcome was recorded."),
        P("result", "string", "success or fail."),
        P("reason", "string", "Why it succeeded / failed.", true),
      ],
      vectorizeProperties: ["reason"],
    },
    {
      name: "Judgment",
      description: "A learned asset: a rule the agency has internalized.",
      properties: [
        P("id", "string", "Unique slug id."),
        P("title", "string", "Short title."),
        P("date", "datetime", "ISO date the judgment was recorded."),
        P("confidence", "float", "Confidence score 0-1."),
        P("status", "string", "active | contradicted | retired."),
        P("rule", "string", "One-line statement of the learned rule.", true),
      ],
      vectorizeProperties: ["rule"],
    },
  ],
  edges: [
    { from: "Requirement", type: "ANSWERED_BY", to: "Presentation", description: "A requirement is answered by a presentation.", properties: [] },
    { from: "Requirement", type: "FOR_CLIENT", to: "Client", description: "Requirement is for a client.", properties: [] },
    { from: "Presentation", type: "FOR_CLIENT", to: "Client", description: "Presentation is for a client.", properties: [] },
    { from: "Presentation", type: "REVISED_TO", to: "Presentation", description: "A draft revised into a final deck.", properties: [] },
    { from: "Presentation", type: "BACKED_BY", to: "Data", description: "Presentation backed by data.", properties: [] },
    { from: "Presentation", type: "RESULTED_IN", to: "Outcome", description: "Presentation resulted in an outcome.", properties: [] },
    { from: "Judgment", type: "DERIVED_FROM", to: "Presentation", description: "Judgment derived from presentation evidence.", properties: [] },
  ],
};

/** Labels that must be mirrored to Weaviate as their own collection. */
export const WEAVIATE_MIRROR_LABELS = new Set([
  "Presentation",
  "Data",
  "Requirement",
  "Judgment",
]);