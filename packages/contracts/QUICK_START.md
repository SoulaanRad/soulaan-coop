# 🚀 Quick Start: Deploy Soulaan Co-op Contracts

> **📍 Network:** This guide deploys to **Base Sepolia testnet** - a free test network where you can experiment without spending real money. When you're ready for production, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for mainnet deployment.

---

## ✅ What's Already Done

The co-op runs on four smart contracts:

1. **SoulaaniCoin (SC)** - `contracts/SoulaaniCoin.sol`  
   - Non-transferable governance token (soulbound)
   - Governance awards/slashes SC for member participation
   - Tracks activity for decay monitoring

2. **UnityCoin (UC)** - `contracts/UnityCoin.sol`
   - ERC-20 stablecoin for transactions
   - Treasury can mint, anyone can burn
   - Pausable in emergencies
   - Requires SC membership to receive UC

3. **RedemptionVault** - `contracts/RedemptionVault.sol`
   - Members deposit UC to redeem for USDC
   - Backend processes redemptions
   - Treasury can withdraw accumulated UC

4. **MockUSDC** - `contracts/MockUSDC.sol`
   - Test USDC token for development
   - Only used on testnet (use real USDC on mainnet)

---


### Wallet Strategy:

**For Admins/Governors (you):**
- Use **MetaMask** or hardware wallet
- Deploy contracts
- Manage treasury
- Award/slash SC tokens

**For Co-op Members:**
- The portal uses **Web3Modal** for wallet connection
- Members can use MetaMask, Coinbase Wallet, WalletConnect, etc.
- Or you can create wallets for them using Privy (optional)

**Think of it this way:**
- Admin wallets = You control (deploy, manage, govern)
- Member wallets = They control (vote, transact, participate)

---

## 🛠️ Two Ways to Get Started

### Option 1: Use MetaMask (Easier)

1. Install MetaMask: https://metamask.io/download/
2. Create wallet, save seed phrase
3. Add **Base Sepolia testnet** to MetaMask:
   - **Network Name:** Base Sepolia
   - **RPC URL:** `https://sepolia.base.org`
   - **Chain ID:** `84532`
   - **Currency Symbol:** ETH
   - **Block Explorer:** `https://sepolia.basescan.org`
4. Get **free test ETH** from a faucet (no real money needed!)

**Note:** Base Sepolia is a **test network** - perfect for development and testing without spending real money.

### Option 2: Generate Wallet with Code

```bash
cd packages/contracts
pnpm create-wallet
```

This creates a new wallet and prints the details. Copy the private key to `.env`.

---

## ⚡ Deploy in 5 Steps

### 1. Set Up Environment

```bash
cd packages/contracts
cp env.example .env
```

Edit `.env` and add:
```bash
# Your wallet's private key (NOT your seed phrase!)
# Get it from: MetaMask → Account Details → Show Private Key
DEPLOYER_PRIVATE_KEY=your_key_without_0x

# Free API key from https://basescan.org/apis  
BASESCAN_API_KEY=your_api_key

# Your wallet address (click your account name in MetaMask to copy it)
# For testing, use your own address for both roles
TREASURY_SAFE_ADDRESS=0x1234...  # Starts with 0x
GOVERNANCE_BOT_ADDRESS=0x1234...  # Use same address for testing
```

### 2. Get Test ETH (Free!)

Get free test ETH for Base Sepolia from any of these faucets:

**Option 1: Coinbase Faucet** (Recommended)
- Visit: https://portal.cdp.coinbase.com/products/faucet
- Select "Base Sepolia"
- Connect your wallet
- Request test ETH (you'll get 0.1 ETH - plenty for deployment!)

**Option 2: Alchemy Faucet**
- Visit: https://www.alchemy.com/faucets/base-sepolia
- Enter your wallet address
- Complete captcha

**Option 3: QuickNode Faucet**
- Visit: https://faucet.quicknode.com/base/sepolia
- Enter your wallet address

💡 **Tip:** Test ETH has no real value - it's just for testing!

### 3. Install & Compile

```bash
pnpm install
pnpm compile
```

### 4. Deploy

```bash
pnpm deploy:sepolia
```

This deploys all three contracts and prints the addresses. **Save these addresses!**

### 5. Verify (Optional but Recommended)

```bash
pnpm verify:sepolia
```

Makes your contracts publicly viewable on BaseScan.

---

## 📝 After Deployment

### Save Contract Addresses

The deployment will print something like:
```
SoulaaniCoin (SC):    0x1234...
Mock USDC:            0x5678...
RedemptionVault:      0x9abc...
UnityCoin (UC):       0xdef0...
```

**Save these!** You'll need them in your web app `.env`:

```bash
# Add to apps/web/.env
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS=0x1234...
NEXT_PUBLIC_UNITY_COIN_ADDRESS=0xdef0...
NEXT_PUBLIC_REDEMPTION_VAULT_ADDRESS=0x9abc...
NEXT_PUBLIC_USDC_ADDRESS=0x5678...  # MockUSDC on testnet, real USDC on mainnet
```

### View on BaseScan

Visit:
- https://sepolia.basescan.org/address/YOUR_SC_ADDRESS
- https://sepolia.basescan.org/address/YOUR_UC_ADDRESS
- https://sepolia.basescan.org/address/YOUR_VAULT_ADDRESS
- https://sepolia.basescan.org/address/YOUR_USDC_ADDRESS

**Note:** Verification might fail for some contracts due to BaseScan API issues. Your contracts still work perfectly - verification just makes the source code public on BaseScan for transparency.

---

## 🏗️ How the Portal Works

Once contracts are deployed, members can access the portal:

### Member Flow:

1. **Member visits portal** → Connects their wallet (MetaMask, Coinbase Wallet, etc.)
2. **Portal checks SC balance** → Must have at least 1 SC to access
3. **Member completes profile** → Name, email, phone (first time only)
4. **Member accesses portal** → View finances, vote on proposals, manage account

### Awarding SC to Members:

Governors can award SC using the `setup-admins` script or directly:

```typescript
import { ethers } from 'ethers';

// Governor wallet (you or other governors)
const governorWallet = new ethers.Wallet(
  process.env.GOVERNOR_PRIVATE_KEY,
  provider
);

// SC contract instance
const scContract = new ethers.Contract(
  process.env.SOULAANI_COIN_ADDRESS,
  scABI,
  governorWallet
);

// Award SC to a member
await scContract.award(
  memberWalletAddress,
  ethers.parseEther('10'), // 10 SC
  ethers.keccak256(ethers.toUtf8Bytes('RENT_PAYMENT')) // reason
);
```

### Adding Members:

Before awarding SC, members must be added:

```typescript
// Add member first
await scContract.addMember(memberWalletAddress);

// Then award SC
await scContract.award(memberWalletAddress, amount, reason);
```

---

## 🆘 Troubleshooting

### "Node version not supported"

The contracts work on Node 18, but ideally upgrade to Node 22:
```bash
nvm install 22
nvm use 22
```

### "Insufficient funds"

You need test ETH. Visit the faucets listed above.

### "Error HH19: ESM project"

This is a configuration issue. Try:
```bash
cd packages/contracts
rm -rf cache artifacts
pnpm clean
pnpm compile
```

If still having issues, I can help debug!

---

## 📖 Full Documentation

- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment guide
- **README.md** - Complete contract documentation
- **contracts/** - Solidity source code with comments

---

## 🎯 Next Steps

1. ✅ Deploy contracts (this guide)
2. ✅ Verify on BaseScan (optional - contracts work without it)
3. ✅ Save contract addresses to `apps/web/.env`
4. ⏭️ **Add governors** using `pnpm setup-admins:sepolia`
5. ⏭️ **Set up the portal** - see [PORTAL_AUTH_README.md](../../apps/web/PORTAL_AUTH_README.md)
6. ⏭️ **Add members** and award them SC
7. ⏭️ Test the full flow: member connects wallet → accesses portal

---

## ⚡ Enabling Instant Onramps (Critical for UX!)

### **The Problem:**

If Treasury Safe (multisig) has to approve every onramp, users wait hours/days for 3 board members to sign. **Terrible user experience!**

### **The Solution:**

Give your backend a **limited minting role** that can mint UC instantly up to a daily limit.

### **How It Works:**

```
User deposits $100 via Stripe
  ↓ instant
Payment confirmed
  ↓ instant  
Backend calls UC.mintOnramp(userAddress, 100 UC)
  ↓ 5 seconds
User has 100 UC in wallet ✅

Time: 5 seconds | Board approval: NOT NEEDED
```

### **Quick Setup:**

**1. Create onramp wallet:**
```bash
pnpm create-wallet
# Save address to .env as ONRAMP_WALLET_ADDRESS
```

**2. Grant ONRAMP_MINTER role:**

After deployment, via BaseScan or manage-roles script:

```typescript
await ucContract.grantRole(
  ethers.id("ONRAMP_MINTER"),
  onrampWalletAddress
);
```

**3. Set daily limit:**

```typescript
// Start with 50,000 UC per day (adjust based on volume)
await ucContract.setDailyMintLimit(
  onrampWalletAddress,
  ethers.parseEther("50000") // 50,000 UC
);
```

**4. Backend code:**

```typescript
// In your backend onramp endpoint
const onrampWallet = new ethers.Wallet(
  process.env.ONRAMP_WALLET_PRIVATE_KEY,
  provider
);

const ucContract = new ethers.Contract(
  process.env.UNITY_COIN_ADDRESS,
  ucABI,
  onrampWallet
);

// After payment confirmed:
const tx = await ucContract.mintOnramp(
  userWalletAddress,
  ethers.parseEther(amount.toString())
);

await tx.wait(); // Done! User has UC
```

### **Security:**

✅ **Daily limit:** Backend can only mint up to 50,000 UC/day (or your set limit)  
✅ **Auto-reset:** Limit resets every 24 hours  
✅ **Revocable:** Treasury Safe can revoke role if compromised  
✅ **Transparent:** All minting logged on-chain  
✅ **Fallback:** Treasury Safe still has unlimited minting for special cases  

### **Recommended Limits:**

| Stage | Expected Daily Volume | Recommended Limit |
|-------|----------------------|------------------|
| Launch (100 users) | $5,000 | 10,000 UC |
| Growth (1,000 users) | $25,000 | 50,000 UC |
| Scale (10,000+ users) | $100,000+ | 200,000 UC |

**Rule of thumb:** Set limit to 2x expected daily volume.

### **If Limit Exceeded:**

```typescript
// Check remaining capacity
const remaining = await ucContract.getRemainingDailyMint(onrampWallet.address);

if (remaining < mintAmount) {
  // Queue for Treasury Safe approval
  await db.onrampRequests.create({
    userId, amount, status: 'pending_treasury'
  });
  
  // Notify: "Processing, available in 2-4 hours"
}
```

**Result:** 99% instant, occasional large amounts via Treasury Safe.

### **Role Summary:**

```
Treasury Safe (3-of-5 multisig)
├─ TREASURER_MINT (unlimited) - for large batches, emergencies
├─ DEFAULT_ADMIN - manages roles and limits
├─ Reviews daily minting reports
├─ Can increase/decrease daily limits
└─ Can revoke ONRAMP_MINTER role if compromised

Backend Onramp Wallet (hot wallet)
├─ ONRAMP_MINTER (limited) - for instant user onramps
├─ Daily limit: 50,000 UC (example)
├─ All minting logged on-chain (transparent)
└─ Treasury reviews activity periodically
```

### **What "Monitoring" Means:**

**Treasury Safe doesn't approve each transaction**, but they:
- ✅ Review daily/weekly reports of UC minted
- ✅ Check on-chain events on BaseScan
- ✅ Run automated monitoring scripts (optional)
- ✅ Can revoke the role instantly if suspicious activity detected
- ✅ Adjust daily limits up or down based on growth

**Example monitoring routine:**
```typescript
// Weekly review by Treasury (manual or automated)
const totalMinted = await getTotalMintedThisWeek();
const averageDaily = totalMinted / 7;

if (averageDaily > dailyLimit * 0.9) {
  // Consider increasing limit
} else if (averageDaily < dailyLimit * 0.3) {
  // Consider decreasing limit for security
}
```

---

**Questions?** Check DEPLOYMENT_GUIDE.md or let me know!

