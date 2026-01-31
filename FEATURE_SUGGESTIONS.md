# Unity Coin Feature Suggestions & Improvements

This document outlines suggested features and improvements to enhance the Unity Coin (UC) transfer, onramp, and wallet management system.

---

## 🎯 High-Priority Features

### 1. Real-Time Balance Updates (WebSocket)

**Current**: Manual refresh and 30-second polling
**Proposed**: WebSocket connection for instant updates

**Benefits**:
- Instant balance updates when transfers received
- Real-time transaction confirmations
- Better user experience (no waiting for refresh)
- Lower server load vs. constant polling

**Implementation**:
```typescript
// Backend: WebSocket server
io.on('connection', (socket) => {
  socket.on('subscribe-wallet', (walletAddress) => {
    // Watch blockchain for Transfer events
    watchContractEvent(unityCoinContract, {
      event: 'Transfer',
      args: { to: walletAddress },
      onLogs: (logs) => {
        socket.emit('balance-updated', { balance });
      }
    });
  });
});

// Mobile: Subscribe to updates
socket.emit('subscribe-wallet', userWalletAddress);
socket.on('balance-updated', ({ balance }) => {
  setBalance(balance);
});
```

**Estimated Effort**: 2-3 days
**Dependencies**: socket.io library, viem event watching

---

### 2. Transaction Status Polling for Onramp

**Current**: User must manually check if UC minted
**Proposed**: Automatic polling with notifications

**User Flow**:
1. User completes payment in app
2. App shows "Processing payment..." with spinner
3. Backend polls transaction status every 3 seconds
4. Push notification when UC minted
5. Automatic balance refresh

**Implementation**:
```typescript
// After payment succeeds
const pollInterval = setInterval(async () => {
  const status = await api.getOnrampStatus(transactionId);

  if (status.status === 'COMPLETED') {
    clearInterval(pollInterval);

    // Show success notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'UC Received!',
        body: `${status.amountUC} UC has been added to your wallet`,
      },
    });

    // Refresh balance
    loadWalletData();
  }
}, 3000);

// Stop polling after 5 minutes
setTimeout(() => clearInterval(pollInterval), 300000);
```

**Benefits**:
- User doesn't need to manually check
- Clear feedback on onramp progress
- Catches failed transactions early

**Estimated Effort**: 1 day
**Dependencies**: expo-notifications for push notifications

---

### 3. Biometric Authentication for Transfers

**Current**: No additional auth for transfers
**Proposed**: Face ID/Touch ID/Fingerprint confirmation before sending

**Benefits**:
- Prevents accidental transfers
- Adds security layer (even if phone stolen)
- Industry standard for financial apps

**Implementation**:
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const authenticateTransfer = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Send ${amount} UC to ${recipientName}?`,
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      // Execute transfer
      await api.executeTransfer(userId, recipientAddress, amount);
    }
  } else {
    // Fallback to password or skip
    Alert.alert('Confirm Transfer', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Confirm', onPress: () => executeTransfer() }
    ]);
  }
};
```

**Estimated Effort**: 1 day
**Dependencies**: expo-local-authentication

---

### 4. Rate Limiting & Daily Transfer Limits

**Current**: Unlimited transfers
**Proposed**: Configurable limits to prevent abuse

**Limits**:
- Max 10 transfers per minute per user
- Configurable daily limit (e.g., 10,000 UC/day)
- Admin can adjust limits per user
- Higher limits for verified users

**Implementation**:
```typescript
// Backend: Rate limiting middleware
import rateLimit from 'express-rate-limit';

const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many transfer requests, please try again later',
  keyGenerator: (req) => req.userId, // Rate limit per user
});

app.use('/trpc/ucTransfer.executeTransfer', transferLimiter);

// Daily limit check in transfer logic
const todayTransfers = await db.onchainTransfer.aggregate({
  where: {
    from: userWallet,
    timestamp: { gte: startOfDay(new Date()) }
  },
  _sum: { amount: true }
});

if (todayTransfers._sum.amount > user.dailyTransferLimit) {
  throw new Error('Daily transfer limit exceeded');
}
```

**Benefits**:
- Prevents spam/abuse
- Limits damage if account compromised
- Regulatory compliance (AML/KYC)

**Estimated Effort**: 2 days
**Dependencies**: express-rate-limit

---

### 5. Transaction Notifications

**Current**: No notifications
**Proposed**: Push notifications for transfers and onramp

**Notification Types**:
- ✅ Transfer received: "You received 50 UC from @alice"
- ✅ Transfer sent confirmed: "Sent 50 UC to @bob - Confirmed"
- ✅ Onramp completed: "Payment processed! 100 UC added to wallet"
- ❌ Onramp failed: "Payment failed - please try again"
- ⚠️ Large transfer: "Large transfer detected: 5000 UC sent (confirm if you initiated)"

**Implementation**:
```typescript
// Backend: Send notification on transfer
async function sendTransferNotification(recipientUserId: string, amount: number, senderName: string) {
  const { pushToken } = await db.user.findUnique({
    where: { id: recipientUserId },
    select: { pushToken: true }
  });

  if (pushToken) {
    await sendPushNotification(pushToken, {
      title: 'UC Received',
      body: `You received ${amount} UC from ${senderName}`,
      data: { type: 'transfer_received', amount }
    });
  }
}

// Call after transfer confirmed on-chain
await sendTransferNotification(recipientId, amount, senderName);
```

**Benefits**:
- User awareness of account activity
- Security (detect unauthorized transfers)
- Better engagement

**Estimated Effort**: 2-3 days
**Dependencies**: expo-notifications, FCM/APNS setup

---

## 💡 Medium-Priority Features

### 6. Transfer Request & Request-to-Pay

**Proposed**: Users can request payment from others

**User Flow**:
1. Alice requests 50 UC from Bob (with optional note: "Lunch payment")
2. Bob receives notification with request
3. Bob can approve (instant transfer) or deny
4. Alice gets notification of decision

**Use Cases**:
- Splitting bills
- Requesting reimbursement
- Invoicing within co-op

**Implementation**:
```prisma
model PaymentRequest {
  id            String   @id @default(cuid())
  requesterId   String
  requester     User     @relation(fields: [requesterId], references: [id])
  payerId       String
  payer         User     @relation(fields: [payerId], references: [id])
  amount        Float
  note          String?
  status        RequestStatus // PENDING, APPROVED, DENIED, EXPIRED
  createdAt     DateTime @default(now())
  expiresAt     DateTime
}
```

**Estimated Effort**: 3-4 days

---

### 7. Recurring Payments / Subscriptions

**Proposed**: Auto-transfer UC on schedule

**Use Cases**:
- Monthly co-op dues
- Recurring donations
- Subscription services within co-op

**Implementation**:
- User authorizes recurring transfer
- Backend cron job executes transfers
- Email notification before each charge
- User can cancel anytime

**Estimated Effort**: 4-5 days

---

### 8. Multi-Signature Wallets for Organizations

**Proposed**: Require multiple approvals for large transfers

**Use Cases**:
- Co-op treasury management
- Shared project funds
- Department budgets

**Example**: Treasury wallet requires 3/5 board members to approve transfers >1000 UC

**Implementation**: Smart contract-based multi-sig (Gnosis Safe pattern)

**Estimated Effort**: 1-2 weeks (complex)

---

### 9. Transaction Categories & Tagging

**Proposed**: Users can categorize and tag transactions

**Features**:
- Add notes to transfers: "Rent payment", "Groceries", "Birthday gift"
- Auto-categorize based on recipient
- Search/filter by category
- Export for accounting

**Benefits**:
- Personal finance tracking
- Tax preparation
- Budget analysis

**Estimated Effort**: 2-3 days

---

### 10. Invoice Generation

**Proposed**: Generate shareable invoices for payment

**User Flow**:
1. User creates invoice (amount, description, due date)
2. System generates QR code + shareable link
3. Payer scans/clicks to pay
4. Automatic matching and reconciliation

**Use Cases**:
- Freelance work within co-op
- Service payments
- Goods sales

**Estimated Effort**: 3-4 days

---

## 🚀 Advanced Features

### 11. Savings Goals & Budgets

**Proposed**: Set aside UC for specific goals

**Features**:
- Create goals: "Emergency Fund: 1000 UC", "New Equipment: 500 UC"
- Auto-allocate % of received UC to goals
- Visual progress bars
- Lock funds until goal reached (optional)

**Implementation**:
```prisma
model SavingsGoal {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  name          String
  targetAmount  Float
  currentAmount Float    @default(0)
  autoAllocate  Float?   // % of received transfers
  locked        Boolean  @default(false)
  createdAt     DateTime @default(now())
  deadline      DateTime?
}
```

**Estimated Effort**: 4-5 days

---

### 12. Peer-to-Peer Lending

**Proposed**: Members lend UC to each other with terms

**Features**:
- Create loan offer (amount, interest rate, duration)
- Borrower accepts terms
- Automatic repayment schedule
- Escrow smart contract
- Credit score system

**Use Cases**:
- Emergency funds
- Business capital
- Community mutual aid

**Estimated Effort**: 2-3 weeks (complex)
**Requires**: Legal review, smart contracts

---

### 13. Decentralized Governance Voting

**Proposed**: Use UC holdings for voting weight

**Features**:
- Members propose changes (weighted by UC holdings or 1-person-1-vote)
- Vote on proposals
- Quadratic voting option
- On-chain vote recording

**Use Cases**:
- Co-op decisions
- Budget allocation
- Policy changes

**Estimated Effort**: 2-3 weeks
**Requires**: Smart contract development

---

### 14. Integration with External Wallets

**Proposed**: Import existing Ethereum wallets

**Features**:
- WalletConnect integration
- MetaMask mobile deep linking
- Non-custodial mode (user controls keys)
- Hybrid mode (both backend and user wallet)

**Benefits**:
- User sovereignty
- Access from any wallet app
- Interoperability

**Implementation**:
```typescript
import { useWalletConnect } from '@walletconnect/react-native-dapp';

const { connector, connect } = useWalletConnect();

// User can choose: Backend wallet OR WalletConnect
if (userPreference === 'walletconnect') {
  await connect();
  const accounts = await connector.getAccounts();
  // Use WalletConnect for signing
} else {
  // Use backend wallet (current implementation)
}
```

**Estimated Effort**: 1 week
**Dependencies**: @walletconnect/react-native-dapp

---

### 15. Cross-Chain Bridge

**Proposed**: Transfer UC to other blockchains

**Supported Chains**:
- Base Mainnet (from Sepolia)
- Ethereum mainnet
- Polygon
- Arbitrum

**Use Cases**:
- DeFi integration
- Cheaper transactions (L2s)
- Broader ecosystem access

**Implementation**: LayerZero or custom bridge contract

**Estimated Effort**: 3-4 weeks (very complex)
**Requires**: Security audit

---

## 🛡️ Security & Compliance Features

### 16. Transaction Monitoring & Fraud Detection

**Proposed**: AI-powered anomaly detection

**Monitoring**:
- Unusual transfer patterns
- Large/rapid withdrawals
- Transfers to flagged addresses
- Velocity checks (many transfers in short time)

**Actions**:
- Temporary hold on suspicious transactions
- Email/SMS verification for large amounts
- Admin review queue
- Automatic reporting

**Estimated Effort**: 2-3 weeks
**Dependencies**: ML model, monitoring infrastructure

---

### 17. KYC/AML Compliance

**Proposed**: Identity verification for large transactions

**Features**:
- Tier 1: Email verification (up to $500/day)
- Tier 2: ID upload (up to $5,000/day)
- Tier 3: Video verification (unlimited)

**Integration**: Stripe Identity, Jumio, or Onfido

**Estimated Effort**: 1-2 weeks
**Cost**: ~$1-3 per verification

---

### 18. Cold Storage for Treasury

**Proposed**: Multi-sig hardware wallet for co-op treasury

**Implementation**:
- Ledger or Trezor integration
- Gnosis Safe multi-sig
- Timelock for large transfers
- Geographic distribution of signers

**Benefits**:
- Maximum security for large funds
- Cannot be compromised by single breach

**Estimated Effort**: 1 week (integration)

---

## 📊 Analytics & Insights

### 19. Personal Finance Dashboard

**Proposed**: Spending insights and trends

**Features**:
- Monthly spending breakdown
- Top recipients/senders
- Cashflow chart
- Average transaction size
- Comparison to previous months

**Visualizations**:
- Pie charts (categories)
- Line graphs (balance over time)
- Bar charts (monthly comparison)

**Estimated Effort**: 3-4 days

---

### 20. Admin Analytics Dashboard

**Proposed**: Network-wide metrics

**Metrics**:
- Total UC in circulation
- Active wallets count
- Transaction volume trends
- Top users by volume
- Onramp success rates by processor
- Average transaction fees collected
- Network health indicators

**Benefits**:
- Business intelligence
- Identify growth opportunities
- Optimize payment processor mix

**Estimated Effort**: 4-5 days

---

## 🎨 UX Improvements

### 21. Transaction Templates

**Proposed**: Save frequent transfer recipients

**Features**:
- Save recipient + amount as template
- Quick send with one tap
- Recurring transfer option
- Templates shared across devices

**Use Cases**:
- Monthly rent payments
- Regular suppliers
- Team members

**Estimated Effort**: 2 days

---

### 22. Batch Transfers

**Proposed**: Send to multiple recipients at once

**Features**:
- CSV upload (address, amount)
- Manual multi-recipient selection
- Preview total amount + fees
- Single transaction batch

**Use Cases**:
- Payroll
- Reimbursements
- Prize distribution

**Implementation**: Smart contract with batch transfer function

**Estimated Effort**: 3-4 days

---

### 23. Dark Mode & Themes

**Proposed**: Customizable app appearance

**Features**:
- Dark/light mode toggle
- Custom accent colors
- High contrast mode (accessibility)
- Automatic based on system setting

**Estimated Effort**: 2-3 days

---

### 24. Offline Mode & Queue

**Proposed**: Queue transfers when offline

**Features**:
- Create transfer while offline
- Queued for sending when online
- Local persistence
- Notification when sent

**Benefits**:
- Works in areas with poor connectivity
- Better user experience

**Estimated Effort**: 2-3 days

---

## 🌍 Blockchain & Infrastructure

### 25. Migrate to Blockchain Indexer

**Current**: Direct viem.getLogs() queries
**Proposed**: The Graph subgraph or Goldsky indexer

**Benefits**:
- Much faster queries
- Complex filtering and aggregation
- GraphQL API
- Real-time subscriptions
- Reduced RPC load

**Implementation**:
```graphql
# GraphQL schema
type Transfer @entity {
  id: ID!
  from: Bytes!
  to: Bytes!
  value: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}

# Query all transfers for user
query GetUserTransfers($address: Bytes!) {
  transfers(where: { or: [{ from: $address }, { to: $address }] }) {
    id
    from
    to
    value
    timestamp
  }
}
```

**When to Migrate**: Transfer volume >1000/day

**Estimated Effort**: 1 week
**Cost**: ~$100-500/month for hosted service

---

### 26. Layer 2 Scaling

**Current**: Base Sepolia (testnet)
**Proposed**: Move to Base Mainnet (already L2)

**Future Options**:
- Base (Optimism L2) - cheapest
- Arbitrum - fast finality
- zkSync - privacy-preserving
- Polygon - EVM compatible

**Benefits**:
- Lower gas fees
- Faster transactions
- Better UX

**Migration**: Test on Base Mainnet first, then evaluate other L2s

---

### 27. Gas Fee Abstraction

**Proposed**: Backend pays gas fees (gasless transactions)

**Implementation**:
- EIP-2771 (meta-transactions)
- Relay service (Gelato, Biconomy)
- Backend wallet pays gas
- Optional: Deduct small fee from UC transfer

**Benefits**:
- User doesn't need ETH for gas
- Simpler UX
- Faster onboarding

**Estimated Effort**: 1 week
**Cost**: Gas costs + relay service fees

---

## 📱 Mobile App Enhancements

### 28. Widget Support

**Proposed**: iOS/Android home screen widgets

**Features**:
- Balance widget
- Recent transactions
- Quick send widget
- Price chart (if UC has market value)

**Estimated Effort**: 3-4 days per platform

---

### 29. Apple Pay / Google Pay Integration

**Proposed**: Buy UC via Apple/Google Pay

**Benefits**:
- One-tap purchases
- No credit card entry
- Higher trust (Apple/Google brand)
- Faster checkout

**Implementation**: Stripe supports both

**Estimated Effort**: 2-3 days

---

### 30. In-App Referral Program

**Proposed**: Earn UC by inviting friends

**Features**:
- Unique referral code per user
- Bonus UC for referrer + referee
- Leaderboard
- Share to social media

**Example**: Referrer gets 10 UC, new user gets 5 UC

**Estimated Effort**: 3-4 days

---

## 🎁 Bonus Ideas

31. **Gift Cards**: Send UC as redeemable gift cards
32. **Charity Donations**: Direct donations to co-op causes
33. **NFT Integration**: Mint receipts as NFTs
34. **Social Features**: User profiles, follows, transaction feed
35. **API for Third-Party Apps**: Let external apps integrate with UC
36. **Desktop App**: Electron-based desktop wallet
37. **Browser Extension**: MetaMask-style browser plugin
38. **Voice Commands**: "Send 50 UC to Alice" (Siri/Google Assistant)
39. **Transaction Disputes**: Dispute resolution system
40. **Automatic Tax Reporting**: Export tax documents (1099 equivalent)

---

## 📈 Priority Matrix

| Feature | Priority | Effort | Impact | Dependencies |
|---------|----------|--------|--------|--------------|
| Real-time Updates (WebSocket) | High | Medium | High | socket.io |
| Onramp Status Polling | High | Low | High | expo-notifications |
| Biometric Auth | High | Low | Medium | expo-local-authentication |
| Rate Limiting | High | Low | High | express-rate-limit |
| Transaction Notifications | High | Medium | High | Push notification service |
| Transfer Requests | Medium | Medium | Medium | None |
| Transaction Categories | Medium | Low | Low | None |
| Invoice Generation | Medium | Medium | Medium | None |
| Savings Goals | Medium | Medium | Medium | None |
| WalletConnect Integration | Medium | High | Medium | @walletconnect/react-native-dapp |
| Blockchain Indexer | High | High | High | The Graph/Goldsky |
| Fraud Detection | Medium | High | High | ML infrastructure |
| KYC/AML | Medium | Medium | Medium | Identity verification service |
| Personal Finance Dashboard | Low | Low | Low | None |
| Dark Mode | Low | Low | Low | None |

---

## 🚀 Recommended Implementation Order

### Phase 1 (Week 1-2): Critical UX
1. Real-time balance updates (WebSocket)
2. Onramp status polling
3. Transaction notifications
4. Biometric authentication

### Phase 2 (Week 3-4): Security & Limits
5. Rate limiting
6. Daily transfer limits
7. Fraud detection basics
8. Admin analytics dashboard

### Phase 3 (Month 2): Advanced Features
9. Transfer request/request-to-pay
10. Transaction categories & tagging
11. Recurring payments
12. Invoice generation

### Phase 4 (Month 3): Scaling
13. Migrate to blockchain indexer
14. Multi-signature wallets (for treasury)
15. KYC/AML compliance
16. Cross-chain bridge (if needed)

### Phase 5 (Month 4+): Nice-to-Haves
17. Personal finance dashboard
18. Savings goals
19. Dark mode
20. Peer-to-peer lending (if desired)

---

**Last Updated**: 2026-01-10
**Status**: Planning Document
**Next Step**: Prioritize top 5 features with stakeholders
