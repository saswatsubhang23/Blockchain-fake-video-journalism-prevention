import { config as dotenv } from "dotenv";

let cached;

export function loadConfig() {
  if (cached) return cached;
  dotenv();

  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const cfg = {
    server: {
      port: num(process.env.PORT, 3000),
      nodeEnv: process.env.NODE_ENV || "production"
    },
    uploads: {
      dir: process.env.UPLOAD_DIR || "uploads",
      maxFileSize: num(process.env.MAX_FILE_SIZE, 1073741824) // 1 GiB
    },
    ipfs: {
      endpoint: process.env.IPFS_ENDPOINT || "http://ipfs:5001",
      projectId: process.env.IPFS_PROJECT_ID || "",
      projectSecret: process.env.IPFS_PROJECT_SECRET || ""
    },
    neo4j: {
      uri: process.env.NEO4J_URI || "bolt://neo4j:7687",
      username: process.env.NEO4J_USERNAME || "neo4j",
      password: process.env.NEO4J_PASSWORD || "password123"
    },
    eth: {
      rpcUrl: process.env.ETH_RPC_URL || "",
      privateKey: process.env.ETH_PRIVATE_KEY || "",
      contractAddress: process.env.CONTRACT_ADDRESS || "",
      chainId: num(process.env.CHAIN_ID, 11155111),
      etherscanApiKey: process.env.ETHERSCAN_API_KEY || ""
    }
  };

  // Soft validations
  const missing = [];
  if (!cfg.ipfs.endpoint) missing.push("IPFS_ENDPOINT");
  if (!cfg.neo4j.uri) missing.push("NEO4J_URI");
  if (!cfg.neo4j.username) missing.push("NEO4J_USERNAME");
  if (!cfg.neo4j.password) missing.push("NEO4J_PASSWORD");

  if (missing.length) {
    console.warn("⚠️ Missing important env vars:", missing.join(", "));
  }

  cached = cfg;
  return cfg;
}