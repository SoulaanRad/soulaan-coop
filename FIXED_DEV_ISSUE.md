# ✅ Fixed: API Dev Server Issue

## Problem
When running `pnpm dev`, the API crashed with error:
```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './services/wallet-service' is not defined by "exports"
```

## Root Cause
The webhook files in `apps/api/src/webhooks/` were importing from `@repo/trpc/services/wallet-service`, but the tRPC package wasn't exporting those paths in its `package.json`.

## Solution Applied
Updated `/packages/trpc/package.json` to export service paths:

```json
"exports": {
  // ... existing exports
  "./services/wallet-service": {
    "import": "./dist/services/wallet-service.js",
    "require": "./dist/services/wallet-service.js",
    "types": "./dist/services/wallet-service.d.ts"
  },
  "./services/blockchain": {
    "import": "./dist/services/blockchain.js",
    "require": "./dist/services/blockchain.js",
    "types": "./dist/services/blockchain.d.ts"
  },
  "./services/payment/*": {
    "import": "./dist/services/payment/*.js",
    "require": "./dist/services/payment/*.js",
    "types": "./dist/services/payment/*.d.ts"
  }
}
```

Then rebuilt the tRPC package:
```bash
pnpm -F @repo/trpc build
```

## Verification
✅ API now starts successfully on port 3001
✅ Health check endpoint responds: `{"status":"OK"}`
✅ Hot-reload works with nodemon

## Expected Warnings (Normal)
When starting the API, you'll see these warnings - they're normal:
```
⚠️ WALLET_ENCRYPTION_KEY not set - wallet encryption will fail
⚠️ BACKEND_WALLET_PRIVATE_KEY not set - minting will fail
```

These are only needed when:
- Creating/exporting user wallets (WALLET_ENCRYPTION_KEY)
- Minting UC tokens via fiat onramp (BACKEND_WALLET_PRIVATE_KEY)

For general API development, you can ignore these warnings.

## Now You Can Run
```bash
# All apps
pnpm dev

# Or just API
pnpm dev:api

# Or just Web
pnpm dev:web
```

All should work without errors! 🚀

---

*Issue fixed: January 11, 2026*
