import weaviate, { WeaviateClient } from "weaviate-client";

const [WEAVIATE_HOSTNAME, WEAVIATE_PORT] = (
  process.env.WEAVIATE_HOST ?? "localhost:8080"
).split(":");

let client: WeaviateClient | null = null;

export async function getWeaviate(): Promise<WeaviateClient> {
  if (client) return client;
  client = await weaviate.connectToLocal({
    host: WEAVIATE_HOSTNAME,
    port: Number(WEAVIATE_PORT ?? 8080),
  });
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
