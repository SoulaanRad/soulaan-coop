# Portal Authentication System

## Overview

The portal uses a secure Web3-based authentication system that only allows users with SoulaaniCoin (SC) to access it.

## Features

- ✅ **Web3 Wallet Authentication**: Users sign in with their Ethereum wallet
- ✅ **SoulaaniCoin Verification**: Checks on-chain balance and active member status
- ✅ **Cryptographic Signatures**: Uses SIWE (Sign-In with Ethereum) for secure authentication
- ✅ **Profile Management**: Requires users to complete profile with name, email, and phone
- ✅ **Session Management**: Secure HTTP-only cookie sessions
- ✅ **CSRF Protection**: Prevents cross-site request forgery attacks
- ✅ **Rate Limiting**: Prevents brute force attacks
- ✅ **Regular Balance Checks**: Ensures continued SoulaaniCoin ownership

## Environment Variables

Create a `.env.local` file in `apps/web/` with the following variables:

```bash
# Session Secret (generate a secure random string)
SESSION_SECRET=your_secure_session_secret_at_least_32_characters_long

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_CHAIN_NAME=Base Sepolia
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# Smart Contract Addresses
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS=0xYourContractAddressHere

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here

# App Configuration
NEXT_PUBLIC_DOMAIN=localhost:3000
NEXT_PUBLIC_URI=http://localhost:3000

# Database URL
DATABASE_URL=postgresql://user:password@localhost:5432/soulaancoop

# Environment
NODE_ENV=development
```

## Development Mode

When `NEXT_PUBLIC_SOULAANI_COIN_ADDRESS` is not set, the system will:
- Skip blockchain balance checks
- Allow any connected wallet to access the portal
- Log warnings indicating development mode is active

This allows development and testing without a deployed contract.

## Production Mode

In production (`NODE_ENV=production`), the system requires:
- Valid `NEXT_PUBLIC_SOULAANI_COIN_ADDRESS`
- Valid `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- Secure `SESSION_SECRET`

All blockchain checks are enforced in production.

## Authentication Flow

### 1. Connect Wallet
- User clicks "Connect Wallet" on `/login`
- Web3Modal opens allowing wallet selection
- User connects their Ethereum wallet

### 2. Sign & Verify
- Server generates a unique challenge (nonce)
- User signs the challenge with their wallet
- Server verifies the signature matches the wallet address
- Server checks SoulaaniCoin balance and active member status on-chain

### 3. Create Profile (First Time Only)
- If user doesn't have a profile, they complete the profile form
- Required fields: Full Name, Phone Number
- Optional fields: Email
- Profile is stored in the database

### 4. Access Granted
- User is redirected to `/portal`
- Session is created with HTTP-only cookies
- User can access all portal features

## API Endpoints

### `POST /api/auth/challenge`
Generate a challenge for wallet authentication.

**Request:**
```json
{
  "address": "0x1234..."
}
```

**Response:**
```json
{
  "message": "Sign in to Soulaan Co-op Portal..."
}
```

### `POST /api/auth/verify`
Verify signature and check SoulaaniCoin balance.

**Request:**
```json
{
  "address": "0x1234...",
  "signature": "0xabcd...",
  "message": "Sign in to Soulaan Co-op Portal..."
}
```

**Response:**
```json
{
  "success": true,
  "address": "0x1234...",
  "hasProfile": false
}
```

### `POST /api/auth/profile`
Create or update user profile.

**Request:**
```json
{
  "walletAddress": "0x1234...",
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "(555) 123-4567"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "...",
    "walletAddress": "0x1234...",
    "name": "John Doe",
    "role": "member"
  }
}
```

### `GET /api/auth/session`
Get current session information.

**Response:**
```json
{
  "isLoggedIn": true,
  "address": "0x1234...",
  "hasProfile": true
}
```

### `POST /api/auth/logout`
Destroy current session.

**Response:**
```json
{
  "success": true
}
```

## Database Schema

### UserProfile
```prisma
model UserProfile {
  id            String   @id @default(cuid())
  walletAddress String   @unique
  name          String
  email         String?
  phoneNumber   String
  role          String   @default("member")
  permissions   String[] @default([])
  lastLogin     DateTime?
  sessionToken  String?
  lastBalanceCheck DateTime?
  loginAttempts Int      @default(0)
  lastLoginAttempt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### AuthChallenge
```prisma
model AuthChallenge {
  id        String   @id @default(cuid())
  address   String
  nonce     String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### RateLimit
```prisma
model RateLimit {
  id        String   @id @default(cuid())
  key       String   @unique
  count     Int      @default(0)
  resetAt   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Security Features

### CSRF Protection
- CSRF tokens are generated for each session
- All state-changing requests require valid CSRF token
- Tokens are validated using constant-time comparison

### Rate Limiting
- 10 requests per minute per IP address
- Exponential backoff for failed attempts
- In-memory storage (should use Redis in production)

### Session Security
- HTTP-only cookies prevent XSS attacks
- Secure flag in production (HTTPS only)
- SameSite=strict prevents CSRF
- 7-day expiration

### Balance Checks
- Initial check during authentication
- Periodic checks (every 24 hours)
- Automatic session revocation if balance drops

## Testing

To test the authentication system:

1. **Without Contract (Development Mode)**:
   ```bash
   # Don't set NEXT_PUBLIC_SOULAANI_COIN_ADDRESS
   pnpm dev
   ```
   - Any wallet can connect and access portal
   - Warnings logged to console

2. **With Contract (Production Mode)**:
   ```bash
   # Set all environment variables
   NEXT_PUBLIC_SOULAANI_COIN_ADDRESS=0x... pnpm dev
   ```
   - Only wallets with SoulaaniCoin can access
   - All checks enforced

## Troubleshooting

### "SoulaaniCoin contract address not configured"
- Set `NEXT_PUBLIC_SOULAANI_COIN_ADDRESS` in `.env.local`
- Or run in development mode (will skip blockchain checks)

### "Failed to verify signature"
- Ensure wallet is connected to correct network
- Check `NEXT_PUBLIC_CHAIN_ID` matches your network
- Verify RPC URL is accessible

### "Rate limit exceeded"
- Wait 60 seconds before trying again
- Clear rate limit data (restart server in development)

### "Invalid CSRF token"
- Clear cookies and try again
- Ensure cookies are enabled in browser

## Deployment Checklist

Before deploying to production:

- [ ] Set secure `SESSION_SECRET` (32+ characters)
- [ ] Set `NEXT_PUBLIC_SOULAANI_COIN_ADDRESS` to deployed contract
- [ ] Set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
- [ ] Set `NODE_ENV=production`
- [ ] Configure Redis for rate limiting (replace in-memory storage)
- [ ] Set up HTTPS (required for secure cookies)
- [ ] Test authentication flow end-to-end
- [ ] Monitor logs for errors
