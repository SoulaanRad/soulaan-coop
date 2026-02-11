# 🔒 Security Guide: Backend Wallet & Key Management

This guide covers security for **both backend wallets**: Governance Bot (SC awards) and Onramp Wallet (UC minting).

## 🎯 Threat Model

### **Threat 1: Governance Bot Compromise**

If the **Governance Bot private key** is compromised, an attacker can:

✅ **They CAN:**
- Award themselves unlimited SC (voting power)
- Slash other members' SC
- Manipulate governance votes
- Process fake redemptions

❌ **They CANNOT:**
- Mint UC tokens (only Treasury Safe can)
- Steal UC from the vault (only Treasury Safe can withdraw)
- Transfer SC (it's non-transferable/soulbound)
- Pause the system (only Treasury Safe can)
- Change role assignments (only Treasury Safe has DEFAULT_ADMIN)

**Risk Level:** 🟡 Medium
- Can disrupt governance
- Cannot directly steal funds
- Can be revoked instantly by Treasury Safe

### **Threat 2: Onramp Wallet Compromise**

If the **Onramp Wallet private key** is compromised, an attacker can:

✅ **They CAN:**
- Mint UC up to the daily limit (e.g., 50,000 UC/day)
- Continue minting daily until detected/revoked
- Potentially mint for multiple days if undetected

❌ **They CANNOT:**
- Mint beyond the daily limit
- Mint after Treasury Safe revokes the role
- Mint unlimited UC (only Treasury Safe can)
- Transfer existing UC from other wallets
- Pause the system

**Risk Level:** 🟠 Medium-High
- Can mint up to daily limit (real financial impact)
- Limited by daily cap (damage contained)
- Can be revoked instantly by Treasury Safe
- All minting is transparent on-chain

**Max Damage Example:**
- Daily limit: 50,000 UC
- If undetected for 3 days: 150,000 UC minted fraudulently
- At $1 per UC = $150,000 potential loss

**Why separate wallet?**
- Limits blast radius if one key is compromised
- Different security requirements (onramp needs higher availability)
- Easier to monitor and audit separately

---

## 🛡️ Defense in Depth Strategy

### **Layer 1: Secure the Key**

#### **DO:**
- ✅ Store in encrypted environment variables
- ✅ Use AWS Secrets Manager / HashiCorp Vault / similar
- ✅ Rotate keys periodically (every 90 days)
- ✅ Use different keys for dev/staging/prod
- ✅ Limit access to production keys (2-3 people max)
- ✅ Enable 2FA on any service storing keys
- ✅ Use dedicated key for each environment

#### **DON'T:**
- ❌ Commit keys to Git (even in private repos)
- ❌ Store in plain text files
- ❌ Share keys via Slack/email/Discord
- ❌ Use same key across multiple environments
- ❌ Store keys in frontend code
- ❌ Log private keys in application logs

### **Layer 2: Rate Limiting**

Implement backend limits to reduce damage if compromised:

```typescript
// In your backend (apps/api/src/award-sc.ts)

const LIMITS = {
  MAX_SC_PER_TRANSACTION: ethers.parseEther('100'),    // 100 SC max per award
  MAX_SC_PER_ADDRESS_PER_DAY: ethers.parseEther('500'), // 500 SC per user per day
  MAX_TOTAL_SC_PER_HOUR: ethers.parseEther('1000'),     // 1000 SC total per hour
};

async function awardSC(address: string, amount: bigint, reason: string) {
  // Check transaction limit
  if (amount > LIMITS.MAX_SC_PER_TRANSACTION) {
    throw new Error('Amount exceeds per-transaction limit - requires Treasury approval');
  }

  // Check per-address daily limit
  const todayTotal = await getAddressTotalToday(address);
  if (todayTotal + amount > LIMITS.MAX_SC_PER_ADDRESS_PER_DAY) {
    throw new Error('Address would exceed daily limit');
  }

  // Check hourly total limit
  const hourTotal = await getHourlyTotal();
  if (hourTotal + amount > LIMITS.MAX_TOTAL_SC_PER_HOUR) {
    throw new Error('Would exceed hourly total limit');
  }

  // Award SC
  await scContract.award(address, amount, ethers.id(reason));
  
  // Log for monitoring
  await logSCAward({ address, amount, reason, timestamp: Date.now() });
}
```

### **Layer 3: Monitoring & Alerts**

Set up automated monitoring for **both SC awards and UC minting**:

```bash
# Monitor SC awards hourly
0 * * * * cd /path/to/contracts && pnpm monitor-sc-awards

# Monitor UC minting hourly
0 * * * * cd /path/to/contracts && pnpm monitor-uc-mints
```

**Alert on SC Awards:**
- Single award > 100 SC
- Address receives > 500 SC per day
- Total awards > 1000 SC per hour
- Awards from unexpected IP addresses
- Awards outside business hours (if applicable)

**Alert on UC Minting:**
- Single mint > $1,000 worth of UC
- Daily limit 90% consumed
- Unusual minting patterns (spikes, off-hours)
- Mints to same address repeatedly
- Daily limit hit multiple days in a row

**Monitoring Tools:**
- **On-chain events:** Use ethers.js to query `Awarded`, `Slashed`, and `Minted` events
- **Backend logs:** Log every SC award and UC mint with timestamp, IP, reason
- **Dashboard:** Build real-time issuance dashboard (both SC and UC)
- **Alerts:** Slack/email/PagerDuty when thresholds exceeded

**Example: Monitor UC Mints**
```typescript
// Monitor UC minting in real-time
ucContract.on('Minted', (to, amount, minter, event) => {
  console.log(`UC Minted: ${ethers.formatEther(amount)} to ${to} by ${minter}`);
  
  // Alert on large single mint
  if (amount > ethers.parseEther("1000")) {
    sendAlert(`⚠️ Large UC mint: $${ethers.formatEther(amount)}`);
  }
  
  // Check daily capacity
  const remaining = await ucContract.getRemainingDailyMint(minter);
  if (remaining < ethers.parseEther("5000")) {
    sendAlert(`⚠️ UC mint capacity low: ${ethers.formatEther(remaining)} remaining`);
  }
});
```

### **Layer 4: Role Separation**

Don't give all power to one key. Use **separate wallets** for different functions:

```
Governance Bot (Hot Wallet #1)
  ├─ GOVERNANCE_AWARD (limited to 100 SC per tx)
  ├─ GOVERNANCE_SLASH
  ├─ Can be revoked instantly
  └─ Monitored 24/7

Onramp Wallet (Hot Wallet #2)
  ├─ ONRAMP_MINTER (limited to 50K UC per day)
  ├─ Separate from governance bot
  ├─ Can be revoked instantly
  └─ Monitored 24/7

Treasury Safe (Cold Wallet - Multisig 3/5)
  ├─ TREASURER_MINT (unlimited UC)
  ├─ GOVERNANCE_AWARD (unlimited SC)
  ├─ GOVERNANCE_SLASH (all)
  ├─ DEFAULT_ADMIN (can revoke hot wallets)
  ├─ Can set/adjust daily limits
  ├─ Used for large batches
  └─ Requires 3 signatures

Monitoring System
  ├─ Alerts on anomalies (both SC and UC)
  ├─ Auto-pause on breach detection
  ├─ Daily reports
  └─ Weekly capacity reviews
```

**Why Separate Wallets?**
- If governance bot compromised → only SC at risk
- If onramp wallet compromised → only UC at risk (capped)
- Different monitoring/alerting for each
- Easier to audit and rotate keys
- Limits blast radius

---

## 🚨 Incident Response Plan

### **Detection (0-5 minutes)**

**Signs of Governance Bot compromise:**
- ⚠️ Unusual SC awards in monitoring dashboard
- ⚠️ Alerts from monitoring script
- ⚠️ Member complaints about lost SC
- ⚠️ Unexpected wallet transactions
- ⚠️ Server logs show unauthorized access

**Signs of Onramp Wallet compromise:**
- ⚠️ Large or unusual UC mints
- ⚠️ Daily limit being hit repeatedly
- ⚠️ UC minted to suspicious addresses
- ⚠️ Minting at unusual times (3am, weekends)
- ⚠️ Multiple small mints to same address
- ⚠️ Alert: "90% of daily limit consumed"

### **Response (5-15 minutes)**

**Step 1: Revoke Compromised Key**

```bash
cd packages/contracts

# For Governance Bot compromise:
await scContract.revokeRole(
  ROLES.SC.GOVERNANCE_AWARD,
  compromisedGovernanceBotAddress
);

# For Onramp Wallet compromise:
await ucContract.revokeRole(
  ROLES.UC.ONRAMP_MINTER,
  compromisedOnrampWalletAddress
);

# Run via manage-roles script
pnpm manage-roles
```

**Step 2: Grant Role to Backup Key**

```bash
# Immediately give power to clean backup key

# For governance bot:
await scContract.grantRole(
  ROLES.SC.GOVERNANCE_AWARD,
  newBackupGovernanceBotAddress
);

# For onramp wallet:
await ucContract.grantRole(
  ROLES.UC.ONRAMP_MINTER,
  newBackupOnrampWalletAddress
);

# Set daily limit for new onramp wallet
await ucContract.setDailyMintLimit(
  newBackupOnrampWalletAddress,
  ethers.parseEther("50000")
);
```

**Step 3: Pause Backend Operations**

```bash
# In your backend, set emergency mode
export EMERGENCY_PAUSE_SC_AWARDS=true
export EMERGENCY_PAUSE_UC_MINTS=true

# Restart backend
pm2 restart api
```

### **Investigation (15 minutes - 2 hours)**

**Step 4: Identify Fraudulent Activity**

```bash
# For SC compromise:
pnpm monitor-sc-awards

# For UC compromise:
# Query all Minted events from compromised wallet
const events = await ucContract.queryFilter(
  ucContract.filters.Minted(null, null, compromisedWalletAddress),
  startBlock,
  'latest'
);

# Or check on BaseScan:
# https://sepolia.basescan.org/address/UNITY_COIN_ADDRESS#events
```

**Step 5: Document the Breach**

For **SC compromise:**
- When did it start?
- How many fraudulent SC awards?
- Which addresses received fraudulent SC?
- Total SC awarded fraudulently?

For **UC compromise:**
- When did unauthorized minting start?
- How much UC was minted fraudulently?
- Which addresses received fraudulent UC?
- Was daily limit hit? For how many days?
- Total dollar value of fraudulent mints?

For **both:**
- How was the key compromised?
- What systems were accessed?
- Were other keys potentially compromised?

### **Remediation (2-24 hours)**

**Step 6: Reverse Fraudulent Activity**

**For SC fraud:**
```typescript
// Using Treasury Safe (multisig)
for (const fraudAward of fraudulentSCAwards) {
  await scContract.slash(
    fraudAward.recipient,
    fraudAward.amount,
    ethers.id('FRAUD_REVERSAL')
  );
}
```

**For UC fraud:**
```typescript
// UC cannot be "unprinted" but you can:

// Option A: Burn from fraudulent addresses (requires their approval - unlikely)
// Not practical for fraud cases

// Option B: Record as bad debt, adjust accounting
await db.fraudulentMints.create({
  amount: totalFraudulentUC,
  date: Date.now(),
  status: 'written_off'
});

// Option C: Request return (if identity known)
// Contact address owners, request return, threaten legal action

// Option D: Pause fraudulent addresses (if you implement blacklist)
for (const fraudAddress of fraudAddresses) {
  await db.blacklist.create({ address: fraudAddress });
}
```

**Key difference:** SC can be slashed (reversed), UC cannot be easily recovered once minted.

**Step 7: Restore Legitimate Activity**

```typescript
// If legitimate users were slashed by attacker (SC only)
for (const victim of slashedVictims) {
  await scContract.award(
    victim.address,
    victim.amount,
    ethers.id('RESTORATION')
  );
}

// For UC, process any legitimate onramps that were blocked during emergency pause
for (const pendingOnramp of queuedOnramps) {
  // Have Treasury Safe manually process via TREASURER_MINT
  await ucContract.mint(pendingOnramp.address, pendingOnramp.amount);
}
```

**Step 8: Communicate with Members**

```markdown
## Incident Report: Governance Bot Compromise

**What happened:**
On [date], we detected unauthorized SC awards from our governance bot.

**Impact:**
- [X] fraudulent SC awards totaling [Y] SC
- [Z] members affected
- All fraudulent SC has been slashed
- Legitimate SC has been restored

**Root cause:**
[Explain how key was compromised]

**Remediation:**
- Compromised key revoked immediately
- New secure key generated
- Additional security measures implemented
- All transactions are public on blockchain: [link]

**Going forward:**
- Enhanced monitoring
- Rate limits implemented
- [Other improvements]

We apologize for the disruption. All member SC balances have been restored.
```

**Step 9: Post-Mortem**

- How did the breach occur?
- What security measures failed?
- What new measures are needed?
- Update this document with lessons learned

### **Prevention (Ongoing)**

**Step 10: Implement Improvements**

Based on post-mortem:
- Rotate all keys
- Implement missing rate limits
- Add more monitoring
- Conduct security audit
- Train team on security practices

---

## 🔐 Key Storage Best Practices

### **Development**

```bash
# .env file (git-ignored)
GOVERNANCE_BOT_PRIVATE_KEY=your_dev_key_here
```

### **Staging**

```bash
# AWS Secrets Manager / Heroku Config Vars
aws secretsmanager create-secret \
  --name staging-governance-bot-key \
  --secret-string "your_staging_key_here"
```

### **Production**

```bash
# Use dedicated secrets management
# Options:
# - AWS Secrets Manager
# - Google Cloud Secret Manager
# - HashiCorp Vault
# - Azure Key Vault

# Example with AWS:
aws secretsmanager create-secret \
  --name prod-governance-bot-key \
  --secret-string "your_prod_key_here" \
  --kms-key-id "your-kms-key-id"

# Access in your app:
const secret = await secretsManager.getSecretValue({
  SecretId: 'prod-governance-bot-key'
}).promise();
```

### **Key Rotation**

**Quick method:**
```bash
# Every 90 days: Use the rotation helper script
pnpm rotate-wallet

# This will:
# 1. Generate new wallet
# 2. Provide step-by-step instructions
# 3. Track rotation history
# 4. Remind you of security best practices
```

**Manual method:**
```bash
# 1. Generate new wallet
pnpm create-wallet

# 2. Grant role to new wallet (old wallet still works during transition)
pnpm manage-roles
# Grant GOVERNANCE_AWARD or ONRAMP_MINTER to new address
# For onramp: Also set daily limit for new address

# 3. Update backend with new key
# Update secrets manager with new key

# 4. Deploy backend with new key
# Redeploy backend or restart services

# 5. Test new key thoroughly
# Wait 24-48 hours, monitor for issues

# 6. Revoke old key (after confirming new one works)
pnpm manage-roles
# Revoke role from old address

# 7. Document the rotation
# Update internal docs with rotation date, addresses, etc.
```

**Key benefits of this approach:**
- ✅ **Zero downtime**: Both keys work during transition
- ✅ **Reversible**: If new key has issues, old one still works
- ✅ **Testable**: Thoroughly test before committing to new key
- ✅ **Auditable**: All role changes logged on-chain

---

## 📊 Monitoring Setup

### **Option 1: Cron Job (Simple)**

```bash
# Add to crontab (crontab -e)
0 * * * * cd /path/to/contracts && pnpm monitor-sc-awards >> /var/log/sc-monitor.log 2>&1
```

### **Option 2: Backend Integration (Better)**

```typescript
// In your backend (apps/api/src/monitoring/sc-monitor.ts)
import { ethers } from 'ethers';

export async function monitorSCAwards() {
  const scContract = new ethers.Contract(
    process.env.SOULAANI_COIN_ADDRESS,
    scABI,
    provider
  );

  const currentBlock = await provider.getBlockNumber();
  const hourAgoBlock = currentBlock - 1800; // ~1 hour

  const events = await scContract.queryFilter(
    scContract.filters.Awarded(),
    hourAgoBlock,
    currentBlock
  );

  // Analyze and alert
  const alerts = analyzeEvents(events);
  
  if (alerts.length > 0) {
    await sendSlackAlert(alerts);
    await sendPagerDutyAlert(alerts);
  }
}

// Run every 15 minutes
setInterval(monitorSCAwards, 15 * 60 * 1000);
```

### **Option 3: Real-time Event Listener (Best)**

```typescript
// Listen for SC awards in real-time
scContract.on('Awarded', (recipient, amount, reason, awarder, event) => {
  console.log(`SC Awarded: ${ethers.formatEther(amount)} to ${recipient}`);
  
  // Check against limits
  if (amount > MAX_SINGLE_AWARD) {
    sendAlert(`⚠️ Large SC award detected: ${ethers.formatEther(amount)}`);
  }
  
  // Log to database
  logSCAward({ recipient, amount, reason, awarder, blockNumber: event.blockNumber });
});
```

---

## ✅ Security Checklist

Before going to production:

**Key Management:**
- [ ] Governance bot key stored in secrets manager (not .env)
- [ ] Onramp wallet key stored in secrets manager (not .env)
- [ ] Keys stored in separate secrets (not same file)
- [ ] Access to production keys limited to 2-3 people
- [ ] All key access requires 2FA
- [ ] Audit logs enabled for key access
- [ ] Backup keys generated and secured (offline)
- [ ] Key rotation schedule established (90 days)

**Smart Contract Setup:**
- [ ] Treasury Safe has DEFAULT_ADMIN role
- [ ] Treasury Safe is true multisig (3+ signers)
- [ ] Daily mint limit set appropriately (start conservative)
- [ ] Test revocation process on testnet
- [ ] Document all wallet addresses and their roles

**Backend Security:**
- [ ] Rate limits implemented in backend (SC awards)
- [ ] Input validation on all onramp requests
- [ ] Backend rate limiting for onramps (before blockchain)
- [ ] Payment verification before minting UC
- [ ] Blacklist system for fraudulent addresses

**Monitoring & Alerts:**
- [ ] SC award monitoring script set up (cron or real-time)
- [ ] UC mint monitoring script set up (cron or real-time)
- [ ] Alert system configured (Slack/email/PagerDuty)
- [ ] Alerts for: large awards, large mints, capacity warnings
- [ ] Dashboard showing daily mint capacity used/remaining

**Incident Response:**
- [ ] Incident response plan documented and tested
- [ ] Team trained on emergency procedures
- [ ] Tested key revocation on testnet
- [ ] Backup contact list for emergency (24/7)
- [ ] Runbook for common scenarios

**Financial Controls:**
- [ ] Accounting system tracking all UC minted
- [ ] Reconciliation process (UC minted = fiat received)
- [ ] Reserve requirements documented
- [ ] Bad debt policy established

---

## 📚 Additional Resources

- **OpenZeppelin Access Control:** https://docs.openzeppelin.com/contracts/access-control
- **AWS Secrets Manager:** https://aws.amazon.com/secrets-manager/
- **Key Management Best Practices:** https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
- **Incident Response:** https://www.cisa.gov/sites/default/files/publications/Incident-Response-Plan-Basics_508c.pdf

---

**Remember:** Security is a process, not a product. Continuously monitor, test, and improve your security posture.

