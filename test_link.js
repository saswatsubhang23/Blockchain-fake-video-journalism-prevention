// Test linkVideoToUploader function
import { upsertVideo, createUploader, linkVideoToUploader } from './src/services/neo4j.js';

// First create a video and uploader
const testVideoData = {
  hash: 'test-link-video-123',
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

const testUploaderData = {
  id: 'test-link-uploader-123',
  ipAddress: '127.0.0.1',
  userAgent: 'Test-Agent/1.0'
};

const testRelationshipData = {
  uploadedAt: new Date().toISOString(),
  isOriginal: true,
  isDuplicate: false
};

console.log('Creating video and uploader first...');

try {
  await upsertVideo(testVideoData);
  console.log('Video created');
  
  await createUploader(testUploaderData);
  console.log('Uploader created');
  
  console.log('Testing linkVideoToUploader with:', testRelationshipData);
  await linkVideoToUploader(testVideoData.hash, testUploaderData.id, testRelationshipData);
  console.log('Success: Link created');
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}

process.exit(0);