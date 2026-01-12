import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { api } from '~/lib/api';

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // TODO: Get from auth context
  const userId = 'PLACEHOLDER_USER_ID';

  const loadHistory = useCallback(async () => {
    try {
      setError(null);

      // Get wallet info
      const wallet = await api.getWalletInfo(userId);

      if (wallet.hasWallet && wallet.address) {
        setWalletAddress(wallet.address);

        // Get transfer history
        const history = await api.getTransferHistory(wallet.address);
        setTransfers(history.transfers || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [loadHistory]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-600">Loading history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg text-red-600 mb-4">Error</Text>
        <Text className="text-center text-gray-600 mb-6">{error}</Text>
        <TouchableOpacity
          onPress={loadHistory}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
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
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Transaction History</Text>

        {transfers.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center">
            <Text className="text-gray-500 text-center">No transactions yet</Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Your transfers will appear here
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {transfers.map((transfer, index) => {
              const isSent = transfer.direction === 'sent';
              const counterparty = isSent ? transfer.to : transfer.from;

              return (
                <View
                  key={`${transfer.transactionHash}-${index}`}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  {/* Transaction Type & Amount */}
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-base">
                        {isSent ? 'Sent' : 'Received'}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {isSent ? 'To' : 'From'}: {truncateAddress(counterparty)}
                      </Text>
                    </View>
                    <Text
                      className={`text-lg font-bold ${
                        isSent ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {isSent ? '-' : '+'}{transfer.valueFormatted} UC
                    </Text>
                  </View>

                  {/* Timestamp */}
                  <Text className="text-gray-400 text-xs mb-2">
                    {formatDate(transfer.timestamp)}
                  </Text>

                  {/* Transaction Hash */}
                  <View className="bg-gray-50 rounded-lg p-2 mt-2">
                    <Text className="text-gray-500 text-xs">Transaction</Text>
                    <Text className="text-gray-700 text-xs font-mono mt-1">
                      {transfer.transactionHash.slice(0, 20)}...
                    </Text>
                  </View>

                  {/* Block Number */}
                  <Text className="text-gray-400 text-xs mt-2">
                    Block #{transfer.blockNumber}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
