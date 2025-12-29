# 06 - Operate

**Purpose:** Define how running systems are monitored, maintained, and supported. Production is not the finish line—it's where the real work begins.

---

## Observability

### Philosophy

Observability answers: "What is happening inside my system?"

Start simple. Add complexity when you need it:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  OBSERVABILITY MATURITY                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Level 1: Logs (Start Here)                                            │
│  ├── Structured JSON logs                                              │
│  ├── Request ID correlation                                            │
│  └── Log aggregation (file or stdout → collector)                     │
│                                                                         │
│  Level 2: Metrics (Add When Needed)                                    │
│  ├── Request rate, latency, errors (RED)                               │
│  ├── Resource utilization (CPU, memory, connections)                   │
│  └── Business metrics (users, actions, revenue)                        │
│                                                                         │
│  Level 3: Tracing (Add For Distributed Systems)                        │
│  ├── Request flow across services                                      │
│  ├── Latency breakdown by component                                    │
│  └── Dependency mapping                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Logging

### Requirements

All logs must be:
- **Structured**: JSON format, parseable
- **Correlated**: Request ID links related logs
- **Leveled**: Appropriate severity
- **Contextual**: Include relevant metadata

### Logger Setup

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: process.env.SERVICE_NAME || 'app',
    environment: process.env.NODE_ENV,
  },
});

// Create child logger with request context
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
```

### Request Logging Middleware

```typescript
// src/middleware/request-logger.ts
import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';
import { logger, createRequestLogger } from '@/lib/logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  const startTime = Date.now();

  // Attach logger to request
  req.log = createRequestLogger(requestId);
  res.setHeader('x-request-id', requestId);

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    req.log.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    }, 'request completed');
  });

  next();
};
```

### Log Levels

| Level | Use For | Example |
|-------|---------|---------|
| `error` | Failures that need attention | Database connection failed |
| `warn` | Concerning but not failed | Retry succeeded after failure |
| `info` | Normal operations | Request completed, user logged in |
| `debug` | Troubleshooting details | Query parameters, intermediate state |
| `trace` | Very verbose (rarely used) | Every function call |

### What to Log

**Always log:**
- Request start/complete with timing
- Authentication events (login, logout, failure)
- Authorization failures
- External service calls with timing
- Errors with stack traces
- Business events (user created, order placed)

**Never log:**
- Passwords, tokens, secrets
- Full credit card numbers
- Personal health information (PHI)
- Anything that could identify individuals in error messages

```typescript
// Good
logger.info({ userId: user.id, action: 'login' }, 'user authenticated');

// Bad - logs password
logger.info({ email, password }, 'login attempt');

// Bad - logs PHI
logger.info({ patientName, diagnosis }, 'record accessed');
```

---

## Metrics (Level 2)

When logs aren't enough, add metrics for dashboards and alerts.

### RED Method

For every service, track:
- **Rate**: Requests per second
- **Errors**: Failed requests per second
- **Duration**: Response time distribution

### Setup with Prometheus

```typescript
// src/lib/metrics.ts
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

// Collect Node.js metrics
collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});
```

```typescript
// src/middleware/metrics.ts
import { RequestHandler } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '@/lib/metrics';

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });

  next();
};
```

### Metrics Endpoint

```typescript
// src/routes/metrics.ts
import { Router } from 'express';
import { register } from '@/lib/metrics';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

export default router;
```

### Grafana Dashboard

Basic dashboard panels for any service:
- Request rate (by endpoint)
- Error rate (4xx, 5xx)
- Latency percentiles (p50, p95, p99)
- Active connections
- CPU/Memory usage

---

## Alerting

### Alert Philosophy

Good alerts are:
- **Actionable**: Someone can do something about it
- **Urgent**: It needs attention now, not tomorrow
- **Rare**: Alert fatigue kills response time

### Basic Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Service down | Health check failing > 1min | Critical | Page on-call |
| Error rate spike | 5xx rate > 1% for 5min | High | Investigate immediately |
| Latency degradation | p95 > 2s for 10min | Medium | Investigate soon |
| Disk space low | < 10% free | Medium | Expand or clean up |
| Certificate expiring | < 7 days | Medium | Renew certificate |

### Alert Configuration (Prometheus/Alertmanager)

```yaml
# alerts.yml
groups:
  - name: service
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
      
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Error rate above 1%"
      
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 2
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "95th percentile latency above 2s"
```

---

## Maintenance

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Check for security vulnerabilities
npm audit

# Update patch versions (safe)
npm update

# Update to latest (review changelog first)
npm install package@latest
```

**Schedule:**
- Security patches: Immediately
- Patch versions: Weekly
- Minor versions: Monthly (with testing)
- Major versions: Quarterly (with planning)

### Database Maintenance

```sql
-- PostgreSQL maintenance tasks

-- Analyze tables for query planner
ANALYZE;

-- Reclaim space from deleted rows
VACUUM ANALYZE;

-- Check table sizes
SELECT 
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check for unused indexes
SELECT 
  schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### Backup Verification

Backups are worthless if they can't be restored. Test monthly:

```bash
# Restore backup to test database
pg_restore -d test_restore backup.dump

# Verify data integrity
psql test_restore -c "SELECT COUNT(*) FROM users;"

# Clean up
dropdb test_restore
```

---

## Incident Response

### Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **S1** | Service completely down | < 15 min | No users can access |
| **S2** | Major feature broken | < 1 hour | Auth failing, data loss |
| **S3** | Minor feature broken | < 4 hours | Non-critical bug, slow performance |
| **S4** | Cosmetic / minor | Next business day | UI glitch, typo |

### Incident Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INCIDENT RESPONSE                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. DETECT                                                              │
│     ├── Alert fires OR user reports                                    │
│     └── Acknowledge alert within SLA                                   │
│                                                                         │
│  2. ASSESS                                                              │
│     ├── What is the impact? (users affected, data at risk)            │
│     ├── What is the severity?                                          │
│     └── Who needs to know?                                             │
│                                                                         │
│  3. MITIGATE                                                            │
│     ├── Stop the bleeding (rollback, disable feature, scale)          │
│     ├── Communicate status                                             │
│     └── Restore service                                                │
│                                                                         │
│  4. INVESTIGATE                                                         │
│     ├── What happened?                                                 │
│     ├── Why did it happen?                                             │
│     └── Gather evidence (logs, metrics, timeline)                      │
│                                                                         │
│  5. DOCUMENT                                                            │
│     ├── Write incident report                                          │
│     ├── Identify action items                                          │
│     └── Schedule post-mortem if S1/S2                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Incident Report Template

```markdown
# Incident Report: [Brief Description]

## Summary
- **Date/Time:** YYYY-MM-DD HH:MM - HH:MM (duration)
- **Severity:** S1/S2/S3/S4
- **Impact:** [Users affected, functionality impacted]
- **Root Cause:** [One sentence]

## Timeline
- HH:MM - [Event]
- HH:MM - [Event]
- HH:MM - [Resolution]

## Root Cause Analysis
[Detailed explanation of what went wrong and why]

## What Went Well
- [Good thing 1]
- [Good thing 2]

## What Went Poorly
- [Problem 1]
- [Problem 2]

## Action Items
- [ ] [Action] - Owner - Due date
- [ ] [Action] - Owner - Due date

## Lessons Learned
[Key takeaways for future prevention]
```

---

## Runbooks

### Common Procedures

Document these for every service:

```markdown
# Runbook: [Service Name]

## Health Check
1. Check service status: `docker service ls`
2. Check logs: `docker service logs service_name`
3. Check health endpoint: `curl https://api.example.com/health`

## Restart Service
1. `docker service update --force service_name`
2. Watch logs for startup
3. Verify health check passes

## Scale Service
1. `docker service scale service_name=N`
2. Wait for replicas to be ready
3. Verify load balancing working

## Rollback Deployment
1. Identify last known good version
2. `docker service update --image ghcr.io/fractionate/service:VERSION`
3. Verify health checks pass

## Database Connection Issues
1. Check PostgreSQL is running
2. Verify connection string in secrets
3. Check connection pool settings
4. Look for "too many connections" in logs

## Common Errors
### "Connection refused to database"
Cause: PostgreSQL not running or network issue
Fix: Check PostgreSQL service, verify network configuration
```

---

## Operational Checklist

### Daily
- [ ] Review alerts from overnight
- [ ] Check error rates in dashboard
- [ ] Review any open incidents

### Weekly
- [ ] Review dependency updates
- [ ] Check disk space trends
- [ ] Review performance metrics

### Monthly
- [ ] Test backup restoration
- [ ] Review and update runbooks
- [ ] Security patch review
- [ ] Capacity planning review

### Quarterly
- [ ] Major version updates
- [ ] Incident trend analysis
- [ ] Update documentation
- [ ] Review alert thresholds
