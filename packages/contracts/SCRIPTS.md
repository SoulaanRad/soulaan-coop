# 📜 Contracts Scripts Reference

## Available Scripts

### Deployment Scripts

#### `deploy.ts` - Main Deployment Script
Deploys all Soulaan Co-op contracts to the blockchain.

```bash
# Deploy to Base Sepolia (testnet)
pnpm deploy:sepolia

# Deploy to local network
pnpm deploy:local
```

**What it does:**
1. Deploys UnityCoin (UC)
2. Deploys SoulaaniCoin (SC)
3. Adds deployer as first admin
4. Awards deployer 1 SC
5. Deploys RedemptionVault
6. Saves deployment info to `deployments/` folder

**Requirements:**
- `.env` file with `PRIVATE_KEY` and `RPC_URL`
- ETH in deployer wallet for gas

---

#### `setup-admins.ts` - Add Admins After Deployment
Interactive script to add admin users and award them SC tokens.

```bash
# Add admins on Base Sepolia
pnpm setup-admins:sepolia

# Add admins on local network
pnpm setup-admins:local
```

**What it does:**
1. Loads latest deployment automatically
2. Checks you have GOVERNANCE_ROLE
3. Lets you use config file OR enter addresses manually
4. Adds each admin as a member
5. Awards each admin 1 SC
6. Shows summary of successful/failed additions

**Two ways to use:**

**Option 1: Config File (Recommended)**
1. Edit `deployment-config.json`:
```json
{
  "baseSepolia": {
    "initialAdmins": [
      {
        "address": "0xAlice...",
        "name": "Alice",
        "note": "Primary admin"
      }
    ]
  }
}
```
2. Run `pnpm setup-admins:sepolia`
3. Choose "yes" when prompted

**Option 2: Interactive**
1. Run `pnpm setup-admins:sepolia`
2. Choose "no" to config file
3. Enter addresses when prompted

---

### Management Scripts

#### `manage-roles.ts` - Role Management
Manage contract roles (GOVERNANCE_ROLE, MINTER_ROLE, etc.)

```bash
pnpm manage-roles --network baseSepolia
```

#### `check-balance.ts` - Check Token Balances
Check UC and SC balances for any address.

```bash
pnpm check-balance --network baseSepolia
```

#### `monitor-sc-awards.ts` - Monitor SC Awards
Listen for SC award events in real-time.

```bash
pnpm monitor-sc-awards --network baseSepolia
```

#### `check-inactive-decay.ts` - Check Inactive Member Decay
Check which members are inactive and subject to SC decay.

```bash
pnpm check-inactive-decay --network baseSepolia
```

---

### Utility Scripts

#### `create-wallet.ts` - Create New Wallet
Generate a new wallet for testing.

```bash
pnpm create-wallet
```

#### `rotate-wallet.ts` - Rotate Wallet Keys
Rotate wallet keys for security.

```bash
pnpm rotate-wallet
```

#### `verify.ts` - Verify Contracts on BaseScan
Verify deployed contracts on BaseScan.

```bash
pnpm verify:sepolia
```

---

## Configuration Files

### `.env`
Environment variables for deployment.

```bash
PRIVATE_KEY="your-private-key"
RPC_URL="https://sepolia.base.org"
GOVERNANCE_BOT_ADDRESS=""  # Optional
TREASURY_SAFE_ADDRESS=""   # Optional
```

### `deployment-config.json`
Pre-configure admins and settings.

```json
{
  "baseSepolia": {
    "network": "Base Sepolia Testnet",
    "chainId": 84532,
    "treasurySafe": "",
    "governanceBot": "",
    "initialAdmins": [
      {
        "address": "0x...",
        "name": "Admin Name",
        "note": "Description"
      }
    ]
  }
}
```

---

## Typical Workflow

### 1. Initial Deployment

```bash
# 1. Configure environment
cd packages/contracts
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 2. Deploy contracts
pnpm deploy:sepolia

# 3. Save the contract addresses from output
# SoulaaniCoin: 0x...
```

### 2. Setup Admins

```bash
# Option A: Use config file
# 1. Edit deployment-config.json
# 2. Add admin addresses
# 3. Run setup script
pnpm setup-admins:sepolia

# Option B: Interactive
pnpm setup-admins:sepolia
# Enter addresses when prompted
```

### 3. Verify Deployment

```bash
# Check admin has SC
pnpm console --network baseSepolia

# In console:
const SC = await ethers.getContractFactory("SoulaaniCoin");
const sc = await SC.attach("YOUR_SC_ADDRESS");
await sc.balanceOf("ADMIN_ADDRESS");
// Should return 1000000000000000000 (1 SC)
```

### 4. Update Web App

```bash
# Edit apps/web/.env
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS="0xYourSCAddress"

# Start web app
cd ../..
pnpm dev --filter @soulaan-coop/web
```

---

## Security Best Practices

### For Deployment
- ✅ Use hardware wallet for production
- ✅ Never commit `.env` files
- ✅ Test on testnet first
- ✅ Transfer GOVERNANCE_ROLE to multi-sig after deployment

### For Admin Management
- ✅ Use `deployment-config.json` for team transparency
- ✅ Verify addresses before adding admins
- ✅ Keep audit log of who has admin access
- ✅ Regularly review and revoke unused admin access

### For Production
- ✅ Use multi-sig for GOVERNANCE_ROLE
- ✅ Implement timelock for critical operations
- ✅ Monitor on-chain events
- ✅ Have incident response plan

---

## Troubleshooting

### "Insufficient funds for gas"
**Solution:** Get more ETH from faucet or fund your wallet.

### "Nonce too high"
**Solution:** Reset your account in MetaMask (Settings → Advanced → Reset Account).

### "Contract not deployed"
**Solution:** Make sure you ran `deploy.ts` first.

### "Missing GOVERNANCE_ROLE"
**Solution:** You need to use the deployer wallet or a wallet with GOVERNANCE_ROLE.

### "Invalid address"
**Solution:** Make sure addresses start with `0x` and are valid Ethereum addresses.

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy contracts | `pnpm deploy:sepolia` |
| Add admins | `pnpm setup-admins:sepolia` |
| Check balance | `pnpm check-balance --network baseSepolia` |
| Verify contracts | `pnpm verify:sepolia` |
| Open console | `pnpm console --network baseSepolia` |
| Run tests | `pnpm test` |
| Compile contracts | `pnpm compile` |

---

**For more details, see:**
- [Getting Started Guide](../../GETTING_STARTED_ADMIN.md)
- [Security Guide](../../DEPLOYMENT_SECURITY_GUIDE.md)
- [Quick Reference](../../ADMIN_QUICK_REFERENCE.md)
