// Test createUploader function
import { createUploader } from './src/services/neo4j.js';

const testUploaderData = {
  id: 'test-uploader-123',
  uploadedAt: new Date().toISOString(),
  ipAddress: '127.0.0.1',
  userAgent: 'Test-Agent/1.0'
};

console.log('Testing createUploader with:', testUploaderData);

try {
  const result = await createUploader(testUploaderData);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}

process.exit(0);