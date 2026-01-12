# Environment Files Guide

Complete guide to all `.env` files in the Soulaan Co-op monorepo.

---

## 📁 Environment File Locations

**Main .env file:** `soulaancoop/.env` (root folder) ⭐

This is the primary environment file used by ALL apps (API, Web, Mobile).

```
soulaancoop/
├── .env                    # ⭐ MAIN ENV FILE - ALL APPS USE THIS
├── .env.example           # Root template (START HERE)
├── apps/
│   ├── api/               # API reads from root .env
│   │   └── .env.example   # (reference only - not required)
│   ├── web/               # Web reads from root .env
│   │   ├── .env           # (may exist for local overrides)
│   │   └── .env.example   # Web template
│   └── mobile/            # Mobile needs its own for Expo
│       ├── .env           # Mobile-specific (EXPO_PUBLIC_* vars)
│       └── .env.example   # Mobile template
└── packages/
    ├── contracts/
    │   └── .env.example   # Smart contract deployment template
    └── db/
        └── .env.example   # Database configuration template
```

**Important:** You typically only need TWO .env files:
1. `soulaancoop/.env` (root) - for API, Web, and shared config
2. `soulaancoop/apps/mobile/.env` - only if developing the mobile app

---

## 🎯 Quick Setup (First Time)

### 1. Root Environment (⭐ START HERE - This is the main .env file)

**The main `.env` file lives in the ROOT folder** (`soulaancoop/.env`), NOT in app folders!

```bash
# Copy the root template (from the root of the monorepo)
cp .env.example .env

# Edit with your values
nano .env  # or use your editor
```

**Minimum required for development:**
```bash
OPENAI_API_KEY=sk-proj-...
DATABASE_URL="postgresql://user:password@localhost:5432/soulaancoop"
```

**This root `.env` file is used by ALL apps** (API, Web, and Mobile inherit from it).

### 2. Mobile Environment (Only for Mobile Development)

```bash
# Copy the mobile template
cp apps/mobile/.env.example apps/mobile/.env

# Edit with your values
nano apps/mobile/.env
```

**Minimum required:**
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📋 Environment Variable Reference

### Root `.env` (Shared by All Apps)

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `OPENAI_API_KEY` | Yes* | OpenAI API key for AI features | https://platform.openai.com/api-keys |
| `DATABASE_URL` | Yes | PostgreSQL connection string | Your database provider |
| `RPC_URL` | UC Only | Blockchain RPC endpoint | https://sepolia.base.org |
| `UNITY_COIN_ADDRESS` | UC Only | UnityCoin contract address | Deploy script output |
| `SOULAANI_COIN_ADDRESS` | UC Only | SoulaaniCoin contract address | Deploy script output |
| `WALLET_ENCRYPTION_KEY` | UC Only | 32-byte hex for wallet encryption | Generate (see below) |
| `BACKEND_WALLET_PRIVATE_KEY` | UC Only | Wallet for minting UC | Your backend wallet |
| `STRIPE_SECRET_KEY` | UC Only | Stripe secret key | https://dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | UC Only | Stripe webhook secret | Stripe webhook settings |

**\* Required for API features, optional for basic development**
**UC Only = Only needed for Unity Coin features**

### API `apps/api/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API server port (default: 3001) |
| `STRIPE_SECRET_KEY` | UC Only | Inherits from root if not set |
| `STRIPE_WEBHOOK_SECRET` | UC Only | Inherits from root if not set |
| `PAYPAL_CLIENT_ID` | Optional | PayPal fallback processor |
| `PAYPAL_CLIENT_SECRET` | Optional | PayPal fallback processor |
| `SQUARE_ACCESS_TOKEN` | Optional | Square fallback processor |

### Web `apps/web/.env`

Inherits from root `.env` plus web-specific variables. See `apps/web/.env.example` for full list.

### Mobile `apps/mobile/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Yes | API endpoint URL |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | UC Only | Stripe publishable key for payments |

---

## 🔑 Generating Secure Keys

### Wallet Encryption Key (32-byte hex)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `WALLET_ENCRYPTION_KEY` in root `.env`.

### Session Secret (for web app)

```bash
openssl rand -base64 32
```

Copy the output to `SESSION_SECRET` in `apps/web/.env`.

---

## 🔍 Environment Variable Inheritance

Variables flow from root to individual apps:

```
Root .env (shared)
    ↓
    ├─→ API .env (API-specific overrides)
    ├─→ Web .env (Web-specific overrides)
    └─→ Mobile .env (Mobile-specific only)
```

**Inheritance Rules:**
1. Root `.env` variables are available to all apps
2. App-specific `.env` files can override root variables
3. `EXPO_PUBLIC_*` variables are mobile-only (not inherited)

---

## 📦 What's Required for Each Feature

### Basic Development (No Unity Coin)
```bash
# Root .env (this is the only .env file you need!)
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://...
PORT=3001  # Optional, defaults to 3001
```

### Unity Coin - Transfers Only
```bash
# Root .env (add these)
RPC_URL=https://sepolia.base.org
UNITY_COIN_ADDRESS=0x...
SOULAANI_COIN_ADDRESS=0x...
WALLET_ENCRYPTION_KEY=<32-byte-hex>
```

### Unity Coin - Full Features (Transfers + Fiat Onramp)
```bash
# Root .env (add all UC variables above, plus:)
BACKEND_WALLET_PRIVATE_KEY=0x...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# apps/mobile/.env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## ⚠️ Security Best Practices

### ✅ DO:
- Use `.env.example` files for templates (commit these)
- Generate secure random keys for encryption
- Use different keys for development/production
- Rotate keys regularly
- Store production keys in secure vaults (not in `.env` files)

### ❌ DON'T:
- Commit `.env` files to git (they're in `.gitignore`)
- Share `.env` files via email or Slack
- Use production keys in development
- Hard-code secrets in source code
- Reuse keys across different environments

---

## 🐛 Troubleshooting

### "Environment variable not found"

**Problem:** App can't find an environment variable.

**Solution:**
1. Check if the variable is in the correct `.env` file
2. Verify the `.env` file is in the correct directory
3. Restart the dev server after changing `.env`
4. Check variable naming (case-sensitive, no spaces around `=`)

### "WALLET_ENCRYPTION_KEY not set" warning

**This is normal!** You only need this when testing wallet features.

**To fix (if needed):**
```bash
# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to root .env
echo "WALLET_ENCRYPTION_KEY=<paste-generated-key>" >> .env
```

### "Mobile app can't connect to API"

**Problem:** `EXPO_PUBLIC_API_BASE_URL` pointing to wrong address.

**Solution:**
```bash
# For iOS Simulator
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001

# For Android Emulator or Physical Device
EXPO_PUBLIC_API_BASE_URL=http://<your-computer-ip>:3001

# Find your IP (macOS):
ipconfig getifaddr en0
```

---

## 📚 Related Guides

- **[ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)** - Detailed environment setup
- **[START_DEV.md](START_DEV.md)** - Quick start guide
- **[DEV_GUIDE.md](DEV_GUIDE.md)** - Complete development workflow

---

## 📞 Quick Reference

| Need to... | File to Edit | Required Variables |
|------------|--------------|-------------------|
| Run API/Web dev servers | `.env` (root) | `OPENAI_API_KEY`, `DATABASE_URL` |
| Change API port | `.env` (root) | `PORT` (defaults to 3001) |
| Test Unity Coin transfers | `.env` (root) | UC blockchain variables |
| Test fiat onramp | `.env` (root) + `apps/mobile/.env` | UC + Stripe variables |
| Run mobile app | `apps/mobile/.env` | `EXPO_PUBLIC_API_BASE_URL` |

---

*For the complete list of all variables and their usage, see [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)*
