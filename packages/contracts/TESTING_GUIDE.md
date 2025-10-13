# 🧪 Smart Contract Testing Guide

## Overview

This document outlines the comprehensive testing strategy for Soulaan Co-op smart contracts.

---

## 📊 Test Coverage Summary

| Contract | Test File | Test Count | Coverage Areas |
|----------|-----------|------------|----------------|
| UnityCoin | `UnityCoin.test.ts` | 70+ tests | Minting, burning, pausing, roles, onramp limits |
| SoulaaniCoin | `SoulaaniCoin.test.ts` | 60+ tests | Awarding, slashing, soulbound, activity tracking |
| RedemptionVault | `RedemptionVault.test.ts` | 50+ tests | Redemptions, fulfillment, cancellation, withdrawals |

**Total: 180+ unit tests**

---

## 🎯 Types of Tests We Have

### 1. **Deployment Tests**
Tests that verify contracts deploy correctly with proper initial state.

**What they test:**
- Constructor parameters are set correctly
- Initial roles are granted properly
- Initial supply is zero
- Name, symbol, decimals are correct
- Reject deployment with invalid parameters (zero addresses)

**Example:**
```typescript
it("Should set the correct name and symbol", async function () {
  expect(await uc.name()).to.equal("UnityCoin");
  expect(await uc.symbol()).to.equal("UC");
});
```

---

### 2. **Role-Based Access Control Tests**
Tests that verify only authorized addresses can call restricted functions.

**What they test:**
- Admin can grant/revoke roles
- Role holders can perform their functions
- Non-role holders cannot perform restricted functions
- Role holders can renounce their roles

**Example:**
```typescript
it("Should not allow non-TREASURER_MINT to mint", async function () {
  await expect(
    uc.connect(user1).mint(user1.address, ethers.parseEther("100"))
  ).to.be.reverted;
});
```

---

### 3. **Core Functionality Tests**
Tests that verify the main business logic works as expected.

**For UnityCoin:**
- Unlimited minting (treasurer)
- Limited minting with daily limits (onramp)
- Burning tokens
- Pausing/unpausing
- Transfers

**For SoulaaniCoin:**
- Awarding SC
- Slashing SC
- Activity tracking
- Soulbound enforcement

**For RedemptionVault:**
- Requesting redemptions
- Fulfilling redemptions
- Cancelling redemptions
- Treasury withdrawals

---

### 4. **Event Emission Tests**
Tests that verify contracts emit correct events when state changes.

**What they test:**
- Events are emitted on state changes
- Events contain correct parameters
- Events are emitted in correct order

**Example:**
```typescript
it("Should emit Minted event", async function () {
  await expect(uc.connect(treasurer).mint(user1.address, amount))
    .to.emit(uc, "Minted")
    .withArgs(user1.address, amount, treasurer.address);
});
```

---

### 5. **Input Validation Tests**
Tests that verify contracts reject invalid inputs.

**What they test:**
- Zero amounts are rejected
- Zero addresses are rejected
- Negative values are handled
- Out-of-range values are rejected

**Example:**
```typescript
it("Should not allow minting zero amount", async function () {
  await expect(
    uc.connect(treasurer).mint(user1.address, 0)
  ).to.be.revertedWith("Amount must be greater than 0");
});
```

---

### 6. **State Consistency Tests**
Tests that verify contract state remains consistent after operations.

**What they test:**
- Balances add up correctly
- Total supply matches sum of balances
- Allowances are tracked correctly
- Mappings are updated correctly

**Example:**
```typescript
it("Should track daily minted amount", async function () {
  await uc.connect(onrampMinter).mintOnramp(user1.address, amount1);
  await uc.connect(onrampMinter).mintOnramp(user2.address, amount2);
  
  expect(await uc.dailyMinted(onrampMinter.address)).to.equal(amount1 + amount2);
});
```

---

### 7. **Time-Based Tests**
Tests that verify time-dependent functionality works correctly.

**What they test:**
- Daily limit resets after 24 hours
- Activity timestamps are recorded
- Time since last activity is calculated correctly

**Example:**
```typescript
it("Should reset daily counter after 24 hours", async function () {
  await uc.connect(onrampMinter).mintOnramp(user1.address, amount);
  await time.increase(86400); // Fast forward 1 day
  await uc.connect(onrampMinter).mintOnramp(user2.address, amount);
  expect(await uc.dailyMinted(onrampMinter.address)).to.equal(amount);
});
```

---

### 8. **Limit Enforcement Tests**
Tests that verify rate limits and caps are enforced.

**What they test:**
- Daily mint limits are enforced
- Cannot exceed limits
- Limits reset correctly
- Multiple minters have separate limits

**Example:**
```typescript
it("Should not allow minting beyond daily limit", async function () {
  const amount = ethers.parseEther("60000"); // Exceeds 50k limit
  await expect(
    uc.connect(onrampMinter).mintOnramp(user1.address, amount)
  ).to.be.revertedWith("Daily minting limit exceeded");
});
```

---

### 9. **Soulbound Token Tests**
Tests that verify SC cannot be transferred (soulbound).

**What they test:**
- Transfers are blocked
- Approvals are blocked
- TransferFrom is blocked
- Allowances return zero

**Example:**
```typescript
it("Should block transfer", async function () {
  await expect(
    sc.connect(member1).transfer(member2.address, ethers.parseEther("10"))
  ).to.be.revertedWith("SC is non-transferable (soulbound)");
});
```

---

### 10. **Integration Tests**
Tests that verify multiple contracts work together correctly.

**What they test:**
- UC can be used with RedemptionVault
- Full redemption flow works
- Multiple contracts interact correctly

**Example:**
```typescript
it("Should handle full redemption flow", async function () {
  // 1. User requests redemption
  await vault.connect(user1).redeem(amount);
  
  // 2. Processor fulfills
  await vault.connect(admin).fulfillRedemption(redemptionId);
  
  // 3. Treasury withdraws
  await vault.connect(admin).withdrawToTreasury(amount, treasurer.address);
  
  expect(await uc.balanceOf(treasurer.address)).to.equal(amount);
});
```

---

### 11. **Edge Case Tests**
Tests that verify contracts handle unusual or extreme scenarios.

**What they test:**
- Multiple rapid operations
- Very large amounts
- Empty balances
- Boundary conditions

**Example:**
```typescript
it("Should handle large award amounts", async function () {
  const largeAmount = ethers.parseEther("1000000");
  await sc.connect(governanceBot).award(member1.address, largeAmount, REASON_RENT);
  expect(await sc.balanceOf(member1.address)).to.equal(largeAmount);
});
```

---

### 12. **Security Tests**
Tests that verify contracts are protected against common attacks.

**What they test:**
- Unauthorized access is prevented
- Reentrancy protection works
- Role revocation stops access
- Overflow/underflow is prevented (Solidity 0.8+)

**Example:**
```typescript
it("Should prevent unauthorized access after role revocation", async function () {
  await sc.connect(governanceBot).grantRole(GOVERNANCE_AWARD, admin.address);
  await sc.connect(governanceBot).revokeRole(GOVERNANCE_AWARD, admin.address);
  
  await expect(
    sc.connect(admin).award(member1.address, amount, REASON_RENT)
  ).to.be.reverted;
});
```

---

### 13. **View Function Tests**
Tests that verify read-only functions return correct data.

**What they test:**
- Balance queries
- Allowance queries
- Role checks
- State variable getters

**Example:**
```typescript
it("Should return correct vault balance", async function () {
  await uc.connect(user1).approve(vaultAddress, amount);
  await vault.connect(user1).redeem(amount);
  expect(await vault.getVaultBalance()).to.equal(amount);
});
```

---

### 14. **Scenario Tests**
Tests that simulate real-world usage scenarios.

**What they test:**
- Complete user journeys
- Multi-step processes
- Typical usage patterns
- Charter compliance

**Example:**
```typescript
it("Should simulate decay detection after 12 months", async function () {
  // Member earns SC
  await sc.connect(governanceBot).award(member1.address, amount, REASON_RENT);
  
  // Fast forward 12 months
  await time.increase(365 * 24 * 60 * 60);
  
  // Check if inactive
  const timeSince = await sc.getTimeSinceLastActivity(member1.address);
  expect(timeSince).to.be.gte(365 * 24 * 60 * 60);
  
  // Slash for inactivity
  await sc.connect(governanceBot).slash(member1.address, amount, REASON_INACTIVITY);
});
```

---

## 🏃 Running Tests

### Run All Tests
```bash
cd packages/contracts
pnpm test
```

### Run Specific Test File
```bash
pnpm test test/UnityCoin.test.ts
pnpm test test/SoulaaniCoin.test.ts
pnpm test test/RedemptionVault.test.ts
```

### Run Tests with Gas Reporter
```bash
REPORT_GAS=true pnpm test
```

### Run Tests with Coverage
```bash
pnpm hardhat coverage
```

---

## 📝 Test Organization

Each test file is organized into `describe` blocks:

```typescript
describe("ContractName", function () {
  describe("Feature Category", function () {
    it("Should do specific thing", async function () {
      // Test implementation
    });
  });
});
```

**Categories we use:**
- Deployment
- Role Management
- Core Functionality (minting, awarding, etc.)
- Input Validation
- Events
- Security
- Edge Cases
- View Functions

---

## ✅ Testing Checklist

Before deploying to mainnet, ensure:

### UnityCoin (UC)
- [x] Deployment with correct parameters
- [x] Unlimited minting for TREASURER_MINT
- [x] Limited minting with daily caps for ONRAMP_MINTER
- [x] Daily limit reset after 24 hours
- [x] Pausing functionality
- [x] Burning functionality
- [x] Standard ERC20 functions (transfer, approve)
- [x] Role management
- [x] Event emission
- [x] Input validation

### SoulaaniCoin (SC)
- [x] Deployment with correct parameters
- [x] Awarding SC with activity tracking
- [x] Slashing SC
- [x] Soulbound enforcement (no transfers)
- [x] Activity tracking and decay monitoring
- [x] Manual activity updates
- [x] Role management
- [x] Event emission
- [x] Input validation

### RedemptionVault
- [x] Deployment with UC reference
- [x] Redemption requests
- [x] Redemption fulfillment
- [x] Redemption cancellation
- [x] Treasury withdrawals
- [x] Role management
- [x] Reentrancy protection
- [x] Event emission
- [x] Input validation

---

## 🎓 Testing Best Practices We Follow

### 1. **Arrange-Act-Assert (AAA) Pattern**
```typescript
it("Should do something", async function () {
  // Arrange: Set up test state
  const amount = ethers.parseEther("100");
  await uc.mint(user.address, amount);
  
  // Act: Perform the action
  await uc.connect(user).transfer(recipient.address, amount);
  
  // Assert: Verify the result
  expect(await uc.balanceOf(recipient.address)).to.equal(amount);
});
```

### 2. **Use beforeEach for Setup**
```typescript
beforeEach(async function () {
  // Deploy fresh contracts for each test
  // Set up common test state
});
```

### 3. **Test One Thing Per Test**
Each test should verify one specific behavior.

### 4. **Use Descriptive Test Names**
```typescript
// Good
it("Should not allow minting beyond daily limit")

// Bad
it("Test minting")
```

### 5. **Test Both Success and Failure Cases**
```typescript
it("Should allow valid operation");
it("Should reject invalid operation");
```

### 6. **Use Constants for Test Data**
```typescript
const GOVERNANCE_AWARD = ethers.id("GOVERNANCE_AWARD");
const REASON_RENT = ethers.id("RENT_PAYMENT");
```

---

## 🔍 What's NOT Tested (and Why)

### OpenZeppelin Base Contracts
We don't re-test OpenZeppelin code (ERC20, AccessControl, etc.) because:
- They're battle-tested
- Extensively audited
- Our tests verify our integration is correct

### Gas Optimization
We focus on correctness over gas optimization in tests.

### Frontend Integration
Smart contract tests focus on on-chain logic, not UI.

---

## 📈 Adding New Tests

When adding new features, add tests for:

1. **Happy path** - Feature works as expected
2. **Input validation** - Rejects invalid inputs
3. **Access control** - Only authorized can call
4. **State changes** - State updates correctly
5. **Events** - Correct events are emitted
6. **Edge cases** - Boundary conditions
7. **Integration** - Works with other contracts

---

## 🐛 Common Testing Patterns

### Testing Reverts
```typescript
await expect(
  contract.function(params)
).to.be.revertedWith("Error message");

// Or just check it reverts
await expect(
  contract.function(params)
).to.be.reverted;
```

### Testing Events
```typescript
await expect(contract.function(params))
  .to.emit(contract, "EventName")
  .withArgs(arg1, arg2, arg3);
```

### Time Manipulation
```typescript
await time.increase(86400); // Fast forward 1 day
const currentTime = await time.latest();
```

### Getting Signers
```typescript
const [admin, user1, user2] = await ethers.getSigners();
```

---

## 📊 Expected Test Results

All tests should pass:
```
  UnityCoin (UC)
    ✓ All tests passing (70+ tests)
  
  SoulaaniCoin (SC)
    ✓ All tests passing (60+ tests)
  
  RedemptionVault
    ✓ All tests passing (50+ tests)

  180+ passing
```

---

## 🚀 Next Steps

After tests pass:

1. **Run on testnet** - Deploy and test on Base Sepolia
2. **Fuzz testing** - Consider using Echidna or Foundry fuzz
3. **Audit** - Get professional security audit before mainnet
4. **Integration tests** - Test with actual backend
5. **Load testing** - Test with high transaction volume

---

## 📚 Resources

- **Hardhat Testing:** https://hardhat.org/tutorial/testing-contracts
- **Chai Matchers:** https://hardhat.org/hardhat-chai-matchers/docs/overview
- **Time Helpers:** https://hardhat.org/hardhat-network-helpers/docs/reference
- **Gas Reporter:** https://github.com/cgewecke/hardhat-gas-reporter

---

**Remember:** Good tests are your safety net. They catch bugs before users do! 🛡️

