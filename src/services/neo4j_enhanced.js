import neo4j from "neo4j-driver";
import { loadConfig } from "../config/env.js";

const cfg = loadConfig();

const driver = neo4j.driver(cfg.neo4j.uri, neo4j.auth.basic(cfg.neo4j.username, cfg.neo4j.password), {
  maxConnectionLifetime: 30_000,
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 10_000
});

/**
 * 🎯 Enhanced Video Node Creation with Full Metadata
 */
export async function upsertVideo(videoData) {
  const session = driver.session();

  try {
    const result = await session.executeWrite(async (tx) => {
      const res = await tx.run(
        `
        MERGE (v:Video {hash: $hash})
        SET v.ipfsCid = $ipfsCid,
            v.ipfsUri = $ipfsUri,
            v.gatewayUrl = $gatewayUrl,
            v.size = $size,
            v.mimeType = $mimeType,
            v.duration = $duration,
            v.format = $format,
            v.codec = $codec,
            v.bitrate = $bitrate,
            v.width = $width,
            v.height = $height,
            v.frameRate = $frameRate,
            v.creationTime = $creationTime,
            v.validation = $validation,
            v.blockchainTxn = $blockchainTxn,
            v.description = $description,
            v.updatedAt = datetime()
        ON CREATE SET v.createdAt = datetime()
        
        // Handle derived relationship if specified
        ${videoData.derivedFromHash ? `
        WITH v
        MATCH (parent:Video {hash: $derivedFromHash})
        MERGE (v)-[r:DERIVED_FROM]->(parent)
        SET r.createdAt = datetime()
        ` : ''}
        
        RETURN v
        `,
        videoData
      );
      return res.records[0]?.get("v").properties;
    });

    return result;
  } finally {
    await session.close();
  }
}

/**
 * 👤 Create or Update Uploader Node
 */
export async function createUploader(uploaderData) {
  const session = driver.session();

  try {
    const result = await session.executeWrite(async (tx) => {
      const res = await tx.run(
        `
        MERGE (u:Uploader {id: $id})
        SET u.lastSeen = datetime(),
            u.ipAddress = $ipAddress,
            u.userAgent = $userAgent,
            u.totalUploads = coalesce(u.totalUploads, 0) + 1
        ON CREATE SET u.firstSeen = datetime(),
                      u.createdAt = datetime()
        RETURN u
        `,
        uploaderData
      );
      return res.records[0]?.get("u").properties;
    });

    return result;
  } finally {
    await session.close();
  }
}

/**
 * 🎪 Create Event Node
 */
export async function createEvent(eventData) {
  const session = driver.session();

  try {
    const result = await session.executeWrite(async (tx) => {
      const res = await tx.run(
        `
        MERGE (e:Event {id: $id})
        SET e.type = $type,
            e.tags = $tags,
            e.description = $description,
            e.updatedAt = datetime()
        ON CREATE SET e.createdAt = datetime()
        RETURN e
        `,
        eventData
      );
      return res.records[0]?.get("e").properties;
    });

    return result;
  } finally {
    await session.close();
  }
}

/**
 * 📍 Create Location Node
 */
export async function createLocation(locationData) {
  const session = driver.session();

  try {
    // Generate location ID if not provided
    const locationId = locationData.name ? 
      locationData.name.toLowerCase().replace(/\s+/g, '_') : 
      `loc_${Date.now()}`;

    const result = await session.executeWrite(async (tx) => {
      const res = await tx.run(
        `
        MERGE (l:Location {id: $id})
        SET l.name = $name,
            l.coordinates = $coordinates,
            l.timestamp = $timestamp,
            l.updatedAt = datetime()
        ON CREATE SET l.createdAt = datetime()
        RETURN l
        `,
        {
          id: locationId,
          ...locationData
        }
      );
      return res.records[0]?.get("l").properties;
    });

    return locationId;
  } finally {
    await session.close();
  }
}

/**
 * 🔗 Link Video to Uploader
 */
export async function linkVideoToUploader(videoHash, uploaderId, relationshipData = {}) {
  const session = driver.session();

  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MATCH (v:Video {hash: $videoHash})
        MATCH (u:Uploader {id: $uploaderId})
        MERGE (u)-[r:UPLOADED]->(v)
        SET r.uploadedAt = $uploadedAt,
            r.isOriginal = $isOriginal,
            r.isDuplicate = $isDuplicate
        `,
        {
          videoHash,
          uploaderId,
          uploadedAt: relationshipData.uploadedAt || new Date(),
          isOriginal: relationshipData.isOriginal || true,
          isDuplicate: relationshipData.isDuplicate || false
        }
      );
    });
  } finally {
    await session.close();
  }
}

/**
 * 🔗 Link Video to Event
 */
export async function linkVideoToEvent(videoHash, eventId, relationshipData = {}) {
  const session = driver.session();

  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MATCH (v:Video {hash: $videoHash})
        MATCH (e:Event {id: $eventId})
        MERGE (e)-[r:CONTAINS]->(v)
        SET r.eventType = $eventType,
            r.recordedAt = $recordedAt
        `,
        {
          videoHash,
          eventId,
          eventType: relationshipData.eventType,
          recordedAt: relationshipData.recordedAt || new Date()
        }
      );
    });
  } finally {
    await session.close();
  }
}

/**
 * 🔗 Link Video to Location
 */
export async function linkVideoToLocation(videoHash, locationId) {
  const session = driver.session();

  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `
        MATCH (v:Video {hash: $videoHash})
        MATCH (l:Location {id: $locationId})
        MERGE (v)-[r:RECORDED_AT]->(l)
        SET r.createdAt = datetime()
        `,
        { videoHash, locationId }
      );
    });
  } finally {
    await session.close();
  }
}

/**
 * 🔍 Find Video by Hash with All Relationships
 */
export async function findVideoByHash(hash) {
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      const res = await tx.run(
        `
        MATCH (v:Video {hash: $hash})
        OPTIONAL MATCH (u:Uploader)-[ur:UPLOADED]->(v)
        OPTIONAL MATCH (e:Event)-[er:CONTAINS]->(v)
        OPTIONAL MATCH (v)-[lr:RECORDED_AT]->(l:Location)
        OPTIONAL MATCH (v)-[dr:DERIVED_FROM]->(parent:Video)
        OPTIONAL MATCH (child:Video)-[cr:DERIVED_FROM]->(v)
        
        RETURN v,
               collect(DISTINCT {uploader: u.id, relationship: ur}) as uploaders,
               collect(DISTINCT {event: e, relationship: er}) as events,
               collect(DISTINCT {location: l, relationship: lr}) as locations,
               collect(DISTINCT {parent: parent.hash}) as parents,
               collect(DISTINCT {child: child.hash}) as children
        `,
        { hash }
      );

      if (res.records.length === 0) return null;

      const record = res.records[0];
      const video = record.get("v").properties;
      
      return {
        ...video,
        uploaders: record.get("uploaders").filter(u => u.uploader),
        events: record.get("events").filter(e => e.event),
        locations: record.get("locations").filter(l => l.location),
        parents: record.get("parents").filter(p => p.parent),
        children: record.get("children").filter(c => c.child)
      };
    });

    return result;
  } finally {
    await session.close();
  }
}

/**
 * 🔍 Get All Relationships for a Video
 */
export async function getVideoRelationships(hash) {
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      const res = await tx.run(
        `
        MATCH (v:Video {hash: $hash})
        
        // Get uploaders
        OPTIONAL MATCH (u:Uploader)-[ur:UPLOADED]->(v)
        WITH v, collect(DISTINCT {
          id: u.id,
          uploadedAt: ur.uploadedAt,
          isOriginal: ur.isOriginal,
          isDuplicate: ur.isDuplicate,
          totalUploads: u.totalUploads
        }) as uploaders
        
        // Get events
        OPTIONAL MATCH (e:Event)-[er:CONTAINS]->(v)
        WITH v, uploaders, collect(DISTINCT {
          id: e.id,
          type: e.type,
          tags: e.tags,
          recordedAt: er.recordedAt
        }) as events
        
        // Get locations
        OPTIONAL MATCH (v)-[lr:RECORDED_AT]->(l:Location)
        WITH v, uploaders, events, collect(DISTINCT {
          id: l.id,
          name: l.name,
          coordinates: l.coordinates
        }) as locations
        
        // Get derived videos (children)
        OPTIONAL MATCH (child:Video)-[cr:DERIVED_FROM]->(v)
        WITH v, uploaders, events, locations, collect(DISTINCT {
          hash: child.hash,
          createdAt: cr.createdAt
        }) as derivedVideos
        
        // Get parent videos
        OPTIONAL MATCH (v)-[pr:DERIVED_FROM]->(parent:Video)
        WITH v, uploaders, events, locations, derivedVideos, collect(DISTINCT {
          hash: parent.hash,
          createdAt: pr.createdAt
        }) as parentVideos
        
        RETURN uploaders, events, locations, derivedVideos, parentVideos
        `,
        { hash }
      );

      if (res.records.length === 0) return {};

      const record = res.records[0];
      return {
        uploaders: record.get("uploaders").filter(u => u.id),
        events: record.get("events").filter(e => e.id),
        locations: record.get("locations").filter(l => l.id),
        derivedVideos: record.get("derivedVideos").filter(d => d.hash),
        parentVideos: record.get("parentVideos").filter(p => p.hash)
      };
    });

    return result;
  } finally {
    await session.close();
  }
}

/**
 * 🕵️ Find Suspicious Patterns - Advanced Fraud Detection
 */
export async function findSuspiciousPatterns(uploaderId, currentVideoHash) {
  const session = driver.session();
  const patterns = [];

  try {
    // Pattern 1: Same uploader with conflicting timestamps
    if (uploaderId) {
      const timeConflicts = await session.executeRead(async (tx) => {
        const res = await tx.run(
          `
          MATCH (u:Uploader {id: $uploaderId})-[r:UPLOADED]->(v:Video)
          WHERE v.hash <> $currentVideoHash 
            AND v.validation IS NOT NULL
            AND v.validation.embeddedTimestamp IS NOT NULL
          WITH v, r.uploadedAt as uploadTime, v.validation.embeddedTimestamp as videoTime
          WHERE duration.between(datetime(videoTime), datetime(uploadTime)).hours > 24
          RETURN count(v) as conflicts, collect(v.hash) as conflictingVideos
          `,
          { uploaderId, currentVideoHash }
        );
        return res.records[0];
      });

      if (timeConflicts && timeConflicts.get("conflicts").toNumber() > 0) {
        patterns.push({
          type: "TIMESTAMP_CONFLICTS",
          severity: "HIGH",
          description: `Uploader has ${timeConflicts.get("conflicts")} videos with suspicious timestamp differences`,
          evidence: timeConflicts.get("conflictingVideos")
        });
      }
    }

    // Pattern 2: Multiple uploaders claiming same original content
    const duplicateOriginClaims = await session.executeRead(async (tx) => {
      const res = await tx.run(
        `
        MATCH (v:Video {hash: $currentVideoHash})<-[r:UPLOADED]-(u:Uploader)
        WHERE r.isOriginal = true
        RETURN count(u) as originalClaimants, collect(u.id) as claimants
        `,
        { currentVideoHash }
      );
      return res.records[0];
    });

    if (duplicateOriginClaims && duplicateOriginClaims.get("originalClaimants").toNumber() > 1) {
      patterns.push({
        type: "MULTIPLE_ORIGIN_CLAIMS",
        severity: "HIGH",
        description: "Multiple users claiming to be original uploader",
        evidence: duplicateOriginClaims.get("claimants")
      });
    }

    // Pattern 3: Rapid-fire uploads from same user
    if (uploaderId) {
      const rapidUploads = await session.executeRead(async (tx) => {
        const res = await tx.run(
          `
          MATCH (u:Uploader {id: $uploaderId})-[r:UPLOADED]->(v:Video)
          WHERE r.uploadedAt > datetime() - duration('PT1H') // Last hour
          RETURN count(v) as recentUploads
          `,
          { uploaderId }
        );
        return res.records[0];
      });

      if (rapidUploads && rapidUploads.get("recentUploads").toNumber() > 10) {
        patterns.push({
          type: "SUSPICIOUS_UPLOAD_RATE",
          severity: "MEDIUM",
          description: `User uploaded ${rapidUploads.get("recentUploads")} videos in the last hour`,
          evidence: { uploaderId, recentCount: rapidUploads.get("recentUploads").toNumber() }
        });
      }
    }

    // Pattern 4: Videos with identical metadata but different hashes (potential manipulation)
    const metadataMatches = await session.executeRead(async (tx) => {
      const res = await tx.run(
        `
        MATCH (current:Video {hash: $currentVideoHash})
        MATCH (other:Video)
        WHERE other.hash <> current.hash
          AND other.duration = current.duration
          AND other.width = current.width
          AND other.height = current.height
          AND abs(other.size - current.size) < 1000 // Within 1KB
        RETURN count(other) as similarVideos, collect(other.hash) as similarHashes
        `,
        { currentVideoHash }
      );
      return res.records[0];
    });

    if (metadataMatches && metadataMatches.get("similarVideos").toNumber() > 0) {
      patterns.push({
        type: "SIMILAR_METADATA",
        severity: "MEDIUM",
        description: "Found videos with nearly identical metadata but different content",
        evidence: metadataMatches.get("similarHashes")
      });
    }

    return patterns;
  } finally {
    await session.close();
  }
}

/**
 * 📊 Get System Statistics
 */
export async function getSystemStats() {
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      const res = await tx.run(
        `
        MATCH (v:Video) 
        OPTIONAL MATCH (u:Uploader)
        OPTIONAL MATCH (e:Event)
        OPTIONAL MATCH (l:Location)
        OPTIONAL MATCH (v2:Video) WHERE v2.validation.isValid = false
        
        RETURN 
          count(DISTINCT v) as totalVideos,
          count(DISTINCT u) as totalUploaders,
          count(DISTINCT e) as totalEvents,
          count(DISTINCT l) as totalLocations,
          count(DISTINCT v2) as invalidVideos,
          sum(v.size) as totalStorageBytes
        `
      );

      const record = res.records[0];
      return {
        totalVideos: record.get("totalVideos").toNumber(),
        totalUploaders: record.get("totalUploaders").toNumber(),
        totalEvents: record.get("totalEvents").toNumber(),
        totalLocations: record.get("totalLocations").toNumber(),
        invalidVideos: record.get("invalidVideos").toNumber(),
        totalStorageBytes: record.get("totalStorageBytes").toNumber(),
        lastUpdated: new Date().toISOString()
      };
    });

    return result;
  } finally {
    await session.close();
  }
}

/**
 * 🔍 Search Videos by Multiple Criteria
 */
export async function searchVideos(criteria) {
  const session = driver.session();

  try {
    let query = `MATCH (v:Video)`;
    let whereConditions = [];
    let params = {};

    // Add search conditions based on criteria
    if (criteria.uploaderId) {
      query += ` MATCH (u:Uploader {id: $uploaderId})-[:UPLOADED]->(v)`;
      params.uploaderId = criteria.uploaderId;
    }

    if (criteria.eventType) {
      query += ` MATCH (e:Event {type: $eventType})-[:CONTAINS]->(v)`;
      params.eventType = criteria.eventType;
    }

    if (criteria.dateFrom) {
      whereConditions.push(`v.createdAt >= datetime($dateFrom)`);
      params.dateFrom = criteria.dateFrom;
    }

    if (criteria.dateTo) {
      whereConditions.push(`v.createdAt <= datetime($dateTo)`);
      params.dateTo = criteria.dateTo;
    }

    if (criteria.validOnly) {
      whereConditions.push(`v.validation.isValid = true`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }

    query += ` RETURN v ORDER BY v.createdAt DESC LIMIT ${criteria.limit || 50}`;

    const result = await session.executeRead(async (tx) => {
      const res = await tx.run(query, params);
      return res.records.map(record => record.get("v").properties);
    });

    return result;
  } finally {
    await session.close();
  }
}