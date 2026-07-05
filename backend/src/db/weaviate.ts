import weaviate, { WeaviateClient } from "weaviate-client";

const WEAVIATE_HOST = process.env.WEAVIATE_HOST ?? "localhost:8080";
const { hostname: weaviateHost, port: weaviatePort } = (() => {
  const [h, p] = WEAVIATE_HOST.split(":");
  return { hostname: h ?? "localhost", port: Number(p ?? 8080) };
})();

let client: WeaviateClient | null = null;

export async function getWeaviate(): Promise<WeaviateClient> {
  if (client) return client;
  client = await weaviate.connectToLocal({ host: weaviateHost, port: weaviatePort });
  return client;
}

export async function vectorSearch(
  type: string,
  query: string,
  limit = 10,
) {
  const wv = await getWeaviate();
  const result = await wv.collections
    .get(type)
    .query.nearText(query, { limit, returnMetadata: ["distance"] });
  return result.objects.map((o) => ({
    ...o.properties,
    _score: o.metadata?.distance,
  }));
}

function defaultVectorizer() {
  return weaviate.configure.vectors.text2VecOpenAI({
    model: "text-embedding-3-small",
  });
}

export async function ensureCollection(name: string): Promise<void> {
  const wv = await getWeaviate();
  const exists = await wv.collections.exists(name);
  if (exists) return;
  await wv.collections.create({
    name,
    description: `ggent collection: ${name}`,
    vectorizers: [defaultVectorizer()],
  } as never);
}

export async function insertObjects(
  collection: string,
  objects: Record<string, unknown>[],
): Promise<number> {
  if (objects.length === 0) return 0;
  const wv = await getWeaviate();
  const coll = wv.collections.get(collection);
  let inserted = 0;
  for (const obj of objects) {
    await coll.data.insert(obj as never);
    inserted++;
  }
  return inserted;
}