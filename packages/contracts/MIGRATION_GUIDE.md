# 🔄 SC Contract Migration Guide

## Overview

This guide explains how to migrate from the old SC contract to the new one with diminishing returns and decay features.

## What the Migration Script Does

The `migrate-and-deploy.ts` script performs a complete migration in **one command**:

1. ✅ **Exports** SC balances from old contract (`0x5125035DA40376E9Ca0376DDDA9C92F7C84d341F`)
2. ✅ **Deploys** all new contracts (SC, UC, RedemptionVault, MockUSDC)
3. ✅ **Migrates** SC balances to new contract
4. ✅ **Sets up** all roles and permissions
5. ✅ **Saves** deployment info to JSON

## 🚀 Quick Start

### Step 1: Prepare Environment

Make sure your `.env` file has:

```bash
# Required
DEPLOYER_PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional (uses deployer if not set)
TREASURY_SAFE_ADDRESS=0x...
GOVERNANCE_BOT_ADDRESS=0x...

# For verification
BASESCAN_API_KEY=your_api_key
```

### Step 2: Run Migration

From `packages/contracts/`:

```bash
# For testnet (Base Sepolia)
pnpm migrate:sepolia

# For mainnet (when ready)
pnpm migrate:mainnet
```

That's it! ✨

## What Happens During Migration

### 1. Export Old Balances (30-60 seconds)
```
📊 STEP 1: Exporting SC balances from old contract
   Scanning blockchain for SC holders...
   Found 15 unique SC recipients
   
   0x1234...: 100.5 SC
   0x5678...: 250.0 SC
   ...
   
   ✅ Found 15 accounts with SC balances
   💾 Export saved to: deployments/sc-export-1234567890.json
```

### 2. Deploy New Contracts (2-3 minutes)
```
📦 STEP 2: Deploying New Contracts
   Deploying SoulaaniCoin (SC)...
   ✅ SC deployed to: 0xNEW_ADDRESS_1
   
   Deploying Mock USDC...
   ✅ Mock USDC deployed to: 0xNEW_ADDRESS_2
   
   Deploying UnityCoin (UC)...
   ✅ UC deployed to: 0xNEW_ADDRESS_3
   
   Deploying RedemptionVault...
   ✅ RedemptionVault deployed to: 0xNEW_ADDRESS_4
   
   Granting permissions...
   ✅ RedemptionVault can now mint UC
```

### 3. Migrate SC Balances (1-2 minutes)
```
🔄 STEP 3: Migrating SC Balances
   Migrating 15 accounts...
   
   3a. Adding members to new SC contract...
      ✅ Added batch 1 (15 members)
   ✅ All 15 members added
   
   3b. Restoring SC balances...
      ✅ 0x1234...: 100.5 SC
      ✅ 0x5678...: 250.0 SC
      ...
   
   ✅ Migration complete!
   📊 Total SC migrated: 1,500.5 SC
```

### 4. Setup Complete
```
🎉 DEPLOYMENT AND MIGRATION COMPLETE!

📋 NEW CONTRACT ADDRESSES:
SoulaaniCoin (SC):    0xNEW_SC_ADDRESS
Mock USDC:            0xNEW_USDC_ADDRESS
RedemptionVault:      0xNEW_VAULT_ADDRESS
UnityCoin (UC):       0xNEW_UC_ADDRESS

🔄 MIGRATION SUMMARY:
Old SC Address:       0x5125035DA40376E9Ca0376DDDA9C92F7C84d341F
New SC Address:       0xNEW_SC_ADDRESS
Accounts Migrated:    15
Total SC Migrated:    1500.5000 SC
```

## Post-Migration Steps

### 1. Update Environment Variables

Update these files with new contract addresses:

#### `apps/api/.env`
```bash
SOULAANI_COIN_ADDRESS=0xNEW_SC_ADDRESS
UNITY_COIN_ADDRESS=0xNEW_UC_ADDRESS
REDEMPTION_VAULT_ADDRESS=0xNEW_VAULT_ADDRESS
```

#### `apps/web/.env.local`
```bash
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS=0xNEW_SC_ADDRESS
NEXT_PUBLIC_UNITY_COIN_ADDRESS=0xNEW_UC_ADDRESS
NEXT_PUBLIC_REDEMPTION_VAULT_ADDRESS=0xNEW_VAULT_ADDRESS
```

#### `apps/mobile/.env`
```bash
SOULAANI_COIN_ADDRESS=0xNEW_SC_ADDRESS
UNITY_COIN_ADDRESS=0xNEW_UC_ADDRESS
REDEMPTION_VAULT_ADDRESS=0xNEW_VAULT_ADDRESS
```

### 2. Verify Contracts

```bash
pnpm verify:sepolia
```

This makes contracts readable on BaseScan.

### 3. Restart Your Backend

```bash
cd apps/api
pnpm dev
```

The backend will now use the new contracts.

### 4. Set Up Monthly Decay Cron Job

See `SC_UPDATES_SUMMARY.md` for instructions on setting up the monthly decay job.

## Important Notes

### Migration is Safe ✅
- Original contract is **read-only** (we only query balances)
- Original SC tokens remain in old contract (not destroyed)
- New SC tokens are **minted fresh** in new contract
- Users' wallet addresses stay the same

### What Gets Migrated
- ✅ SC balances
- ✅ Member status (Active, Suspended, etc.)
- ✅ Member addresses

### What Doesn't Migrate
- ❌ Activity history (fresh start for new tracking)
- ❌ Last activity timestamp (will update as users interact)
- ❌ Activity type counts (will rebuild as users earn)

### UC Tokens
- UC tokens are **in users' wallets** (not contract-specific)
- No UC migration needed
- UC automatically works with new contracts

## Troubleshooting

### "Could not connect to old SC contract"
**Reason:** Old contract address is wrong or network mismatch  
**Solution:** Check `OLD_SC_ADDRESS` in script matches your deployment

### "Transaction failed"
**Reason:** Not enough ETH for gas  
**Solution:** Get more test ETH from Base Sepolia faucet

### "Address already has SC"
**Reason:** Running migration twice  
**Solution:** Deploy fresh or use the new contract as-is

### "Failed to migrate address"
**Reason:** Individual address issue (suspended member, etc.)  
**Solution:** Script continues with other addresses, check logs

## Gas Costs

Expect to pay approximately:

| Action | Gas Cost (Base Sepolia) |
|--------|-------------------------|
| Deploy SC | ~0.0003 ETH |
| Deploy UC | ~0.0004 ETH |
| Deploy Vault | ~0.0002 ETH |
| Add 50 members | ~0.0001 ETH |
| Mint SC (per user) | ~0.00005 ETH |

**Total for 15 users:** ~0.002 ETH (~$5 USD)

## Files Created

### `deployments/sc-export-{timestamp}.json`
Export of old SC balances:
```json
{
  "exportedAt": "2025-01-23T...",
  "oldContractAddress": "0x7E59...",
  "totalHolders": 15,
  "balances": [
    {
      "address": "0x1234...",
      "balance": "100.5",
      "balanceWei": "100500000000000000000",
      "memberStatus": 1,
      "lastActivity": 1234567890,
      "totalActivities": 42
    }
  ]
}
```

### `deployments/baseSepolia-{timestamp}.json`
New deployment info:
```json
{
  "network": "baseSepolia",
  "chainId": 84532,
  "deployedAt": "2025-01-23T...",
  "deployer": "0x...",
  "migration": {
    "oldSCAddress": "0x7E59...",
    "accountsMigrated": 15
  },
  "contracts": {
    "SoulaaniCoin": { "address": "0x..." },
    "UnityCoin": { "address": "0x..." }
  }
}
```

## Testing Migration

After migration, verify everything works:

```bash
# Check deployer SC balance
cd packages/contracts
pnpm check-balance

# Test awarding SC (should apply diminishing returns)
pnpm monitor-sc-awards

# Check for inactive accounts (for decay testing)
pnpm check-inactive-decay
```

## Rollback Plan

If something goes wrong:

1. Old contracts are **unchanged** - still functional
2. Update `.env` files back to old addresses
3. Continue using old contracts
4. Debug issue and re-run migration

## Need Help?

See these docs:
- `SC_UPDATES_SUMMARY.md` - Overview of new features
- `docs/SC_DIMINISHING_RETURNS.md` - Detailed feature docs
- `DEPLOYMENT_GUIDE.md` - Standard deployment guide

Or reach out to the dev team! 🚀
