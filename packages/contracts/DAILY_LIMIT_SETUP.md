# UnityCoin Daily Minting Limit Setup

## Problem

When users try to make purchases using the mobile app, they get this error:
```
Error: Execution reverted with reason: Daily limit not set
```

## Root Cause

The UnityCoin contract has a safety feature that requires a **daily minting limit** to be set for the backend wallet before it can mint UC tokens for fiat onramp purchases. This prevents unlimited minting and provides a safety mechanism.

## Solution

You need to run a one-time setup script to configure the daily minting limit for your backend wallet.

### Step 1: Set the Daily Limit

Run this command from the project root:

```bash
cd packages/contracts
pnpm set-daily-limit
```

This will:
- Set a daily minting limit of **100,000 UC** for the backend wallet
- The limit resets every 24 hours (based on blockchain timestamp)
- Allow the backend to mint UC tokens for user purchases

### Step 2: Verify the Configuration

The script will show you:
```
✅ Daily mint limit configuration complete!

💡 The backend can now mint up to 100000.0 UC per day
   This limit resets every 24 hours (based on block timestamp)
```

### Adjusting the Limit

If you need to change the daily limit, edit the script at:
`packages/contracts/scripts/set-daily-mint-limit.ts`

Change line 48:
```typescript
const dailyLimit = ethers.parseEther("100000"); // 100,000 UC
```

Recommended limits:
- **Small coop**: 10,000 UC/day
- **Medium coop**: 100,000 UC/day (default)
- **Large coop**: 1,000,000 UC/day

### For Other Networks

- **Mainnet**: `pnpm set-daily-limit:mainnet`
- **Local**: `pnpm set-daily-limit:local`

## Security Notes

- Only the admin wallet (deployer) can set daily limits
- The backend wallet must have the `BACKEND` role
- This is a safety feature to prevent unlimited token minting
- The limit resets automatically every 24 hours

## Troubleshooting

### Error: "Backend wallet does not have BACKEND role"

Run the deployment script or grant-roles script first:
```bash
pnpm grant-member-manager
```

### Error: "UNITY_COIN_ADDRESS not set"

Make sure your `.env` file has:
```bash
UNITY_COIN_ADDRESS=0x6aF9926Baa31566A4f9f59816d1D2D9521899fDb
GOVERNANCE_BOT_ADDRESS=0x89590b9173d8166FCCc3D77ca133a295c4d5b6Cd
```

## After Setup

Once the daily limit is set, users will be able to:
- Make purchases in the mobile app
- Mint UC tokens via fiat onramp
- Complete checkout without errors

The error handling in the mobile app has been improved to show user-friendly messages for common errors.
