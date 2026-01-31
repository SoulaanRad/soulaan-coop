# Development Guide

Complete guide for running the Soulaan Co-op applications in development mode.

---

## 🚀 Quick Start

### Run All Apps (Recommended)
```bash
pnpm dev
```
This will start all development servers using Turbo's watch mode with hot-reloading.

### Run Individual Apps

**API Server** (Port 3001)
```bash
pnpm dev:api
# or
pnpm -F @soulaan-coop/api dev
```

**Web Portal** (Port 3000)
```bash
pnpm dev:web
# or
pnpm -F @soulaan-coop/web dev
```

**Mobile App**
```bash
cd apps/mobile
pnpm start
# Then press 'i' for iOS or 'a' for Android
```

---

## 📦 Prerequisites

### Required Software
- **Node.js**: v20.19.3 or higher (v22.14.0+ recommended)
- **pnpm**: v10.11.1 or higher
- **PostgreSQL**: For database (see Database Setup below)

### Install Dependencies
```bash
# Install all workspace dependencies
pnpm install
```

---

## ⚙️ Environment Configuration

### Root Environment Variables
Create or verify `/Users/deonrobinson/workspace/soulaancoop/.env`:
```bash
# OpenAI API Key (for AI features)
OPENAI_API_KEY=sk-proj-...

# Database URL (required for backend)
DATABASE_URL="postgresql://user:password@localhost:5432/soulaancoop"
DIRECT_URL="postgresql://user:password@localhost:5432/soulaancoop"
```

### API Environment Variables
File: `apps/api/.env`
```bash
# Port for API server
PORT=3001
```

### Web Portal Environment Variables
File: `apps/web/.env`
```bash
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/soulaancoop"

# Session secret for authentication
SESSION_SECRET=your-secret-key-here

# Auth configuration
AUTH_SECRET=your-auth-secret-here
AUTH_REDIRECT_PROXY_URL=http://localhost:3000/api/auth

# Blockchain RPC URLs
SEPOLIA_RPC_URL=https://sepolia.base.org
MAINNET_RPC_URL=https://mainnet.base.org

# Contract addresses
UNITY_COIN_ADDRESS=0xB52b287a83f3d370fdAC8c05f39da23522a51ec9
SOULAANI_COIN_ADDRESS=0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542

# Payment processors (optional for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Wallet encryption
WALLET_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Backend wallet for minting (optional)
BACKEND_WALLET_PRIVATE_KEY=0x...
```

### Mobile App Environment Variables
File: `apps/mobile/.env`
```bash
# API base URL
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001

# Stripe publishable key (for payments)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🗄️ Database Setup

### 1. Start PostgreSQL
```bash
# macOS with Homebrew
brew services start postgresql@14

# Or use Docker
docker run --name soulaancoop-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=soulaancoop \
  -p 5432:5432 \
  -d postgres:14
```

### 2. Generate Prisma Client
```bash
pnpm db:generate
```

### 3. Run Migrations
```bash
# Development database
pnpm db:migrate

# Or push schema directly
pnpm db:push
```

### 4. (Optional) Open Prisma Studio
```bash
pnpm db:studio
```
Visit http://localhost:5555 to view and edit database records.

---

## 🛠️ Development Workflow

### Standard Development Flow

1. **Start All Servers**
   ```bash
   pnpm dev
   ```
   This starts:
   - API server on http://localhost:3001
   - Web portal on http://localhost:3000
   - Watches for file changes and auto-reloads

2. **Make Code Changes**
   - Edit files in `apps/api/src/` or `apps/web/`
   - Changes will hot-reload automatically
   - Check terminal for any errors

3. **View Changes**
   - Web portal: http://localhost:3000
   - API health check: http://localhost:3001/health
   - tRPC playground: http://localhost:3001/trpc (if enabled)

### Run Specific App Only

**API Only** (when working on backend)
```bash
pnpm dev:api
```
- Starts on http://localhost:3001
- Hot-reloads on file changes in `apps/api/src/`
- Logs API requests to console

**Web Only** (when working on frontend)
```bash
pnpm dev:web
```
- Starts on http://localhost:3000
- Hot-reloads on file changes in `apps/web/`
- Opens browser automatically

**Mobile Only** (when working on mobile app)
```bash
cd apps/mobile
pnpm start
```
- Starts Expo development server
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code for physical device

---

## 🧪 Testing During Development

### Run Tests
```bash
# All tests
pnpm test

# Specific package tests
pnpm -F @repo/trpc test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

### Type Checking
```bash
# All packages
pnpm typecheck

# Specific package
pnpm -F @soulaan-coop/web typecheck
pnpm -F @soulaan-coop/api tsc
pnpm -F @soulaan-coop/mobile type-check
```

### Linting
```bash
# All packages
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Specific package
pnpm -F @soulaan-coop/web lint
```

---

## 🔍 Debugging

### API Debugging
The API uses `nodemon` and `tsx` for hot-reloading:
```bash
# View detailed logs
pnpm dev:api

# Enable debug mode (add to apps/api/.env)
DEBUG=express:*
NODE_ENV=development
```

**Expected Warnings (Normal)**

When the API starts, you may see these warnings:
```
⚠️ WALLET_ENCRYPTION_KEY not set - wallet encryption will fail
⚠️ BACKEND_WALLET_PRIVATE_KEY not set - minting will fail
```

These are **normal** and can be ignored unless you're:
- Testing wallet creation/export features (need WALLET_ENCRYPTION_KEY)
- Testing fiat onramp/minting features (need BACKEND_WALLET_PRIVATE_KEY)

For general API development, these features are optional.

### Web Debugging
Next.js provides detailed error messages:
```bash
# Development mode (verbose errors)
pnpm dev:web

# Check Next.js build info
cd apps/web
npx next info
```

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3001 (API)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (Web)
lsof -ti:3000 | xargs kill -9
```

**Database Connection Issues**
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**Missing Dependencies**
```bash
# Reinstall all dependencies
pnpm install

# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Turbo Cache Issues**
```bash
# Clear Turbo cache
rm -rf .turbo

# Force rebuild
pnpm build --force
```

---

## 📱 Mobile Development Setup

### Prerequisites
- **Expo CLI**: Installed globally via `npm install -g expo-cli`
- **iOS**: Xcode (macOS only) + iOS Simulator
- **Android**: Android Studio + Android Emulator
- **Physical Device**: Expo Go app installed

### Running on Simulators

**iOS Simulator** (macOS only)
```bash
cd apps/mobile
pnpm start
# Press 'i' when the server starts
```

**Android Emulator**
```bash
cd apps/mobile
pnpm start
# Press 'a' when the server starts
```

### Running on Physical Device
1. Install Expo Go app from App Store / Play Store
2. Start dev server: `cd apps/mobile && pnpm start`
3. Scan QR code with your camera (iOS) or Expo Go app (Android)

### Mobile Hot Reloading
- Shake device to open developer menu
- Enable "Fast Refresh" for automatic reloading
- Press `r` in terminal to manually reload

---

## 🏗️ Building for Production

### Build All Apps
```bash
pnpm build
```

### Build Specific Apps
```bash
# API
pnpm -F @soulaan-coop/api build

# Web
pnpm -F @soulaan-coop/web build

# Mobile (requires EAS Build)
cd apps/mobile
eas build --platform ios
eas build --platform android
```

---

## 📊 Monitoring & Logs

### View Logs

**API Logs**
- Logs appear in terminal running `pnpm dev:api`
- Request/response logging enabled by default
- Errors are logged with stack traces

**Web Logs**
- Browser console (F12 → Console)
- Terminal logs for server-side rendering
- Next.js build logs in terminal

**Mobile Logs**
- Expo Developer Tools console
- Device logs via Xcode (iOS) or Android Studio (Android)
- Metro bundler logs in terminal

---

## 🔐 Security in Development

### API Keys
- Never commit `.env` files
- Use `.env.example` for templates
- Rotate keys regularly

### Database
- Use different credentials for dev/prod
- Don't use production database in development
- Regular backups recommended

### Wallet Private Keys
- Development wallets only
- Never use real funds in development
- Test on Base Sepolia testnet

---

## 🚨 Troubleshooting

### Issue: "Cannot find module"
**Solution**:
```bash
pnpm install
pnpm build
```

### Issue: "Port 3000/3001 already in use"
**Solution**:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Issue: "Database connection failed"
**Solution**:
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Run `pnpm db:migrate`

### Issue: "Prisma Client not generated"
**Solution**:
```bash
pnpm db:generate
```

### Issue: "Turbo not found"
**Solution**:
```bash
pnpm install -g turbo
# or use via pnpm
pnpm exec turbo --version
```

### Issue: "React version mismatch"
**Solution**:
```bash
# Clear all node_modules
pnpm clean:workspaces
pnpm install
```

---

## 📖 Additional Resources

- **Turbo Documentation**: https://turbo.build/repo/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Expo Documentation**: https://docs.expo.dev
- **Prisma Documentation**: https://www.prisma.io/docs
- **tRPC Documentation**: https://trpc.io

---

## 🎯 Quick Command Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm dev:api` | Start API server only |
| `pnpm dev:web` | Start web portal only |
| `pnpm build` | Build all apps for production |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm clean:workspaces` | Clean all node_modules |

---

*Last Updated: January 10, 2026*
*For deployment guide, see IMPLEMENTATION_COMPLETE.md*
