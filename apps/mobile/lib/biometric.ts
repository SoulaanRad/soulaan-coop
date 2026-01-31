import { Platform } from 'react-native';
import { paymentConfirmationService } from './payment-confirmation-service';

// Only import on native platforms
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
if (Platform.OS !== 'web') {
  LocalAuthentication = require('expo-local-authentication');
}

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  // Not available on web
  if (Platform.OS === 'web' || !LocalAuthentication) {
    return false;
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Get the type of biometric authentication available
 */
export async function getBiometricType(): Promise<BiometricType> {
  if (Platform.OS === 'web' || !LocalAuthentication) {
    return 'none';
  }

  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    return 'none';
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return 'none';
  }
}

/**
 * Get a user-friendly name for the biometric type
 */
export async function getBiometricName(): Promise<string> {
  const type = await getBiometricType();

  switch (type) {
    case 'facial':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometrics';
  }
}

/**
 * Authenticate user with biometrics for payment confirmation
 */
export async function authenticateForPayment(amount: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // On web, show a confirmation modal
  if (Platform.OS === 'web' || !LocalAuthentication) {
    try {
      const confirmed = await paymentConfirmationService.confirm(amount);
      if (!confirmed) {
        return { success: false, error: 'Payment cancelled' };
      }
      return { success: true };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return { success: false, error: 'Confirmation failed' };
    }
  }

  try {
    const isAvailable = await isBiometricAvailable();

    if (!isAvailable) {
      // If biometrics not available, allow the payment (PIN would be separate)
      return { success: true };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Confirm payment of ${amount}`,
      fallbackLabel: 'Use Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Handle specific error types
    if (result.error === 'user_cancel') {
      return { success: false, error: 'Authentication cancelled' };
    }

    if (result.error === 'user_fallback') {
      // User chose to use passcode - device handles this
      return { success: false, error: 'Use device passcode' };
    }

    return { success: false, error: result.error || 'Authentication failed' };
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Quick check if device has any form of authentication
 */
export async function hasDeviceAuthentication(): Promise<boolean> {
  if (Platform.OS === 'web' || !LocalAuthentication) {
    return false;
  }

  try {
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    return securityLevel !== LocalAuthentication.SecurityLevel.NONE;
  } catch (error) {
    console.error('Error checking device authentication:', error);
    return false;
  }
}
