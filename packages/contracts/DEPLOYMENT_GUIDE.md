# 🚀 Soulaan Co-op Deployment Guide

**A Complete Step-by-Step Guide for Beginners**

This guide will walk you through deploying the Soulaan Co-op smart contracts to Base Sepolia testnet, even if you've never deployed a smart contract before.

---

## 📋 Table of Contents

1. [Prerequisites Setup](#1-prerequisites-setup)
2. [Get Your Wallet Ready](#2-get-your-wallet-ready)
3. [Get Test ETH](#3-get-test-eth)
4. [Install & Configure](#4-install--configure)
5. [Deploy Contracts](#5-deploy-contracts)
6. [Verify Contracts](#6-verify-contracts)
7. [What's Next?](#7-whats-next)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites Setup

### 🤔 Privy vs MetaMask - Which Do I Need?

**Important:** There's a difference between **admin wallets** (for deployment) and **user wallets** (for members).

| Tool | Purpose | Who Uses It |
|------|---------|-------------|
| **MetaMask** (or similar) | Deploy contracts, admin tasks | You (developer/admin) |
| **Privy** | Create wallets for co-op members | Your users (members) |

**For deployment (right now):** You need MetaMask or can generate a wallet with code (see options below).

**For your app (later):** You'll use Privy to create wallets for co-op members.

### Option A: Install MetaMask (Recommended for Beginners)

MetaMask is a browser wallet that stores your crypto and lets you interact with blockchains.

1. Go to https://metamask.io/download/
2. Install the browser extension for Chrome, Firefox, or Brave
3. Click "Create a new wallet"
4. **SAVE YOUR SEED PHRASE** - Write it down on paper, never digital!
5. Set a strong password

### Option B: Generate Wallet with Code (Alternative)

If you prefer not to use MetaMask, you can generate a wallet programmatically:

```bash
cd packages/contracts
pnpm create-wallet
```

This will:
- Generate a new Ethereum wallet
- Print the address and private key
- Save wallet info to `wallets/` folder (git-ignored)

**After generating:**
1. Copy the private key (without `0x`) to your `.env`
2. Fund the address with test ETH
3. Delete the JSON file after copying to `.env` for security

### Add Base Sepolia Network to MetaMask

1. Open MetaMask
2. Click the network dropdown at the top
3. Click "Add Network" or "Add a network manually"
4. Enter these details:
   - **Network Name:** Base Sepolia
   - **RPC URL:** https://sepolia.base.org
   - **Chain ID:** 84532
   - **Currency Symbol:** ETH
   - **Block Explorer URL:** https://sepolia.basescan.org
5. Click "Save"
6. Switch to Base Sepolia network

---

## 2. Get Your Wallet Ready

### Get Your Private Key

You need your private key to deploy contracts from code.

**⚠️ IMPORTANT:** Your private key is like your bank password. NEVER share it or commit it to GitHub!

**Steps:**
1. Open MetaMask
2. Click the three dots (⋮) next to your account name
3. Click "Account details"
4. Click "Show private key"
5. Enter your MetaMask password
6. **Copy the private key** (it's a long string starting with 0x)
7. Save it somewhere secure (we'll add it to `.env` soon)

### Get Your Wallet Address

1. Open MetaMask
2. Click your account name at the top
3. It will copy your address (looks like: `0x1234...5678`)
4. Save this - you'll use it for initial role setup

---

## 3. Get Test ETH

You need test ETH to pay for gas fees when deploying contracts. Test ETH is free and has no real value.

### Method 1: Coinbase Faucet (Easiest)

1. Go to https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Make sure MetaMask is on Base Sepolia network
3. Click "Connect wallet" and approve
4. Request test ETH
5. Wait 1-2 minutes

### Method 2: Alchemy Faucet

1. Go to https://www.alchemy.com/faucets/base-sepolia
2. Create a free Alchemy account
3. Enter your wallet address
4. Complete any verification (if required)
5. Click "Send Me ETH"

### Verify You Have ETH

1. Open MetaMask
2. Make sure you're on Base Sepolia network
3. You should see a balance like "0.5 ETH"
4. Or check at: https://sepolia.basescan.org/address/YOUR_ADDRESS

**Need more ETH?** You can request from multiple faucets if needed.

---

## 4. Install & Configure

### Install Dependencies

Open your terminal and navigate to the contracts package:

```bash
cd packages/contracts
pnpm install
```

This might take a few minutes. It will install Hardhat and all dependencies.

### Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Open `.env` in your code editor

3. Fill in the values:

```bash
# Your private key from MetaMask (remove the 0x prefix if present)
DEPLOYER_PRIVATE_KEY=your_private_key_here_without_0x

# (Optional) Leave as default or use Alchemy/Infura for better reliability
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Get a free API key from https://basescan.org/apis
BASESCAN_API_KEY=your_basescan_api_key_here

# For testing, use your own wallet address for both
# (You'll create proper multisig/bot wallets later)
TREASURY_SAFE_ADDRESS=your_wallet_address_from_metamask
GOVERNANCE_BOT_ADDRESS=your_wallet_address_from_metamask

# Optional
REPORT_GAS=false
```

**How to get BaseScan API Key (for verification):**
1. Go to https://basescan.org/register
2. Create a free account
3. Go to https://basescan.org/myapikey
4. Click "Add" to create a new API key
5. Copy the key and paste it in your `.env`

### Compile Contracts

Before deploying, let's make sure everything compiles:

```bash
pnpm compile
```

You should see:
```
Compiled 15 Solidity files successfully
```

If you get errors, check that you ran `pnpm install` first.

---

## 5. Deploy Contracts

Now for the exciting part - deploying your contracts!

### Run Deployment

```bash
pnpm deploy:sepolia
```

### What Happens:

The script will:
1. ✅ Connect to Base Sepolia
2. ✅ Check your account has enough ETH
3. ✅ Deploy UnityCoin (UC)
4. ✅ Deploy SoulaaniCoin (SC)
5. ✅ Deploy RedemptionVault
6. ✅ Set up role assignments
7. ✅ Save deployment info to `deployments/` folder
8. ✅ Print contract addresses

### Expected Output:

```
🚀 Starting Soulaan Co-op Contract Deployment...

📝 Deploying contracts with account: 0x1234...5678
💰 Account balance: 0.5 ETH

1️⃣  Deploying UnityCoin (UC)...
✅ UnityCoin deployed to: 0xabcd...

2️⃣  Deploying SoulaaniCoin (SC)...
✅ SoulaaniCoin deployed to: 0xefgh...

3️⃣  Deploying RedemptionVault...
✅ RedemptionVault deployed to: 0xijkl...

🎉 DEPLOYMENT COMPLETE!

📋 DEPLOYED CONTRACT ADDRESSES:
UnityCoin (UC):       0xabcd...
SoulaaniCoin (SC):    0xefgh...
RedemptionVault:      0xijkl...
```

**🎉 Congratulations! You just deployed smart contracts!**

### Save Your Contract Addresses

**VERY IMPORTANT:** Copy these three addresses somewhere safe:
- UnityCoin (UC) address
- SoulaaniCoin (SC) address
- RedemptionVault address

You'll need them to integrate with your backend.

---

## 6. Verify Contracts

Contract verification makes your code publicly visible on BaseScan, which builds trust.

### Run Verification

```bash
pnpm verify:sepolia
```

This will take 1-2 minutes per contract.

### Expected Output:

```
🔍 Starting contract verification...

1️⃣  Verifying UnityCoin...
✅ UnityCoin verified!

2️⃣  Verifying SoulaaniCoin...
✅ SoulaaniCoin verified!

3️⃣  Verifying RedemptionVault...
✅ RedemptionVault verified!

🎉 Verification process complete!
```

### View Your Contracts on BaseScan

Open the URLs printed in the output (or construct them):
- https://sepolia.basescan.org/address/YOUR_UC_ADDRESS
- https://sepolia.basescan.org/address/YOUR_SC_ADDRESS
- https://sepolia.basescan.org/address/YOUR_VAULT_ADDRESS

You should see:
- Green checkmark ✅ next to "Contract"
- "Read Contract" and "Write Contract" tabs
- Your full Solidity source code

---

## 7. What's Next?

### Immediate Next Steps

1. **Save deployment info**
   - Contract addresses are in `deployments/baseSepolia-[timestamp].json`
   - Back this file up somewhere safe

2. **Test your contracts**
   - Go to BaseScan
   - Try "Read Contract" functions (like `totalSupply()`, `balanceOf()`)
   - Try "Write Contract" functions (like `mint()` - connect MetaMask first)

3. **Integrate with your backend**
   - Add contract addresses to your API `.env`:
     ```bash
     UNITY_COIN_ADDRESS=0xabcd...
     SOULAANI_COIN_ADDRESS=0xefgh...
     VAULT_CONTRACT_ADDRESS=0xijkl...
     ```

### Setting Up Proper Roles (Production-Ready)

Right now, your personal wallet has all the roles. For production, you should:

#### 1. Create Treasury Safe (Multisig)

1. Go to https://safe.global
2. Click "Create Account"
3. Choose Base Sepolia network
4. Add signers (e.g., 3 trusted people)
5. Set threshold (e.g., 2 out of 3 must approve)
6. Deploy the Safe
7. Copy the Safe address

#### 2. Create Governance Bot Wallet

This is a wallet your backend server will control.

**Using ethers.js in your backend:**
```javascript
import { ethers } from 'ethers';

// Generate a new wallet
const wallet = ethers.Wallet.createRandom();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);

// Save the private key in your backend .env
// Fund this wallet with ~0.1 ETH for gas fees
```

#### 3. Transfer Roles to Proper Addresses

Once you have your Treasury Safe and Governance Bot addresses:

**Option A: Using BaseScan (GUI)**
1. Go to your UC contract on BaseScan
2. Click "Write Contract" → "Connect Wallet"
3. Find `grantRole` function
4. For TREASURER_MINT role:
   - role: `0x... (keccak256("TREASURER_MINT"))`
   - account: Your Treasury Safe address
5. Submit transaction

**Option B: Write a script (advanced)**

Create `scripts/transfer-roles.ts`:
```typescript
// Grant roles to proper addresses
await unityCoin.grantRole(TREASURER_MINT, treasurySafeAddress);
await unityCoin.grantRole(PAUSER, treasurySafeAddress);

// Renounce your own roles
await unityCoin.renounceRole(TREASURER_MINT, deployerAddress);
await unityCoin.renounceRole(PAUSER, deployerAddress);
```

### Setting Up Instant Onramps (Critical!)

See **QUICK_START.md** for detailed setup of the `ONRAMP_MINTER` role, which allows your backend to mint UC instantly up to a daily limit. This is **essential for good UX** - without it, every onramp requires 3 board signatures (hours of delay).

**Quick summary:**
1. Create an onramp wallet for your backend
2. Grant it `ONRAMP_MINTER` role
3. Set daily limit (e.g., 50,000 UC/day)
4. Backend mints UC instantly when users deposit

**Result:** Users get UC in 5 seconds instead of hours!

### Integrating with Your Backend

See the main project README for:
- Event monitoring (listen for SC award triggers)
- Transaction submission (award SC, process redemptions)
- Privy wallet integration

---

## 8. Troubleshooting

### ❌ "Insufficient funds for intrinsic transaction cost"

**Problem:** You don't have enough test ETH.

**Solution:** Get more test ETH from the faucets (see Section 3).

---

### ❌ "Invalid nonce" or "Transaction already imported"

**Problem:** Network is processing a previous transaction.

**Solution:** Wait 10-20 seconds and try again.

---

### ❌ "Missing required environment variable"

**Problem:** Your `.env` file is incomplete.

**Solution:** 
- Make sure you copied `env.example` to `.env`
- Fill in all required values
- Check there are no spaces around `=` signs

---

### ❌ "Network baseSepolia not found"

**Problem:** Hardhat can't find the network configuration.

**Solution:**
- Check `BASE_SEPOLIA_RPC_URL` in `.env`
- Try the default: `https://sepolia.base.org`
- Or get a free RPC from Alchemy/Infura

---

### ❌ "Contract verification failed: Invalid API Key"

**Problem:** Your BaseScan API key is wrong or missing.

**Solution:**
- Get a free API key from https://basescan.org/apis
- Add it to `.env` as `BASESCAN_API_KEY`

---

### ❌ "Error: could not detect network"

**Problem:** RPC endpoint is not responding.

**Solution:**
- Check your internet connection
- Try a different RPC (Alchemy, Infura, or QuickNode)
- Wait a few minutes and try again

---

### ❌ Contracts deployed but verification fails

**Problem:** BaseScan might be slow or API key issue.

**Solution:**
- Wait 5 minutes and run `pnpm verify:sepolia` again
- Verify manually on BaseScan:
  1. Go to your contract address
  2. Click "Contract" tab
  3. Click "Verify and Publish"
  4. Fill in the form with your contract details

---

### 🆘 Still Having Issues?

1. Check the main README: `packages/contracts/README.md`
2. Review Hardhat docs: https://hardhat.org/docs
3. Base documentation: https://docs.base.org
4. Create an issue on GitHub

---

## 🎓 Learning Resources

### Understanding Smart Contracts
- [Ethereum for Beginners](https://ethereum.org/en/developers/docs/intro-to-ethereum/)
- [What are Smart Contracts?](https://ethereum.org/en/smart-contracts/)
- [Base Documentation](https://docs.base.org/)

### Solidity Programming
- [Solidity by Example](https://solidity-by-example.org/)
- [CryptoZombies](https://cryptozombies.io/) (Interactive tutorial)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Hardhat Development
- [Hardhat Tutorial](https://hardhat.org/tutorial)
- [Hardhat Documentation](https://hardhat.org/docs)

---

## 🔒 Security Reminders

1. ✅ **Never share your private key**
2. ✅ **Never commit `.env` to Git** (it's in `.gitignore`)
3. ✅ **Back up your seed phrase on paper**
4. ✅ **Use multisig for production**
5. ✅ **Test thoroughly on testnet first**
6. ✅ **Consider professional audit before mainnet**

---

## ✨ You Did It!

You've successfully deployed smart contracts to a blockchain! 🎉

This is a major milestone. Your contracts are now live on Base Sepolia and can be interacted with by anyone.

**Next up:** Integrate these contracts with your backend to start awarding SC tokens and processing UC transactions!

---

**Questions or issues?** Check the troubleshooting section or reach out to the team.

