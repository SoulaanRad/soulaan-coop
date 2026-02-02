import React, { useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Landmark, ArrowDownLeft, ArrowUpRight, Clock, Wallet, Copy, Check, Plus, Star, ShieldCheck, Store, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { coopConfig } from '@/lib/coop-config';

/**
 * Truncate wallet address for display
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const config = coopConfig();
  const [balance, setBalance] = useState<number>(0);
  const [balanceFormatted, setBalanceFormatted] = useState<string>('$0.00');
  const [scBalance, setScBalance] = useState<string>('0');
  const [ucBalance, setUcBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(user?.walletAddress || null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      // First get wallet info to ensure we have the latest address
      const walletResult = await api.getWalletInfo(user.id, user.walletAddress);
      let currentWalletAddress = user.walletAddress;

      // If user has a wallet but our session doesn't have it, update the address
      if (walletResult?.hasWallet && walletResult?.address) {
        setWalletAddress(walletResult.address);
        currentWalletAddress = walletResult.address;
      }

      // Fetch balance first (critical)
      const balanceResult = await api.getUSDBalance(user.id, currentWalletAddress);
      console.log('Balance result:', balanceResult);
      setBalance(balanceResult.balance);
      setBalanceFormatted(balanceResult.formatted);

      // Fetch history separately so it doesn't block balance display
      try {
        const historyResult = await api.getP2PHistory(user.id, 5, 0, currentWalletAddress);
        setRecentTransactions(historyResult.transfers);
      } catch (historyErr) {
        console.error('Error loading history:', historyErr);
        // Don't fail the whole load if history fails
      }

      // Fetch featured products
      try {
        const featuredResult = await api.getFeaturedProducts(6);
        setFeaturedProducts(featuredResult);
      } catch (featuredErr) {
        console.error('Error loading featured products:', featuredErr);
      }

      // Fetch token balances (SC and UC)
      if (currentWalletAddress) {
        try {
          const tokenBalances = await api.getTokenBalances(currentWalletAddress);
          setScBalance(tokenBalances.sc);
          setUcBalance(tokenBalances.uc);
        } catch (tokenErr) {
          console.error('Error loading token balances:', tokenErr);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user?.id]);

  const handleCreateWallet = async () => {
    if (!user?.id) return;
    setIsCreatingWallet(true);
    try {
      const result = await api.createWallet(user.id);
      if (result?.address) {
        setWalletAddress(result.address);
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
          {/* Welcome Header */}
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text className="text-lg text-gray-600">
                Welcome back,
              </Text>
              <Text className="text-2xl font-bold text-gray-900">
                {user?.name || user?.email?.split('@')[0]}
              </Text>
            </View>

            {/* Wallet Address Badge */}
            {walletAddress ? (
              <TouchableOpacity
                onPress={handleCopyAddress}
                className="flex-row items-center rounded-full bg-gray-100 px-3 py-2"
                activeOpacity={0.7}
              >
                <Wallet size={14} color="#6b7280" />
                <Text className="ml-1.5 font-mono text-xs text-gray-600">
                  {truncateAddress(walletAddress)}
                </Text>
                {copied ? (
                  <Check size={12} color="#22c55e" style={{ marginLeft: 4 }} />
                ) : (
                  <Copy size={12} color="#9ca3af" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            ) : (
              <Button
                onPress={handleCreateWallet}
                disabled={isCreatingWallet}
                size="sm"
                className="rounded-full"
              >
                {isCreatingWallet ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Wallet size={14} color="#fff" />
                    <Text className="ml-1.5 text-xs font-medium text-white">Create Wallet</Text>
                  </View>
                )}
              </Button>
            )}
          </View>

          {/* Balance Cards - USD and SC side by side */}
          <View className="flex-row gap-3 mb-4">
            {/* Available Balance (USD) */}
            <View className="flex-1 rounded-2xl overflow-hidden" style={{ shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}>
              <LinearGradient
                colors={['#DC2626', '#B91C1C', '#991B1B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, borderRadius: 16 }}
              >
                <View className="flex-row items-center mb-3">
                  <Wallet size={18} color="white" />
                  <Text className="text-white/90 text-xs font-medium ml-2">Available Balance</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-2xl font-bold">{balanceFormatted}</Text>
                )}
              </LinearGradient>
            </View>

            {/* Soulaan Coin */}
            <View className="flex-1 rounded-2xl overflow-hidden" style={{ shadowColor: '#D97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}>
              <LinearGradient
                colors={['#F59E0B', '#D97706', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, borderRadius: 16 }}
              >
                <View className="flex-row items-center mb-3">
                  <TrendingUp size={18} color="white" />
                  <Text className="text-white/90 text-xs font-medium ml-2">Soulaan Coin</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white text-2xl font-bold">{parseFloat(scBalance).toFixed(2)} SC</Text>
                )}
              </LinearGradient>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => router.push('/(authenticated)/pay' as any)}
              className="flex-1 bg-white rounded-2xl py-4 flex-row items-center justify-center border border-gray-100"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
            >
              <Send size={20} color="#B45309" />
              <Text className="text-amber-700 font-bold ml-2">Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/withdraw' as any)}
              className="flex-1 bg-white rounded-2xl py-4 flex-row items-center justify-center border border-gray-100"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
            >
              <Landmark size={20} color="#B45309" />
              <Text className="text-amber-700 font-bold ml-2">Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(authenticated)/payment-methods' as any)}
              className="bg-white rounded-2xl py-4 px-5 items-center justify-center border border-gray-100"
              style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
            >
              <Plus size={20} color="#B45309" />
            </TouchableOpacity>
          </View>


          {/* Recent Activity */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Recent Activity</Text>
              {recentTransactions.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/(authenticated)/history' as any)}
                  className="bg-gray-100 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-amber-700 text-sm font-medium">See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading ? (
              <View className="bg-white rounded-2xl p-8 items-center">
                <ActivityIndicator size="small" color="#6B7280" />
              </View>
            ) : recentTransactions.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center">
                <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Clock size={32} color="#9CA3AF" />
                </View>
                <Text className="text-gray-700 font-medium text-lg">No transactions yet</Text>
                <Text className="text-gray-400 text-sm mt-1 text-center">Send money to someone to get started</Text>
              </View>
            ) : (
              <View className="bg-white rounded-2xl overflow-hidden">
                {recentTransactions.map((tx, index) => (
                  <View
                    key={tx.id}
                    className={`flex-row items-center p-4 ${
                      index < recentTransactions.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <View
                      className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${
                        tx.type === 'received' ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      {tx.type === 'received' ? (
                        <ArrowDownLeft size={22} color="#16A34A" />
                      ) : (
                        <ArrowUpRight size={22} color="#6B7280" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold">{tx.counterparty}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text
                      className={`font-bold text-lg ${
                        tx.type === 'received' ? 'text-green-600' : 'text-gray-900'
                      }`}
                    >
                      {tx.type === 'received' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Featured Products */}
          {featuredProducts.length > 0 && (
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <Star size={20} color="#D97706" fill="#D97706" />
                  <Text className="text-xl font-bold text-gray-900 ml-2">Featured</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(authenticated)/stores' as any)}
                  className="bg-gray-100 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-amber-700 text-sm font-medium">Shop All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                <View className="flex-row gap-3">
                  {featuredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      onPress={() => router.push(`/(authenticated)/product-detail?id=${product.id}` as any)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm"
                      style={{ width: 160 }}
                    >
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          className="w-full h-32"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-32 bg-gray-100 items-center justify-center">
                          <Store size={32} color="#D1D5DB" />
                        </View>
                      )}
                      <View className="p-3">
                        <Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>
                          {product.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          {product.store?.isScVerified && (
                            <ShieldCheck size={12} color="#D97706" style={{ marginRight: 4 }} />
                          )}
                          <Text className="text-gray-500 text-xs" numberOfLines={1}>
                            {product.store?.name}
                          </Text>
                        </View>
                        <View className="flex-row items-center mt-2">
                          <Text className="text-amber-700 font-bold">
                            ${product.priceUSD.toFixed(2)}
                          </Text>
                          {product.compareAtPrice && product.compareAtPrice > product.priceUSD && (
                            <Text className="text-gray-400 text-xs line-through ml-2">
                              ${product.compareAtPrice.toFixed(2)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Coop Info */}
          {user?.coop && (
            <View className="bg-white rounded-2xl p-4 mb-4">
              <Text className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Member of</Text>
              <Text className="text-base font-semibold text-gray-900">{user.coop.name}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
