# SoulaaniCoin (SC) - Diminishing Returns & Time-Based Decay

## Overview

This document describes the new anti-concentration mechanisms added to SoulaaniCoin (SC) to prevent power concentration and encourage ongoing participation.

## ✅ Features Implemented

### 1. **Diminishing Earning Rates** (Tiered System)

SC earnings automatically reduce as members accumulate more tokens, preventing any single member from dominating governance.

#### Earning Rate Tiers:

| Balance % | Earning Rate | Multiplier | Example |
|-----------|--------------|------------|---------|
| < 0.5%    | 100% (Full)  | 10000 BP   | 10 SC awarded → 10 SC received |
| 0.5% - 1% | 50% (Half)   | 5000 BP    | 10 SC awarded → 5 SC received |
| 1% - 2%   | 25% (Quarter)| 2500 BP    | 10 SC awarded → 2.5 SC received |
| ≥ 2%      | 1% (Near-zero)| 100 BP    | 10 SC awarded → 0.1 SC received |

*BP = Basis Points (10000 = 100%)*

#### How It Works:

When SC is awarded, the contract:
1. Checks the recipient's current balance as a percentage of total supply
2. Applies the appropriate tier multiplier
3. Enforces the 2% hard cap (no awards if at/above cap)
4. Emits `DiminishingRateApplied` event if amount was reduced

**Example:**
```solidity
// Member has 0.3% of total SC
award(member, 100 SC) → receives 100 SC (100% rate)

// Member now has 0.6% of total SC  
award(member, 100 SC) → receives 50 SC (50% rate)

// Member now has 1.2% of total SC
award(member, 100 SC) → receives 25 SC (25% rate)

// Member reaches 2.0% of total SC
award(member, 100 SC) → receives 1 SC (1% rate)

// Member has 2.1% of total SC
award(member, 100 SC) → receives 0 SC (at hard cap)
```

### 2. **Hard Cap Enforcement** (2% Maximum)

The contract now enforces a **2% hard cap** during the award process:
- If a member is at or above 2%, they receive **zero** SC from new awards
- If an award would push them above 2%, they only receive up to the cap
- Activity is still tracked even if no SC is awarded
- Previously, the cap was only enforced in the `getVotingPower()` view function

**Example:**
```solidity
// Member has 1.9% of total supply, cap is 2.0%
// Award of 0.5% would exceed cap
// Member only receives 0.1% (up to cap)
```

### 3. **Time-Based Decay** (12-Month Inactivity Rule)

SC decays for inactive members to ensure power stays with active participants.

#### Decay Rules:
- **Inactivity Threshold:** 12 months (365 days) of no activity
- **Decay Rate:** 2% per month after the threshold
- **Execution:** Backend cron job calls `executeDecayBatch()`

#### How It Works:

1. Member's last activity is tracked in `lastActivity` mapping
2. After 12 months of inactivity, decay begins
3. Decay accumulates at 2% per month
4. Backend job executes decay by calling `executeDecayBatch(addresses[])`

**Example Timeline:**
```
Month 0:  Member earns 1000 SC (active)
Month 6:  No activity, but within 12-month threshold → No decay
Month 12: Still no activity, threshold reached → No decay yet
Month 13: 1 month past threshold → Loses 20 SC (2% of 1000)
Month 14: 2 months past threshold → Loses 20 SC more (total 40 SC lost)
Month 25: 13 months past threshold → Loses 260 SC total (26%)
Month 62: 50 months past threshold → Loses 1000 SC (100%, all gone)
```

## 📊 New Contract Functions

### View Functions

#### `calculateDiminishedAmount(address recipient, uint256 baseAmount)`
Calculates the actual amount to be awarded after applying diminishing returns.

```solidity
// Calculate what member will actually receive
uint256 actual = sc.calculateDiminishedAmount(memberAddress, 100 ether);
```

#### `calculateDecayAmount(address account)`
Calculates how much SC should decay for an inactive account.

```solidity
// Check decay amount for a member
uint256 decay = sc.calculateDecayAmount(memberAddress);
// Returns 0 if member is active or hasn't reached threshold
```

### State-Changing Functions

#### `executeDecayBatch(address[] calldata accounts)`
Executes decay for multiple inactive members. Only callable by `GOVERNANCE_SLASH` role.

```solidity
// Backend cron job executes monthly
address[] memory inactiveMembers = [...]; // Query from off-chain
await sc.connect(governanceBot).executeDecayBatch(inactiveMembers);
```

### Admin Functions

#### `setDiminishingRates(...)`
Updates the tier thresholds and multipliers. Only callable by `DEFAULT_ADMIN_ROLE`.

```solidity
await sc.setDiminishingRates(
  50,    // tier1Threshold (0.5%)
  5000,  // tier1Multiplier (50%)
  100,   // tier2Threshold (1.0%)
  2500,  // tier2Multiplier (25%)
  200,   // tier3Threshold (2.0%)
  100    // tier3Multiplier (1%)
);
```

#### `setDecayParameters(uint256 newInactivityPeriod, uint256 newDecayRatePerMonth)`
Updates decay settings. Only callable by `DEFAULT_ADMIN_ROLE`.

```solidity
await sc.setDecayParameters(
  365 * 24 * 60 * 60, // 12 months (in seconds)
  200                  // 2% per month (in basis points)
);
```

## 🔔 New Events

### `DiminishingRateApplied`
Emitted when an award is reduced due to diminishing returns.
```solidity
event DiminishingRateApplied(
  address indexed recipient,
  uint256 requestedAmount,
  uint256 actualAmount,
  uint256 currentBalancePercent
);
```

### `DiminishingRatesUpdated`
Emitted when diminishing rate parameters are changed.
```solidity
event DiminishingRatesUpdated(address indexed updatedBy);
```

### `DecayExecuted`
Emitted when decay is applied to an account.
```solidity
event DecayExecuted(
  address indexed account,
  uint256 amount,
  uint256 monthsInactive
);
```

### `DecayParametersUpdated`
Emitted when decay parameters are changed.
```solidity
event DecayParametersUpdated(
  uint256 newInactivityPeriod,
  uint256 newDecayRate,
  address indexed updatedBy
);
```

## 🏗️ State Variables

### Diminishing Returns
```solidity
uint256 public tier1Threshold = 50;      // 0.5% in basis points
uint256 public tier1Multiplier = 5000;   // 50% earning rate
uint256 public tier2Threshold = 100;     // 1.0% in basis points
uint256 public tier2Multiplier = 2500;   // 25% earning rate
uint256 public tier3Threshold = 200;     // 2.0% in basis points
uint256 public tier3Multiplier = 100;    // 1% earning rate
```

### Time-Based Decay
```solidity
uint256 public decayInactivityPeriod = 365 days;  // 12 months
uint256 public decayRatePerMonth = 200;           // 2% per month
uint256 public lastDecayCheck;                    // Last batch execution
```

## 🚀 Backend Integration

### Monthly Decay Job (Required)

Create a cron job that runs monthly to execute decay:

```typescript
// Example backend cron job (run monthly)
async function executeMonthlyDecay() {
  // 1. Query database for members inactive > 12 months
  const inactiveMembers = await db.user.findMany({
    where: {
      lastActivity: {
        lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      }
    },
    select: { walletAddress: true }
  });

  // 2. Batch into groups of 50-100 (for gas efficiency)
  const batches = chunk(inactiveMembers.map(m => m.walletAddress), 50);

  // 3. Execute decay for each batch
  for (const batch of batches) {
    await scContract.executeDecayBatch(batch);
    console.log(`Decayed ${batch.length} members`);
  }
}
```

## 📝 Migration Notes

### Updating Tests

Existing tests may fail because:
1. Awards now apply diminishing returns (members receive less SC)
2. Hard cap is enforced during award (not just in view functions)

**Fix Strategy:**
- Update test expectations to account for diminishing returns
- Use smaller award amounts to avoid hitting tiers
- Test the new tier logic explicitly

**Example Fix:**
```typescript
// OLD (will fail)
await sc.award(member, ethers.parseEther("100"));
expect(await sc.balanceOf(member)).to.equal(ethers.parseEther("100"));

// NEW (accounts for diminishing returns)
const expectedAmount = await sc.calculateDiminishedAmount(
  member, 
  ethers.parseEther("100")
);
await sc.award(member, ethers.parseEther("100"));
expect(await sc.balanceOf(member)).to.equal(expectedAmount);
```

### Deployment Checklist

When deploying the updated contract:

1. ✅ Deploy new contract with updated code
2. ✅ Set up backend cron job for monthly decay execution
3. ✅ Grant `GOVERNANCE_SLASH` role to backend service
4. ✅ Monitor `DiminishingRateApplied` events to track concentration
5. ✅ Set up alerts if members approach 2% cap
6. ✅ Update frontend to show earning rate tiers
7. ✅ Update documentation for members

## 🎯 Benefits

1. **Prevents Concentration:** No member can accumulate >2% of voting power
2. **Encourages Distribution:** Diminishing returns incentivize helping others earn
3. **Rewards Activity:** Active members maintain their power, inactive members decay
4. **Self-Balancing:** System automatically redistributes power over time
5. **Charter-Compliant:** Fully implements the Soulaan Co-op Charter requirements

## 🔧 Governance Parameters

All parameters are adjustable by governance through the `DEFAULT_ADMIN_ROLE`:

| Parameter | Default | Min | Max | Purpose |
|-----------|---------|-----|-----|---------|
| `tier1Threshold` | 50 BP (0.5%) | 1 BP | 10000 BP | First diminishing tier |
| `tier2Threshold` | 100 BP (1.0%) | tier1 | 10000 BP | Second diminishing tier |
| `tier3Threshold` | 200 BP (2.0%) | tier2 | 10000 BP | Hard cap tier |
| `tier1Multiplier` | 5000 BP (50%) | 0 BP | 10000 BP | Earning rate at tier 1 |
| `tier2Multiplier` | 2500 BP (25%) | 0 BP | 10000 BP | Earning rate at tier 2 |
| `tier3Multiplier` | 100 BP (1%) | 0 BP | 10000 BP | Earning rate at tier 3 |
| `decayInactivityPeriod` | 365 days | 180 days | ∞ | Time before decay starts |
| `decayRatePerMonth` | 200 BP (2%) | 0 BP | 1000 BP | Monthly decay rate |
| `maxVotingPowerPercent` | 2% | 1% | 10% | Hard cap on voting power |

## 📚 References

- [Soulaan Co-op Charter](../../../documents/soulaan-coop-charter.md) - Lines 36-37 (SC Caps)
- [SoulaaniCoin.sol](../contracts/SoulaaniCoin.sol) - Main contract
- Charter Section: "SC Performance Enforcement" - Decay and accountability rules
