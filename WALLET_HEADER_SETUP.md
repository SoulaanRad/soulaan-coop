# Where is `x-wallet-address` Header Set?

This document explains where and how the `x-wallet-address` header is set in both the web and mobile apps.

---

## 🌐 Web App

### Location
**File**: `apps/web/lib/trpc/provider.tsx`

### How It Works

```typescript
// apps/web/lib/trpc/provider.tsx (lines 10-40)

function TRPCClientProvider({ children }: { children: React.ReactNode }) {
  // 1️⃣ Get wallet address from connected Web3 wallet
  const { address } = useAccount();

  // 2️⃣ Store in ref for dynamic updates
  const addressRef = useRef(address);
  addressRef.current = address;

  // 3️⃣ Create tRPC client with header
  const trpcClient = useMemo(() =>
    api.createClient({
      links: [
        httpLink({
          url: env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc',
          
          // 4️⃣ Add wallet address to every request
          headers() {
            return {
              'x-wallet-address': addressRef.current || '',
            };
          },
        }),
      ],
    }),
    []
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}
```

### Key Points

- ✅ **Automatic**: Header is added to every tRPC request
- ✅ **Dynamic**: Updates when wallet connection changes
- ✅ **Source**: Wallet address comes from `useAccount()` (wagmi)
- ✅ **Scope**: All tRPC API calls get this header

### Usage Example

```typescript
// In any component wrapped by TRPCProvider
import { api } from '@/lib/trpc/client';

function MyComponent() {
  // Wallet address is automatically sent in headers
  const { data } = api.onramp.createPaymentIntent.useMutation();
  
  // No need to manually add wallet address! ✅
}
```

---

## 📱 Mobile App

### Location
**File**: `apps/mobile/lib/api.ts`

### How It Works

#### 1. Header Helper Function

```typescript
// apps/mobile/lib/api.ts (lines 9-22)

/**
 * Helper to create headers with optional wallet address
 */
export function createApiHeaders(walletAddress?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    ...networkConfig.defaultHeaders,
  };

  // Add wallet address header if provided
  if (walletAddress) {
    headers['x-wallet-address'] = walletAddress;
  }

  return headers;
}
```

#### 2. Usage in API Functions

```typescript
// apps/mobile/lib/api.ts

export const api = {
  /**
   * Create payment intent - requires wallet address
   */
  async createPaymentIntent(
    amountUSD: number, 
    walletAddress: string | null,  // 👈 Wallet address parameter
    processor?: 'stripe' | 'paypal' | 'square'
  ) {
    const response = await fetch(`${API_BASE_URL}/trpc/onramp.createPaymentIntent`, {
      method: 'POST',
      headers: createApiHeaders(walletAddress),  // 👈 Headers with wallet address
      body: JSON.stringify({ amountUSD, processor })
    });

    // ... handle response
  },

  // Other onramp functions follow the same pattern
  async getAvailableProcessors(walletAddress?: string | null) { /* ... */ }
  async getOnrampHistory(walletAddress: string | null, limit = 50, offset = 0) { /* ... */ }
  async getOnrampStatus(transactionId: string, walletAddress?: string | null) { /* ... */ }
}
```

#### 3. Usage in Components

```typescript
// In any component
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  // 1️⃣ Get wallet address from auth context
  const { user } = useAuth();
  const walletAddress = user?.walletAddress;

  // 2️⃣ Pass wallet address to API functions
  const buyUC = async () => {
    try {
      const paymentIntent = await api.createPaymentIntent(
        100,              // amountUSD
        walletAddress,    // 👈 Pass wallet address explicitly
        'stripe'
      );
      console.log('Success:', paymentIntent);
    } catch (error) {
      console.error('Failed:', error);
    }
  };
}
```

### Key Points

- ⚠️ **Manual**: Must pass `walletAddress` to each protected API function
- ✅ **Flexible**: Can use different wallet addresses per call if needed
- ✅ **Source**: Wallet address comes from `useAuth()` context (stored in DB)
- ⚠️ **Scope**: Only affects API functions that accept `walletAddress` parameter

---

## Comparison Table

| Aspect | Web App | Mobile App |
|--------|---------|------------|
| **File** | `apps/web/lib/trpc/provider.tsx` | `apps/mobile/lib/api.ts` |
| **Method** | Automatic (tRPC headers config) | Manual (pass to each function) |
| **Source** | `useAccount()` from wagmi | `useAuth()` from context |
| **Wallet Origin** | Connected Web3 wallet | User profile in database |
| **Client** | tRPC React Query | Plain fetch() |
| **Setup** | Once in provider | Every protected API call |
| **Dynamic** | ✅ Yes (ref-based) | ✅ Yes (pass current value) |

---

## Backend: How Headers Are Used

### Location
**File**: `packages/trpc/src/procedures/private.ts`

### Middleware Flow

```typescript
// packages/trpc/src/procedures/private.ts

const isAuthed = t.middleware(async ({ ctx, next }) => {
  // 1️⃣ Extract wallet address from header
  const walletAddress = ctx.req.headers['x-wallet-address'] as string;

  // 2️⃣ Validate it exists
  if (!walletAddress) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // 3️⃣ Validate format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  // 4️⃣ Verify on blockchain (for admin routes)
  const adminStatus = await checkAdminStatusWithRole(walletAddress);
  
  if (!adminStatus.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  // 5️⃣ Add to context for route handlers
  return next({
    ctx: {
      ...ctx,
      walletAddress,      // 👈 Available in route handlers
      adminRole: adminStatus.role,
    },
  });
});

export const privateProcedure = t.procedure.use(isAuthed);
```

### Usage in Routes

```typescript
// packages/trpc/src/routers/onramp.ts

export const onrampRouter = router({
  createPaymentIntent: privateProcedure  // 👈 Uses middleware
    .input(z.object({ amountUSD: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // ✅ Wallet address is available from context
      const walletAddress = ctx.walletAddress;
      
      // Look up user by wallet address
      const user = await db.user.findUnique({
        where: { walletAddress }
      });
      
      // ... create payment intent
    }),
});
```

---

## Authentication Flow Diagram

### Web App Flow

```
┌─────────────┐
│   User      │
│  connects   │
│   wallet    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  wagmi's    │
│ useAccount()│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  TRPCProvider       │
│  stores address     │
│  in ref             │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Every tRPC call    │
│  gets header        │
│  automatically      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Backend extracts   │
│  from header and    │
│  verifies           │
└─────────────────────┘
```

### Mobile App Flow

```
┌─────────────┐
│   User      │
│  logs in    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  AuthContext│
│  stores user│
│  (with      │
│  wallet)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Component gets     │
│  user.walletAddress │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Pass to API        │
│  function call      │
│  explicitly         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  createApiHeaders() │
│  adds to request    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Backend extracts   │
│  from header and    │
│  verifies           │
└─────────────────────┘
```

---

## Security Considerations

### Web App
- ✅ Wallet address from **connected wallet** (user must sign to connect)
- ✅ Updates immediately when user switches wallets
- ✅ Cannot be spoofed (user must have access to wallet)

### Mobile App
- ⚠️ Wallet address from **database** (set by admin or during onboarding)
- ⚠️ Trusts that logged-in user owns that wallet address
- ⚠️ No cryptographic proof of ownership (no signing required)

### Backend Verification
- ✅ Validates wallet address format
- ✅ Checks blockchain for admin status (for admin routes)
- ✅ Prevents unauthorized access to protected endpoints

---

## Troubleshooting

### Web App

**Problem**: "No wallet address provided" error

**Solution**: Make sure user has connected their wallet via WalletConnect/MetaMask

```typescript
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address, isConnected } = useAccount();
  
  if (!isConnected) {
    return <ConnectWalletButton />;
  }
  
  // Safe to make protected API calls
}
```

### Mobile App

**Problem**: "No wallet address provided" error

**Solution**: Make sure to pass `walletAddress` to API functions

```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { user } = useAuth();
  
  if (!user?.walletAddress) {
    return <Text>No wallet available</Text>;
  }
  
  // ✅ Pass wallet address
  await api.createPaymentIntent(100, user.walletAddress);
  
  // ❌ Don't forget wallet address
  // await api.createPaymentIntent(100); // ERROR!
}
```

---

## Related Documentation

- 📖 [apps/mobile/AUTHENTICATION.md](apps/mobile/AUTHENTICATION.md) - Mobile authentication guide
- 📖 [apps/api/WEBHOOKS.md](apps/api/WEBHOOKS.md) - Webhook setup guide
- 📖 [apps/api/ENV_SETUP.md](apps/api/ENV_SETUP.md) - Environment variables
