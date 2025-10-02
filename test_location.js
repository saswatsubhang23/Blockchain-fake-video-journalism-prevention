// Test createLocation function
import { createLocation } from './src/services/neo4j.js';

const testLocationData = {
  name: 'TestLocation',
  coordinates: '40.7128,-74.0060',
  timestamp: new Date().toISOString()
};

console.log('Testing createLocation with:', testLocationData);

try {
  const result = await createLocation(testLocationData);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}

process.exit(0);