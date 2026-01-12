# Environment Variables Setup Guide

This guide explains how to configure all required environment variables for the Unity Coin transfer and fiat onramp system.

## Required Environment Variables

### 1. Wallet Encryption

**`WALLET_ENCRYPTION_KEY`** (Required)
- **Purpose**: Encrypts user private keys before storing in database
- **Format**: 64-character hex string (32 bytes)
- **Generate with**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Example**: `a1b2c3d4e5f6...` (64 chars)
- **Security**: Store securely, rotate periodically, never commit to git

---

### 2. Blockchain Configuration

**`RPC_URL`** (Required)
- **Purpose**: Base Sepolia RPC endpoint for blockchain interactions
- **Default**: `https://sepolia.base.org`
- **Alternatives**:
  - Alchemy: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
  - Infura: `https://base-sepolia.infura.io/v3/YOUR_API_KEY`
- **Example**: `RPC_URL=https://sepolia.base.org`

**`UNITY_COIN_ADDRESS`** (Required)
- **Purpose**: UnityCoin ERC-20 contract address
- **Default**: `0xB52b287a83f3d370fdAC8c05f39da23522a51ec9`
- **Example**: `UNITY_COIN_ADDRESS=0xB52b287a83f3d370fdAC8c05f39da23522a51ec9`

**`SOULAANI_COIN_ADDRESS`** (Required)
- **Purpose**: SoulaaniCoin governance token contract address
- **Default**: `0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542`
- **Example**: `SOULAANI_COIN_ADDRESS=0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542`

**`BACKEND_WALLET_PRIVATE_KEY`** (Required for UC minting)
- **Purpose**: Private key of backend wallet with BACKEND role on UnityCoin contract
- **Format**: 0x-prefixed hex string (66 chars)
- **Setup**:
  1. Create new wallet: `node -e "const {generatePrivateKey} = require('viem/accounts'); console.log(generatePrivateKey())"`
  2. Grant BACKEND role on UnityCoin contract
  3. Configure daily minting limits on contract
- **Example**: `BACKEND_WALLET_PRIVATE_KEY=0x1234567890abcdef...`
- **Security**: NEVER commit to git, store in secrets manager

---

### 3. Stripe Configuration (Primary Payment Processor)

**`STRIPE_SECRET_KEY`** (Required)
- **Purpose**: Stripe API secret key for creating payment intents
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Get from**: [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
- **Example**: `STRIPE_SECRET_KEY=sk_test_51AbCdEfGh...`

**`STRIPE_PUBLISHABLE_KEY`** (Optional, for mobile app)
- **Purpose**: Stripe publishable key for mobile SDK
- **Format**: `pk_test_...` (test) or `pk_live_...` (production)
- **Example**: `STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGh...`

**`STRIPE_WEBHOOK_SECRET`** (Required for webhook verification)
- **Purpose**: Verifies webhook requests are from Stripe
- **Format**: `whsec_...`
- **Setup**:
  1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
  2. Click "Add endpoint"
  3. URL: `https://yourdomain.com/webhooks/stripe`
  4. Events: Select `payment_intent.succeeded` and `payment_intent.payment_failed`
  5. Copy "Signing secret"
- **Example**: `STRIPE_WEBHOOK_SECRET=whsec_AbCdEfGh...`

---

### 4. PayPal Configuration (Fallback #1)

**`PAYPAL_CLIENT_ID`** (Optional)
- **Purpose**: PayPal REST API client ID
- **Get from**: [PayPal Developer Dashboard > My Apps](https://developer.paypal.com/dashboard/applications)
- **Example**: `PAYPAL_CLIENT_ID=AbCdEfGh...`

**`PAYPAL_CLIENT_SECRET`** (Optional)
- **Purpose**: PayPal REST API secret
- **Example**: `PAYPAL_CLIENT_SECRET=XyZ123...`

**`PAYPAL_WEBHOOK_ID`** (Optional)
- **Purpose**: Webhook ID for signature verification
- **Setup**:
  1. Go to PayPal Developer Dashboard > Webhooks
  2. Create webhook: `https://yourdomain.com/webhooks/paypal`
  3. Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
  4. Copy Webhook ID
- **Example**: `PAYPAL_WEBHOOK_ID=1A2B3C...`

**`PAYPAL_MODE`** (Optional)
- **Purpose**: PayPal environment mode
- **Options**: `sandbox` or `live`
- **Default**: `sandbox`
- **Example**: `PAYPAL_MODE=sandbox`

---

### 5. Square Configuration (Fallback #2)

**`SQUARE_ACCESS_TOKEN`** (Optional)
- **Purpose**: Square API access token
- **Get from**: [Square Developer Dashboard > OAuth](https://developer.squareup.com/apps)
- **Example**: `SQUARE_ACCESS_TOKEN=EAAAl...`

**`SQUARE_WEBHOOK_SIGNATURE_KEY`** (Optional)
- **Purpose**: Webhook signature verification key
- **Setup**:
  1. Go to Square Developer Dashboard > Webhooks
  2. Create webhook: `https://yourdomain.com/webhooks/square`
  3. Events: `payment.updated`, `refund.updated`
  4. Copy Signature Key
- **Example**: `SQUARE_WEBHOOK_SIGNATURE_KEY=AbC123...`

**`SQUARE_ENVIRONMENT`** (Optional)
- **Purpose**: Square environment
- **Options**: `sandbox` or `production`
- **Default**: `sandbox`
- **Example**: `SQUARE_ENVIRONMENT=sandbox`

---

### 6. Application Configuration

**`DATABASE_URL`** (Required)
- **Purpose**: PostgreSQL connection string
- **Format**: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- **Example**: `DATABASE_URL=postgresql://postgres:password@localhost:5432/soulaan`

**`PORT`** (Optional)
- **Purpose**: API server port
- **Default**: `3001`
- **Example**: `PORT=3001`

**`APP_URL`** (Required for payment redirects)
- **Purpose**: Base URL of your application
- **Example**: `APP_URL=https://yourdomain.com`

**`NODE_ENV`** (Optional)
- **Purpose**: Node environment
- **Options**: `development`, `production`, `test`
- **Default**: `development`
- **Example**: `NODE_ENV=production`

---

## Setup Instructions

### Step 1: Copy Template

```bash
# Backend
cp packages/trpc/.env.example packages/trpc/.env
cp apps/api/.env.example apps/api/.env

# Database
cp packages/db/.env.example packages/db/.env
```

### Step 2: Generate Secrets

```bash
# Generate wallet encryption key
node -e "console.log('WALLET_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate backend wallet private key (then grant BACKEND role on UnityCoin contract)
node -e "const {generatePrivateKey} = require('viem/accounts'); console.log('BACKEND_WALLET_PRIVATE_KEY=' + generatePrivateKey())"
```

### Step 3: Configure Payment Processors

#### Stripe Setup (Required)
1. Create Stripe account: https://dashboard.stripe.com/register
2. Get API keys: Dashboard > Developers > API Keys
3. Set up webhook:
   - URL: `https://yourdomain.com/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret

#### PayPal Setup (Optional)
1. Create PayPal developer account: https://developer.paypal.com
2. Create REST API app: Dashboard > My Apps > Create App
3. Get Client ID and Secret: App Details > Live/Sandbox
4. Set up webhook:
   - URL: `https://yourdomain.com/webhooks/paypal`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`

#### Square Setup (Optional)
1. Create Square developer account: https://developer.squareup.com
2. Create application: Dashboard > Applications
3. Get Access Token: App > OAuth
4. Set up webhook:
   - URL: `https://yourdomain.com/webhooks/square`
   - Events: `payment.updated`, `refund.updated`

### Step 4: Update Environment Files

Create/update `.env` files in:
- `/packages/trpc/.env`
- `/packages/db/.env`
- `/apps/api/.env`

**Example `/packages/trpc/.env`:**
```bash
# Wallet & Blockchain
WALLET_ENCRYPTION_KEY=a1b2c3d4e5f6...
RPC_URL=https://sepolia.base.org
UNITY_COIN_ADDRESS=0xB52b287a83f3d370fdAC8c05f39da23522a51ec9
SOULAANI_COIN_ADDRESS=0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542
BACKEND_WALLET_PRIVATE_KEY=0x1234567890abcdef...

# Stripe (Primary)
STRIPE_SECRET_KEY=sk_test_51AbCdEfGh...
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEfGh...
STRIPE_WEBHOOK_SECRET=whsec_AbCdEfGh...

# PayPal (Optional Fallback)
PAYPAL_CLIENT_ID=AbCdEfGh...
PAYPAL_CLIENT_SECRET=XyZ123...
PAYPAL_WEBHOOK_ID=1A2B3C...
PAYPAL_MODE=sandbox

# Square (Optional Fallback)
SQUARE_ACCESS_TOKEN=EAAAl...
SQUARE_WEBHOOK_SIGNATURE_KEY=AbC123...
SQUARE_ENVIRONMENT=sandbox

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/soulaan

# App
PORT=3001
APP_URL=https://yourdomain.com
NODE_ENV=development
```

### Step 5: Test Configuration

```bash
# Test database connection
cd packages/db
npx prisma db push

# Test API server
cd apps/api
npm run dev

# Check logs for:
# ✅ Stripe is available
# ✅ PayPal is available (if configured)
# ✅ Square is available (if configured)
```

---

## Security Best Practices

### DO:
- ✅ Use different keys for development and production
- ✅ Store production secrets in a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- ✅ Rotate WALLET_ENCRYPTION_KEY periodically
- ✅ Use environment-specific Stripe/PayPal/Square accounts
- ✅ Enable 2FA on all payment processor accounts
- ✅ Monitor webhook endpoints for unusual activity
- ✅ Use HTTPS for all webhook URLs in production

### DON'T:
- ❌ Commit `.env` files to git (add to `.gitignore`)
- ❌ Share private keys in Slack/email
- ❌ Use production keys in development
- ❌ Store unencrypted private keys in database
- ❌ Use same WALLET_ENCRYPTION_KEY across environments
- ❌ Hard-code any secrets in source code

---

## Troubleshooting

### Error: "WALLET_ENCRYPTION_KEY not set"
**Solution**: Generate and set encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Error: "BACKEND_WALLET_PRIVATE_KEY not set"
**Solution**:
1. Generate new wallet private key
2. Get wallet address
3. Grant BACKEND role on UnityCoin contract
4. Set environment variable

### Error: "Stripe not available"
**Check**:
- STRIPE_SECRET_KEY is set correctly
- Stripe account is active
- API key has correct permissions

### Error: "Webhook signature verification failed"
**Check**:
- Webhook secret matches Stripe/PayPal/Square dashboard
- Webhook URL is publicly accessible
- Request is actually from the payment processor (not a test)

### Error: "Failed to mint UC"
**Check**:
- Backend wallet has BACKEND role on UnityCoin
- Backend wallet has sufficient ETH for gas
- UnityCoin contract daily mint limit not exceeded
- User has a wallet created

---

## Testing Checklist

- [ ] Database migrations applied successfully
- [ ] API server starts without errors
- [ ] Stripe webhook endpoint accessible: `curl https://yourdomain.com/webhooks/stripe`
- [ ] PayPal webhook endpoint accessible (if configured)
- [ ] Square webhook endpoint accessible (if configured)
- [ ] Backend wallet has BACKEND role on UnityCoin
- [ ] Backend wallet has ETH for gas fees
- [ ] Test wallet creation: User signs up → Application approved → Wallet created
- [ ] Test UC minting: Backend can call `mintUCToUser()`
- [ ] Test Stripe payment: Create payment intent → Complete payment → UC minted
- [ ] Test UC transfer: User → User transfer succeeds

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables set in production environment
- [ ] Secrets stored in secrets manager (not plain text)
- [ ] Stripe live keys configured
- [ ] PayPal live mode configured (if using)
- [ ] Square production environment configured (if using)
- [ ] Webhook URLs use HTTPS
- [ ] Webhooks registered with payment processors
- [ ] Backend wallet funded with ETH for gas
- [ ] Backend wallet has BACKEND role on UnityCoin (mainnet)
- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] Wallet encryption key rotated
- [ ] Test transaction completed end-to-end

---

**Last Updated**: 2026-01-10
