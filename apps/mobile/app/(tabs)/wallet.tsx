import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { api } from '~/lib/api';

export default function WalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);

  // TODO: Get from auth context
  const userId = 'PLACEHOLDER_USER_ID';

  const loadWalletData = useCallback(async () => {
    try {
      setError(null);

      // Get wallet info
      const wallet = await api.getWalletInfo(userId);
      setWalletInfo(wallet);

      // If user has a wallet, get balance
      if (wallet.hasWallet && wallet.address) {
        const balanceData = await api.getUCBalance(wallet.address);
        setBalance(balanceData.balanceFormatted);
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWalletData();
  }, [loadWalletData]);

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-600">Loading wallet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg text-red-600 mb-4">Error</Text>
        <Text className="text-center text-gray-600 mb-6">{error}</Text>
        <TouchableOpacity
          onPress={loadWalletData}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!walletInfo?.hasWallet) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-xl font-bold text-gray-900 mb-4">No Wallet Yet</Text>
        <Text className="text-center text-gray-600 mb-6">
          Your wallet will be created automatically when your application is approved.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Balance Card */}
      <View className="bg-gradient-to-br from-blue-600 to-purple-600 mx-4 mt-6 p-6 rounded-2xl shadow-lg">
        <Text className="text-white text-sm font-medium mb-2">Unity Coin Balance</Text>
        <Text className="text-white text-4xl font-bold mb-4">{balance} UC</Text>
        <View className="bg-white/20 rounded-lg p-3">
          <Text className="text-white/80 text-xs mb-1">Wallet Address</Text>
          <Text className="text-white font-mono text-sm">{truncateAddress(walletInfo.address)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="mx-4 mt-6 flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/buy')}
          className="flex-1 bg-green-600 py-4 rounded-xl items-center shadow-md"
        >
          <Text className="text-white font-semibold text-base">Buy UC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/transfer')}
          className="flex-1 bg-blue-600 py-4 rounded-xl items-center shadow-md"
        >
          <Text className="text-white font-semibold text-base">Send UC</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View className="mx-4 mt-6 bg-white rounded-xl shadow-sm">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/history')}
          className="p-4 border-b border-gray-100 flex-row justify-between items-center"
        >
          <View>
            <Text className="text-gray-900 font-semibold">Transaction History</Text>
            <Text className="text-gray-500 text-sm">View all your transfers</Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/export-wallet')}
          className="p-4 flex-row justify-between items-center"
        >
          <View>
            <Text className="text-gray-900 font-semibold">Export Wallet</Text>
            <Text className="text-gray-500 text-sm">Backup your private key</Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Info */}
      <View className="mx-4 mt-6 mb-8 bg-white rounded-xl shadow-sm p-4">
        <Text className="text-gray-900 font-semibold mb-3">Wallet Information</Text>

        <View className="mb-3">
          <Text className="text-gray-500 text-xs mb-1">Full Address</Text>
          <Text className="text-gray-900 font-mono text-sm">{walletInfo.address}</Text>
        </View>

        {walletInfo.walletCreatedAt && (
          <View>
            <Text className="text-gray-500 text-xs mb-1">Created</Text>
            <Text className="text-gray-900 text-sm">
              {new Date(walletInfo.walletCreatedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
