import { useState, useCallback } from "react";
import { View, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { Wallet, Copy, Check } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

/**
 * Truncate wallet address for display
 * Shows first 6 and last 4 characters: 0x1234...abcd
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(user?.walletAddress || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch wallet info on focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchWalletInfo();
      }
    }, [user?.id])
  );

  const fetchWalletInfo = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const result = await api.getWalletInfo(user.id);
      if (result?.hasWallet && result?.address) {
        setWalletAddress(result.address);
      }
    } catch (error) {
      console.error("Failed to fetch wallet info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!user?.id) return;

    setIsCreating(true);
    try {
      const result = await api.createWallet(user.id);
      if (result?.address) {
        setWalletAddress(result.address);
      }
    } catch (error) {
      console.error("Failed to create wallet:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletInfo();
    setRefreshing(false);
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View className="px-6 pt-12 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-800">
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </Text>
            <Text className="text-gray-500">Soulaan Cooperative</Text>
          </View>

          {/* Wallet Address Badge */}
          {isLoading ? (
            <ActivityIndicator size="small" color="#B45309" />
          ) : walletAddress ? (
            <TouchableOpacity
              onPress={handleCopyAddress}
              className="flex-row items-center rounded-full bg-gray-100 px-3 py-2"
              activeOpacity={0.7}
            >
              <Wallet size={16} color="#6b7280" />
              <Text className="ml-2 font-mono text-sm text-gray-600">
                {truncateAddress(walletAddress)}
              </Text>
              {copied ? (
                <Check size={14} color="#22c55e" className="ml-1" />
              ) : (
                <Copy size={14} color="#9ca3af" className="ml-1" />
              )}
            </TouchableOpacity>
          ) : (
            <Button
              onPress={handleCreateWallet}
              disabled={isCreating}
              className="rounded-full px-4 py-2"
              size="sm"
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Wallet size={16} color="#fff" />
                  <Text className="ml-2 text-sm font-medium text-white">Create Wallet</Text>
                </View>
              )}
            </Button>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <View className="flex-1 p-6">
        {/* You can add more content here */}
      </View>
    </ScrollView>
  );
}
