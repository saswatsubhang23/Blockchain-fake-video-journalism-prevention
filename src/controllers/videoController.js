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
 * 🛡️ Timeout wrapper for async operations
 */
function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

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
 * 🎯 Main Upload Video Controller - Enhanced Workflow with Timeout Protection
 */
export async function uploadVideo(req, res, next) {
  let file = req.file;
  
  try {
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
    console.log(`📁 File: ${file.originalname} (${file.size} bytes)`);

    // 🔹 Step 1: Generate SHA-256 Hash (Digital Fingerprint)
    console.log(`🔐 Generating hash...`);
    const hash = sha256File(file.path, true);
    console.log(`✅ Hash generated: ${hash}`);

    // 🔹 Step 2: Enhanced Metadata Validation with Tamper Detection
    console.log(`🔍 Validating metadata...`);
    let metadata;
    try {
      metadata = await withTimeout(
        extractAndValidateMetadata(file.path, claimedTimestamp, location),
        30000,
        'Metadata extraction'
      );
      console.log(`✅ Metadata validation: ${metadata.validation.isValid ? 'PASSED' : 'FAILED'}`);
    } catch (err) {
      console.error(`❌ Metadata extraction failed:`, err.message);
      metadata = { 
        duration: null, 
        format: null, 
        size: file.size, 
        mimeType: file.mimetype,
        validation: { isValid: false, issues: [err.message] }
      };
    }

    // 🔹 Step 3: Check for Existing Video (Duplicate Detection)
    console.log(`🔍 Checking for duplicates...`);
    let existingVideo;
    try {
      existingVideo = await withTimeout(
        findVideoByHash(hash),
        10000,
        'Duplicate check'
      );
    } catch (err) {
      console.error(`⚠️ Duplicate check failed:`, err.message);
      existingVideo = null;
    }

    if (existingVideo) {
      console.log(`⚠️ Duplicate detected! Hash ${hash} already exists`);
      
      // Create relationship for duplicate upload
      if (uploaderId) {
        try {
          await linkVideoToUploader(hash, uploaderId, { isDuplicate: true, uploadedAt: new Date().toISOString() });
        } catch (err) {
          console.error(`⚠️ Failed to link duplicate:`, err.message);
        }
      }

      return res.status(200).json({
        ok: true,
        isDuplicate: true,
        hash,
        message: "Video already exists in system",
        originalUpload: existingVideo,
        validation: metadata.validation,
        relationships: await getVideoRelationships(hash).catch(() => ({}))
      });
    }

    // 🔹 Step 4: Store in IPFS (Decentralized Storage)
    console.log(`💾 Uploading to IPFS...`);
    let ipfs;
    try {
      ipfs = await withTimeout(
        addFileFromPath(file.path, file.originalname),
        120000,
        'IPFS upload'
      );
      console.log(`✅ IPFS upload complete: ${ipfs.cid}`);
    } catch (err) {
      console.error(`❌ IPFS upload failed:`, err.message);
      throw new Error(`IPFS upload failed: ${err.message}`);
    }

    // 🔹 Step 5: Register on Blockchain (Optional but Recommended)
    let blockchainResult = { submitted: false };
    try {
      console.log(`⛓️ Attempting blockchain registration...`);
      blockchainResult = await withTimeout(
        registerHashOnChain(hash, ipfs.uri),
        60000,
        'Blockchain registration'
      );
      console.log(`✅ Blockchain registration: ${blockchainResult.submitted ? 'SUCCESS' : 'SKIPPED'}`);
    } catch (e) {
      console.log(`⚠️ Blockchain registration failed/skipped: ${e.message}`);
      blockchainResult = { submitted: false, reason: e.message };
    }

    // 🔹 Step 6: Create Video Node in Neo4j
    console.log(`📊 Storing in Neo4j database...`);
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

    let storedVideo;
    try {
      storedVideo = await withTimeout(
        upsertVideo(videoData),
        15000,
        'Neo4j video creation'
      );
      console.log(`✅ Video stored in Neo4j`);
    } catch (err) {
      console.error(`❌ Neo4j storage failed:`, err.message);
      throw new Error(`Database storage failed: ${err.message}`);
    }

    // 🔹 Step 7: Create Graph Relationships
    const relationships = [];

    // Uploader → Video relationship
    if (uploaderId) {
      try {
        console.log(`👤 Creating uploader relationship...`);
        await withTimeout(
          createUploader({
            id: uploaderId,
            ipAddress: String(req.ip || ''),
            userAgent: String(req.get('User-Agent') || '')
          }),
          10000,
          'Uploader creation'
        );
        
        await withTimeout(
          linkVideoToUploader(hash, uploaderId, { 
            uploadedAt: new Date().toISOString(),
            isOriginal: derivedFromHash ? false : true,
            isDuplicate: false
          }),
          10000,
          'Uploader link'
        );
        relationships.push(`(${uploaderId})-[:UPLOADED]->(${hash})`);
        console.log(`✅ Uploader linked`);
      } catch (err) {
        console.error(`⚠️ Uploader linking failed:`, err.message);
      }
    }

    // Event → Video relationship
    if (eventId && eventType) {
      try {
        console.log(`🎪 Creating event relationship...`);
        await withTimeout(
          createEvent({
            id: String(eventId),
            type: String(eventType),
            tags: eventTags ? String(eventTags).split(',').map(tag => String(tag.trim())) : [],
            description: String(description || '')
          }),
          10000,
          'Event creation'
        );
        
        await withTimeout(
          linkVideoToEvent(hash, eventId, { 
            eventType: String(eventType),
            recordedAt: String(claimedTimestamp || new Date().toISOString())
          }),
          10000,
          'Event link'
        );
        relationships.push(`(${eventId})-[:CONTAINS]->(${hash})`);
        console.log(`✅ Event linked`);
      } catch (err) {
        console.error(`⚠️ Event linking failed:`, err.message);
      }
    }

    // Location → Video relationship
    if (location || gpsCoordinates) {
      try {
        console.log(`📍 Creating location relationship...`);
        const locationId = await withTimeout(
          createLocation({
            name: String(location || ''),
            coordinates: String(gpsCoordinates || ''),
            timestamp: String(claimedTimestamp || new Date().toISOString())
          }),
          10000,
          'Location creation'
        );
        
        await withTimeout(
          linkVideoToLocation(hash, locationId),
          10000,
          'Location link'
        );
        relationships.push(`(${locationId})-[:RECORDED_AT]->(${hash})`);
        console.log(`✅ Location linked`);
      } catch (err) {
        console.error(`⚠️ Location linking failed:`, err.message);
      }
    }

    // Derived relationship (if this video is derived from another)
    if (derivedFromHash) {
      relationships.push(`(${hash})-[:DERIVED_FROM]->(${derivedFromHash})`);
    }

    // 🔹 Step 8: Analyze Suspicious Patterns
    let suspiciousPatterns = [];
    try {
      console.log(`🕵️ Analyzing for suspicious patterns...`);
      suspiciousPatterns = await withTimeout(
        findSuspiciousPatterns(uploaderId, hash),
        15000,
        'Pattern analysis'
      );
      console.log(`✅ Pattern analysis complete: ${suspiciousPatterns.length} patterns found`);
    } catch (err) {
      console.error(`⚠️ Pattern analysis failed:`, err.message);
    }

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

    console.log(`✅ Upload complete! Hash: ${hash}, Risk level: ${response.security.riskLevel}`);
    return res.json(response);

  } catch (err) {
    console.error('❌ Upload failed:', err);
    console.error('Stack trace:', err.stack);
    
    // Send detailed error response
    return res.status(500).json({
      ok: false,
      error: err.message || 'Upload failed',
      stage: err.message?.includes('IPFS') ? 'IPFS upload' :
             err.message?.includes('Database') ? 'Database storage' :
             err.message?.includes('Metadata') ? 'Metadata extraction' :
             'Processing',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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