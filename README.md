# Video Archival Diplomatics (Backend)

A production-ready Express API for video archival diplomatics:
- Upload videos, compute SHA-256 hash, extract basic metadata
- Store content on IPFS
- Persist graph relationships in Neo4j
- Optionally register hashes on Ethereum via a simple smart contract

This version uses Docker Compose for the app, Neo4j, and IPFS.

---

## 🚀 Quick Start (One Command)

**Get started in under 5 minutes!**

### Linux / macOS / Git Bash
```bash
./init.sh
```

### Windows
```bat
init.bat
```

The initialization script will set up everything automatically. See [QUICKSTART.md](QUICKSTART.md) for details.

---

## Manual Setup (Docker + Neo4j + IPFS)

1) Install deps locally (for tooling and contract tasks):
```bash
npm ci
```

2) Configure environment:
```bash
cp .env.example .env
# Defaults are set for Docker; adjust if needed
```

3) Start services:
```bash
mkdir -p uploads
docker compose up -d
```

4) Initialize Neo4j constraints/indexes:
```bash
docker compose exec app npm run neo4j:init
```

5) Verify:
```bash
curl http://localhost:3000/health
# -> {"ok":true}
```

6) Upload a video:
```bash
curl -X POST http://localhost:3000/uploadVideo \
  -F "video=@your-video.mp4;type=video/mp4" \
  -F "uploaderId=testuser123" \
  -F "eventId=event001" \
  -F "eventType=Upload"
```

7) Check by hash:
```bash
curl http://localhost:3000/checkVideo/0x<returned_sha256_hash>
```

---

## 📋 Services

After initialization, the following services will be available:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web Interface** | http://localhost:3000 | N/A |
| **API** | http://localhost:3000 | N/A |
| **Neo4j Browser** | http://localhost:7475 | user: `neo4j`<br>password: `password123` |
| **IPFS Gateway** | http://localhost:8081 | N/A |
| **IPFS API** | http://localhost:5002 | N/A |

---

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes (recommended for first-time users)
- **[UPLOAD_TROUBLESHOOTING.md](UPLOAD_TROUBLESHOOTING.md)** - Debugging and setup guide
- **[UPLOAD_FIX_SUMMARY.md](UPLOAD_FIX_SUMMARY.md)** - Technical details and performance
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Architecture overview

---

## 🔗 Optional: On-chain Registration

To enable blockchain-based video hash registration:

1) Configure `.env`:
```
ETH_RPC_URL=https://sepolia.infura.io/v3/<YOUR_PROJECT_ID>
ETH_PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>
CHAIN_ID=11155111
```

2) Deploy the contract:
```bash
npm run contracts:compile
npm run contracts:deploy
# Copy the printed address to:
# CONTRACT_ADDRESS=0x...
```

3) Re-upload a file; response includes `chain.submitted=true` and a tx hash.

---

## 🔧 Troubleshooting

See [UPLOAD_TROUBLESHOOTING.md](UPLOAD_TROUBLESHOOTING.md) for comprehensive debugging help.

**Quick fixes:**

- Rebuild after changes:
```bash
docker compose up -d --build
```

- View logs:
```bash
docker compose logs -f app neo4j ipfs
```

- Reset (remove volumes/data):
```bash
docker compose down -v
```

- Permission issues on uploads:
```bash
mkdir -p uploads && chmod 775 uploads
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source. See LICENSE for details.

---

**Built with ❤️ to fight fake news with blockchain technology** 🎥⛓️🔍