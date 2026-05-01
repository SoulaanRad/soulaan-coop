import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Send,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { coopConfig } from '@/lib/coop-config';

/**
 * Format SC balance as whole integers with comma separators.
 * SC rewards are whole numbers (10 SC per $1), so no decimals needed.
 */
function formatSCBalance(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num) || num === 0) return '0';
  return Math.floor(num).toLocaleString();
}

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
  const [scBalance, setScBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(user?.walletAddress || null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [copied, setCopied] = useState(false);
  const coopWalletName = user?.coop?.name || user?.coop?.shortName || config.name || config.shortName;

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Refresh balances and recent transactions whenever the screen comes back into focus
  // (e.g. after returning from a store purchase or sending a payment)
  useFocusEffect(
    useCallback(() => {
      if (user?.id && !isLoading) {
        loadData();
      }
    }, [user?.id])
  );

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

      // Fetch history, orders, and SC rewards
      try {
        const [historyResult, ordersResult, scRewardsResult] = await Promise.all([
          api.getP2PHistory(user.id, 10, 0, currentWalletAddress),
          currentWalletAddress 
            ? api.getMyOrders(currentWalletAddress, 10).catch(() => ({ orders: [] }))
            : Promise.resolve({ orders: [] }),
          api.getUserSCRewards(user.id, 10, currentWalletAddress).catch(() => ({ rewards: [] }))
        ]);

        // Merge and sort by date
        const transfers = historyResult.transfers.map((t: any) => ({ 
          ...t, 
          activityType: 'transfer' 
        }));
        
        const orders = (ordersResult?.orders || []).map((o: any) => ({ 
          ...o, 
          activityType: 'order',
          counterparty: o.store?.name || 'Store Purchase',
          amount: o.totalUSD,
          type: 'sent' // Orders are always outgoing
        }));

        const scRewards = (scRewardsResult?.rewards || []).map((r: any) => ({
          ...r,
          activityType: 'scReward',
          counterparty: r.reason === 'STORE_PURCHASE_REWARD' 
            ? `SC Reward from ${r.relatedStore?.name || 'Store'}`
            : r.reason === 'STORE_SALE_REWARD'
            ? `SC Reward - Sale`
            : 'SC Reward',
          amount: r.amountSC,
          type: 'received', // SC rewards are always incoming
          createdAt: r.completedAt || r.createdAt,
        }));

        const combined = [...transfers, ...orders, ...scRewards]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        setRecentTransactions(combined);
      } catch (historyErr) {
        console.error('Error loading history:', historyErr);
        // Don't fail the whole load if history fails
      }

      // Fetch token balances from the backend and display the active wallet token.
      if (currentWalletAddress) {
        try {
          const tokenBalances = await api.getTokenBalances(currentWalletAddress);
          console.log('📊 Token Balances Response:', tokenBalances);
          console.log('💰 SC Balance:', tokenBalances.sc);
          setScBalance(tokenBalances.sc);
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
    <SafeAreaView className="flex-1 bg-[#F7F4EF]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7F1D1D" />
        }
      >
        <View className="px-5 pt-4">
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-bold uppercase tracking-[2px] text-red-900/60">
                {coopWalletName} Wallet
              </Text>
              <Text className="mt-1 text-3xl font-black text-slate-950">
                Hi, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'member'}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Your co-op money, marketplace, and proposals in one place.
              </Text>
            </View>

            {walletAddress ? (
              <TouchableOpacity
                onPress={handleCopyAddress}
                className="flex-row items-center rounded-2xl border border-white bg-white/90 px-3 py-2"
                activeOpacity={0.75}
                style={{ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
              >
                <Wallet size={14} color="#7F1D1D" />
                <Text className="ml-2 font-mono text-xs font-semibold text-slate-600">
                  {truncateAddress(walletAddress)}
                </Text>
                {copied ? (
                  <Check size={13} color="#16A34A" style={{ marginLeft: 6 }} />
                ) : (
                  <Copy size={13} color="#94A3B8" style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateWallet}
                disabled={isCreatingWallet}
                className="flex-row items-center rounded-2xl bg-red-900 px-4 py-3"
                activeOpacity={0.8}
              >
                {isCreatingWallet ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Wallet size={16} color="#fff" />
                    <Text className="ml-2 text-xs font-bold text-white">Create Wallet</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View className="mb-5 overflow-hidden rounded-[28px]" style={{ shadowColor: '#7F1D1D', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.2, shadowRadius: 22, elevation: 8 }}>
            <LinearGradient
              colors={['#7F1D1D', '#C2410C', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22 }}
            >
              <View className="mb-8 flex-row items-start justify-between">
                <View>
                  <View className="mb-3 self-start rounded-full bg-white/15 px-3 py-1">
                    <Text className="text-xs font-bold uppercase tracking-[1px] text-white/80">Available Rewards</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-5xl font-black text-white">{formatSCBalance(scBalance)}</Text>
                  )}
                  <Text className="mt-1 text-sm font-semibold text-white/75">Soulaan Coin balance</Text>
                </View>
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <TrendingUp size={26} color="white" />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-white/15 p-4">
                  <Text className="text-xs font-semibold text-white/65">Co-op</Text>
                  <Text className="mt-1 text-xl font-black text-white" numberOfLines={1}>
                    {coopWalletName}
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl bg-white/15 p-4">
                  <Text className="text-xs font-semibold text-white/65">Rewards Token</Text>
                  <Text className="mt-1 text-xl font-black text-white">SC</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View className="mb-6 flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(authenticated)/payment-methods' as any)}
              className="flex-1 rounded-[22px] border border-white bg-white p-4"
              activeOpacity={0.8}
              style={{ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 }}
            >
              <View className="mb-4 h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                <CreditCard size={21} color="#C2410C" />
              </View>
              <Text className="text-base font-black text-slate-950">Add Card</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">Save a payment method</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(authenticated)/stores' as any)}
              className="flex-1 rounded-[22px] border border-white bg-white p-4"
              activeOpacity={0.8}
              style={{ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 }}
            >
              <View className="mb-4 h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                <ShoppingBag size={21} color="#047857" />
              </View>
              <Text className="text-base font-black text-slate-950">Shop Local</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">Support member stores</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(authenticated)/pay' as any)}
              className="flex-1 rounded-[22px] border border-white bg-white p-4"
              activeOpacity={0.8}
              style={{ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 }}
            >
              <View className="mb-4 h-11 w-11 items-center justify-center rounded-2xl bg-sky-50">
                <Send size={21} color="#0369A1" />
              </View>
              <Text className="text-base font-black text-slate-950">Pay</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-500">Send or scan fast</Text>
            </TouchableOpacity>
          </View>

          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-black text-slate-950">Recent Activity</Text>
              <Text className="mt-1 text-xs text-slate-500">Purchases, rewards, and transfers</Text>
            </View>
            {recentTransactions.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(authenticated)/history' as any)}
                className="flex-row items-center rounded-full bg-white px-3 py-2"
              >
                <Text className="text-sm font-bold text-red-900">See All</Text>
                <ArrowRight size={14} color="#7F1D1D" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View className="items-center rounded-[28px] bg-white p-10">
              <ActivityIndicator size="small" color="#7F1D1D" />
            </View>
          ) : recentTransactions.length === 0 ? (
            <View className="items-center rounded-[28px] border border-white bg-white px-6 py-5">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Clock size={26} color="#64748B" />
              </View>
              <Text className="text-base font-black text-slate-800">No transactions yet</Text>
              <Text className="mt-1 max-w-[260px] text-center text-xs leading-4 text-slate-500">
                Start with a store purchase or member payment.
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-[28px] border border-white bg-white">
                {recentTransactions.map((tx, index) => {
                  // Determine icon and background color based on activity type
                  const isOrder = tx.activityType === 'order';
                  const isSCReward = tx.activityType === 'scReward';
                  const isReceived = tx.type === 'received';
                  
                  const bgColor = isOrder 
                    ? 'bg-amber-100' 
                    : isSCReward
                      ? 'bg-amber-100'
                    : isReceived 
                      ? 'bg-green-100' 
                      : 'bg-gray-100';
                  
                  const icon = isOrder ? (
                    <Store size={22} color="#D97706" />
                  ) : isSCReward ? (
                    <Coins size={22} color="#F59E0B" />
                  ) : isReceived ? (
                    <ArrowDownLeft size={22} color="#16A34A" />
                  ) : (
                    <ArrowUpRight size={22} color="#6B7280" />
                  );

                  const content = (
                    <>
                      <View
                        className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${bgColor}`}
                      >
                        {icon}
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-semibold">{tx.counterparty}</Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text
                        className={`font-bold text-lg ${
                          isSCReward ? 'text-amber-600' : isReceived ? 'text-green-600' : 'text-gray-900'
                        }`}
                      >
                        {isSCReward 
                          ? `+${formatSCBalance(String(tx.amount))} SC`
                          : `${isReceived ? '+' : '-'}$${tx.amount.toFixed(2)}`
                        }
                      </Text>
                    </>
                  );

                  // Only make orders clickable
                  if (isOrder) {
                    return (
                      <TouchableOpacity
                        key={tx.id}
                        onPress={() => router.push(`/(authenticated)/order-detail?id=${tx.id}` as any)}
                        className={`flex-row items-center p-4 ${
                          index < recentTransactions.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                        activeOpacity={0.7}
                      >
                        {content}
                      </TouchableOpacity>
                    );
                  }

                  // Transfers and SC rewards are not clickable
                  return (
                    <View
                      key={tx.id}
                      className={`flex-row items-center p-4 ${
                        index < recentTransactions.length - 1 ? 'border-b border-gray-50' : ''
                      }`}
                    >
                      {content}
                    </View>
                  );
                })}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
