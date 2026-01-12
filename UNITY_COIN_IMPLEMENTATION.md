# Unity Coin Transfer & Fiat Onramp Implementation

## Overview
This document summarizes the backend implementation for Unity Coin (UC) transfers and fiat onramp functionality.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Buy UC       │  │ Transfer UC  │  │ TX History   │     │
│  │ (Onramp)     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────┬────────────────┬────────────────┬─────────────┘
             │                │                │
             │ tRPC API       │ tRPC API       │ tRPC API
             ▼                ▼                ▼
┌────────────────────────────────────────────────────────────┐
│                   Backend (tRPC Routers)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Onramp       │  │ UC Transfer  │  │ User/Admin   │    │
│  │ Router       │  │ Router       │  │ Routers      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│  ┌──────▼──────────────────▼──────────────────▼───────┐   │
│  │             Services Layer                         │   │
│  │  • Payment Service (Stripe/PayPal/Square)         │   │
│  │  • Wallet Service (Encryption/Signing)            │   │
│  │  • Blockchain Service (viem queries)              │   │
│  └───────┬────────────────┬──────────────────┬────────┘   │
└──────────┼────────────────┼──────────────────┼────────────┘
           │                │                  │
           ▼                ▼                  ▼
┌──────────────────┐ ┌─────────────┐ ┌────────────────────┐
│ Payment          │ │ PostgreSQL  │ │ Base Sepolia       │
│ Processors       │ │ Database    │ │ (Blockchain)       │
│ (Stripe/PayPal/  │ │             │ │ • UnityCoin        │
│  Square)         │ │             │ │ • SoulaaniCoin     │
└──────────────────┘ └─────────────┘ └────────────────────┘
```

---

## Backend Services Created

### 1. **Wallet Service** (`/packages/trpc/src/services/wallet-service.ts`)

**Purpose**: Manages custodial wallets with encryption and transaction signing.

**Key Functions**:
- `createWallet()` - Generate new Ethereum wallet with mnemonic
- `encryptPrivateKey()` - AES-256-GCM encryption for secure storage
- `decryptPrivateKey()` - Decrypt for transaction signing
- `createWalletForUser(userId)` - Create and store wallet in database
- `getUserWallet(userId)` - Retrieve wallet with decrypted private key
- `sendTransaction()` - Sign and send blockchain transactions
- `mintUCToUser(userId, amountUC)` - Mint UC tokens for fiat onramp

**Security Features**:
- AES-256-GCM encryption with auth tags
- Environment-based encryption key
- Automatic memory clearing after use

---

### 2. **Blockchain Service** (`/packages/trpc/src/services/blockchain.ts`)

**Purpose**: Abstraction layer for blockchain interactions using viem.

**Key Functions**:
- `getPublicClient()` - Create viem public client for reads
- `getWalletClient(privateKey)` - Create viem wallet client for writes
- `getUCBalance(address)` - Query UC token balance
- `isActiveMember(address)` - Check SoulaaniCoin membership
- `getTransferEvents(address)` - Query Transfer events for an address
- `getAllTransferEvents()` - Query all Transfer events (admin)
- `parseTransferEvents(logs)` - Parse blockchain logs into structured data
- `formatUCAmount()` / `parseUCAmount()` - Handle 18 decimal conversions
- `estimateGas()` / `getGasPrice()` - Gas estimation utilities

**Smart Contracts Supported**:
- UnityCoin (ERC-20 stablecoin) - `0xB52b287a83f3d370fdAC8c05f39da23522a51ec9`
- SoulaaniCoin (Governance token) - `0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542`

---

### 3. **Payment Service** (`/packages/trpc/src/services/payment/`)

**Purpose**: Multi-processor payment abstraction with automatic failover.

**Structure**:
```
payment/
├── types.ts         # Common interfaces and types
├── stripe.ts        # Stripe implementation
├── paypal.ts        # PayPal implementation
├── square.ts        # Square implementation
└── index.ts         # Manager with failover logic
```

**Features**:
- **Automatic Failover**: Tries processors in order until one succeeds
- **Processor Health Checks**: `isAvailable()` tests connectivity
- **Webhook Verification**: Validates webhook signatures from all processors
- **Refund Support**: Unified refund interface

**Payment Flow**:
1. Client requests payment intent
2. Manager tries Stripe (primary)
3. If Stripe fails, tries PayPal (fallback #1)
4. If PayPal fails, tries Square (fallback #2)
5. Returns success or comprehensive error

---

## tRPC Routers Created

### 1. **Application Router** (`/packages/trpc/src/routers/application.ts`)

**New Procedures**:
- `approveApplication` - Approve user application + auto-create wallet
- `rejectApplication` - Reject user application

**Workflow**:
```
Application Submitted
    ↓
Admin Approves (approveApplication)
    ↓
1. Update application.status = APPROVED
2. Create wallet for user (encrypt + store private key)
3. Update user.status = ACTIVE
    ↓
User receives wallet address
```

---

### 2. **User Router** (`/packages/trpc/src/routers/user.ts`)

**New Procedures**:
- `exportWallet` - Export private key (requires password re-auth)
- `getWalletInfo` - Get wallet address and metadata

**Security**:
- Password verification required before key export
- Audit logging for all exports (TODO: implement audit log table)
- Clear security warnings displayed to users

---

### 3. **Admin Router** (`/packages/trpc/src/routers/admin.ts`)

**New Procedures**:
- `getUsersWithoutWallets` - List active users without wallets
- `createWalletForUserAdmin` - Manually create wallet for user
- `createBulkWallets` - Create wallets for multiple users at once
- `getAllUsersWithWallets` - List all users with wallet status

**Use Case**: Admins can create wallets for users who were approved before wallet auto-creation was implemented.

---

### 4. **UC Transfer Router** (`/packages/trpc/src/routers/uc-transfer.ts`)

**Purpose**: Handle Unity Coin transfers between users.

**Procedures**:
- `getBalance` - Get UC balance for wallet
- `validateRecipient` - Validate recipient address (must be active SC member)
- `getUserByUsername` - Find user by username for transfers
- `getTransferHistory` - Get transfer history (sent/received)
- `estimateTransferGas` - Estimate gas cost for transfer
- `executeTransfer` - Execute UC transfer (backend signs transaction)

**Transfer Flow**:
```
User initiates transfer
    ↓
1. Validate recipient is active SC member
2. Check sender's UC balance
3. Build transfer transaction (UnityCoin.transfer)
4. Backend signs transaction with user's encrypted private key
5. Send transaction to blockchain
6. Return transaction hash
```

**Security Validations**:
- Recipient must be active SoulaaniCoin member (enforced by smart contract)
- Sender must have sufficient UC balance
- Rate limiting to prevent spam (TODO: implement)

---

### 5. **Onramp Router** (`/packages/trpc/src/routers/onramp.ts`)

**Purpose**: Fiat-to-UC conversions using credit card/bank payments.

**Procedures**:
- `getAvailableProcessors` - List working payment processors
- `createPaymentIntent` - Create payment intent with failover
- `getOnrampHistory` - User's onramp transaction history
- `getOnrampStatus` - Status of specific onramp transaction
- `getOnrampStats` - Admin statistics (volume, success rates, etc.)

**Onramp Flow**:
```
User wants to buy $50 UC
    ↓
1. createPaymentIntent (tries Stripe → PayPal → Square)
2. Store OnrampTransaction in DB (status: PENDING)
3. Return clientSecret to mobile app
    ↓
Mobile app presents payment UI
    ↓
User completes payment
    ↓
Payment processor sends webhook
    ↓
Webhook handler:
  1. Verify signature
  2. Find OnrampTransaction
  3. Mint UC to user's wallet (calls mintUCToUser)
  4. Update transaction.status = COMPLETED
  5. Store blockchain tx hash
```

---

## Database Schema Changes

### **User Model Updates**:
```prisma
model User {
  id                  String   @id @default(cuid())
  email               String   @unique
  // ... existing fields
  walletAddress       String?  @unique              // NEW
  encryptedPrivateKey String?                       // NEW
  walletCreatedAt     DateTime?                     // NEW
  onrampTransactions  OnrampTransaction[]           // NEW relation
}
```

### **UserProfile Model Updates**:
```prisma
model UserProfile {
  // ... existing fields
  username          String?  @unique  // NEW - for transfer recipient lookup
}
```

### **New OnrampTransaction Model**:
```prisma
model OnrampTransaction {
  id                String        @id @default(cuid())
  userId            String
  user              User          @relation(fields: [userId], references: [id])

  amountUSD         Float         // Amount paid in USD
  amountUC          Float         // UC tokens to mint

  paymentIntentId   String        @unique  // Payment ID from processor
  processor         String        // 'stripe', 'paypal', or 'square'
  status            OnrampStatus  // PENDING, COMPLETED, FAILED, REFUNDED

  mintTxHash        String?       // Blockchain tx hash
  processorChargeId String?       // Processor's charge ID

  createdAt         DateTime      @default(now())
  completedAt       DateTime?
  failedAt          DateTime?
  failureReason     String?

  @@index([userId, createdAt])
  @@index([processor, status])
}

enum OnrampStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

---

## Environment Variables Required

Add these to your `.env` file:

```bash
# ─── Wallet Encryption ───────────────────────────────────
WALLET_ENCRYPTION_KEY=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# ─── Blockchain Configuration ────────────────────────────
RPC_URL=https://sepolia.base.org
UNITY_COIN_ADDRESS=0xB52b287a83f3d370fdAC8c05f39da23522a51ec9
SOULAANI_COIN_ADDRESS=0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542

# ─── Backend Wallet (for UC minting) ─────────────────────
BACKEND_WALLET_PRIVATE_KEY=0x<private-key-with-BACKEND-role-on-UnityCoin-contract>

# ─── Stripe Payment Processor (Primary) ──────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── PayPal Payment Processor (Fallback #1) ──────────────
PAYPAL_CLIENT_ID=<paypal-client-id>
PAYPAL_CLIENT_SECRET=<paypal-client-secret>
PAYPAL_WEBHOOK_ID=<paypal-webhook-id>
PAYPAL_MODE=sandbox  # or 'live' for production

# ─── Square Payment Processor (Fallback #2) ──────────────
SQUARE_ACCESS_TOKEN=<square-access-token>
SQUARE_WEBHOOK_SIGNATURE_KEY=<square-webhook-signature-key>
SQUARE_ENVIRONMENT=sandbox  # or 'production'

# ─── Application URLs ────────────────────────────────────
APP_URL=https://yourdomain.com
```

---

## API Endpoints Summary

### **UC Transfer Endpoints** (`trpc.ucTransfer.*`):
- `getBalance({ walletAddress })` - Get UC balance
- `validateRecipient({ recipientAddress })` - Validate transfer recipient
- `getUserByUsername({ username })` - Find user by username
- `getTransferHistory({ walletAddress, fromBlock?, limit })` - Get transfer history
- `estimateTransferGas({ from, to, amount })` - Estimate gas cost
- `executeTransfer({ userId, recipientAddress, amount })` - Execute transfer

### **Onramp Endpoints** (`trpc.onramp.*`):
- `getAvailableProcessors()` - List available payment processors
- `createPaymentIntent({ amountUSD, processor? })` - Create payment intent
- `getOnrampHistory({ limit, offset })` - Get user's onramp history
- `getOnrampStatus({ transactionId })` - Get transaction status
- `getOnrampStats({ fromDate?, toDate? })` - Admin statistics

### **Wallet Management Endpoints** (`trpc.user.*` / `trpc.admin.*`):
- `user.exportWallet({ userId, password })` - Export private key
- `user.getWalletInfo({ userId })` - Get wallet info
- `admin.getUsersWithoutWallets()` - List users without wallets
- `admin.createWalletForUserAdmin({ userId })` - Create wallet for user
- `admin.createBulkWallets({ userIds })` - Bulk create wallets

### **Application Management** (`trpc.application.*`):
- `approveApplication({ userId, reviewNotes? })` - Approve + create wallet
- `rejectApplication({ userId, reviewNotes })` - Reject application

---

## Security Considerations

### **Private Key Security**:
✅ Private keys encrypted with AES-256-GCM before database storage
✅ Encryption key stored in environment variables (not in code)
✅ Private keys cleared from memory after use
✅ Password re-authentication required for key export
⚠️ TODO: Implement audit logging for all key exports
⚠️ TODO: Add 2FA requirement for key export

### **Payment Security**:
✅ Webhook signature verification for all processors
✅ Idempotency checks to prevent double-minting
✅ Amount validation before minting
✅ Daily minting limits enforced by smart contract
⚠️ TODO: Rate limiting on payment creation endpoints
⚠️ TODO: Fraud detection patterns

### **Transfer Security**:
✅ Recipient must be active SoulaaniCoin member (enforced on-chain)
✅ Sender balance checked before transfer
✅ Transaction signing done server-side (user can't manipulate)
⚠️ TODO: Daily transfer limits per user
⚠️ TODO: Unusual activity monitoring

---

## Next Steps (Remaining Implementation)

### **Backend**:
1. ✅ Database schema (COMPLETED)
2. ✅ Wallet service (COMPLETED)
3. ✅ Blockchain service (COMPLETED)
4. ✅ Payment service (COMPLETED)
5. ✅ tRPC routers (COMPLETED)
6. ⏳ Webhook handlers (IN PROGRESS - need to create API routes)
7. ⏳ Environment setup documentation

### **Mobile App**:
1. Install payment processor SDKs (Stripe, PayPal, Square)
2. Create Buy UC screen
3. Create UC transfer screen
4. Create transaction history view
5. Create wallet export flow

### **Admin Portal**:
1. Create UC transactions monitoring page
2. Create onramp transactions monitoring page
3. Create wallet management UI

### **Testing**:
1. Test wallet creation flow
2. Test UC transfer end-to-end
3. Test fiat onramp end-to-end
4. Test payment processor failover
5. Security penetration testing

---

## Migration Path

### **Current State**: Direct blockchain queries via `viem.getLogs()`

**Pros**:
- Simple implementation
- No additional infrastructure
- Works immediately

**Cons**:
- Slow for large datasets
- RPC rate limits
- No complex analytics

### **Future State**: Blockchain indexer (The Graph, Ponder, or Goldsky)

**When to migrate**: Transfer volume > 1000/day or need complex analytics

**Migration strategy**:
1. Abstract blockchain queries behind interface
2. Current implementation: `BlockchainDataSource` (viem)
3. Future implementation: `IndexerDataSource` (GraphQL)
4. tRPC API stays identical (no mobile/web changes needed)

---

## Smart Contract Integration

### **UnityCoin Contract**:
- **Address**: `0xB52b287a83f3d370fdAC8c05f39da23522a51ec9`
- **Functions Used**:
  - `balanceOf(address)` - Query UC balance
  - `transfer(address to, uint256 amount)` - Transfer UC (0.1% fee)
  - `mintOnramp(address to, uint256 amount)` - Mint UC for fiat onramp (BACKEND role only)
- **Events**:
  - `Transfer(address indexed from, address indexed to, uint256 value)`
  - `FeeCollected(address indexed treasury, uint256 amount)`

### **SoulaaniCoin Contract**:
- **Address**: `0x7E59d1F33F4efF9563544B2cc90B9Cc7516E2542`
- **Functions Used**:
  - `isActiveMember(address)` - Check if address can receive UC

---

## Monitoring & Alerts

### **Recommended Alerts**:
- ❌ Payment processor unavailable
- ❌ Webhook signature verification failures
- ❌ Minting failures
- ❌ Daily minting limit approaching
- ❌ Failed transaction signing attempts
- ❌ Unusual transfer volumes
- ❌ Multiple failed authentication attempts
- ❌ Private key export events

### **Metrics to Track**:
- Total UC minted via onramp (24h, 7d, 30d)
- Total UC transfer volume
- Payment processor success rates
- Average onramp transaction time
- Number of active wallets
- Failed transaction rate

---

## Support & Troubleshooting

### **Common Issues**:

**Q: Wallet creation fails with "WALLET_ENCRYPTION_KEY not set"**
A: Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   Add to `.env`: `WALLET_ENCRYPTION_KEY=<generated-key>`

**Q: UC minting fails with "BACKEND_WALLET_PRIVATE_KEY not set"**
A: Deploy UnityCoin contract, grant BACKEND role to a wallet, add private key to `.env`

**Q: Transfer fails with "Recipient is not an active SoulaaniCoin member"**
A: Only users with active SC membership can receive UC. Check `SoulaaniCoin.isActiveMember(address)`

**Q: All payment processors show as unavailable**
A: Check payment processor API keys in `.env`. Test connectivity with each processor's dashboard.

**Q: Webhook not firing after payment**
A: Verify webhook URL is publicly accessible. Check webhook signature secret matches processor dashboard.

---

## Contributors

Built with:
- **viem** - Ethereum interactions
- **tRPC** - Type-safe API
- **Prisma** - Database ORM
- **Stripe SDK** - Payment processing
- **AES-256-GCM** - Encryption

---

**Last Updated**: 2026-01-10
**Backend Version**: v1.0.0
**Smart Contracts**: Base Sepolia Testnet
