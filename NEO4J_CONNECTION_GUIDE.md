# 🗄️ Neo4j Database Connection & Setup Guide

## 🔐 **Connection Details**

### **Neo4j Browser Interface:**
- **URL:** http://localhost:7475/browser/
- **Username:** `neo4j`
- **Password:** `password`
- **Bolt URL:** `bolt://localhost:7688`

---

## 🚀 **Step-by-Step Connection Process**

### **Step 1: Open Neo4j Browser**
1. Go to: http://localhost:7475/browser/
2. You'll see the Neo4j Browser login screen

### **Step 2: Connect to Database**
1. **Connect URL:** Leave as default (`neo4j://localhost:7687` will be auto-corrected)
2. **Authentication Type:** `Username / Password`
3. **Username:** `neo4j`
4. **Password:** `password`
5. Click **"Connect"**

### **Step 3: Verify Connection**
Run this query to test:
```cypher
RETURN "Hello Neo4j!" as greeting
```

---

## 📊 **Exploring Your Fake Journalism Detection Database**

### **🔍 Basic Exploration Queries**

#### **1. See All Videos in System:**
```cypher
MATCH (v:Video) 
RETURN v.hash, v.filename, v.uploadTimestamp, v.validation.trustScore
LIMIT 10
```

#### **2. View All Node Types:**
```cypher
CALL db.labels() YIELD label
RETURN label ORDER BY label
```

#### **3. See All Relationship Types:**
```cypher
CALL db.relationshipTypes() YIELD relationshipType
RETURN relationshipType ORDER BY relationshipType
```

#### **4. Count Everything:**
```cypher
MATCH (n) 
RETURN labels(n)[0] as NodeType, count(n) as Count
ORDER BY Count DESC
```

### **🕵️ Fake Journalism Detection Queries**

#### **5. Find Duplicate Videos:**
```cypher
MATCH (v1:Video), (v2:Video) 
WHERE v1.hash = v2.hash AND id(v1) < id(v2)
RETURN v1.filename as Original, v2.filename as Duplicate, v1.hash as Hash
```

#### **6. Check Video Authenticity:**
```cypher
MATCH (v:Video)
WHERE v.validation.trustScore < 70
RETURN v.filename, v.validation.trustScore, v.validation.riskLevel, v.validation.issues
ORDER BY v.validation.trustScore ASC
```

#### **7. Find Suspicious Upload Patterns:**
```cypher
MATCH (u:Uploader)-[:UPLOADED]->(v:Video)
WITH u, count(v) as videoCount, collect(v.uploadTimestamp) as timestamps
WHERE videoCount > 5
RETURN u.id, videoCount, timestamps[0] as firstUpload, timestamps[-1] as lastUpload
ORDER BY videoCount DESC
```

#### **8. Trace Video Relationships:**
```cypher
MATCH path = (v:Video)-[:DERIVED_FROM*1..3]->(original:Video)
RETURN path
LIMIT 10
```

#### **9. Event Analysis:**
```cypher
MATCH (e:Event)-[:CONTAINS]->(v:Video)
WITH e, count(v) as videoCount, collect(v.validation.trustScore) as trustScores
RETURN e.type, e.description, videoCount, 
       round(reduce(sum = 0, score IN trustScores | sum + score) / size(trustScores)) as avgTrustScore
ORDER BY videoCount DESC
```

#### **10. Location-Based Analysis:**
```cypher
MATCH (l:Location)<-[:RECORDED_AT]-(v:Video)<-[:UPLOADED]-(u:Uploader)
WITH l, collect(DISTINCT u.id) as uploaders, count(v) as videoCount
WHERE size(uploaders) > 1
RETURN l.name, l.coordinates, uploaders, videoCount
ORDER BY videoCount DESC
```

### **🎯 Advanced Fraud Detection Queries**

#### **11. Find Videos with Metadata Inconsistencies:**
```cypher
MATCH (v:Video)
WHERE v.validation.metadataInconsistencies > 0
RETURN v.filename, v.validation.metadataInconsistencies, v.validation.issues
ORDER BY v.validation.metadataInconsistencies DESC
```

#### **12. Detect Rapid Upload Bursts (Potential Bot Activity):**
```cypher
MATCH (u:Uploader)-[:UPLOADED]->(v:Video)
WITH u, v ORDER BY v.uploadTimestamp
WITH u, collect(v.uploadTimestamp) as timestamps
WITH u, timestamps, 
     [i IN range(0, size(timestamps)-2) | 
      duration.between(datetime(timestamps[i]), datetime(timestamps[i+1])).minutes] as intervals
WHERE any(interval IN intervals WHERE interval < 5)
RETURN u.id, size(timestamps) as totalVideos, intervals
```

#### **13. Find Videos Claiming Same Event from Different Perspectives:**
```cypher
MATCH (e:Event)-[:CONTAINS]->(v:Video)
WITH e, collect(v) as videos
WHERE size(videos) > 1
UNWIND videos as v1
UNWIND videos as v2
WHERE id(v1) < id(v2) AND v1.hash <> v2.hash
RETURN e.type, e.description, v1.filename, v2.filename, 
       v1.validation.trustScore, v2.validation.trustScore
```

---

## 🛠️ **Database Management**

### **Clear All Data (Reset Database):**
```cypher
MATCH (n) DETACH DELETE n
```

### **Create Sample Test Data:**
```cypher
// Create a test uploader
CREATE (u:Uploader {id: 'test_journalist', totalUploads: 1, lastSeen: datetime()})

// Create a test video
CREATE (v:Video {
  hash: 'test123hash',
  filename: 'breaking_news.mp4',
  ipfsCid: 'QmTest123',
  uploadTimestamp: datetime(),
  validation: {
    trustScore: 85,
    riskLevel: 'LOW',
    metadataInconsistencies: 0,
    issues: []
  }
})

// Create an event
CREATE (e:Event {
  id: 'protest_2025',
  type: 'protest',
  description: 'Peaceful demonstration',
  tags: ['democracy', 'peaceful']
})

// Create relationships
CREATE (u)-[:UPLOADED]->(v)
CREATE (e)-[:CONTAINS]->(v)
```

### **View Database Schema:**
```cypher
CALL db.schema.visualization()
```

---

## 🎯 **Pro Tips for Fake Journalism Detection**

### **Red Flags to Look For:**
1. **Low Trust Scores** (< 50)
2. **Multiple uploads from same user in short time**
3. **Videos with identical hashes but different claimed events**
4. **Metadata inconsistencies**
5. **Same location, different claimed times**

### **Green Flags (Authentic Content):**
1. **Trust Score > 80**
2. **Consistent metadata**
3. **Unique hash with no duplicates**
4. **Reasonable upload patterns**
5. **Verifiable location/time data**

---

## 🔧 **Troubleshooting**

### **Connection Issues:**
- **Port 7475 not accessible:** Check if Docker container is running
- **Authentication failed:** Use `neo4j` / `password`
- **Database empty:** Run the initialization script again

### **Common Commands:**
```bash
# Check Neo4j container status
docker ps | grep neo4j

# View Neo4j logs
docker logs neo4j --tail 20

# Restart Neo4j
docker-compose restart neo4j

# Re-initialize database
docker exec video-archival-app node scripts/initNeo4jEnhanced.js
```

---

## 🌟 **Your Database is Ready!**

Your Neo4j database is now set up with:
- ✅ **Enhanced schema** for video verification
- ✅ **Fraud detection** capabilities  
- ✅ **Relationship tracking** between videos, uploaders, events
- ✅ **Trust scoring** system
- ✅ **Sample data** for testing

Start exploring with the queries above! 🚀