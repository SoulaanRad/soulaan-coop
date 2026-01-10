# Mobile App Login & Balance Viewing - Implementation Summary

## Overview
Implemented passwordless email authentication and blockchain balance viewing for the Soulaan Co-op mobile app.

## Features Implemented

### 1. Passwordless Authentication
- **Email + Verification Code login** (no passwords stored on device)
- 6-digit codes sent via email
- 10-minute code expiration
- 60-second resend cooldown
- Status-based access control (PENDING/REJECTED/SUSPENDED users blocked)

### 2. Blockchain Balance Integration
- **SoulaaniCoin (SC)** balance display
- **UnityCoin (UC)** balance display
- Real-time balance fetching from Base Sepolia
- Auto-refresh every 60 seconds
- Pull-to-refresh support

### 3. Mobile App Screens
- **Home Screen**: Welcome message, balance cards, account info
- **Profile Screen**: User details, wallet address, logout

### 4. Security Features
- Secure session storage using `expo-secure-store`
- Encrypted keychain (iOS) / EncryptedSharedPreferences (Android)
- Auto-navigation based on auth state
- Session persistence across app restarts

## Backend Changes

### Database
- **New Model**: `LoginCode` for storing verification codes
- **Fields**: email, code, expiresAt, used

### API Endpoints
- `auth.requestLoginCode` - Send verification code to email
- `auth.verifyLoginCode` - Verify code and return user data

### Email System
- Uses `nodemailer` for email sending
- Development mode: Codes logged to console
- Production: Configured via SMTP environment variables

## Files Created/Modified

### Backend
- `packages/db/prisma/schema.prisma` - Added LoginCode model
- `packages/trpc/src/lib/email.ts` - Email utility
- `packages/trpc/src/routers/auth.ts` - Passwordless auth endpoints

### Mobile App
- `apps/mobile/lib/secure-storage.ts` - Secure storage utility
- `apps/mobile/contexts/auth-context.tsx` - Authentication context
- `apps/mobile/lib/config.ts` - Blockchain config
- `apps/mobile/lib/contract-abis.ts` - Smart contract ABIs
- `apps/mobile/lib/blockchain-client.ts` - Viem blockchain client
- `apps/mobile/hooks/use-balances.ts` - Balance fetching hook
- `apps/mobile/components/balance-card.tsx` - Balance display component
- `apps/mobile/app/_layout.tsx` - Added auth/query providers
- `apps/mobile/app/(authenticated)/_layout.tsx` - Authenticated tab layout
- `apps/mobile/app/(authenticated)/home.tsx` - Home screen
- `apps/mobile/app/(authenticated)/profile.tsx` - Profile screen
- `apps/mobile/components/onboarding-flow.tsx` - Updated login flow

## Setup Instructions

### 1. Environment Variables

#### Backend (API)
Create/update `.env` file in `apps/api/`:
```env
# Email Configuration (for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@soulaan.coop
```

#### Mobile App
Create `.env` file in `apps/mobile/`:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_RPC_URL=https://sepolia.base.org
EXPO_PUBLIC_CHAIN_ID=84532
EXPO_PUBLIC_SC_CONTRACT=0xYourSoulaaniCoinAddress
EXPO_PUBLIC_UC_CONTRACT=0xYourUnityCoinAddress
```

### 2. Deploy Smart Contracts
Before balances work, you need to:
1. Deploy SoulaaniCoin and UnityCoin contracts
2. Update contract addresses in mobile `.env`
3. Ensure users have wallet addresses assigned

### 3. Testing Flow

#### Test User Setup
1. Create a test user via the onboarding flow
2. In database, update user status to `ACTIVE`:
   ```sql
   UPDATE "User" SET status = 'ACTIVE' WHERE email = 'test@example.com';
   ```
3. Assign a wallet address (or wait for admin approval flow)

#### Login Testing
1. Open mobile app
2. Go to login screen
3. Enter email → Click "Send Login Code"
4. Check console for code (dev mode) or check email (production)
5. Enter 6-digit code → Click "Verify & Sign In"
6. Should navigate to authenticated home screen

#### Balance Testing
1. After login, verify home screen shows:
   - SC Balance card (gold)
   - UC Balance card (red)
   - Account information
2. Test pull-to-refresh
3. Balances should auto-update every 60 seconds

### 4. Email Configuration Options

**Development (No Email Service)**:
- Codes are logged to console
- Look for: `[DEV] Login code for user@example.com: 123456`

**Production Options**:

**Option 1: Gmail SMTP**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password  # Generate at myaccount.google.com/apppasswords
```

**Option 2: Resend (Recommended)**
- Sign up at resend.com
- Use standard SMTP or API integration
- Good deliverability for transactional emails

**Option 3: Custom SMTP**
- Any SMTP server works
- Just configure host, port, user, pass

## Architecture Decisions

### 1. Passwordless vs Password
- **Why**: Accessibility (many users don't have regular email), security, simpler UX
- **Trade-off**: Requires email service, but email has many interchangeable providers

### 2. Blockchain Balance Fetching
- **Why**: Direct RPC calls avoid backend bottleneck, real-time data
- **Trade-off**: Requires RPC provider, but public RPCs exist

### 3. Secure Storage
- **Why**: Native encrypted storage is most secure for mobile
- **Trade-off**: Platform-specific, but expo-secure-store abstracts this

### 4. React Query for Balances
- **Why**: Automatic caching, refetching, loading states
- **Trade-off**: Additional dependency, but worth it for UX

## Decentralization Principles

As requested, this implementation:
- ✅ **No Twilio** - Uses email instead of SMS
- ✅ **Standard SMTP** - Easy to swap providers
- ✅ **Direct blockchain access** - No centralized balance API
- ✅ **Self-hostable** - All components can be self-hosted

## Next Steps

### Short Term
1. Set up SMTP credentials for email sending
2. Deploy smart contracts and update addresses
3. Implement admin wallet generation on approval
4. Test with real users

### Future Enhancements
1. **Biometric Auth**: Face ID/Touch ID for quick re-auth
2. **Transaction History**: Show SC/UC transaction history
3. **Governance**: View/vote on proposals from mobile
4. **Send/Receive**: UC transfer functionality
5. **QR Codes**: Scan QR for payments
6. **Push Notifications**: Balance changes, proposal deadlines

## Testing Checklist

### Backend
- [ ] Database migration applied successfully
- [ ] Email sending works (or dev logging works)
- [ ] requestLoginCode endpoint works
- [ ] verifyLoginCode endpoint works
- [ ] Status-based blocking works (PENDING/REJECTED/SUSPENDED)

### Mobile App
- [ ] Dependencies installed
- [ ] App builds without errors
- [ ] Login screen shows email input
- [ ] "Send Code" button works
- [ ] Code input appears after sending
- [ ] Verification works with correct code
- [ ] Error messages show for invalid codes
- [ ] Resend timer works (60 seconds)
- [ ] Session persists after app restart
- [ ] Home screen shows user info
- [ ] Balance cards display (or show setup message)
- [ ] Pull-to-refresh works
- [ ] Profile screen shows all user data
- [ ] Logout works and returns to onboarding

## Troubleshooting

### "Code sent to your email" but no email received
- Check SMTP credentials in `.env`
- Check console for `[DEV]` log message
- Verify email service is configured

### Balances show "0" or don't load
- Check contract addresses in mobile `.env`
- Verify RPC URL is correct
- Ensure user has `walletAddress` in database
- Check browser console for errors

### Login code "Invalid or expired"
- Codes expire after 10 minutes
- Each code can only be used once
- Check database `LoginCode` table

### Session doesn't persist
- Check expo-secure-store is installed
- Verify auth context is wrapping the app
- Check for errors in console

## Support

For issues, check:
1. Console logs (mobile and backend)
2. Database for user status and login codes
3. Environment variables are set correctly
4. Smart contracts are deployed (for balances)
