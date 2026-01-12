# Starting Development Servers

## ✅ Quick Start (All Apps)

Run this single command to start both API and Web servers:

```bash
pnpm dev
```

This will start:
- **API Server**: http://localhost:3001
- **Web Portal**: http://localhost:3000

Both servers will hot-reload when you make code changes.

---

## 🎯 Individual Apps

### Start API Only
```bash
pnpm dev:api
```
- Runs on: http://localhost:3001
- Hot-reloads on changes in `apps/api/src/`

### Start Web Only
```bash
pnpm dev:web
```
- Runs on: http://localhost:3000
- Hot-reloads on changes in `apps/web/`

### Start Mobile App
```bash
cd apps/mobile
pnpm start
```
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code for physical device

---

## 🔍 Verification

### Check if servers are running:

**API Health Check**
```bash
curl http://localhost:3001/health
# Should return: {"status":"OK"}
```

**Expected Warnings**

When the API starts, you may see:
```
⚠️ WALLET_ENCRYPTION_KEY not set - wallet encryption will fail
⚠️ BACKEND_WALLET_PRIVATE_KEY not set - minting will fail
```

These are **normal** and only needed for specific features (wallet export, UC minting). You can safely ignore them for general development.

**Web Portal**
```bash
curl -I http://localhost:3000
# Should return: HTTP 200 OK
```

**View Logs**
- API: Check terminal running `pnpm dev:api`
- Web: Check terminal running `pnpm dev:web` + browser console (F12)

---

## 🛑 Stop Servers

**If running with `pnpm dev`:**
- Press `Ctrl+C` in terminal

**If running individually:**
- Press `Ctrl+C` in each terminal
- Or kill processes:
```bash
# Kill API (port 3001)
lsof -ti:3001 | xargs kill -9

# Kill Web (port 3000)
lsof -ti:3000 | xargs kill -9
```

---

## 🔧 Prerequisites

Before running dev servers, ensure:

1. **Dependencies installed**
   ```bash
   pnpm install
   ```

2. **Database running** (PostgreSQL)
   ```bash
   # Check PostgreSQL is running
   psql -U postgres -c "SELECT 1"
   ```

3. **Environment variables configured**
   - Root `.env` has `OPENAI_API_KEY`
   - `apps/api/.env` has `PORT=3001`
   - `apps/web/.env` has `DATABASE_URL` and `SESSION_SECRET`
   - `apps/mobile/.env` has `EXPO_PUBLIC_API_BASE_URL`

4. **Prisma Client generated**
   ```bash
   pnpm db:generate
   ```

5. **Database migrated**
   ```bash
   pnpm db:migrate
   ```

---

## 🚀 First Time Setup

If this is your first time running the project:

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma Client
pnpm db:generate

# 3. Run database migrations
pnpm db:migrate

# 4. Start all dev servers
pnpm dev
```

Visit:
- Web Portal: http://localhost:3000
- API: http://localhost:3001

---

## 📱 Mobile Development

For mobile app development:

```bash
# Navigate to mobile app
cd apps/mobile

# Start Expo dev server
pnpm start

# Follow on-screen instructions:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web browser
# - Scan QR code with Expo Go app on physical device
```

**Requirements:**
- iOS: Xcode + iOS Simulator (macOS only)
- Android: Android Studio + Android Emulator
- Physical device: Expo Go app installed

---

## 🐛 Common Issues

### "Port already in use"
```bash
lsof -ti:3000 | xargs kill -9  # Kill web
lsof -ti:3001 | xargs kill -9  # Kill API
```

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
brew services start postgresql@14
# or
docker start soulaancoop-postgres

# Verify DATABASE_URL in apps/web/.env
```

### "Module not found"
```bash
pnpm install
pnpm build
```

### "Prisma Client not generated"
```bash
pnpm db:generate
```

---

## 📖 More Information

For detailed development guide, see: **DEV_GUIDE.md**

For environment setup, see: **ENV_SETUP_GUIDE.md**

For deployment, see: **IMPLEMENTATION_COMPLETE.md**

---

*Quick Reference: Run `pnpm dev` to start everything!* 🚀
