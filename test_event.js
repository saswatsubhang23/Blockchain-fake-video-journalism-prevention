// Test createEvent function
import { createEvent } from './src/services/neo4j.js';

const testEventData = {
  id: 'test-event-123',
  type: 'creation',
  tags: ['test', 'unique'],
  description: 'Test event description'
};

console.log('Testing createEvent with:', testEventData);

try {
  const result = await createEvent(testEventData);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Full error:', error);
}

process.exit(0);