import type { IngestResult, OntologyStatus, GraphResult } from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function asJson<T>(res: Response): Promise<T> {
	if (!res.ok) {
		let msg = `HTTP ${res.status}`;
		try {
			const body = await res.json();
			msg = body.error ?? body.message ?? msg;
		} catch {
			msg = await res.text().catch(() => msg);
		}
		throw new Error(msg);
	}
	return res.json() as Promise<T>;
}

function withFiles(files: File[], extra: Record<string, string> = {}): FormData {
	const fd = new FormData();
	for (const f of files) fd.append('files', f, f.name);
	for (const [k, v] of Object.entries(extra)) fd.append(k, v);
	return fd;
}

export async function getOntologyStatus(): Promise<OntologyStatus> {
	const res = await fetch(`${BASE}/ontology/status`, { method: 'GET' });
	return asJson<OntologyStatus>(res);
}

export async function ingestInitial(
	files: File[],
	questions?: string,
): Promise<IngestResult> {
	const fd = withFiles(files, questions ? { questions } : {});
	const res = await fetch(`${BASE}/ingest/initial`, { method: 'POST', body: fd });
	return asJson<IngestResult>(res);
}

export async function ingestAppendFiles(files: File[]): Promise<IngestResult> {
	const fd = withFiles(files);
	const res = await fetch(`${BASE}/ingest/append`, { method: 'POST', body: fd });
	return asJson<IngestResult>(res);
}

export async function ingestAppendRaw(
	note: string,
	presenterId?: string,
): Promise<IngestResult> {
	const res = await fetch(`${BASE}/ingest/append`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ raw: { note, presenterId } }),
	});
	return asJson<IngestResult>(res);
}

export async function fetchGraph(limit = 300): Promise<GraphResult> {
	const query = `MATCH (n)-[r]->(m) RETURN n, r, m LIMIT ${limit}`;
	const res = await fetch(`${BASE}/cypher`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ query }),
	});
	return asJson<GraphResult>(res);
}