import { create } from "ipfs-http-client";
import { loadConfig } from "../config/env.js";
import fs from "fs/promises";

const cfg = loadConfig();

function getClient() {
  const headers = {};
  if (cfg.ipfs.projectId && cfg.ipfs.projectSecret) {
    const auth = Buffer.from(`${cfg.ipfs.projectId}:${cfg.ipfs.projectSecret}`).toString("base64");
    headers.authorization = `Basic ${auth}`;
  }
  return create({ url: cfg.ipfs.endpoint, headers });
}

export async function addFileFromPath(filePath, filename) {
  const client = getClient();
  const data = await fs.readFile(filePath);
  const { cid } = await client.add({ path: filename, content: data }, { pin: true });
  return {
    cid: cid.toString(),
    uri: `ipfs://${cid.toString()}`,
    gatewayUrl: guessGatewayUrl(cid.toString())
  };
}

function guessGatewayUrl(cid) {
  // Local gateway exposed by docker-compose at 8080
  return `http://localhost:8080/ipfs/${cid}`;
}