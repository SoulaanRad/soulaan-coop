# 🚀 Quick Start: Deploy Soulaan Co-op Contracts


## ✅ What's Already Done

I've created three smart contracts for you:

1. **UnityCoin (UC)** - `contracts/UnityCoin.sol`
   - ERC-20 stablecoin for transactions
   - Treasury can mint, anyone can burn
   - Pausable in emergencies

2. **SoulaaniCoin (SC)** - `contracts/SoulaaniCoin.sol`  
   - Non-transferable governance token (soulbound)
   - Governance bot awards/slashes SC
   - Tracks activity for decay monitoring

3. **RedemptionVault** - `contracts/RedemptionVault.sol`
   - Members deposit UC to redeem for fiat
   - Backend processes redemptions
   - Treasury can withdraw accumulated UC

---


### Use MetaMask (or generate a wallet) for:
- ✅ **Deploying contracts** (admin task, right now)
- ✅ Treasury Safe management
- ✅ Governance bot wallet

### Use Privy for:
- ✅ **Creating wallets for co-op members** (users)
- ✅ Member authentication in your app
- ✅ User transactions

**Think of it this way:**
- MetaMask = **Admin wallet** (you and treasury)
- Privy = **Member wallets** (your users)

---

## 🛠️ Two Ways to Get Started

### Option 1: Use MetaMask (Easier)

1. Install MetaMask: https://metamask.io/download/
2. Create wallet, save seed phrase
3. Add Base Sepolia network (see DEPLOYMENT_GUIDE.md)
4. Get test ETH from faucet

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
# Your wallet's private key (from MetaMask or create-wallet script)
DEPLOYER_PRIVATE_KEY=your_key_without_0x

# Free API key from https://basescan.org/apis  
BASESCAN_API_KEY=your_api_key

# For testing, use your own address for both
TREASURY_SAFE_ADDRESS=your_wallet_address
GOVERNANCE_BOT_ADDRESS=your_wallet_address
```

### 2. Get Test ETH

Visit https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Connect wallet
- Request test ETH
- Wait 1-2 minutes

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
UnityCoin (UC):       0x1234...
SoulaaniCoin (SC):    0x5678...
RedemptionVault:      0x9abc...
```

**Save these!** You'll need them in your backend `.env`:

```bash
# Add to apps/api/.env or wherever your backend is
UC_CONTRACT_ADDRESS=0x1234...
SC_CONTRACT_ADDRESS=0x5678...
VAULT_CONTRACT_ADDRESS=0x9abc...
```

### View on BaseScan

Visit:
- https://sepolia.basescan.org/address/YOUR_UC_ADDRESS
- https://sepolia.basescan.org/address/YOUR_SC_ADDRESS
- https://sepolia.basescan.org/address/YOUR_VAULT_ADDRESS

---

## 🏗️ How Privy Fits In (Later)

Once contracts are deployed, here's how Privy works with them:

### In Your App:

1. **Member signs up** → Privy creates a wallet for them
2. **Member pays rent** → Your backend detects the UC transaction
3. **Backend awards SC** → Using the governance bot wallet, calls `SC.award(memberAddress, amount, reason)`
4. **Member votes** → Uses their Privy wallet to interact with SC

### Code Example (Backend):

```typescript
import { ethers } from 'ethers';

// Governance bot wallet (your backend controls this)
const governanceWallet = new ethers.Wallet(
  process.env.GOVERNANCE_BOT_PRIVATE_KEY,
  provider
);

// SC contract instance
const scContract = new ethers.Contract(
  process.env.SC_CONTRACT_ADDRESS,
  scABI,
  governanceWallet
);

// Award SC to a member (their Privy wallet address)
await scContract.award(
  memberPrivyWalletAddress,
  ethers.parseEther('10'), // 10 SC
  ethers.id('RENT_PAYMENT') // reason
);
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
2. ✅ Verify on BaseScan
3. ✅ Save contract addresses
4. ⚡ **Set up instant onramps** (see below - critical for UX!)
5. ⏭️ Integrate with backend (event monitoring)
6. ⏭️ Connect Privy for member wallets
7. ⏭️ Build member onboarding flow

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
  process.env.UC_CONTRACT_ADDRESS,
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

