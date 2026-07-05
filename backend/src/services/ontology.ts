import { runQuery } from "../db/memgraph";
import type { Ontology } from "../agent/schemas";

function safeLabel(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "");
}

export async function applyOntologyToMemgraph(
  ontology: Ontology,
  competenceQuestions: string[],
): Promise<void> {
  for (const label of ontology.labels) {
    const lbl = safeLabel(label.name);
    // Memgraph 2.14: no constraint name, no IF NOT EXISTS, no index ON label.
    try {
      await runQuery(
        `CREATE CONSTRAINT ON (n:${lbl}) ASSERT n.id IS UNIQUE;`,
      );
    } catch (err) {
      const msg = (err as Error).message;
      // "already exists" or "already defined" is fine; only warn real errors.
      if (!/already exists|already defined|unique constraint/i.test(msg)) {
        console.warn(`[ontology] constraint ${lbl}:`, msg);
      }
    }
  }

  const now = new Date().toISOString();
  try {
    await runQuery(
      `MERGE (o:OntologyVersion {version: $version})
       SET o.generatedAt = $now, o.description = $description, o.questions = $questions`,
      {
        version: ontology.version,
        description: ontology.description,
        questions: competenceQuestions,
        now,
      },
    );
  } catch (err) {
    console.warn(
      `[ontology] OntologyVersion:`,
      (err as Error).message,
    );
  }

  for (const label of ontology.labels) {
    try {
      await runQuery(
        `MATCH (o:OntologyVersion {version: $version})
         MERGE (l:Label {name: $name})
         MERGE (o)-[:DEFINES_LABEL]->(l)
         SET l.properties = $properties,
             l.vectorizeProperties = $vectorizeProperties`,
        {
          version: ontology.version,
          name: label.name,
          properties: label.properties
            .map((p) => `${p.name}:${p.type}`)
            .join(", "),
          vectorizeProperties: label.vectorizeProperties ?? [],
        },
      );
    } catch (err) {
      console.warn(
        `[ontology] label ${label.name}:`,
        (err as Error).message,
      );
    }
  }

  for (const edge of ontology.edges) {
    try {
      await runQuery(
        `MATCH (o:OntologyVersion {version: $version})
         MERGE (e:EdgeType {from: $from, type: $type, to: $to})
         MERGE (o)-[:DEFINES_EDGE]->(e)
         SET e.properties = $properties`,
        {
          version: ontology.version,
          from: edge.from,
          type: edge.type,
          to: edge.to,
          properties: (edge.properties ?? [])
            .map((p) => `${p.name}:${p.type}`)
            .join(", "),
        },
      );
    } catch (err) {
      console.warn(
        `[ontology] edge ${edge.type}:`,
        (err as Error).message,
      );
    }
  }
}

export async function loadLatestOntology(): Promise<Ontology | null> {
  try {
    const labelRes = await runQuery(
      `MATCH (o:OntologyVersion)
       RETURN o ORDER BY o.generatedAt DESC LIMIT 1`,
    );
    if (labelRes.records.length === 0) return null;
    const rec = labelRes.records[0].toObject();
    const version = (rec["o.version"] ?? rec.version) as string | undefined;
    if (!version) return null;
    const description = (rec["o.description"] ?? rec.description ?? "") as string;

    const edgesForVersion = await runQuery(
      `MATCH (o:OntologyVersion {version: $version})-[:DEFINES_LABEL]->(l:Label)
       RETURN l.name AS name, l.properties AS properties, l.vectorizeProperties AS vectorizeProperties`,
      { version },
    );

    const edgeTypeRes = await runQuery(
      `MATCH (o:OntologyVersion {version: $version})-[:DEFINES_EDGE]->(e:EdgeType)
       RETURN e.from AS from, e.type AS type, e.to AS to, e.properties AS properties`,
      { version },
    );

    const labels = edgesForVersion.records.map((r) => {
      const o = r.toObject();
      return {
        name: o.name as string,
        description: "",
        properties: parseProps(o.properties as string),
        vectorizeProperties: (o.vectorizeProperties as string[]) ?? [],
      };
    });

    const edges = edgeTypeRes.records.map((r) => {
      const o = r.toObject();
      return {
        from: o.from as string,
        type: o.type as string,
        to: o.to as string,
        description: "",
        properties: parseProps(o.properties as string),
      };
    });

    return { version, description, labels, edges };
  } catch (err) {
    console.warn(`[ontology] loadLatestOntology:`, (err as Error).message);
    return null;
  }
}

function parseProps(
  spec?: string,
): {
  name: string;
  type: "string" | "integer" | "float" | "boolean" | "datetime" | "stringList";
  description: string;
  vectorize: boolean;
}[] {
  if (!spec) return [];
  return spec
    .split(", ")
    .filter(Boolean)
    .map((p) => {
      const [name, type] = p.split(":");
      return {
        name: name ?? p,
        type: (type as never) ?? "string",
        description: "",
        vectorize: false,
      };
    });
}