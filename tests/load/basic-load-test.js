/**
 * Basic Load Test for EaseMail
 *
 * Tests the application under various load scenarios:
 * - Ramp up: 0 → 50 users over 1 minute
 * - Steady: 50 users for 3 minutes
 * - Spike: 100 users for 1 minute
 * - Ramp down: 100 → 0 users over 1 minute
 *
 * Requirements:
 * - Install k6: https://k6.io/docs/get-started/installation/
 * - Run: k6 run tests/load/basic-load-test.js
 *
 * Environment variables (optional):
 * - BASE_URL: Target URL (default: http://localhost:3001)
 * - TEST_USER_EMAIL: Test user email
 * - TEST_USER_PASSWORD: Test user password
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const healthCheckLatency = new Trend('health_check_latency');
const requestsTotal = new Counter('requests_total');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'test123';

// Load test stages
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '30s', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
    errors: ['rate<0.05'],             // Custom error rate < 5%
  },
};

// Test setup (runs once at the beginning)
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log('Test stages:');
  console.log('  1. Ramp up to 50 users (1 min)');
  console.log('  2. Steady load: 50 users (3 min)');
  console.log('  3. Spike to 100 users (30 sec)');
  console.log('  4. Steady spike: 100 users (30 sec)');
  console.log('  5. Ramp down to 0 (1 min)');
  console.log('');

  // Test that server is reachable
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`Health check failed: ${healthCheck.status}`);
    throw new Error('Server is not healthy - aborting load test');
  }

  return { baseUrl: BASE_URL };
}

// Main test scenario (runs for each virtual user)
export default function (data) {
  requestsTotal.add(1);

  // Test 1: Health check endpoint
  const healthRes = http.get(`${data.baseUrl}/api/health`);
  healthCheckLatency.add(healthRes.timings.duration);

  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check returns JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    'health status is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy' || body.status === 'degraded';
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1); // Wait 1 second between requests

  // Test 2: Public pages
  const homeRes = http.get(`${data.baseUrl}/`);
  apiLatency.add(homeRes.timings.duration);

  check(homeRes, {
    'home page status is 200': (r) => r.status === 200,
    'home page loads in <2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(2);

  // Test 3: API endpoint (unauthenticated - should return 401)
  const apiRes = http.get(`${data.baseUrl}/api/emails`);
  apiLatency.add(apiRes.timings.duration);

  check(apiRes, {
    'API responds (200 or 401)': (r) => r.status === 200 || r.status === 401,
    'API is fast': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Static assets
  const staticRes = http.get(`${data.baseUrl}/favicon.ico`);

  check(staticRes, {
    'static asset loads': (r) => r.status === 200 || r.status === 404,
  });

  sleep(2);
}

// Teardown (runs once at the end)
export function teardown(data) {
  console.log('');
  console.log('Load test completed!');
  console.log(`Total requests: ${requestsTotal.value}`);
}
