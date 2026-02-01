# Production Monitoring & Alerts Setup

Complete guide for setting up monitoring, alerting, and observability for EaseMail production deployment.

## Overview

EaseMail monitoring stack:
- **Error Tracking**: Sentry (already integrated)
- **Uptime Monitoring**: UptimeRobot (recommended) or Pingdom
- **Application Performance**: Vercel Analytics + Sentry Performance
- **Database**: Supabase Metrics
- **Logs**: Vercel Logs + Sentry Breadcrumbs

## 1. Sentry Alert Configuration

### Already Configured
- ✅ Sentry SDK installed and configured
- ✅ Error tracking on client, server, and edge runtime
- ✅ Source maps for production debugging
- ✅ Performance monitoring enabled

### Configure Alerts

**Go to**: Sentry Dashboard → Settings → Alerts

#### Alert Rule 1: High Error Rate
```
Name: High Error Rate Alert
Conditions:
  - When: Error count
  - Is: above 10
  - In: 5 minutes
  - For: any environment

Actions:
  - Send notification to: #alerts channel (Slack)
  - Send email to: team@easemail.com
```

#### Alert Rule 2: New Issue
```
Name: New Error First Seen
Conditions:
  - When: An event is first seen
  - For: production environment

Actions:
  - Send notification to: #alerts channel
  - Assign to: On-call engineer
```

#### Alert Rule 3: Critical Errors
```
Name: Critical Error Alert
Conditions:
  - When: An event is tagged
  - With: level=error or level=fatal
  - And: environment=production
  - Is: above 1
  - In: 1 minute

Actions:
  - Send notification to: #critical-alerts
  - Send email to: on-call@easemail.com
  - Create PagerDuty incident (if configured)
```

#### Alert Rule 4: Performance Degradation
```
Name: Slow Transaction Alert
Conditions:
  - When: A metric
  - Of: p95(transaction.duration)
  - Is: above 2000ms
  - In: 5 minutes
  - For: production environment

Actions:
  - Send notification to: #performance channel
  - Create issue in: Performance project
```

#### Alert Rule 5: Database Errors
```
Name: Database Connection Failures
Conditions:
  - When: An event's message
  - Contains: database OR connection OR ECONNREFUSED OR getaddrinfo
  - And: environment=production
  - Is: above 5
  - In: 5 minutes

Actions:
  - Send notification to: #critical-alerts
  - Create PagerDuty incident
```

### Sentry Integration Setup

#### Slack Integration
1. Go to: Sentry → Settings → Integrations → Slack
2. Click "Add to Slack"
3. Authorize workspace
4. Configure default channel: `#alerts`
5. Test integration

#### Email Notifications
1. Go to: Settings → Account → Notifications
2. Add team email addresses
3. Configure notification preferences:
   - ✅ Issue alerts
   - ✅ Deploy notifications
   - ✅ Weekly reports
   - ❌ Resolved issues (too noisy)

## 2. Uptime Monitoring Setup

### Recommended: UptimeRobot (Free)

**Sign up**: https://uptimerobot.com

#### Monitor 1: Main Application
```
Monitor Type: HTTP(s)
URL: https://your-domain.com/
Interval: 5 minutes
Alert Contacts: email, SMS
```

#### Monitor 2: Health Check Endpoint
```
Monitor Type: HTTP(s)
URL: https://your-domain.com/api/health
Interval: 2 minutes
Expected Response: 200
Keyword Alert: "healthy"
Alert Contacts: email, SMS, Slack
```

#### Monitor 3: API Availability
```
Monitor Type: HTTP(s)
URL: https://your-domain.com/api/emails
Interval: 5 minutes
Expected Response: 401 (auth required - means API is up)
Alert Contacts: email
```

#### Monitor 4: Database Connectivity
```
Monitor Type: Keyword
URL: https://your-domain.com/api/health
Interval: 5 minutes
Keyword to exist: "database":{"status":"ok"
Alert Contacts: email, SMS
```

### Alert Channels

#### Email Alerts
- Add team email addresses
- Configure alert thresholds (e.g., alert after 2 consecutive failures)

#### SMS Alerts (Critical Only)
- Add on-call phone numbers
- Enable only for critical monitors
- Configure during business hours

#### Slack Integration
1. Create incoming webhook in Slack
2. Add webhook URL to UptimeRobot integrations
3. Configure alert channel: `#uptime-alerts`

## 3. Vercel Monitoring

### Vercel Dashboard

Already enabled automatically for deployed projects.

**Access**: https://vercel.com/dashboard → Select project → Analytics

#### Key Metrics to Monitor
- **Response Time**: Target < 500ms p95
- **Error Rate**: Target < 0.1%
- **Bandwidth**: Monitor for unexpected spikes
- **Edge Requests**: Track CDN hit rate

### Vercel Alerts

**Go to**: Project Settings → Notifications

#### Configure Alerts
```yaml
Deployment Failed:
  enabled: true
  channels: [email, Slack]

Domain Errors:
  enabled: true
  channels: [email]

Budget Exceeded:
  enabled: true
  threshold: $50/month
  channels: [email]
```

### Vercel Log Drains (Optional)

For persistent log storage:

1. Go to: Settings → Log Drains
2. Add drain:
   - **Datadog**: https://docs.datadoghq.com/logs/
   - **Logtail**: https://logtail.com/
   - **Better Stack**: https://betterstack.com/

## 4. Database Monitoring (Supabase)

### Supabase Dashboard

**Access**: https://app.supabase.com → Project → Database

#### Metrics to Monitor
- **Connection Pool Usage**: Alert if > 80%
- **Query Performance**: Slow queries > 1s
- **Database Size**: Alert at 80% of plan limit
- **Active Connections**: Alert if > 90% of max

### Database Alerts

**Go to**: Project Settings → Database → Usage

#### Configure Alerts
```yaml
Connection Pool:
  threshold: 80%
  action: email

Storage:
  threshold: 80%
  action: email

API Requests:
  threshold: 90% of plan
  action: email
```

### Query Performance Monitoring

Enable in Supabase:
```sql
-- Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000 -- queries taking > 1 second
ORDER BY mean_time DESC
LIMIT 20;
```

## 5. Custom Health Check Monitoring

### Internal Health Dashboard

Create a simple monitoring dashboard:

```typescript
// app/admin/health/page.tsx
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export default async function HealthDashboard() {
  // Check database
  const dbHealth = await checkDatabase();

  // Check external services
  const nylasHealth = await checkNylas();
  const redisHealth = await checkRedis();

  return (
    <div>
      <h1>System Health Dashboard</h1>

      <HealthCard
        name="Database"
        status={dbHealth.status}
        latency={dbHealth.latency}
      />

      <HealthCard
        name="Nylas API"
        status={nylasHealth.status}
      />

      <HealthCard
        name="Redis Cache"
        status={redisHealth.status}
      />

      {/* Add more health checks */}
    </div>
  );
}
```

### Automated Health Checks

Use Vercel Cron to run health checks:

```javascript
// app/api/cron/health-check/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const health = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health`);
  const data = await health.json();

  if (data.status !== 'healthy') {
    // Send alert to Slack/Email
    await sendAlert({
      title: 'Health Check Failed',
      message: `Status: ${data.status}`,
      details: data.checks
    });
  }

  return Response.json({ checked: true, status: data.status });
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/health-check",
    "schedule": "*/5 * * * *"
  }]
}
```

## 6. Alert Notification Channels

### Slack Workspace Setup

#### Create Channels
```
#alerts          - All non-critical alerts
#critical-alerts - Critical issues requiring immediate attention
#uptime-alerts   - Uptime monitoring notifications
#performance     - Performance degradation alerts
#deployments     - Deployment notifications
```

#### Configure Incoming Webhooks

1. Go to Slack App Directory
2. Search "Incoming Webhooks"
3. Add to workspace
4. Create webhook for each channel
5. Store webhook URLs in environment variables:
   ```
   SLACK_ALERTS_WEBHOOK=https://hooks.slack.com/services/...
   SLACK_CRITICAL_WEBHOOK=https://hooks.slack.com/services/...
   ```

### Email Distribution Lists

Create email lists:
```
alerts@easemail.com        → All team members
critical@easemail.com      → On-call rotation
performance@easemail.com   → Engineering team
ops@easemail.com           → Operations team
```

### PagerDuty Integration (Optional)

For 24/7 on-call rotation:

1. Sign up: https://pagerduty.com
2. Create service: "EaseMail Production"
3. Integrate with Sentry
4. Set up escalation policies
5. Configure on-call schedules

## 7. Alert Response Playbook

### Critical Alert Response (< 15 minutes)

1. **Acknowledge alert**: Respond in Slack/PagerDuty
2. **Check health endpoint**: `/api/health`
3. **Check Sentry**: Review error details
4. **Check Vercel logs**: Recent deployments
5. **Rollback if needed**: `vercel rollback`
6. **Communicate**: Update status page
7. **Post-mortem**: Document incident

### High Error Rate Response (< 30 minutes)

1. Review Sentry error details
2. Check if related to recent deployment
3. Identify error pattern (client/server/API)
4. Hotfix if needed
5. Monitor error rate after fix

### Performance Degradation Response (< 1 hour)

1. Check database slow query log
2. Review Vercel performance metrics
3. Check for N+1 queries
4. Review caching strategy
5. Optimize if needed

## 8. Monitoring Dashboard Templates

### Sentry Dashboard

Create custom dashboard:

**Widgets to Add:**
1. Error rate over time (last 24h)
2. Performance p95 (last 24h)
3. Top 10 errors
4. Browser breakdown
5. Release health
6. User impact

### Vercel Dashboard

Key metrics to pin:
1. Response time (p50, p95, p99)
2. Error rate
3. Bandwidth usage
4. Edge requests
5. Build duration

## 9. Weekly/Monthly Reports

### Automated Reports

Configure in Sentry:
- Weekly error summary
- Performance trends
- User impact reports
- Release comparison

### Manual Review (Monthly)

Checklist:
- [ ] Review top 20 errors
- [ ] Check performance trends
- [ ] Audit alert noise (false positives)
- [ ] Update alert thresholds if needed
- [ ] Review on-call incidents
- [ ] Update runbooks

## 10. Testing Alerts

### Test Each Alert Channel

```bash
# Test Sentry integration
curl -X POST https://sentry.io/api/0/projects/.../keys/.../test/

# Test health check endpoint
curl https://your-domain.com/api/health

# Test Slack webhook
curl -X POST $SLACK_ALERTS_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test alert from EaseMail monitoring"}'

# Test email alerts
# (Send test alert through UptimeRobot interface)
```

### Alert Testing Checklist

- [ ] Sentry error alert triggers correctly
- [ ] Sentry performance alert triggers correctly
- [ ] Uptime monitor detects downtime
- [ ] Health check failures trigger alerts
- [ ] Slack notifications arrive in correct channels
- [ ] Email notifications reach distribution lists
- [ ] PagerDuty pages on-call engineer (if configured)
- [ ] Alert messages contain actionable information
- [ ] False positive rate is acceptable (< 5%)

## 11. Alert Threshold Tuning

Start conservative, then tune based on actual patterns:

### Initial Thresholds
- Error rate: > 10 errors in 5 minutes
- Response time: p95 > 2000ms
- Uptime: 2 consecutive failures
- Database: connections > 80%

### After 1 Week
- Review alert volume
- Reduce false positives
- Adjust thresholds based on baseline

### After 1 Month
- Optimize alert routing
- Add new alerts for discovered patterns
- Remove noisy alerts

## 12. Cost Optimization

### Free Tier Limits

- **Sentry**: 5k errors/month free
- **UptimeRobot**: 50 monitors free
- **Vercel**: Analytics included
- **Supabase**: Metrics included

### Paid Upgrades (When Needed)

Consider upgrading when:
- Sentry: > 5k errors/month (sign of larger issues!)
- UptimeRobot: Need < 5 min monitoring
- Better Stack: Need centralized log management

## Next Steps

1. **Immediately**:
   - [ ] Configure Sentry alerts (30 minutes)
   - [ ] Set up UptimeRobot monitors (20 minutes)
   - [ ] Create Slack channels (10 minutes)
   - [ ] Test all alert channels (20 minutes)

2. **This Week**:
   - [ ] Set up Vercel notifications
   - [ ] Configure Supabase alerts
   - [ ] Create internal health dashboard
   - [ ] Write incident response playbook

3. **This Month**:
   - [ ] Review and tune alert thresholds
   - [ ] Set up PagerDuty (if needed)
   - [ ] Create monitoring dashboard
   - [ ] Document all runbooks

## Resources

- **Sentry Docs**: https://docs.sentry.io/product/alerts/
- **UptimeRobot Guide**: https://uptimerobot.com/help
- **Vercel Monitoring**: https://vercel.com/docs/concepts/observability
- **Supabase Metrics**: https://supabase.com/docs/guides/platform/metrics
