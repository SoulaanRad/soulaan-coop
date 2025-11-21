# 🔐 Getting Started with Soulaan Co-op Portal

**A step-by-step guide for setting up your wallet and deploying the portal with Web3 authentication**

This guide is designed for both technical and semi-non-technical users who need to manage the Soulaan Co-op portal.

## What is the Portal?

The Soulaan Co-op Portal is accessible to **all members with SoulaaniCoin (SC)**. It provides:
- **For all members**: View finances, transactions, proposals, and community data
- **For businesses**: Accept UC payments and manage business profile
- **For admins**: Approve applications and manage user profiles
- **For governors**: Add/remove members, award SC, and execute proposals

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Up Your Admin Wallet](#setting-up-your-admin-wallet)
3. [Deploying Smart Contracts](#deploying-smart-contracts)
4. [Configuring the Portal](#configuring-the-admin-panel)
5. [First-Time Login](#first-time-login)
6. [Adding Additional Admins](#adding-additional-admins)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

### For Technical Setup Person:
- **Node.js** v22+ installed ([Download here](https://nodejs.org/))
- **pnpm** package manager (`npm install -g pnpm`)
- **Git** installed
- Basic command line knowledge
- A crypto wallet (MetaMask recommended)

### For All Admin Users:
- **MetaMask Wallet** installed ([Download here](https://metamask.io/))
- **Test ETH** on Base Sepolia (for testing) or Base Mainnet (for production)
- **Email address** and **phone number** for profile creation

---

## 🔑 Setting Up Your Admin Wallet

### Step 1: Install MetaMask

1. Go to [metamask.io](https://metamask.io/)
2. Click "Download" and install the browser extension
3. Follow the setup wizard to create a new wallet
4. **CRITICAL**: Write down your 12-word recovery phrase and store it safely (never share this!)
5. Create a strong password

### Step 2: Add Base Sepolia Network (Testing)

1. Open MetaMask
2. Click the network dropdown at the top
3. Click "Add Network" → "Add a network manually"
4. Enter these details:
   - **Network Name**: Base Sepolia
   - **RPC URL**: `https://sepolia.base.org`
   - **Chain ID**: `84532`
   - **Currency Symbol**: `ETH`
   - **Block Explorer**: `https://sepolia.basescan.org`
5. Click "Save"

### Step 3: Get Test ETH (For Testing Only)

1. Copy your wallet address (click on it in MetaMask)
2. Go to [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
3. Paste your address and request test ETH
4. Wait 1-2 minutes for it to arrive

---

## 🚀 Deploying Smart Contracts

### Step 1: Clone and Setup the Project

```bash
# Clone the repository
git clone https://github.com/SoulaanRad/soulaan-coop.git
cd soulaancoop

# Install dependencies
pnpm install
```

### Step 2: Configure Environment Variables

Create a file at `packages/contracts/.env`:

```bash
# Your wallet's private key (NEVER share this!)
PRIVATE_KEY="your-metamask-private-key-here"

# RPC URL for Base Sepolia (testing)
RPC_URL="https://sepolia.base.org"

# Optional: Separate governance bot address (leave blank to use deployer)
GOVERNANCE_BOT_ADDRESS=""

# Optional: Treasury safe address (leave blank to use deployer)
TREASURY_SAFE_ADDRESS=""
```

**⚠️ How to get your Private Key (DO THIS SAFELY):**
1. Open MetaMask
2. Click the three dots → Account Details
3. Click "Show Private Key"
4. Enter your password
5. Copy the key (NEVER share this with anyone!)

### Step 2b: Configure Initial Admins (Optional)

Edit `packages/contracts/deployment-config.json` to pre-configure admin wallets:

```json
{
  "baseSepolia": {
    "network": "Base Sepolia Testnet",
    "chainId": 84532,
    "treasurySafe": "",
    "governanceBot": "",
    "initialAdmins": [
      {
        "address": "0xYourWalletAddress",
        "name": "Your Name",
        "note": "Primary admin"
      },
      {
        "address": "0xAnotherAdminAddress",
        "name": "Team Member",
        "note": "Secondary admin"
      }
    ]
  }
}
```

**This is optional** - you can also add admins interactively after deployment.

### Step 3: Configure Web App Environment

Create a file at `apps/web/.env.local`:

```bash
# Database (you'll set this up next)
DATABASE_URL="postgresql://username:password@localhost:5432/soulaancoop"

# Session secret (generate a random string)
SESSION_SECRET="your-super-secret-random-string-here"

# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-project-id"

# These will be filled after contract deployment
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS=""
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
```

**How to get WalletConnect Project ID:**
1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com/)
2. Sign up for a free account
3. Create a new project
4. Copy the Project ID

### Step 4: Setup Database

```bash
# Setup PostgreSQL database
pnpm db:generate
pnpm db:push
```

### Step 5: Deploy Contracts

```bash
cd packages/contracts

# Deploy to Base Sepolia (testing)
pnpm deploy:sepolia
```

**What happens during deployment:**
- ✅ UnityCoin (UC) is deployed
- ✅ SoulaaniCoin (SC) is deployed
- ✅ Your deployer wallet is added as a member
- ✅ Your deployer wallet receives 1 SC token
- ✅ RedemptionVault is deployed
- 💾 Deployment info is saved to `deployments/` folder

**Save these addresses!** You'll see output like:
```
📋 DEPLOYED CONTRACT ADDRESSES:
UnityCoin (UC):       0x1234...
SoulaaniCoin (SC):    0x5678...
RedemptionVault:      0x9abc...
```

### Step 5b: Setup Additional Admins

After deployment, add other admin users:

```bash
# Still in packages/contracts directory
pnpm setup-admins:sepolia
```

**This interactive script will:**
- ✅ Load your latest deployment automatically
- ✅ Let you use addresses from `deployment-config.json` OR enter them manually
- ✅ Add each admin as a member
- ✅ Award each admin 1 SC token
- ✅ Verify everything worked

**Example session:**
```
🔐 Soulaan Co-op Admin Setup
================================

📋 Deployment Info:
Network: baseSepolia
SoulaaniCoin: 0x5678...

🔑 Using account: 0xYourDeployer...
✅ You have GOVERNANCE_ROLE

📝 Found admins in config file:
   1. Alice: 0xAlice...
   2. Bob: 0xBob...

Use admins from config file? (yes/no): yes

📋 Summary: Adding 2 admin(s):
   1. Alice: 0xAlice...
   2. Bob: 0xBob...

Proceed? (yes/no): yes

➕ Processing: Alice (0xAlice...)
   Adding as member...
   ✅ Added as member
   Awarding 1 SC...
   ✅ Awarded 1 SC
   Final SC balance: 1.0 SC

🎉 Admin setup complete!
```

### Step 6: Update Web App with Contract Address

Edit `apps/web/.env.local` and add the SoulaaniCoin address:

```bash
NEXT_PUBLIC_SOULAANI_COIN_ADDRESS="0x5678..."  # Use your actual SC address
```

---

## 🌐 Configuring the Portal

### Step 1: Start the Development Server

```bash
# From the root directory
pnpm dev --filter @soulaan-coop/web
```

The portal will be available at: **http://localhost:3000**

### Step 2: Verify Configuration

Check that these files exist and are configured:
- ✅ `apps/web/.env.local` - Environment variables
- ✅ `packages/db/.env` - Database connection
- ✅ `packages/contracts/deployments/` - Deployment records

---

## 🎉 First-Time Login

### Step 1: Navigate to Login Page

1. Open your browser to `http://localhost:3000/login`
2. You'll see a 4-step onboarding flow

### Step 2: Connect Your Wallet

1. Click "Connect Wallet"
2. MetaMask will pop up
3. Select your account
4. Click "Sign" to prove you own the wallet (this is free, no gas fees!)

### Step 3: Verify SoulaaniCoin

1. Click "Verify SoulaaniCoin"
2. The system checks if you have SC (you should have 1 SC from deployment!)
3. If successful, you'll move to the next step

### Step 4: Create Your Profile

Fill in your details:
- **Full Name**: Your name
- **Email**: Your email address
- **Phone Number**: Your phone number

Click "Create Profile"

### Step 5: Access Portal

1. Click "Go to Portal"
2. You're now logged in! 🎉

---

## 👥 Adding Additional Members

### Recommended Method: Use the Setup Script

The easiest way to add members (including governors) is using the built-in setup script:

```bash
cd packages/contracts

# Add admins interactively
pnpm setup-admins:sepolia
```

**The script will:**
1. ✅ Automatically load your latest deployment
2. ✅ Check you have GOVERNANCE_ROLE
3. ✅ Let you add members from config file OR enter manually
4. ✅ Add each member to the blockchain
5. ✅ Award each member 1 SC
6. ✅ Grant all 3 governance roles (GOVERNANCE_AWARD, GOVERNANCE_SLASH, MEMBER_MANAGER)
7. ✅ Verify everything worked
8. ✅ Show a summary of successful/failed additions

**To add members from config file:**
1. Edit `packages/contracts/deployment-config.json`
2. Add member addresses to the `initialAdmins` array
3. Run `pnpm setup-admins:sepolia`
4. Choose "yes" when asked to use config file

**Note**: Members added this way become governors (full governance rights). To add regular members or assign specific roles, use the portal UI after it's deployed.

### Alternative: Using Hardhat Console (Advanced)

For advanced users who want direct control:

```bash
cd packages/contracts

# Start Hardhat console
pnpm console --network baseSepolia

# In the console:
const SC = await ethers.getContractFactory("SoulaaniCoin");
const sc = await SC.attach("YOUR_SC_ADDRESS");

// Add new admin as member
await sc.addMember("0xNewAdminAddress");

// Award them 1 SC
const oneToken = ethers.parseEther("1");
const reason = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ALLOCATION"));
await sc.award("0xNewAdminAddress", oneToken, reason);

// Verify
console.log(await sc.balanceOf("0xNewAdminAddress"));
```

---

## 🔧 Troubleshooting

### "I don't have SoulaaniCoin"

**Solution:**
- Make sure you deployed the contracts with your wallet
- Check your SC balance at `https://sepolia.basescan.org/token/YOUR_SC_ADDRESS?a=YOUR_WALLET_ADDRESS`
- Ask an existing admin to award you SC using the add-admin script

### "MetaMask won't connect"

**Solution:**
- Make sure you're on the correct network (Base Sepolia for testing)
- Refresh the page and try again
- Clear your browser cache
- Try a different browser

### "Signature verification failed"

**Solution:**
- Make sure you're signing with the correct wallet
- Check that the contract address in `.env.local` is correct
- Verify the RPC URL is working

### "Profile creation failed"

**Solution:**
- Check that the database is running
- Verify `DATABASE_URL` in `.env.local`
- Run `pnpm db:push` to ensure schema is up to date

### "Session expired"

**Solution:**
- Sessions last 24 hours by default
- Simply reconnect your wallet and sign again
- No need to recreate your profile

---

## 📞 Getting Help

If you encounter issues:

1. **Check the logs**: Look at the terminal where you ran `pnpm dev`
2. **Check MetaMask**: Look for any error messages
3. **Check BaseScan**: Verify your transactions at `https://sepolia.basescan.org`
4. **Ask for help**: Contact your technical lead with:
   - What you were trying to do
   - The error message you saw
   - Screenshots if possible

---

## 🔒 Security Best Practices

### For Everyone:
- ✅ **NEVER** share your private key or recovery phrase
- ✅ **NEVER** share your `.env` files
- ✅ Use strong, unique passwords
- ✅ Enable 2FA on your email
- ✅ Keep your recovery phrase in a safe, offline location

### For Admins:
- ✅ Only use the portal on trusted devices
- ✅ Log out when done
- ✅ Don't access portal on public WiFi
- ✅ Regularly check who has admin access

---

## 🚀 Production Deployment Checklist

When ready to go live:

- [ ] Switch from Base Sepolia to Base Mainnet
- [ ] Get real ETH (not test ETH)
- [ ] Update all `.env` files with production values
- [ ] Generate a strong `SESSION_SECRET` (use: `openssl rand -base64 32`)
- [ ] Deploy contracts to Base Mainnet
- [ ] Update `NEXT_PUBLIC_SOULAANI_COIN_ADDRESS`
- [ ] Deploy web app to Vercel/Netlify
- [ ] Setup production database (Supabase/Railway)
- [ ] Enable HTTPS
- [ ] Test the entire flow with a test wallet first
- [ ] Document all contract addresses securely

---

**You're all set! Welcome to the Soulaan Co-op admin team! 🎉**

