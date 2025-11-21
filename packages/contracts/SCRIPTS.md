# 📜 Smart Contracts Scripts Reference

Quick reference for all available npm scripts in the contracts package.

## 🏗️ Build & Compile

```bash
npm run compile      # Compile all contracts
npm run clean        # Clean artifacts and cache
npm run typechain    # Generate TypeScript types
```

## 🧪 Testing

```bash
# Run tests
npm test                  # Run all tests (278 tests)
npm run test:uc          # Test UnityCoin only
npm run test:sc          # Test SoulaaniCoin only
npm run test:vault       # Test RedemptionVault only

# Test analysis
npm run test:coverage    # Generate coverage report
npm run test:gas         # Show gas usage report
npm run test:watch       # Watch mode (if configured)
```

## 🖥️ Local Development

```bash
# Terminal 1: Start local blockchain
npm run node             # Start Hardhat node
npm run node:fork        # Fork Base mainnet

# Terminal 2: Deploy locally
npm run deploy:local     # Deploy to localhost

# Terminal 3: Interact with contracts
npm run console          # Open Hardhat console
npm run console:local    # Console on localhost network
```

## 🌐 Testnet Deployment

```bash
# Deploy to Base Sepolia
npm run deploy:sepolia   # Deploy all contracts
npm run verify:sepolia   # Verify contracts on Etherscan

# Check status
npm run check-balance    # Check deployer balance
npm run manage-roles     # Manage contract roles
```

## 🔧 Utility Scripts

```bash
# Wallet management
npm run create-wallet    # Create new wallet
npm run rotate-wallet    # Rotate wallet keys

# Monitoring
npm run monitor-sc-awards       # Monitor SC award events
npm run check-inactive-decay    # Check for inactive members
```

## ✨ Code Quality

```bash
# Linting
npm run lint             # Lint Solidity files
npm run lint:fix         # Auto-fix linting issues

# Formatting
npm run format           # Format all files (Solidity + TypeScript)
npm run format:check     # Check formatting without changes
```

## 🚀 Workflow Examples

### Full Local Development Cycle

```bash
# 1. Clean and compile
npm run clean && npm run compile

# 2. Run tests
npm test

# 3. Start local node (Terminal 1)
npm run node

# 4. Deploy locally (Terminal 2)
npm run deploy:local

# 5. Interact via console (Terminal 3)
npm run console:local
```

### Pre-Deployment Checklist

```bash
# 1. Run all tests
npm test

# 2. Generate coverage
npm run test:coverage

# 3. Check gas usage
npm run test:gas

# 4. Lint contracts
npm run lint

# 5. Format code
npm run format

# 6. Final compile
npm run compile
```

### Testnet Deployment

```bash
# 1. Check balance
npm run check-balance

# 2. Deploy contracts
npm run deploy:sepolia

# 3. Verify on Etherscan
npm run verify:sepolia

# 4. Setup roles
npm run manage-roles
```

## 🔍 Debugging Commands

```bash
# If you have issues, try these:
npm run clean           # Clean old artifacts
npm run compile         # Recompile
npm test                # Verify tests pass
npm run lint            # Check for issues
```

## 📝 CI/CD Usage

These scripts are used in GitHub Actions:

```yaml
# In .github/workflows/contracts-ci.yml
- run: npm test
- run: npm run test:coverage
- run: npm run lint
- run: npm run deploy:sepolia  # On main branch
```

## 🎯 Quick Commands

**Most common daily commands:**

```bash
npm test                    # Run tests
npm run test:gas           # Check gas costs
npm run lint && npm run format  # Clean up code
npm run deploy:local       # Test deployment
```

## 💡 Tips

1. **Always run tests before deploying**: `npm test`
2. **Use local node for testing**: Start with `npm run node`
3. **Check gas costs regularly**: `npm run test:gas`
4. **Keep code formatted**: `npm run format` before committing
5. **Lint before pushing**: `npm run lint` catches issues early

---

**Need help?** Check the main README or ask the team!

