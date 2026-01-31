# Mobile App Authentication Guide

This document explains how authentication headers are set in the mobile app to access protected API endpoints.

## Overview

The mobile app uses the `x-wallet-address` header to authenticate requests to protected endpoints (those using `privateProcedure` in the backend).

## How It Works

### 1. Header Creation Helper

The `createApiHeaders()` function adds the wallet address to request headers:

```typescript
// In apps/mobile/lib/api.ts
export function createApiHeaders(walletAddress?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    ...networkConfig.defaultHeaders,
  };

  // Add wallet address header if provided (for privateProcedure endpoints)
  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress;
  }

  return headers;
}
```

### 2. Get Wallet Address from Auth Context

In your components, get the user's wallet address from `AuthContext`:

```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;

  // Use walletAddress in API calls...
}
```

## Protected Endpoints

### Onramp (Payment) Functions

All onramp functions now accept a `walletAddress` parameter:

#### Get Available Payment Processors

```typescript
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const { user } = useAuth();

// Get available payment processors
const processors = await api.getAvailableProcessors(user?.walletAddress);
```

#### Create Payment Intent

```typescript
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const { user } = useAuth();

try {
  // Create payment intent for $100 USD via Stripe
  const paymentIntent = await api.createPaymentIntent(
    100,                    // amountUSD
    user?.walletAddress,    // walletAddress for auth
    'stripe'                // processor (optional)
  );
  
  console.log('Payment Intent:', paymentIntent);
  // { paymentIntentId, clientSecret, processor, amountUSD, amountUC, transactionId }
} catch (error) {
  console.error('Payment failed:', error);
}
```

#### Get Transaction History

```typescript
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const { user } = useAuth();

try {
  // Get last 50 transactions
  const history = await api.getOnrampHistory(
    user?.walletAddress,  // walletAddress for auth
    50,                   // limit (default: 50)
    0                     // offset (default: 0)
  );
  
  console.log('Transaction History:', history);
} catch (error) {
  console.error('Failed to load history:', error);
}
```

#### Get Transaction Status

```typescript
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const { user } = useAuth();
const transactionId = 'txn_123...';

try {
  const status = await api.getOnrampStatus(
    transactionId,
    user?.walletAddress  // optional for status check
  );
  
  console.log('Transaction Status:', status);
} catch (error) {
  console.error('Failed to get status:', error);
}
```

## Complete Example: Buy UC Flow

```typescript
import { useState } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export function BuyUCScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuyUC = async (amountUSD: number) => {
    // Check if user has a wallet
    if (!user?.walletAddress) {
      setError('You need a wallet to buy UC. Please contact support.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Check available payment processors
      const { processors } = await api.getAvailableProcessors(user.walletAddress);
      console.log('Available processors:', processors);

      // 2. Create payment intent
      const paymentIntent = await api.createPaymentIntent(
        amountUSD,
        user.walletAddress,
        'stripe' // or let it choose automatically
      );

      console.log('Payment Intent created:', paymentIntent);

      // 3. Navigate to payment screen with the clientSecret
      // (You'd implement Stripe payment UI here)
      // navigation.navigate('Payment', { 
      //   clientSecret: paymentIntent.clientSecret 
      // });

      // 4. After payment, you can check status
      const status = await api.getOnrampStatus(
        paymentIntent.transactionId,
        user.walletAddress
      );

      console.log('Payment status:', status);

    } catch (err: any) {
      console.error('Buy UC failed:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>Buy Universal Credit (UC)</Text>
      
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Button title="Buy $50 UC" onPress={() => handleBuyUC(50)} />
          <Button title="Buy $100 UC" onPress={() => handleBuyUC(100)} />
          <Button title="Buy $250 UC" onPress={() => handleBuyUC(250)} />
        </>
      )}
    </View>
  );
}
```

## Error Handling

### No Wallet Address

If the user doesn't have a wallet address, protected endpoints will fail:

```typescript
const { user } = useAuth();

if (!user?.walletAddress) {
  // Show error: User needs a wallet
  // Options:
  // 1. Contact admin to create wallet
  // 2. Disable payment features
  console.error('User does not have a wallet');
  return;
}

// Safe to call protected endpoints
await api.createPaymentIntent(100, user.walletAddress);
```

### Authentication Errors

The backend will return specific errors if authentication fails:

- **401 UNAUTHORIZED**: No wallet address provided
- **400 BAD_REQUEST**: Invalid wallet address format
- **403 FORBIDDEN**: Wallet is not authorized (not an admin for admin endpoints)

```typescript
try {
  await api.createPaymentIntent(100, user?.walletAddress);
} catch (error: any) {
  if (error.message.includes('UNAUTHORIZED')) {
    // User needs to login again
  } else if (error.message.includes('BAD_REQUEST')) {
    // Invalid wallet address
  } else if (error.message.includes('FORBIDDEN')) {
    // User is not authorized for this action
  }
}
```

## Security Notes

1. ✅ **Wallet address is validated** on the backend (format check)
2. ✅ **Blockchain verification** for admin actions (checks on-chain roles)
3. ✅ **No private keys** are sent in headers (only public wallet address)
4. ⚠️ **User ownership** is assumed - the backend trusts that the logged-in user owns the wallet address in their profile

## Comparison: Web vs Mobile

| Aspect | Web App | Mobile App |
|--------|---------|------------|
| **Client** | tRPC React Query | Plain fetch() |
| **Auth Source** | `useAccount()` from wagmi | `useAuth()` context |
| **Header Setup** | Automatic in tRPC provider | Manual in API calls |
| **Wallet Address** | From connected Web3 wallet | From user profile in DB |

### Web App (Automatic)

```typescript
// apps/web/lib/trpc/provider.tsx
const { address } = useAccount(); // From connected wallet

api.createClient({
  links: [
    httpLink({
      headers() {
        return {
          'x-wallet-address': address || '', // Automatic
        };
      },
    }),
  ],
});
```

### Mobile App (Manual)

```typescript
// apps/mobile/lib/api.ts
const { user } = useAuth(); // From DB

await api.createPaymentIntent(
  100,
  user?.walletAddress  // Must pass explicitly
);
```

## Future Improvements

1. **Create tRPC client for mobile** - Use the same client as web for consistency
2. **Add wallet creation flow** - Allow users to create wallets in the mobile app
3. **Web3 wallet support** - Allow users to connect external wallets (MetaMask Mobile, WalletConnect)
4. **Automatic header injection** - Create a wrapper that automatically adds headers from AuthContext

## Troubleshooting

### "No wallet address provided" error

**Problem**: Calling protected endpoints without passing wallet address

**Solution**: Always get wallet address from AuthContext and pass it to API functions:

```typescript
const { user } = useAuth();
await api.createPaymentIntent(100, user?.walletAddress); // ✅ Correct
```

### "User does not have a wallet"

**Problem**: User's profile doesn't have a wallet address set

**Solution**: Contact admin to create a wallet or wait for wallet creation to be implemented

### Headers not being sent

**Problem**: Old code not using the updated API functions

**Solution**: Update all onramp function calls to include `walletAddress` parameter
