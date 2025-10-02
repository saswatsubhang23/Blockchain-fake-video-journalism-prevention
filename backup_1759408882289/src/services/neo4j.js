import neo4j from "neo4j-driver";
import { loadConfig } from "../config/env.js";

const cfg = loadConfig();

const driver = neo4j.driver(cfg.neo4j.uri, neo4j.auth.basic(cfg.neo4j.username, cfg.neo4j.password), {
  maxConnectionLifetime: 30_000,
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 10_000
});

export async function upsertVideo({
  hash,
  ipfsCid,
  ipfsUri,
  gatewayUrl,
  size,
  mimeType,
  duration,
  format,
  uploaderId,
  eventId,
  eventType,
  derivedFromHash
}) {
  const session = driver.session();

  try {
    const result = await session.executeWrite(async (tx) => {
      const res = await tx.run(
        `
        MERGE (v:Video { hash: $hash })
        ON CREATE SET v.createdAt = datetime()
        SET v.updatedAt = datetime(),
            v.ipfsCid = $ipfsCid,
            v.ipfsUri = $ipfsUri,
            v.gatewayUrl = $gatewayUrl,
            v.size = $size,
            v.mimeType = $mimeType,
            v.duration = $duration,
            v.format = $format
        WITH v
        OPTIONAL MATCH (p:Video { hash: $derivedFromHash })
        FOREACH (_ IN CASE WHEN $derivedFromHash IS NULL THEN [] ELSE [1] END |
          MERGE (v)-[:DERIVED_FROM]->(p)
        )
        WITH v
        FOREACH (_ IN CASE WHEN $uploaderId IS NULL THEN [] ELSE [1] END |
          MERGE (u:User { id: $uploaderId })
          MERGE (v)-[:UPLOADED_BY]->(u)
        )
        WITH v
        FOREACH (_ IN CASE WHEN $eventId IS NULL THEN [] ELSE [1] END |
          MERGE (e:Event { id: $eventId })
          SET e.type = $eventType
          MERGE (v)-[:HAS_EVENT]->(e)
        )
        RETURN v
        `,
        {
          hash,
          ipfsCid,
          ipfsUri,
          gatewayUrl,
          size,
          mimeType,
          duration,
          format,
          uploaderId: uploaderId || null,
          eventId: eventId || null,
          eventType: eventType || null,
          derivedFromHash: derivedFromHash || null
        }
      );
      return res.records[0]?.get("v").properties || null;
    });
    return result;
  } finally {
    await session.close();
  }
}

export async function findVideoByHash(hash) {
  const session = driver.session();
  try {
    const res = await session.run(
      `
      MATCH (v:Video { hash: $hash })
      OPTIONAL MATCH (v)-[:UPLOADED_BY]->(u:User)
      OPTIONAL MATCH (v)-[:HAS_EVENT]->(e:Event)
      RETURN v, collect(DISTINCT u) as uploaders, collect(DISTINCT e) as events
      `,
      { hash }
    );
    if (!res.records.length) return null;

    const v = res.records[0].get("v").properties;
    const uploaders = res.records[0].get("uploaders").map((u) => u.properties);
    const events = res.records[0].get("events").map((e) => e.properties);
    return { ...v, uploaders, events };
  } finally {
    await session.close();
  }
}