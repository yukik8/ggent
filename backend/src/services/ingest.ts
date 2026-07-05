import { runAgent } from "../agent/agent";
import { BASE_ONTOLOGY } from "../agent/baseOntology";
import { DEFAULT_COMPETENCE_QUESTIONS } from "../agent/schemas";
import { loadLatestOntology } from "./ontology";
import { extractFiles } from "./extractor";

export interface IngestResult {
  ontologyVersion: string;
  competenceQuestions?: string[];
  nodeCounts: Record<string, number>;
  edgeCount: number;
  vectorized: Record<string, number>;
  evolved: boolean;
  source: "files" | "synth";
  agentSummary: string;
  errors: string[];
}

export async function initialIngestFiles(
  filePaths: string[],
  competenceQuestions?: string[],
): Promise<IngestResult> {
  const questions = competenceQuestions?.length
    ? competenceQuestions
    : DEFAULT_COMPETENCE_QUESTIONS;

  const texts = await extractFiles(filePaths);
  const mode: "synth" | "extract" = filePaths.length > 0 ? "extract" : "synth";
  const source = mode === "synth" ? "synth" : "files";

  const { context, finalMessage } = await runAgent(
    BASE_ONTOLOGY,
    questions,
    texts,
    mode,
  );

  return {
    ontologyVersion: context.ontology.version,
    competenceQuestions: questions,
    nodeCounts: context.nodeCounts,
    edgeCount: context.edgeCount,
    vectorized: context.vectorized,
    evolved: context.ontologyChanged,
    source,
    agentSummary: finalMessage,
    errors: context.errors,
  };
}

export async function appendIngestFiles(
  filePaths: string[],
): Promise<IngestResult> {
  if (filePaths.length === 0) {
    throw new Error("append requires at least one uploaded file.");
  }
  const current = await loadLatestOntology();
  if (!current) {
    throw new Error(
      "No ontology in graph. Call /ingest/initial first (with files or competenceQuestions).",
    );
  }
  const texts = await extractFiles(filePaths);
  const { context, finalMessage } = await runAgent(
    current,
    [],
    texts,
    "extract",
  );

  return {
    ontologyVersion: context.ontology.version,
    nodeCounts: context.nodeCounts,
    edgeCount: context.edgeCount,
    vectorized: context.vectorized,
    evolved: context.ontologyChanged,
    source: "files",
    agentSummary: finalMessage,
    errors: context.errors,
  };
}