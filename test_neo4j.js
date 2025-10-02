// Quick test to isolate Neo4j Map error
import { upsertVideo } from './src/services/neo4j.js';

const testVideoData = {
  hash: 'test-hash-123',
  ipfsCid: 'QmTest123',
  ipfsUri: 'ipfs://QmTest123',
  gatewayUrl: 'http://localhost:8080/ipfs/QmTest123',
  size: 1000,
  mimeType: 'video/mp4',
  duration: 30,
  format: 'mp4',
  codec: 'h264',
  bitrate: 1000000,
  width: 1920,
  height: 1080,
  frameRate: '30/1',
  creationTime: new Date().toISOString(),
  validationStatus: 'VALID',
  validationIssues: '[]',
  blockchainTxn: null,
  description: null,
  derivedFromHash: null
};

console.log('Testing upsertVideo with:', testVideoData);

try {
  const result = await upsertVideo(testVideoData);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
}

process.exit(0);