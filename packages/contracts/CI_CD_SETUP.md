# 🚀 CI/CD Setup for Smart Contracts

This guide covers how to set up automated testing and deployment for your smart contracts.

## 📋 Table of Contents

1. [Running Tests Locally](#running-tests-locally)
2. [Manual Deployment](#manual-deployment)
3. [CI/CD Setup (GitHub Actions)](#cicd-setup-github-actions)
4. [Secrets Management](#secrets-management)
5. [Deployment Workflows](#deployment-workflows)

---

## 🧪 Running Tests Locally

### **Prerequisites:**

```bash
cd packages/contracts
pnpm install
```

### **Run All Tests:**

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test:uc        # UnityCoin tests
pnpm test:sc        # SoulaaniCoin tests
pnpm test:vault     # RedemptionVault tests

# Run with gas reporting
pnpm test:gas

# Run with coverage report
pnpm test:coverage
```

### **Expected Output:**

```
  UnityCoin
    Deployment
      ✓ Should deploy with correct name and symbol
      ✓ Should set deployer as default admin
    Minting
      ✓ Should allow TREASURER_MINT to mint unlimited UC
      ✓ Should allow ONRAMP_MINTER to mint up to daily limit
      ✓ Should prevent minting beyond daily limit
    ...

  64 passing (4s)
```

### **Before Deploying:**

```bash
# Make sure all tests pass
pnpm test

# Optional: Check for linting issues
cd ../../  # Go to workspace root
pnpm lint  # If you have a lint script set up
```

---

## 🚀 Manual Deployment

### **Step 1: Set Up Environment**

Create `.env` file:

```bash
cd packages/contracts
cp .env.example .env
```

Edit `.env`:

```bash
# Your deployer wallet private key (WITHOUT 0x prefix)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Get free API key from https://basescan.org/apis
BASESCAN_API_KEY=your_basescan_api_key

# Optional: Custom RPC (default works fine)
# BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Treasury Safe address (multisig)
TREASURY_SAFE_ADDRESS=0xYourTreasurySafeAddress

# Governance bot address (backend wallet for SC)
GOVERNANCE_BOT_ADDRESS=0xYourGovernanceBotAddress

# Onramp wallet address (backend wallet for UC)
ONRAMP_WALLET_ADDRESS=0xYourOnrampWalletAddress

# Daily mint limit for onramp wallet (in UC, without decimals)
ONRAMP_DAILY_LIMIT=50000
```

### **Step 2: Get Test ETH**

You need Base Sepolia ETH in your deployer wallet:

**Option A: Coinbase Faucet** (Recommended)
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

**Option B: Alchemy Faucet**
- https://www.alchemy.com/faucets/base-sepolia

### **Step 3: Deploy**

```bash
# Compile contracts
pnpm compile

# Deploy to Base Sepolia
pnpm deploy:sepolia
```

This will:
1. Deploy all three contracts
2. Set up initial roles
3. Save deployment info to `deployments/`
4. Print contract addresses

**Save the output!** You'll need these addresses.

### **Step 4: Verify Contracts**

```bash
# Verify on BaseScan (makes source code public)
pnpm verify:sepolia
```

### **Step 5: Update Backend**

Add contract addresses to your backend:

```bash
# In apps/api/.env or your secrets manager
UC_CONTRACT_ADDRESS=0x...
SC_CONTRACT_ADDRESS=0x...
REDEMPTION_VAULT_ADDRESS=0x...
```

---

## ⚙️ CI/CD Setup (GitHub Actions)

### **What Gets Automated:**

1. ✅ Run tests on every PR
2. ✅ Check test coverage
3. ✅ Prevent merging if tests fail
4. ✅ (Optional) Auto-deploy to testnet on merge to `main`

### **Workflow File:**

I'll create `.github/workflows/contracts-test.yml` for you.

### **What to Store in GitHub Secrets:**

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

**Required Secrets (for testing):**
- None! Tests run without secrets.

**Required Secrets (for deployment):**
- `DEPLOYER_PRIVATE_KEY` - Private key for deploying contracts
- `BASESCAN_API_KEY` - API key for contract verification
- `TREASURY_SAFE_ADDRESS` - Multisig address
- `GOVERNANCE_BOT_ADDRESS` - Backend governance wallet
- `ONRAMP_WALLET_ADDRESS` - Backend onramp wallet
- `ONRAMP_DAILY_LIMIT` - Daily mint limit (e.g., 50000)

**Optional Secrets:**
- `BASE_SEPOLIA_RPC_URL` - Custom RPC endpoint (default works fine)

### **How to Add Secrets:**

1. Go to GitHub → Your Repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `DEPLOYER_PRIVATE_KEY`
4. Value: `your_private_key_without_0x`
5. Click "Add secret"
6. Repeat for other secrets

---

## 🔄 Deployment Workflows

### **Workflow 1: Test on Every PR (Automatic)**

```yaml
# .github/workflows/contracts-test.yml
# Runs automatically on every PR
# No secrets needed
```

### **Workflow 2: Deploy to Testnet (Manual Trigger)**

```yaml
# .github/workflows/contracts-deploy.yml
# Manually triggered from GitHub Actions tab
# Requires secrets
```

### **How to Manually Trigger Deployment:**

1. Go to GitHub → Your Repo → Actions
2. Click "Deploy Contracts to Base Sepolia"
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

This will:
1. Run tests first
2. Deploy contracts if tests pass
3. Verify contracts on BaseScan
4. Comment on the PR with deployment addresses

---

## 🔒 Secrets Management

### **What Goes Where:**

| Environment | Storage | Secrets |
|------------|---------|---------|
| **Local Development** | `.env` file (git-ignored) | All secrets |
| **CI/CD (Testing)** | None needed | No secrets needed for tests |
| **CI/CD (Deployment)** | GitHub Secrets | `DEPLOYER_PRIVATE_KEY`, `BASESCAN_API_KEY`, addresses |
| **Backend Production** | AWS Secrets Manager / Vault | `GOVERNANCE_BOT_PRIVATE_KEY`, `ONRAMP_WALLET_PRIVATE_KEY`, contract addresses |

### **Security Best Practices:**

#### **DO:**
- ✅ Use different private keys for dev/staging/prod
- ✅ Store production keys in secrets manager (AWS, Vault, etc.)
- ✅ Store CI/CD secrets in GitHub Secrets (encrypted)
- ✅ Use read-only RPC URLs when possible
- ✅ Rotate deployer key after initial deployment
- ✅ Limit who can access GitHub Secrets (repository admins only)

#### **DON'T:**
- ❌ Commit `.env` file to git
- ❌ Use same private key across environments
- ❌ Share private keys via Slack/email
- ❌ Log private keys in CI/CD output
- ❌ Use production keys in CI/CD (use testnet keys only)

---

## 📊 CI/CD Pipeline Overview

### **Pull Request Flow:**

```
Developer creates PR
    ↓
GitHub Actions triggered
    ↓
1. Install dependencies (pnpm install)
    ↓
2. Compile contracts (pnpm compile)
    ↓
3. Run tests (pnpm test)
    ↓
4. Generate coverage report
    ↓
5. Comment on PR with results
    ↓
PR can be merged ✅ (if tests pass)
PR blocked ❌ (if tests fail)
```

### **Deployment Flow (Manual):**

```
Developer clicks "Run workflow"
    ↓
GitHub Actions triggered
    ↓
1. Run all tests (must pass)
    ↓
2. Load secrets from GitHub Secrets
    ↓
3. Deploy contracts to Base Sepolia
    ↓
4. Verify contracts on BaseScan
    ↓
5. Save deployment info as artifact
    ↓
6. Post deployment addresses to Slack (optional)
    ↓
Deployment complete ✅
```

---

## 🧪 Testing Strategy

### **What Gets Tested:**

1. **Unit Tests** - Each contract function
2. **Integration Tests** - Multiple contracts working together
3. **Access Control Tests** - Role-based permissions
4. **Edge Cases** - Boundary conditions, reverts
5. **Gas Usage** - Ensure functions are efficient

### **Coverage Goals:**

- ✅ Aim for **80%+ coverage**
- ✅ Cover all critical functions (mint, burn, award, slash)
- ✅ Test all access control (roles)
- ✅ Test all revert conditions (should fail when expected)

### **Current Test Coverage:**

```bash
# Run coverage report
pnpm test:coverage

# View in browser
open coverage/index.html
```

---

## 🚨 Troubleshooting

### **Tests Fail Locally:**

```bash
# Clean and rebuild
pnpm clean
pnpm compile
pnpm test
```

### **Deployment Fails in CI/CD:**

Check that all secrets are set:
1. Go to GitHub → Settings → Secrets
2. Verify all required secrets exist
3. Check CI/CD logs for error message

### **"Insufficient funds" Error:**

Your deployer wallet needs Base Sepolia ETH:
- Visit a faucet (see "Get Test ETH" above)
- Wait a few minutes for ETH to arrive
- Try deployment again

### **Contract Verification Fails:**

- Make sure `BASESCAN_API_KEY` is set correctly
- Try running `pnpm verify:sepolia` manually
- Check BaseScan API key is valid (not rate limited)

---

## 📝 Example Deployment Output

```
🚀 DEPLOYING CONTRACTS TO BASE SEPOLIA...

📋 Configuration:
Network:      Base Sepolia (84532)
Deployer:     0x1234...5678
Treasury:     0x9abc...def0
Gov Bot:      0x5678...9abc
Onramp:       0xdef0...1234

✅ Compiling contracts...
✅ Deploying UnityCoin...
✅ Deploying SoulaaniCoin...
✅ Deploying RedemptionVault...
✅ Setting up roles...

🎉 DEPLOYMENT COMPLETE!

📋 CONTRACT ADDRESSES:
UnityCoin (UC):       0xABCD1234567890...
SoulaaniCoin (SC):    0xEF1234567890AB...
RedemptionVault:      0x567890ABCDEF12...

🔗 View on BaseScan:
https://sepolia.basescan.org/address/0xABCD1234567890...

📦 Deployment saved to: deployments/base-sepolia-YYYY-MM-DD.json

⚠️  NEXT STEPS:
1. Verify contracts: pnpm verify:sepolia
2. Update backend with contract addresses
3. Test onramp flow end-to-end
4. Set up monitoring for contract events
```

---

## ✅ Pre-Deployment Checklist

Before deploying to testnet:

- [ ] All tests pass locally (`pnpm test`)
- [ ] Test coverage is adequate (`pnpm test:coverage`)
- [ ] `.env` file is set up correctly
- [ ] Deployer wallet has Base Sepolia ETH
- [ ] Treasury Safe address is correct
- [ ] Governance bot address is correct
- [ ] Onramp wallet address is correct
- [ ] BaseScan API key is valid

Before deploying to production (mainnet):

- [ ] All testnet deployments tested thoroughly
- [ ] Security audit completed (if budget allows)
- [ ] All keys stored in secrets manager (not `.env`)
- [ ] Multisig treasury is set up (not single wallet)
- [ ] Monitoring scripts are running
- [ ] Incident response plan is documented
- [ ] Team is trained on emergency procedures
- [ ] Insurance/reserves are in place

---

## 📚 Additional Resources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Base Sepolia Network Info](https://docs.base.org/network-information)

---

**Ready to deploy?** Start with `pnpm test` to make sure everything works! 🚀

