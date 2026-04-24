# Slack Notifications Setup Guide

Automated Slack notifications for API health monitoring, errors, and important events.

## Features

### 1. API Startup Notifications
- Notifies when the API server starts
- Includes port, environment, and version info

### 2. Health Monitoring
- Checks database connection every 60 seconds
- Sends alerts when service goes down
- Sends recovery notification when service comes back up
- Smart throttling to avoid notification spam

### 3. Error Notifications
- Uncaught exceptions
- Unhandled promise rejections
- Includes error message and stack trace

### 4. Application Events
- New membership applications submitted
- Other important business events

## Setup Instructions

### Step 1: Create a Slack Webhook

1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Name it "Soulaan Monitoring" (or your preferred name)
5. Select your workspace
6. Click "Create App"

### Step 2: Enable Incoming Webhooks

1. In your app settings, click "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to **On**
3. Click "Add New Webhook to Workspace"
4. Select the channel where you want notifications (e.g., `#alerts` or `#monitoring`)
5. Click "Allow"
6. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### Step 3: Add Webhook to Environment Variables

Add the webhook URL to your environment variables:

**For local development (`.env`):**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**For Railway:**
1. Go to your Railway project
2. Select your API service
3. Go to "Variables" tab
4. Add new variable:
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Your webhook URL
5. Click "Add"
6. Redeploy your service

**For production (`.env.production`):**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Step 4: Test the Integration

1. Start your API server:
   ```bash
   pnpm start:api
   ```

2. You should receive a Slack notification:
   ```
   🚀 API Service Started
   Service: API
   Status: Started
   Port: 3001
   Environment: development
   Time: [timestamp]
   ```

3. Test error notification by triggering an error:
   ```bash
   # In your API, trigger a test error
   curl http://localhost:3001/test-error
   ```

## Notification Types

### 1. Startup Notification
```
🚀 API Service Started
- Service: API
- Status: Started
- Port: 3001
- Environment: production
- Time: [timestamp]
```

### 2. Health Status - Service Up
```
✅ API Service Online
- Service: API
- Status: Online
- Environment: production
- Uptime: 0 minutes
- Time: [timestamp]
```

### 3. Health Status - Service Down
```
🔴 DATABASE Service Offline
- Service: DATABASE
- Status: Offline
- Environment: production
- Error: Connection refused
- Time: [timestamp]
```

### 4. Error Notification
```
💥 API Service Error
- Service: API
- Error Type: Uncaught Exception
- Error Message: Cannot read property 'foo' of undefined
- Stack Trace: [stack trace]
- Time: [timestamp]
```

### 5. Application Submitted
```
📝 New Membership Application Submitted!
- Co-op: Soulaan Co-op
- Applicant: John Doe
- Email: john@example.com
- Application ID: clx123456
- Time: [timestamp]
```

## Configuration

### Health Check Interval

The health monitor checks every 60 seconds by default. To change:

```typescript
// In apps/api/src/index.ts
startHealthMonitoring(120000); // Check every 2 minutes
```

### Notification Throttling

To avoid spam, notifications are throttled:

- **Cooldown period**: 5 minutes between similar notifications
- **Failure threshold**: 3 consecutive failures before alerting
- **Status change**: Always notifies when status changes (up ↔ down)

To adjust these settings:

```typescript
// In apps/api/src/health-monitor.ts
const NOTIFICATION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILURES_BEFORE_ALERT = 5; // 5 failures
```

## Monitoring Channels

### Recommended Channel Structure

1. **#alerts** - Critical errors and service outages
2. **#monitoring** - Health status changes and startup notifications
3. **#applications** - New membership applications
4. **#deployments** - Deployment notifications

### Multiple Webhooks

To send different notifications to different channels, create multiple webhooks:

```bash
# .env
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/.../alerts
SLACK_WEBHOOK_MONITORING=https://hooks.slack.com/services/.../monitoring
SLACK_WEBHOOK_APPLICATIONS=https://hooks.slack.com/services/.../applications
```

Then update the service:

```typescript
// In slack-notification-service.ts
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_WEBHOOK_ALERTS = process.env.SLACK_WEBHOOK_ALERTS || SLACK_WEBHOOK_URL;
const SLACK_WEBHOOK_MONITORING = process.env.SLACK_WEBHOOK_MONITORING || SLACK_WEBHOOK_URL;
```

## Troubleshooting

### No Notifications Received

1. **Check webhook URL is set:**
   ```bash
   echo $SLACK_WEBHOOK_URL
   ```

2. **Check logs for errors:**
   ```
   ⚠️ Slack webhook not configured, skipping notification
   ```

3. **Test webhook manually:**
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test notification"}' \
     YOUR_WEBHOOK_URL
   ```

4. **Verify webhook is active in Slack:**
   - Go to [Slack API Apps](https://api.slack.com/apps)
   - Select your app
   - Check "Incoming Webhooks" is enabled

### Duplicate Notifications

If you're receiving duplicate notifications:

1. Check if multiple instances of the API are running
2. Verify health monitoring is only started once
3. Check the cooldown period isn't too short

### Missing Notifications

If some notifications aren't being sent:

1. Check if the service is catching errors properly
2. Verify the notification function is being called
3. Check Slack API rate limits (1 message per second per webhook)

## Testing

### Test All Notification Types

```bash
# 1. Start the API (should send startup notification)
pnpm start:api

# 2. Trigger an error (should send error notification)
# Add this test endpoint to your API:
app.get('/test-error', () => {
  throw new Error('Test error notification');
});

# 3. Stop database (should send health down notification)
# Stop your database service temporarily

# 4. Start database (should send health up notification)
# Restart your database service
```

### Manual Test

Create a test script:

```typescript
// test-slack.ts
import { sendApiHealthNotification } from "@repo/trpc/services/slack-notification-service";

await sendApiHealthNotification({
  status: "up",
  service: "api",
  environment: "test",
});

console.log("Test notification sent!");
```

Run it:
```bash
tsx test-slack.ts
```

## Best Practices

1. **Use different channels for different severity levels**
   - Critical: #alerts (with @channel mentions)
   - Info: #monitoring (no mentions)
   - Business: #applications

2. **Set up notification rules**
   - Mute #monitoring during off-hours
   - Keep #alerts unmuted 24/7

3. **Monitor notification volume**
   - If too many notifications, increase cooldown
   - If too few, decrease failure threshold

4. **Regular testing**
   - Test notifications weekly
   - Verify webhooks are still active
   - Check channel permissions

5. **Documentation**
   - Document what each notification means
   - Create runbooks for common alerts
   - Train team on responding to alerts

## Advanced Features

### Custom Notification Format

Customize notification appearance:

```typescript
await sendSlackNotification({
  text: "🚨 Critical Alert",
  attachments: [
    {
      color: "danger",
      title: "Production Database Down",
      fields: [
        { title: "Severity", value: "Critical", short: true },
        { title: "Impact", value: "All users affected", short: true },
      ],
      footer: "Soulaan Monitoring",
      footer_icon: "https://your-icon-url.com/icon.png",
      ts: Math.floor(Date.now() / 1000),
    },
  ],
});
```

### Mention Users

Mention specific users for critical alerts:

```typescript
await sendSlackNotification({
  text: "<!channel> 🚨 Production is down! <@U123456> <@U789012>",
  // ...
});
```

### Rich Formatting

Use Slack's mrkdwn formatting:

```typescript
await sendSlackNotification({
  text: "*Critical Error*\n```\nError: Connection timeout\n```\n_Check the logs immediately_",
});
```

## Integration with Other Services

### PagerDuty Integration

For critical alerts, integrate with PagerDuty:

```typescript
if (status === "down" && service === "database") {
  // Send to both Slack and PagerDuty
  await sendSlackNotification({ ... });
  await sendPagerDutyAlert({ ... });
}
```

### Email Notifications

For non-urgent notifications, send emails:

```typescript
if (status === "degraded") {
  await sendSlackNotification({ ... });
  await sendEmailNotification({ ... });
}
```

## Monitoring the Monitor

Set up a separate service to monitor the monitoring system:

1. Use a service like UptimeRobot or Pingdom
2. Monitor the `/health` endpoint
3. Send alerts if the API doesn't respond
4. This ensures you're notified even if the API crashes completely
