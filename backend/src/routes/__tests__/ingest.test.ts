import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { IngestResult } from "../../services/ingest";

vi.mock("../../services/ingest", () => ({
  initialIngestFiles: vi.fn(),
  appendIngestFiles: vi.fn(),
}));

import { initialIngestFiles, appendIngestFiles } from "../../services/ingest";
import ingestRoutes from "../ingest";

const app = new Hono();
app.route("/ingest", ingestRoutes);

const mockResult: IngestResult = {
  ontologyVersion: "1.0.0",
  competenceQuestions: ["What is the difference?"],
  nodeCounts: { Client: 3, Requirement: 3, Presentation: 3 },
  edgeCount: 7,
  vectorized: { Presentation: 3 },
  evolved: false,
  source: "synth",
  agentSummary: "Created seed dataset from base ontology.",
  errors: [],
};

const mockFileResult: IngestResult = { ...mockResult, source: "files" };

describe("POST /ingest/initial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(initialIngestFiles).mockResolvedValue(mockResult);
  });

  it("returns 200 with IngestResult in synth mode (no files)", async () => {
    const form = new FormData();
    const res = await app.fetch(
      new Request("http://localhost/ingest/initial", { method: "POST", body: form }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ontologyVersion: "1.0.0", source: "synth" });
    expect(initialIngestFiles).toHaveBeenCalledWith([], undefined);
  });

  it("passes competenceQuestions when sent as a JSON array string", async () => {
    const form = new FormData();
    form.append("competenceQuestions", JSON.stringify(["q1", "q2"]));
    const res = await app.fetch(
      new Request("http://localhost/ingest/initial", { method: "POST", body: form }),
    );

    expect(res.status).toBe(200);
    expect(initialIngestFiles).toHaveBeenCalledWith([], ["q1", "q2"]);
  });

  it("passes competenceQuestions when sent as a comma-separated string", async () => {
    const form = new FormData();
    form.append("competenceQuestions", "q1,q2");
    const res = await app.fetch(
      new Request("http://localhost/ingest/initial", { method: "POST", body: form }),
    );

    expect(res.status).toBe(200);
    expect(initialIngestFiles).toHaveBeenCalledWith([], ["q1", "q2"]);
  });

  it("calls initialIngestFiles with file paths when files are uploaded", async () => {
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("files", file);
    const res = await app.fetch(
      new Request("http://localhost/ingest/initial", { method: "POST", body: form }),
    );

    expect(res.status).toBe(200);
    expect(initialIngestFiles).toHaveBeenCalled();
    const [paths] = vi.mocked(initialIngestFiles).mock.calls[0];
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toContain("ggent-");
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(initialIngestFiles).mockRejectedValue(new Error("boom"));
    const form = new FormData();
    const res = await app.fetch(
      new Request("http://localhost/ingest/initial", { method: "POST", body: form }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "boom" });
  });
});

describe("POST /ingest/append", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appendIngestFiles).mockResolvedValue(mockFileResult);
  });

  it("returns 200 with IngestResult when files are uploaded", async () => {
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("files", file);
    const res = await app.fetch(
      new Request("http://localhost/ingest/append", { method: "POST", body: form }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ source: "files" });
    expect(appendIngestFiles).toHaveBeenCalled();
    const [paths] = vi.mocked(appendIngestFiles).mock.calls[0];
    expect(paths.length).toBeGreaterThan(0);
  });

  it("returns 400 when no files are uploaded", async () => {
    const form = new FormData();
    const res = await app.fetch(
      new Request("http://localhost/ingest/append", { method: "POST", body: form }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "No files uploaded." });
    expect(appendIngestFiles).not.toHaveBeenCalled();
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(appendIngestFiles).mockRejectedValue(new Error("boom"));
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("files", file);
    const res = await app.fetch(
      new Request("http://localhost/ingest/append", { method: "POST", body: form }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "boom" });
  });
});
