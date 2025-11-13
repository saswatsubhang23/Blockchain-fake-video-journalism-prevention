# 🚀 Quick Start Guide

Get the Video Archival Diplomatics project running in **under 5 minutes**!

## One-Command Setup

### Linux / macOS / Git Bash (Windows)
```bash
./init.sh
```

### Windows (Command Prompt / PowerShell)
```bat
init.bat
```

That's it! The script will:
- ✅ Check prerequisites (Docker, Node.js)
- ✅ Install dependencies
- ✅ Create configuration files
- ✅ Start all services (API, Neo4j, IPFS)
- ✅ Initialize database
- ✅ Verify everything works

## Manual Setup (Alternative)

If you prefer manual setup or the script doesn't work:

### Prerequisites
- [Docker Desktop](https://docs.docker.com/get-docker/) (required)
- [Node.js 18+](https://nodejs.org/) (optional but recommended)

### Steps

1. **Clone and enter the repository**
   ```bash
   git clone https://github.com/saswatsubhang23/Blockchain-fake-video-journalism-prevention.git
   cd Blockchain-fake-video-journalism-prevention
   ```

2. **Install dependencies** (optional, needed for local development)
   ```bash
   npm ci
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

4. **Create uploads directory**
   ```bash
   mkdir -p uploads
   ```

5. **Start services**
   ```bash
   docker compose up -d
   ```

6. **Initialize database**
   ```bash
   docker compose exec app npm run neo4j:init
   ```

7. **Verify**
   ```bash
   curl http://localhost:3000/health
   # Should return: {"ok":true}
   ```

## Access Your Services

Once setup is complete:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web Interface** | http://localhost:3000 | N/A |
| **API** | http://localhost:3000 | N/A |
| **Neo4j Browser** | http://localhost:7475 | user: `neo4j`<br>password: `password123` |
| **IPFS Gateway** | http://localhost:8081 | N/A |
| **IPFS API** | http://localhost:5002 | N/A |

## First Upload

### Via Web Interface
1. Open http://localhost:3000
2. Drag & drop a video file or click to upload
3. Fill in metadata (Uploader ID is required)
4. Click "Upload Video"
5. Wait for success message

### Via Command Line
```bash
curl -X POST http://localhost:3000/uploadVideo \
  -F "video=@your-video.mp4" \
  -F "uploaderId=testuser" \
  -F "eventId=event001" \
  -F "eventType=NewsReport"
```

## Common Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f neo4j
docker compose logs -f ipfs
```

### Stop Services
```bash
docker compose down
```

### Restart Services
```bash
docker compose restart
```

### Rebuild After Code Changes
```bash
docker compose up -d --build
```

### Reset Everything (Delete All Data)
```bash
docker compose down -v
```

## Troubleshooting

### Services Won't Start
```bash
# Check if ports are already in use
docker compose ps

# Check service logs
docker compose logs
```

### Upload Fails
1. Check all services are running: `docker compose ps`
2. Check logs: `docker compose logs -f app`
3. Verify IPFS: `curl http://localhost:5002/api/v0/version`
4. Verify Neo4j: Open http://localhost:7475 in browser

For detailed troubleshooting, see [UPLOAD_TROUBLESHOOTING.md](UPLOAD_TROUBLESHOOTING.md)

### Port Conflicts
If ports 3000, 7475, 7687, 5002, or 8081 are already in use:

1. Edit `docker-compose.yml`
2. Change port mappings (e.g., `3001:3000` instead of `3000:3000`)
3. Update `.env` if needed
4. Restart: `docker compose up -d`

## Next Steps

- 📖 Read [README.md](README.md) for detailed documentation
- 🔧 See [UPLOAD_TROUBLESHOOTING.md](UPLOAD_TROUBLESHOOTING.md) for debugging
- 🛠️ Check [UPLOAD_FIX_SUMMARY.md](UPLOAD_FIX_SUMMARY.md) for technical details
- 🔗 Explore [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) for architecture

## Optional: Blockchain Integration

To enable on-chain video registration:

1. Get a testnet RPC URL (e.g., from [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/))

2. Edit `.env`:
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

5. Restart services:
   ```bash
   docker compose restart app
   ```

## Development Mode

For local development without Docker:

1. Start Neo4j (via [Neo4j Desktop](https://neo4j.com/download/))
2. Start IPFS daemon: `ipfs daemon`
3. Copy local config: `cp .env.local .env`
4. Initialize database: `npm run neo4j:init`
5. Start server: `npm start`

## Support

- 🐛 Found a bug? [Open an issue](https://github.com/saswatsubhang23/Blockchain-fake-video-journalism-prevention/issues)
- 💡 Have a suggestion? [Start a discussion](https://github.com/saswatsubhang23/Blockchain-fake-video-journalism-prevention/discussions)
- 📧 Need help? Check the troubleshooting guides first

---

**Ready to fight fake news with blockchain?** 🎥⛓️🔍
