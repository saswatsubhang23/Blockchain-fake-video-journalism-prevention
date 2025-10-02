import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe-static";
import { addFileFromPath } from "../services/ipfs.js";
import { 
  upsertVideo, 
  findVideoByHash, 
  createUploader, 
  createEvent, 
  createLocation,
  linkVideoToUploader,
  linkVideoToEvent,
  linkVideoToLocation,
  findSuspiciousPatterns,
  getVideoRelationships 
} from "../services/neo4j.js";
import { registerHashOnChain, isRegisteredOnChain } from "../services/eth.js";
import { sha256File } from "../utils/hash.js";

ffmpeg.setFfprobePath(ffprobe.path);

/**
 * 🔹 Enhanced Metadata Validation with Tamper Detection
 */
async function extractAndValidateMetadata(filePath, claimedTimestamp = null, location = null) {
  return await new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data) {
        return resolve({ 
          duration: null, 
          format: null, 
          size: null, 
          mimeType: null,
          validation: { isValid: false, issues: ["Failed to read metadata"] }
        });
      }

      const metadata = {
        duration: data.format?.duration ?? null,
        format: data.format?.format_name ?? null,
        size: data.format?.size ? Number(data.format.size) : null,
        mimeType: (data.format?.format_long_name || "").toLowerCase().includes("mp4") ? "video/mp4" : null,
        codec: data.streams?.[0]?.codec_name ?? null,
        bitrate: data.format?.bit_rate ? Number(data.format.bit_rate) : null,
        creationTime: data.format?.tags?.creation_time ?? null,
        
        // Video-specific metadata
        width: data.streams?.[0]?.width ?? null,
        height: data.streams?.[0]?.height ?? null,
        frameRate: data.streams?.[0]?.r_frame_rate ?? null,
        
        validation: validateMetadata(data, claimedTimestamp, location)
      };

      resolve(metadata);
    });
  });
}

/**
 * 🕵️ Metadata Validation Logic - Detects Tampering
 */
function validateMetadata(ffprobeData, claimedTimestamp, location) {
  const issues = [];
  let isValid = true;

  // Check format consistency
  if (!ffprobeData.format || !ffprobeData.streams) {
    issues.push("Invalid or corrupted video format");
    isValid = false;
  }

  // Check timestamp consistency
  const embeddedTimestamp = ffprobeData.format?.tags?.creation_time;
  if (claimedTimestamp && embeddedTimestamp) {
    const claimed = new Date(claimedTimestamp);
    const embedded = new Date(embeddedTimestamp);
    const timeDiff = Math.abs(claimed - embedded) / (1000 * 60 * 60); // hours
    
    if (timeDiff > 24) { // More than 24 hours difference
      issues.push(`Timestamp mismatch: claimed ${claimed.toISOString()} vs embedded ${embedded.toISOString()}`);
      isValid = false;
    }
  }

  // Check codec consistency
  const videoStream = ffprobeData.streams?.find(s => s.codec_type === 'video');
  if (videoStream && videoStream.codec_name && !['h264', 'h265', 'vp9', 'av1'].includes(videoStream.codec_name.toLowerCase())) {
    issues.push(`Unusual codec detected: ${videoStream.codec_name}`);
  }

  // Check duration consistency
  if (ffprobeData.format?.duration && ffprobeData.format.duration < 0.1) {
    issues.push("Suspiciously short duration");
  }

  return {
    isValid,
    issues,
    embeddedTimestamp,
    suspiciousCodec: videoStream?.codec_name,
    hasMetadata: !!embeddedTimestamp
  };
}

/**
 * 🎯 Main Upload Video Controller - Enhanced Workflow
 */
export async function uploadVideo(req, res, next) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: "No file uploaded (field name: video)" });

    // 🔹 Input Processing
    const { 
      uploaderId, 
      eventId, 
      eventType, 
      derivedFromHash,
      claimedTimestamp,
      location,
      gpsCoordinates,
      eventTags,
      description
    } = req.body;

    console.log(`📹 Processing video upload from ${uploaderId || 'anonymous'}`);

    // 🔹 Step 1: Generate SHA-256 Hash (Digital Fingerprint)
    const hash = sha256File(file.path, true);
    console.log(`🔐 Generated hash: ${hash}`);

    // 🔹 Step 2: Enhanced Metadata Validation with Tamper Detection
    const metadata = await extractAndValidateMetadata(file.path, claimedTimestamp, location);
    console.log(`🔍 Metadata validation: ${metadata.validation.isValid ? 'PASSED' : 'FAILED'}`);

    // 🔹 Step 3: Check for Existing Video (Duplicate Detection)
    const existingVideo = await findVideoByHash(hash);
    if (existingVideo) {
      console.log(`⚠️ Duplicate detected! Hash ${hash} already exists`);
      
      // Create relationship for duplicate upload
      if (uploaderId) {
        await linkVideoToUploader(hash, uploaderId, { isDuplicate: true, uploadedAt: new Date().toISOString() });
      }

      return res.status(200).json({
        ok: true,
        isDuplicate: true,
        hash,
        message: "Video already exists in system",
        originalUpload: existingVideo,
        validation: metadata.validation,
        relationships: await getVideoRelationships(hash)
      });
    }

    // 🔹 Step 4: Store in IPFS (Decentralized Storage)
    console.log(`💾 Storing in IPFS...`);
    const ipfs = await addFileFromPath(file.path, file.originalname);
    console.log(`✅ IPFS storage complete: ${ipfs.cid}`);

    // 🔹 Step 5: Register on Blockchain (Optional but Recommended)
    let blockchainResult = { submitted: false };
    try {
      console.log(`⛓️ Registering on blockchain...`);
      blockchainResult = await registerHashOnChain(hash, ipfs.uri);
      console.log(`✅ Blockchain registration: ${blockchainResult.submitted ? 'SUCCESS' : 'SKIPPED'}`);
    } catch (e) {
      console.log(`⚠️ Blockchain registration failed: ${e.message}`);
      blockchainResult = { submitted: false, reason: e.message };
    }

    // 🔹 Step 6: Create Video Node in Neo4j
    const videoData = {
      hash: String(hash),
      ipfsCid: String(ipfs.cid || ''),
      ipfsUri: String(ipfs.uri || ''),
      gatewayUrl: String(ipfs.gatewayUrl || ''),
      size: Number(metadata.size ?? file.size ?? 0),
      mimeType: String(metadata.mimeType ?? file.mimetype ?? 'video/mp4'),
      duration: Number(metadata.duration ?? 0),
      format: String(metadata.format ?? 'unknown'),
      codec: String(metadata.codec ?? 'h264'),
      bitrate: Number(metadata.bitrate ?? 1000000),
      width: Number(metadata.width ?? 1920),
      height: Number(metadata.height ?? 1080),
      frameRate: String(metadata.frameRate ?? '30/1'),
      creationTime: String(metadata.creationTime ?? new Date().toISOString()),
      validationStatus: String(metadata.validation?.isValid ? 'VALID' : 'INVALID'),
      validationIssues: String(JSON.stringify(metadata.validation?.issues || [])),
      blockchainTxn: String(blockchainResult?.txHash || ''),
      description: String(description || '')
    };

    console.log('DEBUG: About to call upsertVideo with:', videoData);
    const storedVideo = await upsertVideo(videoData);
    console.log(`📊 Video stored in Neo4j`);

    // 🔹 Step 7: Create Graph Relationships
    const relationships = [];

    // Uploader → Video relationship
    if (uploaderId) {
      console.log('DEBUG: About to call createUploader with:', {
        id: uploaderId,
        ipAddress: String(req.ip || ''),
        userAgent: String(req.get('User-Agent') || '')
      });
      await createUploader({
        id: uploaderId,
        ipAddress: String(req.ip || ''),
        userAgent: String(req.get('User-Agent') || '')
      });
      await linkVideoToUploader(hash, uploaderId, { 
        uploadedAt: new Date().toISOString(),
        isOriginal: derivedFromHash ? false : true,
        isDuplicate: false
      });
      relationships.push(`(${uploaderId})-[:UPLOADED]->(${hash})`);
    }

    // Event → Video relationship
    if (eventId && eventType) {
      await createEvent({
        id: String(eventId),
        type: String(eventType),
        tags: eventTags ? String(eventTags).split(',').map(tag => String(tag.trim())) : [],
        description: String(description || '')
      });
      await linkVideoToEvent(hash, eventId, { 
        eventType: String(eventType),
        recordedAt: String(claimedTimestamp || new Date().toISOString())
      });
      relationships.push(`(${eventId})-[:CONTAINS]->(${hash})`);
    }

    // Location → Video relationship
    if (location || gpsCoordinates) {
      const locationId = await createLocation({
        name: String(location || ''),
        coordinates: String(gpsCoordinates || ''),
        timestamp: String(claimedTimestamp || new Date().toISOString())
      });
      await linkVideoToLocation(hash, locationId);
      relationships.push(`(${locationId})-[:RECORDED_AT]->(${hash})`);
    }

    // Derived relationship (if this video is derived from another)
    if (derivedFromHash) {
      // This will be handled in the Neo4j service
      relationships.push(`(${hash})-[:DERIVED_FROM]->(${derivedFromHash})`);
    }

    // 🔹 Step 8: Analyze Suspicious Patterns
    const suspiciousPatterns = await findSuspiciousPatterns(uploaderId, hash);

    // 🔹 Final Output - Comprehensive Report
    const response = {
      ok: true,
      isDuplicate: false,
      timestamp: new Date().toISOString(),
      
      // Core identifiers
      hash,
      ipfs: {
        cid: ipfs.cid,
        uri: ipfs.uri,
        gatewayUrl: ipfs.gatewayUrl
      },
      
      // Validation results
      validation: {
        isValid: metadata.validation.isValid,
        issues: metadata.validation.issues,
        embeddedTimestamp: metadata.validation.embeddedTimestamp,
        hasMetadata: metadata.validation.hasMetadata
      },
      
      // Metadata
      metadata: {
        size: videoData.size,
        duration: videoData.duration,
        format: videoData.format,
        codec: videoData.codec,
        dimensions: `${videoData.width}x${videoData.height}`,
        bitrate: videoData.bitrate
      },
      
      // Storage & Blockchain
      storage: {
        ipfs: { stored: true, cid: ipfs.cid },
        neo4j: { stored: true, relationships: relationships.length },
        blockchain: blockchainResult
      },
      
      // Graph relationships
      relationships: {
        created: relationships,
        count: relationships.length
      },
      
      // Security analysis
      security: {
        suspiciousPatterns: suspiciousPatterns.length,
        patterns: suspiciousPatterns,
        riskLevel: suspiciousPatterns.length > 0 ? 'HIGH' : 'LOW'
      },

      // Database record
      neo4j: storedVideo
    };

    console.log(`✅ Upload complete! Risk level: ${response.security.riskLevel}`);
    return res.json(response);

  } catch (err) {
    console.error('❌ Upload failed:', err);
    next(err);
  }
}

/**
 * 🔍 Enhanced Video Check with Relationship Analysis
 */
export async function checkVideo(req, res, next) {
  try {
    let { hash } = req.params;
    if (!hash) return res.status(400).json({ ok: false, error: "Hash param required" });
    if (!hash.startsWith("0x")) hash = `0x${hash}`;

    console.log(`🔍 Checking video: ${hash}`);

    // Get video from Neo4j
    const storedVideo = await findVideoByHash(hash);
    if (!storedVideo) {
      return res.status(404).json({ ok: false, error: "Video not found" });
    }

    // Check blockchain status
    const onChain = await isRegisteredOnChain(hash).catch(() => false);

    // Get all relationships
    const relationships = await getVideoRelationships(hash);

    // Analyze patterns
    const suspiciousPatterns = await findSuspiciousPatterns(
      storedVideo.uploaders?.[0]?.id, 
      hash
    );

    const response = {
      ok: true,
      hash,
      onChain,
      
      // Video details
      video: storedVideo,
      
      // Validation status
      validation: storedVideo.validation || { isValid: true, issues: [] },
      
      // All relationships in the graph
      relationships: {
        uploaders: relationships.uploaders || [],
        events: relationships.events || [],
        locations: relationships.locations || [],
        derivedVideos: relationships.derivedVideos || [],
        parentVideos: relationships.parentVideos || []
      },
      
      // Security analysis
      security: {
        suspiciousPatterns: suspiciousPatterns.length,
        patterns: suspiciousPatterns,
        riskLevel: suspiciousPatterns.length > 0 ? 'HIGH' : 'LOW',
        trustScore: calculateTrustScore(storedVideo, relationships, suspiciousPatterns)
      },
      
      // Verification proof
      proof: {
        ipfs: storedVideo.ipfsCid,
        blockchain: storedVideo.blockchainTxn,
        timestamp: storedVideo.createdAt,
        hash: hash
      }
    };

    return res.json(response);
  } catch (err) {
    console.error('❌ Check failed:', err);
    next(err);
  }
}

/**
 * 🎯 Calculate Trust Score based on multiple factors
 */
function calculateTrustScore(video, relationships, suspiciousPatterns) {
  let score = 100; // Start with perfect score
  
  // Deduct for validation issues
  if (video.validation && !video.validation.isValid) {
    score -= 30;
  }
  
  // Deduct for suspicious patterns
  score -= suspiciousPatterns.length * 15;
  
  // Add points for blockchain verification
  if (video.blockchainTxn) {
    score += 10;
  }
  
  // Add points for having metadata
  if (video.validation?.hasMetadata) {
    score += 5;
  }
  
  // Add points for having multiple confirming sources
  if (relationships.uploaders?.length > 1) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
}