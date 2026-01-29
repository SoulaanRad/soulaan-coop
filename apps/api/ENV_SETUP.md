# Environment Variables Setup

This document lists all required and optional environment variables for the API server.

## Quick Start

1. Create a `.env` file in `apps/api/`:
   ```bash
   cd apps/api
   cp .env.example .env  # or create manually
   ```

2. Fill in the required variables (marked with ✅)

3. Start the server:
   ```bash
   pnpm --filter @soulaan-coop/api dev
   ```

---

## Environment Variables

### Database (✅ Required)

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/soulaan_coop?schema=public
```

### Encryption & Security (✅ Required)

```bash
# 32-byte hex string for wallet encryption
# Generate with: openssl rand -hex 32
WALLET_ENCRYPTION_KEY=your_32_byte_hex_key_here

# Session secret for authentication
SESSION_SECRET=your_session_secret_here
```

### Blockchain (⚠️ Required for production)

```bash
# RPC URL for blockchain network
RPC_URL=https://rpc.testnet.soulaan.network

# Contract addresses
SOULAANI_COIN_ADDRESS=0x...
UNIVERSAL_CREDIT_ADDRESS=0x...
```

### File Storage (⚠️ Required for uploads)

```bash
# Pinata JWT for IPFS uploads
PINATA_JWT=your_pinata_jwt_here
```

### Notifications (❌ Optional)

```bash
# Slack webhook for waitlist/application notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

---

## Payment Processors

### Stripe (⚠️ Required for payments)

```bash
# Stripe API keys
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_xxx...

# ───────────────────────────────────────────────────────────────
# Webhook Configuration (Choose one option)
# ───────────────────────────────────────────────────────────────

# Option 1: Direct Webhooks (default)
STRIPE_WEBHOOK_SECRET=whsec_xxx...
USE_HOOKDECK=false  # or leave unset

# Option 2: Hookdeck Proxy (recommended for production)
USE_HOOKDECK=true
HOOKDECK_SIGNATURE_KEY=xxx...  # Optional: additional security
```

📖 **See [WEBHOOKS.md](./WEBHOOKS.md) for detailed webhook setup**

### PayPal (❌ Optional)

```bash
PAYPAL_CLIENT_ID=xxx...
PAYPAL_CLIENT_SECRET=xxx...
PAYPAL_WEBHOOK_ID=xxx...
```

⚠️ **Warning**: PayPal webhook signature verification not yet implemented

### Square (❌ Optional)

```bash
SQUARE_ACCESS_TOKEN=xxx...
SQUARE_WEBHOOK_SIGNATURE_KEY=xxx...
SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

⚠️ **Warning**: Square webhook signature verification not yet implemented

---

## Additional Services

### OpenAI (❌ Optional)

```bash
# For Sashimo AI integration
OPENAI_API_KEY=sk-xxx...
```

### Server Configuration

```bash
# Server port (defaults to 3001)
PORT=3001

# Environment mode
NODE_ENV=development  # or 'production', 'test'
```

---

## Development vs Production

### Development

Minimum required variables for local development:

```bash
DATABASE_URL=postgresql://localhost:5432/soulaan_coop
WALLET_ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
NODE_ENV=development
```

### Production

Additional requirements for production:

```bash
# All development variables, plus:
RPC_URL=https://rpc.mainnet.soulaan.network
SOULAANI_COIN_ADDRESS=0x...
UNIVERSAL_CREDIT_ADDRESS=0x...
PINATA_JWT=xxx...
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
USE_HOOKDECK=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
NODE_ENV=production
```

---

## Generating Secrets

```bash
# Generate WALLET_ENCRYPTION_KEY (32 bytes = 64 hex chars)
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32

# Generate random password
openssl rand -base64 24
```

---

## Verification

Check which environment variables are loaded:

```bash
# Start the API server and look for:
🔐 Environment Variables Check:
  WALLET_ENCRYPTION_KEY: ✅ Set (a1b2c3d4...)
  DATABASE_URL: ✅ Set

📋 Environment Variables:
  PINATA_JWT: ✅ Set
  STRIPE_SECRET_KEY: ✅ Set
  # etc...
```

---

## Troubleshooting

### "Environment variable not found"

**Problem**: Missing required variable

**Solution**: Add the variable to your `.env` file and restart the server

### "Invalid DATABASE_URL"

**Problem**: Malformed connection string

**Solution**: Use this format:
```
postgresql://user:password@host:port/database?schema=public
```

### "Webhook secret not configured"

**Problem**: Missing webhook secret for payment processor

**Solution**: See [WEBHOOKS.md](./WEBHOOKS.md) for setup instructions

---

## Security Notes

1. ⚠️ **Never commit `.env` files to git**
2. 🔒 Use different secrets for development vs production
3. 🔄 Rotate secrets regularly
4. 🚫 Don't share secrets in Slack/email
5. ✅ Use a secrets manager in production (AWS Secrets Manager, Vault, etc.)
