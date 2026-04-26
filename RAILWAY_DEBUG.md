# Railway Deployment Debugging Guide

## Issue: Container Stopping with SIGTERM

Your API container is starting successfully but then being stopped by Railway with a `SIGTERM` signal.

## Changes Made

### 1. Enhanced Health Check Endpoint (`/health`)
- Added database connectivity check
- Returns 503 status if database is down
- Includes uptime information

### 2. Graceful Shutdown Handling
- Properly handles SIGTERM and SIGINT signals
- Closes database connections before shutdown
- Prevents abrupt termination

### 3. Railway Configuration (`railway.toml`)
- Configured health check path: `/health`
- Set health check timeout: 300 seconds
- Configured restart policy

### 4. Startup Database Test
- Tests database connection on startup
- Logs connection status
- Helps identify database issues early

## How to Debug

### Step 1: Check Railway Logs
In your Railway dashboard, check the deployment logs for:

1. **Database Connection Errors**
   ```
   ❌ Database connection failed: ...
   ```

2. **Uncaught Exceptions**
   ```
   💥 UNCAUGHT EXCEPTION:
   ```

3. **Shutdown Signals**
   ```
   ⚠️  Received SIGTERM, starting graceful shutdown...
   ```

### Step 2: Verify Environment Variables
Ensure these are set in Railway:
- `DATABASE_URL` - PostgreSQL connection string
- `PINATA_JWT` - Pinata API key
- `WALLET_ENCRYPTION_KEY` - Encryption key
- `STRIPE_SECRET_KEY` - Stripe API key
- `PORT` - Should be set automatically by Railway

### Step 3: Check Health Check Configuration
In Railway dashboard:
1. Go to your service settings
2. Navigate to "Health Checks" section
3. Verify:
   - Health check path is set to `/health`
   - Timeout is at least 300 seconds
   - Initial delay is at least 30 seconds

### Step 4: Test Health Endpoint Locally
```bash
# Start the API locally
pnpm start:api

# In another terminal, test the health endpoint
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-03-29T01:30:00.000Z",
  "database": "connected",
  "uptime": 123.45
}
```

### Step 5: Check Database Connection
The most common cause of SIGTERM is database connection failure.

**Test database connection manually:**
```bash
# Using psql
psql $DATABASE_URL

# Or using Node
node -e "import('@soulaan/db').then(({db}) => db.\$queryRaw\`SELECT 1\`.then(() => console.log('✅ Connected')))"
```

## Common Issues and Solutions

### Issue 1: Database Connection Timeout
**Symptoms:**
- Health check fails
- Container restarts repeatedly
- Logs show database connection errors

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check if database service is running
3. Ensure database accepts connections from Railway's IP range
4. Increase connection timeout in Prisma schema

### Issue 2: Memory Limit Exceeded
**Symptoms:**
- Container killed with OOM (Out of Memory)
- No graceful shutdown logs

**Solution:**
1. Increase memory allocation in Railway
2. Check for memory leaks in application
3. Optimize database queries

### Issue 3: Startup Timeout
**Symptoms:**
- Container stops before health check succeeds
- Logs show server started but then SIGTERM

**Solution:**
1. Increase health check timeout in Railway
2. Increase initial delay for health checks
3. Optimize startup time (reduce dependencies)

### Issue 4: Port Binding Issues
**Symptoms:**
- Server doesn't respond to health checks
- Port already in use errors

**Solution:**
1. Ensure app listens on `0.0.0.0` not `localhost`
2. Use Railway's `PORT` environment variable
3. Check no other process is using the port

## Railway Health Check Best Practices

1. **Set Appropriate Timeouts**
   - Health check timeout: 300s (5 minutes)
   - Initial delay: 30-60s
   - Interval: 30s

2. **Return Proper Status Codes**
   - 200: Service healthy
   - 503: Service unhealthy (triggers restart)

3. **Include Database Check**
   - Always test database connectivity
   - Return 503 if database is down

4. **Log Everything**
   - Log health check requests
   - Log database connection status
   - Log shutdown signals

## Monitoring Commands

### View Real-time Logs
```bash
# In Railway CLI
railway logs --follow

# Or in Railway dashboard
# Go to your service → Deployments → Click on deployment → View logs
```

### Check Service Status
```bash
railway status
```

### Restart Service
```bash
railway restart
```

## Next Steps

1. **Deploy the changes**
   ```bash
   git add .
   git commit -m "Add health checks and graceful shutdown"
   git push
   ```

2. **Monitor the deployment**
   - Watch Railway logs for startup messages
   - Check health endpoint after deployment
   - Monitor for SIGTERM signals

3. **If still failing:**
   - Check Railway dashboard for specific error messages
   - Verify all environment variables are set
   - Test database connection from Railway environment
   - Contact Railway support with deployment logs

## Additional Resources

- [Railway Health Checks Documentation](https://docs.railway.app/deploy/healthchecks)
- [Railway Deployment Logs](https://docs.railway.app/deploy/deployments#logs)
- [Prisma Connection Troubleshooting](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
