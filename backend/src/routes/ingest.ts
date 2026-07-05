import { Hono } from "hono";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { initialIngestFiles, appendIngestFiles } from "../services/ingest";

const ingest = new Hono();

async function saveUploadedFiles(body: Record<string, unknown>): Promise<string[]> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ggent-"));
  const paths: string[] = [];
  const files = body.files as
    | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }[]
    | { name: string; arrayBuffer: () => Promise<ArrayBuffer> }
    | undefined;
  if (!files) return paths;
  const arr = Array.isArray(files) ? files : [files];
  for (const f of arr) {
    if (!f || typeof f.name !== "string" || !f.arrayBuffer) continue;
    const buf = Buffer.from(await f.arrayBuffer());
    const dest = path.join(tmp, path.basename(f.name) || `file-${paths.length}`);
    await fs.writeFile(dest, buf);
    paths.push(dest);
  }
  return paths;
}

function parseQuestions(raw: unknown): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    } catch {
      return raw
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

ingest.post("/initial", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const rawBody = body as Record<string, unknown>;
  const paths = await saveUploadedFiles(rawBody);
  const rawQs = rawBody.competenceQuestions ?? rawBody.questions;
  const questions = parseQuestions(rawQs);
  try {
    // No files = synthesize a seed dataset against the BASE ontology.
    const result = await initialIngestFiles(paths, questions);
    await cleanup(paths);
    return c.json(result);
  } catch (err) {
    await cleanup(paths);
    return c.json({ error: (err as Error).message }, 500);
  }
});

ingest.post("/append", async (c) => {
  const ct = c.req.header("content-type") ?? "";
  const isJson = ct.includes("application/json");

  if (isJson) {
    const body = await c.req.json().catch(() => ({}));
    const raw = (body as Record<string, unknown>).raw as
      | { note: string; presenterId?: string }
      | undefined;
    if (!raw || typeof raw.note !== "string" || !raw.note.trim()) {
      return c.json({ error: "Provide {raw: {note, presenterId?}}." }, 400);
    }
    const tempPath = path.join(os.tmpdir(), `ggent-raw-${Date.now()}.txt`);
    await fs.writeFile(tempPath, raw.note, "utf8");
    try {
      const result = await appendIngestFiles([tempPath]);
      return c.json(result);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500);
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  const body = await c.req.parseBody({ all: true });
  const paths = await saveUploadedFiles(body as Record<string, unknown>);
  if (paths.length === 0) {
    return c.json({ error: "No files uploaded." }, 400);
  }
  try {
    const result = await appendIngestFiles(paths);
    await cleanup(paths);
    return c.json(result);
  } catch (err) {
    await cleanup(paths);
    return c.json({ error: (err as Error).message }, 500);
  }
});

async function cleanup(paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await fs.unlink(p);
      await fs.rmdir(path.dirname(p)).catch(() => {});
    } catch {
      // ignore
    }
  }
}

export default ingest;