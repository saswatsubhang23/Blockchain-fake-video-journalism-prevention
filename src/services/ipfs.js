import { create } from "ipfs-http-client";
import { loadConfig } from "../config/env.js";
import fs from "fs/promises";
import path from "path";

const cfg = loadConfig();

/**
 * 🔄 Retry wrapper with exponential backoff
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function getClient() {
  const headers = {};
  if (cfg.ipfs.projectId && cfg.ipfs.projectSecret) {
    const auth = Buffer.from(`${cfg.ipfs.projectId}:${cfg.ipfs.projectSecret}`).toString("base64");
    headers.authorization = `Basic ${auth}`;
  }
  
  try {
    return create({ url: cfg.ipfs.endpoint, headers, timeout: 60000 });
  } catch (error) {
    console.error(`❌ Failed to create IPFS client:`, error.message);
    throw new Error(`IPFS client creation failed: ${error.message}`);
  }
}

export async function addFileFromPath(filePath, filename) {
  return await withRetry(async () => {
    console.log(`📤 Uploading ${filename} to IPFS (endpoint: ${cfg.ipfs.endpoint})...`);
    
    // Security: Validate that filePath is within the uploads directory
    const uploadsDir = path.resolve(cfg.uploads.dir);
    const resolvedPath = path.resolve(filePath);
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      throw new Error('Invalid file path: File must be within uploads directory');
    }
    
    const client = getClient();
    const data = await fs.readFile(resolvedPath);
    
    console.log(`📦 File size: ${data.length} bytes`);
    
    const { cid } = await client.add(
      { path: filename, content: data }, 
      { pin: true, timeout: 60000 }
    );
    
    const result = {
      cid: cid.toString(),
      uri: `ipfs://${cid.toString()}`,
      gatewayUrl: guessGatewayUrl(cid.toString())
    };
    
    console.log(`✅ IPFS upload successful: ${result.cid}`);
    return result;
  }, 3, 2000);
}

function guessGatewayUrl(cid) {
  // Local gateway exposed by docker-compose at 8081 (mapped from container's 8080)
  return `http://localhost:8081/ipfs/${cid}`;
}