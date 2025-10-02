import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { uploadVideo, checkVideo } from "../controllers/videoController_enhanced.js";
import { 
  getSystemStats, 
  searchVideos, 
  getVideoRelationships,
  findSuspiciousPatterns 
} from "../services/neo4j_enhanced.js";

const router = Router();

// 🎯 Enhanced Video Upload (Main Endpoint)
router.post("/uploadVideo", upload.single("video"), uploadVideo);

// 🔍 Enhanced Video Check with Relationships
router.get("/checkVideo/:hash", checkVideo);

// 📊 System Statistics and Analytics
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await getSystemStats();
    res.json({ ok: true, stats });
  } catch (err) {
    next(err);
  }
});

// 🔍 Advanced Video Search
router.get("/search", async (req, res, next) => {
  try {
    const {
      uploaderId,
      eventType,
      dateFrom,
      dateTo,
      validOnly = false,
      limit = 50
    } = req.query;

    const criteria = {
      uploaderId,
      eventType,
      dateFrom,
      dateTo,
      validOnly: validOnly === 'true',
      limit: parseInt(limit)
    };

    const results = await searchVideos(criteria);
    res.json({ 
      ok: true, 
      results,
      count: results.length,
      criteria 
    });
  } catch (err) {
    next(err);
  }
});

// 🕵️ Suspicious Pattern Analysis
router.get("/analyze/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const patterns = await findSuspiciousPatterns(null, hash);
    
    res.json({
      ok: true,
      hash,
      suspiciousPatterns: patterns,
      riskLevel: patterns.length > 0 ? 'HIGH' : 'LOW',
      analysis: {
        totalPatterns: patterns.length,
        highSeverity: patterns.filter(p => p.severity === 'HIGH').length,
        mediumSeverity: patterns.filter(p => p.severity === 'MEDIUM').length,
        lowSeverity: patterns.filter(p => p.severity === 'LOW').length
      }
    });
  } catch (err) {
    next(err);
  }
});

// 🔗 Get Video Relationships Graph
router.get("/relationships/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const relationships = await getVideoRelationships(hash);
    
    res.json({
      ok: true,
      hash,
      relationships,
      summary: {
        totalUploaders: relationships.uploaders?.length || 0,
        totalEvents: relationships.events?.length || 0,
        totalLocations: relationships.locations?.length || 0,
        derivedVideos: relationships.derivedVideos?.length || 0,
        parentVideos: relationships.parentVideos?.length || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

// 📈 Uploader Profile Analysis
router.get("/uploader/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // This would need to be implemented in neo4j service
    res.json({
      ok: true,
      uploaderId: id,
      message: "Uploader analysis endpoint - implement in neo4j service"
    });
  } catch (err) {
    next(err);
  }
});

// 🎪 Event Analysis
router.get("/event/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // This would need to be implemented in neo4j service
    res.json({
      ok: true,
      eventId: id,
      message: "Event analysis endpoint - implement in neo4j service"
    });
  } catch (err) {
    next(err);
  }
});

// 🆔 Verify Video Chain (for derived content)
router.get("/chain/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const relationships = await getVideoRelationships(hash);
    
    // Build the complete chain
    const chain = {
      current: hash,
      parents: relationships.parentVideos || [],
      children: relationships.derivedVideos || [],
      depth: 0
    };
    
    // Calculate chain depth
    let currentParents = relationships.parentVideos || [];
    while (currentParents.length > 0) {
      chain.depth++;
      // In a real implementation, you'd recursively get parent relationships
      break; // Simplified for now
    }
    
    res.json({
      ok: true,
      chain,
      isOriginal: chain.parents.length === 0,
      hasDerivatives: chain.children.length > 0,
      chainLength: chain.depth + chain.children.length
    });
  } catch (err) {
    next(err);
  }
});

export default router;