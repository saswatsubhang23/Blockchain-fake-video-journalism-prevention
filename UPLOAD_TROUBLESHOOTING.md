# Upload Troubleshooting Guide

This guide helps you troubleshoot upload issues in the Video Archival Diplomatics application.

## Common Upload Issues and Solutions

### 1. Upload Stuck or Times Out

**Symptoms:**
- Upload progress stops at a certain point
- Browser shows "pending" indefinitely
- No error messages in the console

**Solutions:**

#### Check Service Health
```bash
# If using Docker:
docker compose ps
docker compose logs -f app neo4j ipfs

# Check if Neo4j is responding:
curl http://localhost:7475

# Check if IPFS is responding:
curl http://localhost:5002/api/v0/version
```

#### Verify Configuration
1. Check `.env` file matches your setup:
   - For Docker: Use the default `.env` (IPFS at `ipfs:5001`, Neo4j at `neo4j:7687`)
   - For local: Use `.env.local` (IPFS at `127.0.0.1:5001`, Neo4j at `localhost:7687`)

2. Ensure passwords match:
   - `.env` should have `NEO4J_PASSWORD=password123`
   - This matches the docker-compose.yml configuration

#### Increase Timeouts
If you're uploading large files, you may need to increase timeouts:

Edit `src/controllers/videoController.js`:
```javascript
// Change IPFS timeout from 120000 (2 min) to 300000 (5 min)
ipfs = await withTimeout(
  addFileFromPath(file.path, file.originalname),
  300000,  // 5 minutes
  'IPFS upload'
);
```

### 2. IPFS Upload Fails

**Symptoms:**
- Error message contains "IPFS upload failed"
- Logs show connection refused or timeout

**Solutions:**

#### Verify IPFS is Running
```bash
# Docker:
docker compose ps ipfs
docker compose logs ipfs

# Local IPFS daemon:
ipfs daemon
# or if using IPFS Desktop, ensure it's running
```

#### Check IPFS Endpoint
```bash
# Test IPFS connection:
curl http://localhost:5002/api/v0/version  # Docker (mapped from 5001)
curl http://localhost:5001/api/v0/version  # Local daemon
```

#### Common IPFS Issues:
- **Port conflicts**: Check if port 5001 is already in use
- **CORS issues**: Ensure IPFS API allows connections
- **Storage space**: Check if IPFS has enough disk space

### 3. Neo4j Connection Fails

**Symptoms:**
- Error message contains "Neo4j connection failed" or "Database storage failed"
- Upload fails after IPFS upload succeeds

**Solutions:**

#### Verify Neo4j is Running
```bash
# Docker:
docker compose ps neo4j
docker compose logs neo4j

# Local Neo4j:
# Check Neo4j browser at http://localhost:7474
```

#### Initialize Neo4j Constraints
```bash
# Docker:
docker compose exec app npm run neo4j:init

# Local:
npm run neo4j:init
```

#### Check Neo4j Credentials
1. Default credentials: `neo4j` / `password123`
2. Verify in `.env` file
3. Test connection in Neo4j Browser (http://localhost:7475 for Docker, 7474 for local)

### 4. Blockchain Registration Fails

**Symptoms:**
- Upload completes but blockchain shows "submitted: false"
- This is expected if blockchain is not configured

**Solutions:**

This is **optional** and won't prevent uploads from working. To enable:

1. Get a testnet RPC URL (e.g., from Infura, Alchemy)
2. Add to `.env`:
   ```
   ETH_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   ETH_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   ```
3. Deploy contract:
   ```bash
   npm run contracts:compile
   npm run contracts:deploy
   ```
4. Add contract address to `.env`:
   ```
   CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
   ```

### 5. Metadata Extraction Fails

**Symptoms:**
- Upload fails during "metadata validation" stage
- Error mentions ffprobe or ffmpeg

**Solutions:**

This is handled gracefully - upload will continue with basic metadata. If you want full metadata:

1. Ensure ffmpeg is installed:
   ```bash
   # Ubuntu/Debian:
   sudo apt-get install ffmpeg
   
   # macOS:
   brew install ffmpeg
   ```

2. The app uses `ffmpeg-static` and `ffprobe-static` npm packages, which should work automatically.

## Development Setup

### Option 1: Docker (Recommended)

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env

# 3. Start all services
mkdir -p uploads
docker compose up -d

# 4. Initialize Neo4j
docker compose exec app npm run neo4j:init

# 5. Check logs
docker compose logs -f app

# 6. Test
curl http://localhost:3000/health
```

### Option 2: Local Development

**Prerequisites:**
- Node.js 18+
- Neo4j Desktop or Server
- IPFS daemon or Desktop app

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment for local
cp .env.local .env

# 3. Start Neo4j (via Neo4j Desktop or systemctl)

# 4. Start IPFS daemon
ipfs daemon
# or start IPFS Desktop application

# 5. Initialize Neo4j
npm run neo4j:init

# 6. Start the server
npm start

# 7. Test
curl http://localhost:3000/health
```

## Monitoring Upload Progress

### Check Server Logs

The server now provides detailed logging at each stage:

```
📹 Processing video upload from user123
📁 File: video.mp4 (12345678 bytes)
🔐 Generating hash...
✅ Hash generated: 0xabc123...
🔍 Validating metadata...
✅ Metadata validation: PASSED
🔍 Checking for duplicates...
💾 Uploading to IPFS...
📤 Uploading video.mp4 to IPFS...
📦 File size: 12345678 bytes
✅ IPFS upload successful: QmXyz...
✅ IPFS upload complete: QmXyz...
⛓️ Attempting blockchain registration...
⚠️ Blockchain registration failed/skipped: Wallet or contract not configured
📊 Storing in Neo4j database...
✅ Video stored in Neo4j
👤 Creating uploader relationship...
✅ Uploader linked
🕵️ Analyzing for suspicious patterns...
✅ Pattern analysis complete: 0 patterns found
✅ Upload complete! Hash: 0xabc123..., Risk level: LOW
```

### Browser Console

Open browser DevTools (F12) and check:
- Network tab for failed requests
- Console tab for JavaScript errors

## Testing Upload

### Using cURL

```bash
curl -X POST http://localhost:3000/uploadVideo \
  -F "video=@test-video.mp4;type=video/mp4" \
  -F "uploaderId=testuser" \
  -F "eventId=event001" \
  -F "eventType=NewsReport"
```

### Using the Web Interface

1. Open http://localhost:3000 in your browser
2. Drag and drop a video file or click to upload
3. Fill in metadata fields:
   - Uploader ID (required)
   - Event ID (optional)
   - Event Type (optional)
   - Location (optional)
4. Click "Upload Video"
5. Monitor progress in browser console and server logs

## Port Reference

### Docker Setup:
- App: http://localhost:3000
- Neo4j Browser: http://localhost:7475
- Neo4j Bolt: bolt://localhost:7687
- IPFS API: http://localhost:5002
- IPFS Gateway: http://localhost:8081

### Local Setup:
- App: http://localhost:3000
- Neo4j Browser: http://localhost:7474
- Neo4j Bolt: bolt://localhost:7687
- IPFS API: http://localhost:5001
- IPFS Gateway: http://localhost:8080

## Performance Tips

1. **Large Files**: Set appropriate timeouts for your file sizes
   - Default IPFS timeout: 120 seconds (2 minutes)
   - For files >100MB, increase to 300+ seconds

2. **Network Speed**: IPFS upload speed depends on your network
   - Local IPFS daemon is faster than remote gateways
   - Consider pinning to multiple IPFS nodes

3. **Database Performance**: Neo4j indexes help with queries
   - Run `npm run neo4j:init` to create indexes
   - Consider increasing Neo4j memory for large datasets

## Getting Help

If you're still experiencing issues:

1. Check server logs for detailed error messages
2. Verify all services are running and healthy
3. Test each service independently (IPFS, Neo4j)
4. Check file permissions on `uploads` directory
5. Ensure ports are not blocked by firewall

## Quick Fixes Checklist

- [ ] All services running (docker compose ps or manual check)
- [ ] Correct .env configuration for your setup
- [ ] Neo4j initialized (npm run neo4j:init)
- [ ] Uploads directory exists and writable
- [ ] No port conflicts
- [ ] Sufficient disk space for uploads and IPFS
- [ ] Network connectivity for IPFS and blockchain (if used)
