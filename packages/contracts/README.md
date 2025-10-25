# 🏛️ Soulaan Co-op Smart Contracts

Smart contracts for the Soulaan Co-op economy on Base Sepolia testnet.

## 📦 Contracts

### 1. **UnityCoin (UC)** - `UnityCoin.sol`
Stable digital currency for economic transactions in the Soulaan Co-op.

**Features:**
- ERC-20 standard token
- Two-tier minting system:
  - Unlimited minting (Treasury Safe)
  - **Limited minting with daily caps (Backend for instant onramps) ⚡**
- Burnable by anyone (burn your own tokens)
- Pausable in emergencies
- 18 decimals (like ETH)

**Roles:**
- `TREASURER_MINT`: Can mint unlimited UC (held by Treasury Safe)
- `ONRAMP_MINTER`: Can mint UC up to daily limit (held by backend for instant user onramps)
- `PAUSER`: Can pause/unpause all transfers (held by Treasury Safe)
- `DEFAULT_ADMIN`: Can grant/revoke roles and set daily limits

**Why Two Minting Roles?**
- `TREASURER_MINT` for large batches and emergencies (requires 3/5 multisig - slow but secure)
- `ONRAMP_MINTER` for instant user onramps (backend mints immediately - fast UX, capped for security)

### 2. **SoulaaniCoin (SC)** - `SoulaaniCoin.sol`
Non-transferable governance and yield token (soulbound).

**Features:**
- ERC-20-based but completely non-transferable (soulbound)
- Members earn SC through participation
- Used for voting and staking
- Tracks last activity for decay monitoring

**Roles:**
- `GOVERNANCE_AWARD`: Can award SC to members (governance bot)
- `GOVERNANCE_SLASH`: Can slash SC from members (governance bot)
- `DEFAULT_ADMIN`: Can grant/revoke roles

**How it works:**
- Backend awards SC when members pay rent, spend at businesses, or work on projects
- SC cannot be transferred or sold (soulbound to wallet)
- Backend can slash SC for inactivity or violations

### 3. **RedemptionVault** - `RedemptionVault.sol`
Vault for members to redeem UC for fiat currency.

**Features:**
- Members deposit UC to request redemption
- Backend processes redemptions off-chain
- Can fulfill or cancel redemptions
- Treasury can withdraw accumulated UC

**Roles:**
- `REDEMPTION_PROCESSOR`: Backend that processes redemptions
- `TREASURER`: Can withdraw UC to Treasury Safe
- `DEFAULT_ADMIN`: Can grant/revoke roles

**Flow:**
1. Member calls `redeem(amount)` (must approve UC first)
2. Vault emits `RedeemRequested` event
3. Backend monitors events and processes redemption off-chain
4. Backend calls `fulfillRedemption()` or `cancelRedemption()`

---

## 🚀 Quick Start

> **📚 Need CI/CD setup?** See [CI_CD_SETUP.md](./CI_CD_SETUP.md) for automated testing and deployment

### Prerequisites

1. **Node.js** (v22+) and **pnpm** installed
2. **MetaMask** wallet (or any Web3 wallet)
3. **Test ETH** on Base Sepolia

### 1. Install Dependencies

From the **workspace root**:

```bash
cd packages/contracts
pnpm install
```

### 2. Set Up Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add:

```bash
# Your wallet's private key (from MetaMask: Account Details -> Export Private Key)
DEPLOYER_PRIVATE_KEY=your_private_key_here_without_0x

# Get free API key from https://basescan.org/apis
BASESCAN_API_KEY=your_basescan_api_key_here

# Optional: Add these if you have them ready
TREASURY_SAFE_ADDRESS=0x...
GOVERNANCE_BOT_ADDRESS=0x...
```

**⚠️ IMPORTANT:** Never commit your `.env` file or share your private key!

### 3. Get Test ETH

You need test ETH on Base Sepolia to deploy contracts.

**Option A: Coinbase Faucet** (Recommended)
1. Go to https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Connect your wallet
3. Request test ETH

**Option B: Base Sepolia Faucet**
1. Go to https://www.alchemy.com/faucets/base-sepolia
2. Enter your wallet address
3. Request test ETH

Check your balance at: https://sepolia.basescan.org

### 4. Compile Contracts

```bash
pnpm compile
```

This generates TypeScript types for your contracts in `typechain-types/`.

### 5. Deploy to Base Sepolia

```bash
pnpm deploy:sepolia
```

This will:
- Deploy all three contracts (UC, SC, RedemptionVault)
- Set up role assignments
- Save deployment info to `deployments/`
- Print contract addresses

**Example output:**
```
🎉 DEPLOYMENT COMPLETE!

📋 DEPLOYED CONTRACT ADDRESSES:
UnityCoin (UC):       0x1234...
SoulaaniCoin (SC):    0x5678...
RedemptionVault:      0x9abc...
```

### 6. Verify Contracts on BaseScan

```bash
pnpm verify:sepolia
```

This makes your contract source code publicly viewable on BaseScan, which builds trust and enables users to interact with your contracts directly.

---

## 🎓 Understanding Wallets & Keys

### What You Need:

#### 1. **Deployer Wallet** (Your Admin Wallet)
This is **your** personal wallet that will deploy the contracts.

**How to get it:**
1. Install MetaMask browser extension
2. Create a new wallet (save your seed phrase!)
3. Get your private key: MetaMask → Account Details → Export Private Key
4. Add it to `.env` as `DEPLOYER_PRIVATE_KEY`

#### 2. **Treasury Safe** (Multisig for UC Control)
A wallet that requires multiple people to approve transactions (like 3 out of 5).

**For testing:** Use your own wallet address initially.

**For production:** Create a multisig on https://safe.global

**What it controls:**
- Unlimited UC minting (for large batches)
- Setting daily mint limits for onramp wallet
- Granting/revoking the ONRAMP_MINTER role
- Pausing UC transfers in emergencies

#### 3. **Governance Bot Wallet** (Backend Server Wallet)
A wallet your backend server controls to automatically award/slash SC.

**How to create:**
1. Create a new MetaMask account (or use a library like ethers.js)
2. Save its private key securely in your backend `.env`
3. Fund it with a small amount of ETH for gas fees

**What it controls:**
- Awarding SC when members participate
- Slashing SC for inactivity or violations

#### 4. **Onramp Wallet** (Backend Server Wallet)
A separate wallet for instant UC minting (keep separate from governance bot for security).

**How to create:**
```bash
cd packages/contracts
pnpm create-wallet
```

**What it controls:**
- Instant UC minting up to daily limit (e.g., 50,000 UC/day)
- Automatically mints when users deposit money

**Security:**
- Daily limit prevents unlimited minting if compromised
- Treasury Safe can revoke access instantly
- All minting logged on-chain

#### 5. **Member Wallets** (Regular Users)
Created automatically by Privy when users sign up.

---

## 📚 Base Sepolia Resources

### What is Base Sepolia?

**Base** is an Ethereum Layer 2 blockchain by Coinbase (faster, cheaper than Ethereum mainnet).

**Sepolia** is a testnet (practice environment with fake money).

**Base Sepolia** = Practice version of Base where you can test for free before going live.

### Key Information:

- **Chain ID:** 84532
- **RPC URL:** https://sepolia.base.org
- **Block Explorer:** https://sepolia.basescan.org
- **Currency:** Test ETH (free, no real value)

### Add to MetaMask:

1. Open MetaMask
2. Click network dropdown (top)
3. Click "Add Network"
4. Enter:
   - **Network Name:** Base Sepolia
   - **RPC URL:** https://sepolia.base.org
   - **Chain ID:** 84532
   - **Currency Symbol:** ETH
   - **Block Explorer:** https://sepolia.basescan.org

### Learning Resources:

- [Base Docs](https://docs.base.org/)
- [What is a Testnet?](https://ethereum.org/en/developers/docs/networks/#testnets)
- [Ethereum for Beginners](https://ethereum.org/en/developers/docs/intro-to-ethereum/)
- [Smart Contract Tutorial](https://ethereum.org/en/developers/docs/smart-contracts/)

---

## 🔧 Common Commands

```bash
# Compile contracts
pnpm compile

# Run all tests
pnpm test

# Run specific tests
pnpm test:uc      # UnityCoin tests
pnpm test:sc      # SoulaaniCoin tests
pnpm test:vault   # RedemptionVault tests

# Run with coverage
pnpm test:coverage

# Deploy to Base Sepolia
pnpm deploy:sepolia

# Verify contracts on BaseScan
pnpm verify:sepolia

# Wallet & role management
pnpm create-wallet   # Create new wallet
pnpm rotate-wallet   # Rotate backend keys
pnpm manage-roles    # Grant/revoke roles

# Monitoring
pnpm monitor-sc-awards        # Monitor SC awards
pnpm check-inactive-decay     # Check for inactive SC holders

# Clean build artifacts
pnpm clean

# Start local Hardhat node (for local testing)
pnpm node
```

---

## 🏗️ Project Structure

```
packages/contracts/
├── contracts/          # Solidity smart contracts
│   ├── UnityCoin.sol
│   ├── SoulaaniCoin.sol
│   └── RedemptionVault.sol
├── scripts/            # Deployment & verification scripts
│   ├── deploy.ts
│   └── verify.ts
├── deployments/        # Saved deployment info (auto-generated)
├── test/              # Contract tests (add your own!)
├── hardhat.config.ts  # Hardhat configuration
├── package.json
└── README.md          # This file
```

---

## 🔒 Security Notes

1. **Never share your private key** - Anyone with it can control your wallet
2. **Never commit `.env`** - It's in `.gitignore` for a reason
3. **Use multisig for production** - Don't let one person control everything
4. **Test thoroughly** - This is testnet, but still test before mainnet
5. **Audit contracts** - Consider a professional audit before mainnet launch

---

## 🆘 Troubleshooting

### "Insufficient funds for intrinsic transaction cost"
You need more test ETH. Visit the faucets listed above.

### "Invalid nonce" or "Transaction already imported"
Wait a few seconds and try again. The network might be processing your previous transaction.

### "Contract verification failed"
Make sure you have `BASESCAN_API_KEY` in your `.env` file. Get one free at https://basescan.org/apis

### "Network baseSepolia not found"
Check that `BASE_SEPOLIA_RPC_URL` is set correctly in `.env` (or it will use the default).

---

## 📞 Next Steps

After deploying:

1. **Save contract addresses** - Copy them from deployment output
2. **Set up instant onramps** - See QUICK_START.md for ONRAMP_MINTER setup (critical for UX!)
3. **Add to your backend** - Update your API/backend with contract addresses
4. **Integrate with Privy** - Connect wallet creation to SC awards
5. **Build transaction monitoring** - Listen for events to award SC and monitor UC minting
6. **Create admin dashboard** - UI for Treasury to manage roles and review minting activity

---

## 📄 License

MIT License - See LICENSE file in root directory.

---

**Need help?** Check the main project README or reach out to the team!

