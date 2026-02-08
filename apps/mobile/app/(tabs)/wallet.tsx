import { View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Send, QrCode, History, Key, Copy, Check, Plus, Package } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export default function WalletScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [balance, setBalance] = useState<string>('$0.00');
  const [balanceNum, setBalanceNum] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadWalletData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const wallet = await api.getWalletInfo(user.id);
      setWalletInfo(wallet);

      if (wallet.hasWallet && wallet.address) {
        const balanceData = await api.getUSDBalance(user.id, wallet.address);
        setBalance(balanceData.formatted);
        setBalanceNum(balanceData.balance || 0);
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

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

  const handleCopyAddress = async () => {
    if (!walletInfo?.address) return;
    await Clipboard.setStringAsync(walletInfo.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#FFFBEB' }}>
        <ActivityIndicator size="large" color="#B45309" />
        <Text className="mt-4 text-gray-600">Loading wallet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#FFFBEB' }}>
        <Text className="text-lg text-red-600 mb-4">Error</Text>
        <Text className="text-center text-gray-600 mb-6">{error}</Text>
        <TouchableOpacity
          onPress={loadWalletData}
          className="bg-amber-600 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!walletInfo?.hasWallet) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: '#FFFBEB' }}>
        <Text className="text-xl font-bold text-gray-900 mb-4">No Wallet Yet</Text>
        <Text className="text-center text-gray-600 mb-6">
          Your wallet will be created automatically when your application is approved.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#FFFBEB' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B45309" />
      }
    >
      {/* Header */}
      <View className="px-4 pt-14 pb-2">
        <Text className="text-xl font-bold text-gray-800">Wallet</Text>
      </View>

      {/* Balance Card */}
      <View
        className="mx-4 mt-2 p-6 rounded-2xl"
        style={{ backgroundColor: '#DC2626' }}
      >
        <Text className="text-white/80 text-sm font-medium mb-1">Available Balance</Text>
        <Text className="text-white text-4xl font-bold mb-4">{balance}</Text>
        <TouchableOpacity
          onPress={handleCopyAddress}
          className="bg-white/20 rounded-xl p-3 flex-row items-center justify-between"
          activeOpacity={0.7}
        >
          <View>
            <Text className="text-white/70 text-xs mb-1">Wallet Address</Text>
            <Text className="text-white font-mono">{truncateAddress(walletInfo.address)}</Text>
          </View>
          {copied ? (
            <Check size={18} color="white" />
          ) : (
            <Copy size={18} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View className="mx-4 mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.push('/(authenticated)/fund-wallet')}
          className="flex-1 bg-green-600 py-4 rounded-xl items-center flex-row justify-center"
          activeOpacity={0.8}
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Add Money</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(authenticated)/pay')}
          className="flex-1 bg-amber-600 py-4 rounded-xl items-center flex-row justify-center"
          activeOpacity={0.8}
        >
          <Send size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Send</Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-3">
        <TouchableOpacity
          onPress={() => router.push('/(authenticated)/scan-pay')}
          className="bg-white border border-amber-200 py-4 rounded-xl items-center flex-row justify-center"
          activeOpacity={0.8}
        >
          <QrCode size={18} color="#B45309" />
          <Text className="text-amber-700 font-semibold ml-2">Scan QR to Pay</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View className="mx-4 mt-6 bg-white rounded-2xl border border-amber-100 overflow-hidden">
        <TouchableOpacity
          onPress={() => router.push('/(authenticated)/history')}
          className="p-4 flex-row items-center border-b border-gray-100"
          activeOpacity={0.7}
        >
          <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
            <History size={20} color="#B45309" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold">Transaction History</Text>
            <Text className="text-gray-500 text-sm">View all your transfers</Text>
          </View>
          <Text className="text-gray-400 text-xl">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(authenticated)/orders')}
          className="p-4 flex-row items-center border-b border-gray-100"
          activeOpacity={0.7}
        >
          <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
            <Package size={20} color="#7C3AED" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold">Order History</Text>
            <Text className="text-gray-500 text-sm">View your store purchases</Text>
          </View>
          <Text className="text-gray-400 text-xl">›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/export-wallet' as any)}
          className="p-4 flex-row items-center"
          activeOpacity={0.7}
        >
          <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
            <Key size={20} color="#B45309" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold">Export Wallet</Text>
            <Text className="text-gray-500 text-sm">Backup your private key</Text>
          </View>
          <Text className="text-gray-400 text-xl">›</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Info */}
      <View className="mx-4 mt-4 mb-8 bg-white rounded-2xl border border-amber-100 p-4">
        <Text className="text-gray-900 font-semibold mb-4">Wallet Details</Text>

        <View className="mb-4">
          <Text className="text-gray-500 text-xs mb-1">Full Address</Text>
          <Text className="text-gray-900 font-mono text-sm" selectable>{walletInfo.address}</Text>
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
