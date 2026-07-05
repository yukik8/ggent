import weaviate, { WeaviateClient } from "weaviate-client";

const WEAVIATE_HOST = process.env.WEAVIATE_HOST ?? "localhost:8080";

let client: WeaviateClient | null = null;

export async function getWeaviate(): Promise<WeaviateClient> {
  if (client) return client;
  client = await weaviate.connectToLocal({ host: WEAVIATE_HOST });
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
