// Test endpoints for api-client tests
import { http } from 'msw';

// Test endpoints that hang for timeout testing
// Matches both relative paths and full URLs (API_BASE_URL = http://localhost:4000)
export const testHandlers = [
  http.get('/things', () => new Promise(() => {})), // hangs forever
  http.post('/things', () => new Promise(() => {})), // hangs forever
  http.get('/anything', () => new Promise(() => {})), // hangs forever
  http.post('/anything', () => new Promise(() => {})), // hangs forever
  // Full URL versions for apiFetch which uses API_BASE_URL
  http.get('http://localhost:4000/things', () => new Promise(() => {})),
  http.post('http://localhost:4000/things', () => new Promise(() => {})),
  http.get('http://localhost:4000/anything', () => new Promise(() => {})),
  http.post('http://localhost:4000/anything', () => new Promise(() => {})),
];
