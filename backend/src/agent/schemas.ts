import { z } from "zod";

export const DEFAULT_COMPETENCE_QUESTIONS = [
  "What is the difference between our high performers gaining clients, what makes their presentations different?",
  "What things other than the presentation makes these sales go through?",
  "Is there a relation between high performing presenters and their actual success in advertisement creation?",
];

export const Primitive = z.enum([
  "string",
  "integer",
  "float",
  "boolean",
  "datetime",
  "stringList",
]);

export const PropertySpec = z.object({
  name: z.string(),
  type: Primitive,
  description: z.string(),
  vectorize: z.boolean(),
});

export const LabelSpec = z.object({
  name: z.string(),
  description: z.string(),
  properties: z.array(PropertySpec),
  vectorizeProperties: z.array(z.string()),
});

export const EdgeSpec = z.object({
  from: z.string(),
  type: z.string(),
  to: z.string(),
  description: z.string(),
  properties: z.array(PropertySpec),
});

export const OntologySchema = z.object({
  version: z.string(),
  description: z.string(),
  labels: z.array(LabelSpec),
  edges: z.array(EdgeSpec),
});
export type Ontology = z.infer<typeof OntologySchema>;
export type PropertyType = z.infer<typeof Primitive>;

export const GenericRow = z.record(z.any());
export const EdgeInstance = z.object({
  from: z.string(),
  fromId: z.string(),
  type: z.string(),
  to: z.string(),
  toId: z.string(),
  properties: GenericRow,
});

export const IngestionPayloadSchema = z.object({
  ontology: OntologySchema,
  nodes: z.record(z.array(GenericRow)),
  edges: z.array(EdgeInstance),
});
export const IngestionPayload = IngestionPayloadSchema;
export type IngestionPayload = z.infer<typeof IngestionPayloadSchema>;

export const OntologyDelta = z.object({
  addedLabels: z.array(LabelSpec),
  addedEdges: z.array(EdgeSpec),
  addedProperties: z.array(
    z.object({
      label: z.string(),
      properties: z.array(PropertySpec),
      vectorizeProperties: z.array(z.string()),
    }),
  ),
});
export type OntologyDelta = z.infer<typeof OntologyDelta>;

export const EvolveResultSchema = z.object({
  ontology: OntologySchema,
  nodes: z.record(z.array(GenericRow)),
  edges: z.array(EdgeInstance),
});
export const EvolveResult = EvolveResultSchema;
export type EvolveResult = z.infer<typeof EvolveResultSchema>;

export const SeedOnlySchema = z.object({
  nodes: z.record(z.array(GenericRow)),
  edges: z.array(EdgeInstance),
});
export const SeedOnly = SeedOnlySchema;
export type SeedOnly = z.infer<typeof SeedOnlySchema>;