# Unity Coin Mobile App Implementation

## Overview
This document describes the mobile app implementation for Unity Coin (UC) wallet, transfers, and fiat onramp features.

---

## Mobile App Screens

### 1. Wallet Screen (`/app/(tabs)/wallet.tsx`)

**Purpose**: Display UC balance and wallet information

**Features**:
- ✅ Show UC balance with real-time updates
- ✅ Display wallet address (truncated)
- ✅ Quick action buttons: Buy UC, Send UC
- ✅ Navigation to transaction history
- ✅ Wallet export option (placeholder)
- ✅ Pull-to-refresh support
- ✅ Handles users without wallets gracefully

**API Calls**:
- `api.getWalletInfo(userId)` - Get wallet address and metadata
- `api.getUCBalance(walletAddress)` - Get current UC balance

**UI Components**:
- Gradient balance card showing UC amount
- Wallet address display with copy button
- Action buttons grid
- Quick actions list
- Wallet information section

---

### 2. Transfer Screen (`/app/(tabs)/transfer.tsx`)

**Purpose**: Send UC to other users

**Features**:
- ✅ Recipient selection via username or wallet address
- ✅ Real-time recipient validation
- ✅ Amount input with "Max" button
- ✅ Fee preview (0.1% transfer fee)
- ✅ Transfer confirmation dialog
- ✅ Balance checking
- ✅ Error handling and validation

**API Calls**:
- `api.getWalletInfo(userId)` - Get sender's wallet
- `api.getUCBalance(walletAddress)` - Get sender's balance
- `api.getUserByUsername(username)` - Find recipient by username
- `api.validateRecipient(address)` - Validate recipient address
- `api.executeTransfer(userId, recipient, amount)` - Execute transfer

**Workflow**:
1. User selects recipient method (username or address)
2. User enters recipient identifier
3. Click "Verify" to validate recipient
4. Enter transfer amount
5. Review fee breakdown
6. Confirm transfer
7. Backend signs and sends transaction
8. Display success with transaction hash

**Validation**:
- Recipient must be active SoulaaniCoin member
- Amount must be > 0 and <= balance
- Username must exist in database
- Address must be valid Ethereum address

---

### 3. Buy UC Screen (`/app/(tabs)/buy.tsx`)

**Purpose**: Purchase UC with fiat currency

**Features**:
- ✅ Payment processor selection (Stripe/PayPal/Square)
- ✅ Preset amount buttons ($25, $50, $100, $250)
- ✅ Custom amount input
- ✅ 1:1 UC preview (1 UC = 1 USD)
- ✅ Min/max limits ($10-$10,000)
- ✅ Payment processor availability check
- ⚠️ **Placeholder implementation** - needs payment SDK integration

**API Calls**:
- `api.getAvailableProcessors()` - Get working payment processors
- `api.createPaymentIntent(amountUSD, processor)` - Create payment intent

**Payment Flow** (To Be Implemented):

**Stripe Integration**:
```bash
npm install @stripe/stripe-react-native
npx pod-install  # iOS only
```

```typescript
import { useStripe } from '@stripe/stripe-react-native';

const { presentPaymentSheet } = useStripe();

// After creating payment intent
const { error } = await presentPaymentSheet({
  clientSecret: paymentIntent.clientSecret,
  merchantDisplayName: 'Soulaan Co-op',
});

if (!error) {
  // Payment successful - webhook will handle UC minting
}
```

**PayPal Integration**:
```bash
npm install react-native-paypal
```

**Square Integration**:
```bash
npm install react-native-square-in-app-payments
```

**Current State**: Shows payment intent creation and instructions for SDK integration

---

### 4. Transaction History Screen (`/app/(tabs)/history.tsx`)

**Purpose**: View all UC transfers

**Features**:
- ✅ List of sent/received transfers
- ✅ Transaction details (amount, counterparty, timestamp)
- ✅ Transaction hash and block number
- ✅ Color-coded sent (red) vs received (green)
- ✅ Pull-to-refresh support
- ✅ Empty state handling

**API Calls**:
- `api.getWalletInfo(userId)` - Get wallet address
- `api.getTransferHistory(walletAddress)` - Get transfers from blockchain

**Display Fields**:
- Transaction type (Sent/Received)
- Counterparty address (truncated)
- Amount with +/- indicator
- Timestamp (formatted)
- Transaction hash (truncated)
- Block number

**Data Source**: Blockchain (Base Sepolia) via Transfer events - no database storage

---

## API Integration

All UC-related API functions added to `/apps/mobile/lib/api.ts`:

### Wallet Functions:
```typescript
api.getWalletInfo(userId: string)
api.getUCBalance(walletAddress: string)
```

### Transfer Functions:
```typescript
api.validateRecipient(recipientAddress: string)
api.getUserByUsername(username: string)
api.executeTransfer(userId: string, recipientAddress: string, amount: string)
api.getTransferHistory(walletAddress: string, limit?: number)
```

### Onramp Functions:
```typescript
api.getAvailableProcessors()
api.createPaymentIntent(amountUSD: number, processor?: 'stripe' | 'paypal' | 'square')
api.getOnrampHistory(limit?: number, offset?: number)
api.getOnrampStatus(transactionId: string)
```

---

## Tab Navigation

Updated `/app/(tabs)/_layout.tsx` with 6 tabs:

1. **Home** - Original home screen
2. **Wallet** - UC balance and wallet info
3. **Send** - Transfer UC to others
4. **Buy UC** - Fiat onramp
5. **History** - Transaction history
6. **More** - Original explore screen

Icons use SF Symbols:
- Wallet: `creditcard.fill`
- Send: `arrow.up.circle.fill`
- Buy: `cart.fill`
- History: `clock.fill`

---

## User Experience Flow

### First-Time User (No Wallet):
1. User signs up
2. Admin approves application
3. **Wallet automatically created** (backend)
4. User sees wallet screen with new address and 0 UC balance
5. User can buy UC via fiat onramp
6. User can send/receive UC

### Existing User:
1. Open app → Navigate to Wallet tab
2. See current UC balance
3. Options:
   - Buy more UC (Buy UC tab)
   - Send UC (Send tab)
   - View history (History tab)
   - Export private key (future)

### Transfer Flow:
1. Navigate to Send tab
2. Choose recipient method (username or address)
3. Enter recipient identifier
4. Click "Verify" to validate
5. Enter amount
6. Review fee (0.1% + gas)
7. Confirm
8. Transaction sent (backend signs)
9. Navigate to History to view confirmation

### Buy UC Flow (When SDKs Installed):
1. Navigate to Buy UC tab
2. Select payment processor (Stripe/PayPal/Square)
3. Enter amount ($10-$10,000)
4. Click "Buy UC"
5. Payment processor UI appears
6. Complete payment
7. Webhook processes payment
8. UC minted to wallet
9. Balance updates

---

## Next Steps for Full Implementation

### 1. Install Payment SDKs

```bash
cd apps/mobile

# Stripe (Primary)
npm install @stripe/stripe-react-native

# PayPal (Optional Fallback)
npm install react-native-paypal

# Square (Optional Fallback)
npm install react-native-square-in-app-payments

# iOS dependencies
npx pod-install
```

### 2. Configure Payment Providers

**Update `/apps/mobile/app/_layout.tsx`**:
```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      {/* existing providers */}
    </StripeProvider>
  );
}
```

**Add to `.env`**:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_PAYPAL_CLIENT_ID=...
EXPO_PUBLIC_SQUARE_APP_ID=...
```

### 3. Implement Payment UI

**Update `/apps/mobile/app/(tabs)/buy.tsx`**:

Replace the `handleBuyUC` function with actual payment SDK integration:

```typescript
import { useStripe } from '@stripe/stripe-react-native';

const { presentPaymentSheet, initPaymentSheet } = useStripe();

const handleBuyUC = async () => {
  // ... validation code ...

  try {
    // Create payment intent
    const paymentIntent = await api.createPaymentIntent(amountUSD, selectedProcessor);

    if (selectedProcessor === 'stripe') {
      // Initialize Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Soulaan Co-op',
        paymentIntentClientSecret: paymentIntent.clientSecret,
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert('Payment Failed', paymentError.message);
        return;
      }

      // Payment successful
      Alert.alert(
        'Success',
        `Payment confirmed! Your UC will be minted shortly.`,
        [
          { text: 'View History', onPress: () => router.push('/(tabs)/history') },
          { text: 'OK' },
        ]
      );

      // Refresh wallet balance
      loadWalletData();
    }
    // Add PayPal/Square flows similarly
  } catch (err) {
    Alert.alert('Error', err instanceof Error ? err.message : 'Payment failed');
  }
};
```

### 4. Add QR Code Scanning

For address-based transfers, add QR code scanner:

```bash
npm install expo-camera expo-barcode-scanner
```

**Create `/components/QRScanner.tsx`**:
```typescript
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';

export function QRScanner({ onScan }) {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  return (
    <Camera
      onBarCodeScanned={({ data }) => onScan(data)}
      style={{ flex: 1 }}
    />
  );
}
```

### 5. Implement Wallet Export

**Create `/apps/mobile/app/export-wallet.tsx`**:
```typescript
export default function ExportWalletScreen() {
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  const handleExport = async () => {
    // Re-authenticate with password
    const wallet = await api.exportWallet(userId, password);
    setPrivateKey(wallet.privateKey);

    // Show warning
    Alert.alert(
      'Security Warning',
      wallet.warning,
      [{ text: 'I Understand' }]
    );
  };

  return (
    // Password input → Export button → Display private key with QR code
  );
}
```

### 6. Add Authentication Context

Replace hardcoded `userId` with actual auth:

**Create `/contexts/AuthContext.tsx`**:
```typescript
export const AuthContext = createContext({
  userId: null,
  isAuthenticated: false,
  login: async (email, password) => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
```

**Update screens**:
```typescript
const { userId } = useAuth();
```

### 7. Add Polling for Onramp Status

After payment completion, poll for UC minting:

```typescript
const pollOnrampStatus = async (transactionId: string) => {
  const interval = setInterval(async () => {
    const status = await api.getOnrampStatus(transactionId);

    if (status.status === 'COMPLETED') {
      clearInterval(interval);
      Alert.alert('UC Received!', `${status.amountUC} UC has been added to your wallet`);
      loadWalletData(); // Refresh balance
    } else if (status.status === 'FAILED') {
      clearInterval(interval);
      Alert.alert('Payment Failed', status.failureReason || 'Unknown error');
    }
  }, 3000); // Poll every 3 seconds

  // Stop polling after 5 minutes
  setTimeout(() => clearInterval(interval), 300000);
};
```

---

## Testing Checklist

### Wallet Screen:
- [ ] Displays balance correctly
- [ ] Shows wallet address
- [ ] Handles users without wallets
- [ ] Pull-to-refresh updates balance
- [ ] Navigation to other screens works

### Transfer Screen:
- [ ] Username validation works
- [ ] Address validation works
- [ ] Cannot send more than balance
- [ ] Fee calculation correct (0.1%)
- [ ] Transfer confirmation dialog shows
- [ ] Successful transfer updates balance
- [ ] Error handling works

### Buy UC Screen:
- [ ] Payment processor selection works
- [ ] Preset amounts populate input
- [ ] Custom amount input works
- [ ] Min/max validation ($10-$10,000)
- [ ] UC preview calculation correct (1:1)
- [ ] Payment SDK launches (when installed)

### Transaction History:
- [ ] Shows sent transactions (red, negative)
- [ ] Shows received transactions (green, positive)
- [ ] Timestamps formatted correctly
- [ ] Transaction hashes clickable (future: open Basescan)
- [ ] Pull-to-refresh updates list
- [ ] Empty state displays when no transactions

---

## Security Considerations

### ✅ Implemented:
- Backend wallet signing (users don't handle private keys)
- Password re-authentication for wallet export
- Recipient validation before transfers
- Balance checking before transfers
- Webhook signature verification (backend)

### ⚠️ TODO:
- Rate limiting on transfer UI (prevent spam)
- Biometric authentication for transfers
- Session timeout
- Secure storage for auth tokens
- Audit logging for wallet exports

---

## Performance Optimizations

### Current:
- Pull-to-refresh for manual updates
- Basic error handling and loading states

### Recommended:
- React Query for caching balance/history
- Optimistic UI updates for transfers
- Background balance polling
- WebSocket connection for real-time updates
- Image caching for QR codes

---

## Accessibility

### Implemented:
- Semantic HTML/React Native components
- Color contrast for text
- Touch target sizes (44x44 minimum)

### TODO:
- Screen reader labels
- Haptic feedback on actions
- Voice-over support
- Dynamic text sizing

---

## Known Limitations

1. **Payment SDK Integration**: Placeholder implementation - requires manual SDK setup
2. **User Authentication**: Uses hardcoded `userId` - needs proper auth context
3. **QR Code Scanner**: Not implemented - needs expo-camera integration
4. **Wallet Export**: UI not created - needs password re-auth flow
5. **Real-time Updates**: Uses pull-to-refresh - could add WebSocket
6. **Transaction Confirmation**: No status polling - needs periodic checks
7. **Error Recovery**: Basic error handling - could add retry logic
8. **Offline Support**: No offline mode - all features require network

---

## File Structure

```
apps/mobile/
├── app/
│   └── (tabs)/
│       ├── wallet.tsx        ✅ UC balance & wallet info
│       ├── transfer.tsx      ✅ Send UC to others
│       ├── buy.tsx           ⚠️ Buy UC (needs SDK integration)
│       ├── history.tsx       ✅ Transaction history
│       └── _layout.tsx       ✅ Tab navigation
├── lib/
│   └── api.ts                ✅ UC API functions added
└── components/
    └── QRScanner.tsx         ❌ Not created yet
```

---

## Dependencies

### Already Installed:
- ✅ expo
- ✅ expo-router
- ✅ react-native
- ✅ @tanstack/react-query

### Need to Install:
- ❌ @stripe/stripe-react-native
- ❌ react-native-paypal
- ❌ react-native-square-in-app-payments
- ❌ expo-camera (for QR scanner)
- ❌ expo-barcode-scanner (for QR scanner)
- ❌ react-native-qrcode-svg (for displaying QR codes)

---

## Deployment Notes

### iOS:
1. Install payment SDKs
2. Run `npx pod-install`
3. Add camera permissions to `Info.plist`
4. Test on physical device (payment SDKs may not work in simulator)

### Android:
1. Install payment SDKs
2. Add camera permissions to `AndroidManifest.xml`
3. Test on physical device

### Environment Variables:
```bash
# .env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_PAYPAL_CLIENT_ID=...
EXPO_PUBLIC_SQUARE_APP_ID=...
```

---

**Last Updated**: 2026-01-10
**Status**: Core UI Complete, Payment SDKs Pending
**Next Priority**: Install payment processor SDKs and implement actual payment flows
