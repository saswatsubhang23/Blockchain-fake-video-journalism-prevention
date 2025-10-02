import neo4j from "neo4j-driver";
import { loadConfig } from "../src/config/env.js";

const cfg = loadConfig();

async function initializeEnhancedSchema() {
  const driver = neo4j.driver(cfg.neo4j.uri, neo4j.auth.basic(cfg.neo4j.username, cfg.neo4j.password));
  const session = driver.session();

  try {
    console.log("🚀 Initializing Enhanced Neo4j Schema for Archival Diplomatics...");

    // 🔹 Video Node Constraints and Indexes
    await session.run(`
      CREATE CONSTRAINT video_hash_unique IF NOT EXISTS
      FOR (v:Video)
      REQUIRE v.hash IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX video_ipfs_cid IF NOT EXISTS
      FOR (v:Video)
      ON (v.ipfsCid)
    `);

    await session.run(`
      CREATE INDEX video_created_at IF NOT EXISTS
      FOR (v:Video)
      ON (v.createdAt)
    `);

    // Note: Cannot create index on nested properties in older Neo4j versions
    // await session.run(`
    //   CREATE INDEX video_validation IF NOT EXISTS
    //   FOR (v:Video)
    //   ON (v.validation.isValid)
    // `);

    // 🔹 Uploader Node Constraints and Indexes
    await session.run(`
      CREATE CONSTRAINT uploader_id_unique IF NOT EXISTS
      FOR (u:Uploader)
      REQUIRE u.id IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX uploader_last_seen IF NOT EXISTS
      FOR (u:Uploader)  
      ON (u.lastSeen)
    `);

    await session.run(`
      CREATE INDEX uploader_total_uploads IF NOT EXISTS
      FOR (u:Uploader)
      ON (u.totalUploads)
    `);

    // 🔹 Event Node Constraints and Indexes
    await session.run(`
      CREATE CONSTRAINT event_id_unique IF NOT EXISTS
      FOR (e:Event)
      REQUIRE e.id IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX event_type IF NOT EXISTS
      FOR (e:Event)
      ON (e.type)
    `);

    // Array properties might not be indexable in some Neo4j versions
    // await session.run(`
    //   CREATE INDEX event_tags IF NOT EXISTS
    //   FOR (e:Event)
    //   ON (e.tags)
    // `);

    // 🔹 Location Node Constraints and Indexes
    await session.run(`
      CREATE CONSTRAINT location_id_unique IF NOT EXISTS
      FOR (l:Location)
      REQUIRE l.id IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX location_coordinates IF NOT EXISTS
      FOR (l:Location)
      ON (l.coordinates)
    `);

    // 🔹 Relationship Indexes for Performance
    await session.run(`
      CREATE INDEX uploaded_relationship_time IF NOT EXISTS
      FOR ()-[r:UPLOADED]-()
      ON (r.uploadedAt)
    `);

    await session.run(`
      CREATE INDEX derived_relationship_time IF NOT EXISTS
      FOR ()-[r:DERIVED_FROM]-()
      ON (r.createdAt)
    `);

    await session.run(`
      CREATE INDEX contains_relationship_time IF NOT EXISTS
      FOR ()-[r:CONTAINS]-()
      ON (r.recordedAt)
    `);

    console.log("✅ All constraints and indexes created successfully!");

    // 🔹 Create Sample Data for Testing (Optional)
    console.log("📊 Creating sample data for testing...");

    // Sample events
    await session.run(`
      MERGE (e1:Event {id: "protest_2025_001"})
      SET e1.type = "protest",
          e1.tags = ["democracy", "freedom", "peaceful"],
          e1.description = "Peaceful democracy protest",
          e1.createdAt = datetime()
    `);

    await session.run(`
      MERGE (e2:Event {id: "breaking_news_001"})
      SET e2.type = "breaking_news",
          e2.tags = ["urgent", "politics", "announcement"],
          e2.description = "Emergency press conference",
          e2.createdAt = datetime()
    `);

    // Sample locations
    await session.run(`
      MERGE (l1:Location {id: "times_square_nyc"})
      SET l1.name = "Times Square, NYC",
          l1.coordinates = "40.7580,-73.9855",
          l1.createdAt = datetime()
    `);

    await session.run(`
      MERGE (l2:Location {id: "capitol_building_dc"})
      SET l2.name = "Capitol Building, Washington DC",
          l2.coordinates = "38.8899,-77.0091",
          l2.createdAt = datetime()
    `);

    console.log("✅ Sample data created!");

    // 🔹 Display Schema Information
    console.log("\n📋 Enhanced Schema Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const schemaInfo = await session.run(`
      CALL db.schema.visualization() YIELD nodes, relationships
      RETURN nodes, relationships
    `);

    console.log("🎯 Node Types:");
    console.log("   • Video (hash, ipfsCid, validation, metadata)");
    console.log("   • Uploader (id, totalUploads, lastSeen)");
    console.log("   • Event (id, type, tags, description)");
    console.log("   • Location (id, name, coordinates)");

    console.log("\n🔗 Relationship Types:");
    console.log("   • (Uploader)-[:UPLOADED]->(Video)");
    console.log("   • (Event)-[:CONTAINS]->(Video)");
    console.log("   • (Video)-[:RECORDED_AT]->(Location)");
    console.log("   • (Video)-[:DERIVED_FROM]->(Video)");

    console.log("\n🔍 Key Features:");
    console.log("   • Duplicate detection via hash uniqueness");
    console.log("   • Metadata validation and tamper detection");
    console.log("   • Suspicious pattern analysis");
    console.log("   • Trust score calculation");
    console.log("   • Full relationship tracking");

    console.log("\n🎯 Ready for Fake Journalism Prevention!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Schema initialization failed:", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the initialization
initializeEnhancedSchema()
  .then(() => {
    console.log("✅ Enhanced Neo4j schema initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });