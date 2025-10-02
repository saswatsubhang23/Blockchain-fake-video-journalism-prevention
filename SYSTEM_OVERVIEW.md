# 🎥 Video Archival Diplomatics - Fake Journalism Prevention System

## 🎉 System Status: FULLY OPERATIONAL

### 📋 Services Running
- ✅ **Express.js API Server**: http://localhost:3000
- ✅ **Neo4j Database**: http://localhost:7475 (neo4j/password)
- ✅ **IPFS Node**: http://localhost:8081
- ✅ **Test Interface**: http://localhost:8000/test-interface.html

### 🔧 System Architecture

#### Core Components:
1. **Video Upload & Analysis**: SHA-256 hashing and metadata extraction
2. **IPFS Storage**: Decentralized, immutable content storage
3. **Neo4j Graph Database**: Relationship tracking and duplicate detection
4. **Blockchain Integration**: Optional Ethereum smart contract registry
5. **RESTful API**: Upload and verification endpoints

#### Data Flow:
```
Video Upload → Hash Generation → IPFS Storage → Neo4j Record → Response
     ↓
Duplicate Detection → Relationship Mapping → Verification Report
```

### 🛠 API Endpoints

#### 1. Upload Video
```
POST /uploadVideo
Content-Type: multipart/form-data

Fields:
- video: [file] Video file to upload
- uploaderId: [string] Identifier for the uploader
- eventType: [string] Type of event (journalism_verification, breaking_news, etc.)
- eventId: [string] Optional event identifier
- derivedFromHash: [string] Optional parent video hash

Response:
{
  "ok": true,
  "hash": "0x...",
  "ipfs": {
    "cid": "Qm...",
    "uri": "ipfs://...",
    "gatewayUrl": "http://..."
  },
  "neo4j": { ... },
  "chain": { "submitted": false }
}
```

#### 2. Check Video
```
GET /checkVideo/:hash

Response:
{
  "ok": true,
  "onChain": false,
  "video": {
    "hash": "0x...",
    "ipfsCid": "Qm...",
    "size": 123,
    "mimeType": "video/mp4",
    "uploaders": [...],
    "events": [...]
  }
}
```

### 🧪 Testing Examples

#### Upload Test File:
```bash
curl.exe -X POST \
  -F "video=@path/to/video.mp4" \
  -F "uploaderId=journalist_123" \
  -F "eventType=journalism_verification" \
  http://localhost:3000/uploadVideo
```

#### Check Video:
```bash
curl.exe -X GET http://localhost:3000/checkVideo/0x...
```

### 🔍 Fake Journalism Prevention Features

#### 1. Content Integrity
- **SHA-256 Hashing**: Cryptographic fingerprinting
- **IPFS Storage**: Immutable content addressing
- **Timestamp Recording**: Creation time verification

#### 2. Duplicate Detection
- **Hash Comparison**: Identical content detection
- **Relationship Mapping**: Track content derivations
- **Multiple Uploader Tracking**: See who uploaded what

#### 3. Verification Network
- **Graph Relationships**: Connect related content
- **Source Tracking**: Follow content lineage
- **Trust Scoring**: Based on uploader history

#### 4. Decentralized Proof
- **IPFS Distribution**: No single point of failure
- **Blockchain Registry**: Optional permanent record
- **Cryptographic Verification**: Tamper-evident storage

### 🗄 Database Schema (Neo4j)

#### Video Node:
```cypher
CREATE (v:Video {
  hash: "0x...",
  ipfsCid: "Qm...",
  size: 123456,
  mimeType: "video/mp4",
  duration: 120.5,
  createdAt: datetime(),
  updatedAt: datetime()
})
```

#### Relationships:
- `(:User)-[:UPLOADED]->(:Video)`
- `(:Video)-[:DERIVED_FROM]->(:Video)`
- `(:Event)-[:CONTAINS]->(:Video)`

### 🔒 Security Features

#### 1. Content Verification
- Cryptographic hashing prevents tampering
- IPFS content addressing ensures integrity
- Timestamp verification for chronological proof

#### 2. Distributed Storage
- No central point of failure
- Content replicated across IPFS network
- Resilient against censorship

#### 3. Audit Trail
- Complete upload history
- Multi-uploader tracking
- Event correlation

### 📊 Use Cases

#### 1. Journalism Verification
- Reporters upload original footage
- Editors verify content authenticity
- News organizations cross-reference sources

#### 2. Deepfake Detection
- Compare against known authentic content
- Track content manipulation chains
- Identify suspicious duplicates

#### 3. Legal Evidence
- Timestamped content for court proceedings
- Immutable storage for evidence preservation
- Chain of custody documentation

#### 4. Content Attribution
- Proper credit to original creators
- Prevent unauthorized redistribution
- Track content usage rights

### 🚀 Next Steps

#### Immediate Enhancements:
1. **Web Interface**: Complete frontend application
2. **Blockchain Setup**: Deploy Ethereum contracts
3. **Advanced Analytics**: ML-based similarity detection
4. **API Authentication**: User management system

#### Advanced Features:
1. **Video Similarity Analysis**: Detect edited versions
2. **Metadata Verification**: EXIF and technical analysis
3. **Social Graph Integration**: Reputation systems
4. **Real-time Alerts**: Suspicious activity detection

### 🔧 Development Commands

```bash
# Start services
docker compose up -d

# Initialize database
docker exec video-archival-app npm run neo4j:init

# Check logs
docker logs video-archival-app

# Stop services
docker compose down
```

### 📝 Configuration Files
- `docker-compose.yml`: Service orchestration
- `.env`: Environment configuration
- `package.json`: Node.js dependencies
- `hardhat.config.cjs`: Blockchain configuration

---

## 🎯 Mission Statement
This system empowers journalists, fact-checkers, and content creators to maintain the integrity of digital media in an era of sophisticated manipulation tools. By creating an immutable, verifiable record of authentic content, we help preserve truth in journalism and combat the spread of misinformation.

**Built with ❤️ for truth and transparency in digital media.**