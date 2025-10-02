import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const required = ["PORT", "NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD", "IPFS_ENDPOINT"];

const missing = required.filter((k) => !process.env[k] || process.env[k].trim() === "");
if (missing.length) {
  console.warn("⚠️ Missing required environment variables:", missing.join(", "));
}

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const full = path.resolve(__dirname, "..", uploadDir);
if (!fs.existsSync(full)) {
  fs.mkdirSync(full, { recursive: true });
  console.log(`📁 Created upload dir at ${full}`);
}