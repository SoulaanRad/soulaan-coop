# Payment Confirmation Modal

This guide explains how the payment confirmation modal works in the mobile app.

## Overview

The app now uses a custom modal for payment confirmations instead of `window.confirm()` on web platform. This provides a better user experience with native-looking UI.

## Architecture

### 1. **Modal Component**
`components/payment-confirmation-modal.tsx`

A React Native modal component that displays the payment amount and confirmation buttons.

### 2. **Service Layer**
`lib/payment-confirmation-service.ts`

A global service that allows non-React code (like utility functions) to trigger the modal.

### 3. **Provider Component**
`components/payment-confirmation-provider.tsx`

A React provider that wraps the app and manages the modal state.

### 4. **Biometric Utility**
`lib/biometric.ts`

Uses the payment confirmation service when biometrics are not available or on web platform.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  User initiates payment                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  authenticateForPayment(amount) called                       │
│  (from biometric.ts)                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──── Native (iOS/Android) ────┐
                  │                               │
                  │                               ▼
                  │                    ┌──────────────────────┐
                  │                    │  Biometric prompt    │
                  │                    │  (Face ID/Touch ID)  │
                  │                    └──────────────────────┘
                  │
                  └──── Web Platform ────────┐
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │  paymentConfirmationService  │
                              │  .confirm(amount)            │
                              └──────────┬───────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────────┐
                              │  PaymentConfirmationProvider │
                              │  shows modal                 │
                              └──────────┬───────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────────┐
                              │  PaymentConfirmationModal    │
                              │  (user clicks Confirm/Cancel)│
                              └──────────┬───────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────────┐
                              │  Promise resolves            │
                              │  true/false                  │
                              └──────────────────────────────┘
```

## Usage Example

### In a Payment Screen

```typescript
import { authenticateForPayment } from '@/lib/biometric';

function PaymentScreen() {
  const handlePayment = async () => {
    try {
      // This will show biometrics on native, modal on web
      const result = await authenticateForPayment('$50.00');
      
      if (result.success) {
        // Process payment
        console.log('Payment confirmed!');
        await processPayment();
      } else {
        // Handle cancellation
        console.log('Payment cancelled:', result.error);
        alert(result.error || 'Payment cancelled');
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <View>
      <Button title="Pay $50.00" onPress={handlePayment} />
    </View>
  );
}
```

### Direct Service Usage (Advanced)

If you need to show a confirmation modal without the biometric flow:

```typescript
import { paymentConfirmationService } from '@/lib/payment-confirmation-service';

async function confirmAction() {
  const confirmed = await paymentConfirmationService.confirm('$100.00');
  
  if (confirmed) {
    console.log('User confirmed!');
  } else {
    console.log('User cancelled');
  }
}
```

## Customization

### Styling the Modal

Edit `components/payment-confirmation-modal.tsx`:

```typescript
const styles = StyleSheet.create({
  // ... existing styles
  
  confirmButton: {
    backgroundColor: '#3b82f6', // Change button color
  },
  amount: {
    fontSize: 32, // Change amount text size
    color: '#3b82f6', // Change amount color
  },
  // ... other styles
});
```

### Changing Button Text

In `components/payment-confirmation-modal.tsx`:

```typescript
<TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
  <Text style={styles.cancelButtonText}>Cancel</Text> // Change text here
</TouchableOpacity>

<TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
  <Text style={styles.confirmButtonText}>Confirm</Text> // Change text here
</TouchableOpacity>
```

### Adding Animation

The modal already uses `animationType="fade"`. You can change it to:

```typescript
<Modal
  visible={visible}
  transparent
  animationType="slide" // or "none"
  onRequestClose={onCancel}
>
```

## Platform-Specific Behavior

| Platform | Behavior |
|----------|----------|
| **iOS** | Shows Face ID or Touch ID biometric prompt |
| **Android** | Shows fingerprint or face recognition prompt |
| **Web** | Shows custom payment confirmation modal |

## Provider Setup

The provider is already added to your app in `app/_layout.tsx`:

```typescript
<QueryClientProvider client={queryClient}>
  <StripeWrapper>
    <AuthProvider>
      <PaymentConfirmationProvider> {/* ✅ Added here */}
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
          </Stack>
        </ThemeProvider>
      </PaymentConfirmationProvider>
    </AuthProvider>
  </StripeWrapper>
</QueryClientProvider>
```

## Troubleshooting

### Modal not showing

**Problem**: Payment confirmation modal doesn't appear on web

**Solution**: Make sure `PaymentConfirmationProvider` is wrapping your app in `_layout.tsx`

### Multiple modals showing

**Problem**: Multiple confirmation modals appear at once

**Solution**: The service ensures only one modal at a time. If you see multiples, check if you're calling `confirm()` multiple times rapidly.

### Modal stuck open

**Problem**: Modal won't close after clicking confirm/cancel

**Solution**: Check console for errors. The promise should always resolve. Try reloading the app.

### Biometrics not working on native

**Problem**: Modal shows on native instead of Face ID/Touch ID

**Solution**: Check if:
1. Device has biometrics enrolled
2. `expo-local-authentication` is installed
3. App has permission to use biometrics

## Testing

### Test on Web
```bash
pnpm --filter @soulaan-coop/mobile web
```

Click any payment button - you should see the custom modal instead of browser confirm dialog.

### Test on iOS Simulator
```bash
pnpm --filter @soulaan-coop/mobile ios
```

Enable Face ID: **Features → Face ID → Enrolled**

### Test on Android Emulator
```bash
pnpm --filter @soulaan-coop/mobile android
```

Enable fingerprint: **Settings → Security → Fingerprint**

## Related Files

- `apps/mobile/components/payment-confirmation-modal.tsx` - Modal UI component
- `apps/mobile/components/payment-confirmation-provider.tsx` - Provider that manages modal state
- `apps/mobile/lib/payment-confirmation-service.ts` - Global service for triggering modals
- `apps/mobile/lib/biometric.ts` - Biometric authentication utility that uses the modal
- `apps/mobile/app/_layout.tsx` - Root layout with provider setup

## Future Enhancements

Potential improvements:

1. **Dark mode support** - Detect and style modal for dark mode
2. **Custom animations** - Add slide-up or scale animations
3. **Sound effects** - Play confirmation sound on success
4. **Haptic feedback** - Vibrate on button press
5. **Accessibility** - Improve screen reader support
6. **PIN fallback** - Add PIN entry when biometrics fail
7. **Multiple currencies** - Support different currency formats
