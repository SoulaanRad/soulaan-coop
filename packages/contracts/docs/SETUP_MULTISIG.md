# 🏛️ Setting Up Treasury Safe (Multisig)

## What is a Treasury Safe?

A **Safe** (formerly Gnosis Safe) is a smart contract wallet that requires multiple signatures to execute transactions. For example, a 3-of-5 Safe requires 3 out of 5 board members to approve before any action can be taken.

**Why use it:**
- ✅ No single person can control everything
- ✅ Democratic decision making
- ✅ Protection against key loss (if 1 member loses key, still works)
- ✅ Protection against compromise (attacker needs 3+ keys)
- ✅ Builds community trust

---

## 📋 Prerequisites

1. **Identify your signers** (board members)
   - Need 5-7 trusted people
   - Each needs a wallet address
   - They don't need ETH in their wallets (Safe pays gas)

2. **Decide threshold**
   - 3-of-5 (60% approval)
   - 4-of-7 (57% approval)
   - Recommendation: 3-of-5 for balance of security and speed

---

## 🚀 Step-by-Step: Create Treasury Safe

### **Step 1: Go to Safe Website**

Visit: https://app.safe.global/welcome

### **Step 2: Connect Your Wallet**

- Click "Connect Wallet"
- Choose MetaMask (or your preferred wallet)
- Approve connection

### **Step 3: Create New Safe**

1. Click "Create Account" or "Create new Safe"
2. Select network: **Base Sepolia** (for testing)
3. Give it a name: "Soulaan Co-op Treasury"

### **Step 4: Add Signers**

1. **Owner 1 (You):**
   - Name: Your name
   - Address: Your wallet address (auto-filled)

2. Click "+ Add another signer"

3. **Owner 2-5:**
   - Name: Board member name
   - Address: Their wallet address (0x...)
   
4. Repeat for all 5-7 board members

**Important:** Each board member should:
- Have control of their wallet
- Understand they're a signer
- Keep their private key secure
- Be available to sign when needed

### **Step 5: Set Threshold**

- "How many signers are required to confirm a transaction?"
- Choose: **3** (if you have 5 signers)
- Or: **4** (if you have 7 signers)

### **Step 6: Review & Deploy**

1. Review all details
2. Click "Next"
3. Confirm transaction in MetaMask
4. Pay gas fee (one-time, ~$5-10 on mainnet, less on testnet)
5. Wait for deployment (~30 seconds)

### **Step 7: Save Safe Address**

Once deployed, you'll see:
```
Your Safe Address: 0x1234567890abcdef1234567890abcdef12345678
```

**SAVE THIS ADDRESS!** This is your Treasury Safe address.

Copy it to your `.env`:
```bash
TREASURY_SAFE_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

---

## 🔑 Using the Safe

### **How to Execute Transactions:**

1. **Proposer** creates transaction in Safe UI
2. Safe generates transaction for signers to review
3. **3 signers** (or your threshold) approve the transaction
4. **Last signer** executes the transaction (pays gas)

### **Example: Minting UC**

**Scenario:** Member deposits $100, you need to mint 100 UC

1. Go to Safe UI: https://app.safe.global
2. Click "New Transaction"
3. Click "Contract Interaction"
4. Enter:
   - **To:** UC Contract Address (0x...)
   - **Contract (ABI):** Paste UnityCoin ABI or select from dropdown
   - **Method:** `mint`
   - **to (address):** Member's wallet address
   - **amount (uint256):** `100000000000000000000` (100 with 18 decimals)
5. Click "Review"
6. Click "Submit" (you're signer 1)
7. Share transaction link with other signers
8. They go to Safe UI → "Transactions" → Sign pending transaction
9. After 3 signatures, last signer clicks "Execute"
10. Transaction confirmed! Member receives 100 UC

### **Example: Granting Role**

**Scenario:** Add a new governance bot wallet

1. Safe UI → "New Transaction"
2. "Contract Interaction"
3. Enter:
   - **To:** SC Contract Address
   - **Method:** `grantRole`
   - **role (bytes32):** `0x...` (GOVERNANCE_AWARD hash)
   - **account (address):** New bot wallet address
4. Get 3 signatures
5. Execute

---

## 👥 Board Member Guide

**What to tell your board members:**

### **You've Been Added as a Signer**

Welcome to the Soulaan Co-op Treasury Safe! Here's what you need to know:

**What is this?**
- You're one of 5 signers on the Treasury Safe
- 3 out of 5 signatures are needed for any transaction
- You help control UC minting, pausing, and role management

**What do I need?**
- Your wallet (the one with address 0x... that was added)
- Access to Safe UI: https://app.safe.global
- Ability to check Safe regularly for pending transactions

**How do I sign a transaction?**
1. You'll be notified of a pending transaction (via Slack/email)
2. Go to https://app.safe.global
3. Connect your wallet
4. Go to "Transactions" tab
5. See pending transaction
6. Review what it does
7. Click "Confirm" if you agree
8. Approve in your wallet

**What if I disagree with a transaction?**
- Don't sign it
- Discuss with other board members
- It won't execute without 3 signatures

**What if I lose access to my wallet?**
- The Safe still works (only need 3 of 5)
- Board can vote to replace you with a new signer
- Backup your seed phrase on paper!

---

## 🔧 Advanced: Managing Signers

### **Add a New Signer (if someone leaves the board)**

1. Safe UI → "Settings" → "Owners"
2. Click "Add new owner"
3. Enter new member's address
4. Create transaction
5. Get 3 signatures
6. Execute

### **Remove a Signer**

1. Safe UI → "Settings" → "Owners"
2. Click ⋮ next to signer to remove
3. Click "Remove owner"
4. Create transaction
5. Get 3 signatures
6. Execute

### **Change Threshold**

1. Safe UI → "Settings" → "Policies"
2. Change "Required confirmations"
3. Create transaction
4. Get current threshold signatures
5. Execute

---

## 🚨 Emergency Access

### **What if we need fast action?**

**Option 1: Emergency Multisig (2-of-3)**

Create a second, faster Safe with 2-of-3 threshold:
- 3 most available board members
- Only has PAUSER role
- Can quickly pause system in emergency
- Cannot mint, cannot change roles

**Option 2: Emergency Committee**

Designate 3 board members as "on-call":
- They commit to signing within 1 hour
- Rotate monthly
- For critical issues only

---

## 📊 Best Practices

### **DO:**
- ✅ Test on Base Sepolia before mainnet
- ✅ Document who each signer is
- ✅ Have backup contact info for all signers
- ✅ Set up notifications (Safe has mobile app)
- ✅ Review transactions carefully before signing
- ✅ Keep signers to odd numbers (5, 7, 9)
- ✅ Use descriptive transaction notes

### **DON'T:**
- ❌ Add signers you don't fully trust
- ❌ Set threshold too high (7-of-7 = one person can block everything)
- ❌ Set threshold too low (1-of-5 = defeats the purpose)
- ❌ Share signer private keys
- ❌ Sign transactions you don't understand
- ❌ Use Safe address for personal transactions

---

## 🎯 Checklist

Before deploying contracts with Safe:

- [ ] Safe created on Base Sepolia
- [ ] 5-7 signers added
- [ ] Threshold set to 3-of-5 or 4-of-7
- [ ] All signers confirmed they have access
- [ ] All signers understand their role
- [ ] Safe address saved to `.env`
- [ ] Tested creating and signing a transaction
- [ ] Emergency contact list for all signers
- [ ] Backup plan if signer is unavailable

---

## 📚 Resources

- **Safe Docs:** https://docs.safe.global/
- **Safe UI:** https://app.safe.global/
- **Safe Mobile App:** https://apps.apple.com/app/safe-multisig/id1515759131
- **Tutorial Video:** https://www.youtube.com/watch?v=... (search "Gnosis Safe tutorial")

---

## 💬 Need Help?

If you're setting up your first Safe:
1. Test on Sepolia first (it's free)
2. Start with 3-of-5 (easiest to manage)
3. Do a test transaction before deploying contracts
4. Keep threshold at 60% (3-of-5, 4-of-7, etc.)

---

**Remember:** The Safe is your co-op's treasury. Take time to set it up right!

