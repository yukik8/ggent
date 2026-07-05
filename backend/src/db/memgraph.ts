import neo4j from "neo4j-driver";

const BOLT_URL = process.env.MEMGRAPH_BOLT ?? "bolt://localhost:7687";

export const driver = neo4j.driver(BOLT_URL, neo4j.auth.basic("", ""), {
  disableLosslessIntegers: true,
});

export async function runQuery(
  cypher: string,
  params?: Record<string, unknown>,
) {
  const session = driver.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}
