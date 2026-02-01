# Load Testing Guide for EaseMail

This directory contains load testing scripts to validate EaseMail's performance under concurrent user load.

## Overview

Load testing helps identify:
- **Performance bottlenecks** under high traffic
- **Maximum concurrent users** the system can handle
- **Response time degradation** as load increases
- **Error rates** under stress
- **Database connection limits**
- **Memory leaks** over extended periods

## Tool: k6

We use [k6](https://k6.io/) - a modern open-source load testing tool.

### Why k6?
- Written in Go, very fast
- Scripts in JavaScript (easy to write)
- Built-in metrics and thresholds
- Beautiful terminal output
- Free and open source

## Installation

### Windows
```bash
# Using Chocolatey
choco install k6

# Using Scoop
scoop install k6

# Or download from: https://k6.io/docs/get-started/installation/
```

### macOS
```bash
brew install k6
```

### Linux
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Verify Installation
```bash
k6 version
```

## Available Test Scripts

### 1. Basic Load Test (`basic-load-test.js`)

Tests core functionality under load:
- Health check endpoint
- Home page
- API endpoints
- Static assets

**Load Profile:**
- Ramp up: 0 → 50 users (1 min)
- Steady: 50 users (3 min)
- Spike: 50 → 100 users (30 sec)
- Spike hold: 100 users (30 sec)
- Ramp down: 100 → 0 (1 min)

**Run:**
```bash
k6 run tests/load/basic-load-test.js
```

**With custom URL:**
```bash
k6 run --env BASE_URL=https://your-domain.com tests/load/basic-load-test.js
```

## Running Load Tests

### Before Running Load Tests

1. **Use staging/test environment** - Never run load tests against production!
2. **Notify your team** - Load tests will generate high traffic
3. **Check database limits** - Ensure test database can handle connections
4. **Monitor resources** - Have monitoring dashboards open

### Basic Usage

```bash
# Run default test
k6 run tests/load/basic-load-test.js

# Run with custom duration
k6 run --duration 10m tests/load/basic-load-test.js

# Run with specific number of users
k6 run --vus 100 --duration 5m tests/load/basic-load-test.js

# Run against production (BE CAREFUL!)
k6 run --env BASE_URL=https://yourdomain.com tests/load/basic-load-test.js
```

### Output Options

```bash
# Save results to JSON
k6 run --out json=results.json tests/load/basic-load-test.js

# Save results to CSV
k6 run --out csv=results.csv tests/load/basic-load-test.js

# Send results to InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/basic-load-test.js
```

## Understanding Results

### Key Metrics

```
http_req_duration.............: avg=245ms  min=50ms  med=200ms  max=2s   p(95)=500ms
```
- **avg**: Average response time
- **min**: Fastest response
- **med**: Median (50th percentile)
- **max**: Slowest response
- **p(95)**: 95% of requests were faster than this

### What to Look For

#### ✅ Good Results
```
http_req_duration: p(95)<2000ms     ✓ [passed]
http_req_failed: rate<0.01          ✓ [passed]
errors: rate<0.05                   ✓ [passed]
```
- 95% of requests complete in < 2 seconds
- Error rate < 1%
- Custom errors < 5%

#### ⚠️ Warning Signs
- Response time p(95) > 2000ms
- Error rate > 1%
- Response times increasing over time (memory leak?)
- Database connection errors

#### 🔴 Critical Issues
- Error rate > 5%
- Timeouts
- 500 errors
- Database connection failures
- Out of memory errors

## Load Test Scenarios

### Scenario 1: Baseline Test (Current Performance)

**Goal:** Establish baseline metrics

```bash
# 10 users for 2 minutes
k6 run --vus 10 --duration 2m tests/load/basic-load-test.js
```

**Expected Results:**
- Response time p(95): < 500ms
- Error rate: 0%

### Scenario 2: Target Load (Expected Production Traffic)

**Goal:** Verify performance at expected load

```bash
# 50 users for 5 minutes
k6 run --vus 50 --duration 5m tests/load/basic-load-test.js
```

**Expected Results:**
- Response time p(95): < 1000ms
- Error rate: < 0.1%

### Scenario 3: Stress Test (Find Breaking Point)

**Goal:** Find maximum capacity

```bash
# Ramp up to 200 users
k6 run --stage 1m:50 --stage 2m:100 --stage 2m:150 --stage 2m:200 --stage 1m:0 tests/load/basic-load-test.js
```

**What to watch:**
- At what point do response times spike?
- When do errors start appearing?
- Does the system recover when load decreases?

### Scenario 4: Soak Test (Stability Over Time)

**Goal:** Detect memory leaks and gradual degradation

```bash
# 25 users for 30 minutes
k6 run --vus 25 --duration 30m tests/load/basic-load-test.js
```

**What to watch:**
- Do response times increase over time?
- Does error rate increase over time?
- Memory usage trends

## Interpreting Results

### Database Connection Limits

If you see errors like:
```
Error: "too many clients already"
Error: "connection pool exhausted"
```

**Solution:**
- Increase Supabase connection pool
- Implement connection pooling (PgBouncer)
- Add retry logic with exponential backoff

### Slow Response Times

If p(95) > 2000ms:

**Check:**
1. Database query performance
2. API endpoint optimization
3. Caching strategy
4. N+1 query problems

### Memory Issues

If you see increasing response times over time:

**Check:**
1. Memory leaks in Node.js
2. Unbounded caching
3. Large response payloads
4. Connection leaks

## Advanced: Authenticated Load Testing

For testing authenticated endpoints:

```javascript
// Add to test script
export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const authToken = loginRes.json('token');
  return { authToken };
}

export default function (data) {
  // Use auth token in requests
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
  };

  const res = http.get(`${BASE_URL}/api/emails`, { headers });
  // ... rest of test
}
```

## Continuous Load Testing

### CI/CD Integration

Add to `.github/workflows/performance-test.yml`:

```yaml
name: Performance Test

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: |
          k6 run --env BASE_URL=${{ secrets.STAGING_URL }} tests/load/basic-load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
```

## Best Practices

### DO ✅
- Test against staging/test environments
- Start with small load and increase gradually
- Monitor system resources during tests
- Run tests during low-traffic periods
- Document baseline metrics
- Share results with team

### DON'T ❌
- Run load tests against production without approval
- Run tests without monitoring
- Test during peak hours
- Ignore warnings and errors
- Skip baseline measurements
- Forget to clean up test data

## Monitoring During Load Tests

### What to Monitor

1. **Application Metrics**
   - Response times
   - Error rates
   - Request throughput

2. **Server Metrics**
   - CPU usage
   - Memory usage
   - Network bandwidth

3. **Database Metrics**
   - Connection pool usage
   - Query performance
   - Lock contention

4. **External Services**
   - API rate limits
   - Third-party latency
   - Webhook delivery

### Monitoring Tools

- **Vercel Dashboard**: Real-time metrics
- **Supabase Dashboard**: Database performance
- **Sentry**: Error tracking
- **k6 Cloud** (optional): Advanced metrics and reporting

## Troubleshooting

### Test Fails Immediately

```bash
Error: Server is not healthy - aborting load test
```

**Solution:** Ensure server is running and `/api/health` returns 200

### Connection Errors

```bash
Error: ECONNREFUSED
```

**Solution:**
- Check BASE_URL is correct
- Verify server is accessible
- Check firewall rules

### High Error Rate

```bash
http_req_failed: rate=0.15 (15%)
```

**Solution:**
- Check server logs for errors
- Review Sentry for error details
- Check database connection limits
- Verify API rate limiting

## Next Steps

After running load tests:

1. **Document baseline metrics**
2. **Set performance budgets**
3. **Create performance alerts**
4. **Schedule regular load tests**
5. **Optimize bottlenecks**
6. **Re-test after optimizations**

## Resources

- **k6 Documentation**: https://k6.io/docs/
- **k6 Examples**: https://k6.io/docs/examples/
- **Performance Best Practices**: https://web.dev/performance/
- **Database Optimization**: https://supabase.com/docs/guides/database/performance

## Questions?

Refer to the main project documentation or contact the engineering team.
