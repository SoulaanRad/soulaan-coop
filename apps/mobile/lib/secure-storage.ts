import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage utility using Expo SecureStore
 * Data is encrypted and stored in the device's secure storage (Keychain on iOS, EncryptedSharedPreferences on Android)
 */

const STORAGE_KEYS = {
  USER: '@soulaan:user',
  LOGIN_TIME: '@soulaan:loginTime',
} as const;

export const secureStorage = {
  /**
   * Store a value securely
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw new Error('Failed to store data securely');
    }
  },

  /**
   * Retrieve a value from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      return null;
    }
  },

  /**
   * Remove a value from secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing secure data:', error);
      throw new Error('Failed to remove data');
    }
  },

  /**
   * Clear all authentication data
   */
  async clear(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.USER),
        SecureStore.deleteItemAsync(STORAGE_KEYS.LOGIN_TIME),
      ]);
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      throw new Error('Failed to clear storage');
    }
  },

  /**
   * Get storage keys
   */
  keys: STORAGE_KEYS,
};
