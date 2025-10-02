import neo4j from "neo4j-driver";
import { loadConfig } from "../src/config/env.js";

const cfg = loadConfig();

async function main() {
  const driver = neo4j.driver(cfg.neo4j.uri, neo4j.auth.basic(cfg.neo4j.username, cfg.neo4j.password));
  const session = driver.session();

  try {
    await session.run(`
      CREATE CONSTRAINT video_hash IF NOT EXISTS
      FOR (v:Video)
      REQUIRE v.hash IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX video_ipfsCid IF NOT EXISTS
      FOR (v:Video)
      ON (v.ipfsCid)
    `);

    console.log("✅ Neo4j constraints and indexes ensured.");
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error("❌ Neo4j init failed:", err);
  process.exit(1);
});