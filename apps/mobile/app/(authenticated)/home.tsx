import React from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, BadgeDollarSign } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { BalanceCard } from '@/components/balance-card';
import { useAuth } from '@/contexts/auth-context';
import { useBalances } from '@/hooks/use-balances';

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: balances, isLoading, refetch } = useBalances(user?.walletAddress);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-6">
          {/* Welcome Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-foreground">
              Welcome back,
            </Text>
            <Text className="text-3xl font-bold text-gold-700">
              {user?.name || user?.email.split('@')[0]}
            </Text>
          </View>

          {/* Wallet Address Warning */}
          {!user?.walletAddress && (
            <Card className="bg-yellow-50 border-yellow-200 mb-6">
              <CardContent className="p-4">
                <Text className="text-yellow-800 font-semibold mb-1">
                  Wallet Being Set Up
                </Text>
                <Text className="text-yellow-700 text-sm">
                  Your wallet is being configured. Balances will appear once setup is complete.
                </Text>
              </CardContent>
            </Card>
          )}

          {/* Balance Cards */}
          {user?.walletAddress ? (
            <View className="gap-4 mb-6">
              <BalanceCard
                title="SoulaaniCoin"
                symbol="SC"
                balance={balances?.sc}
                description="Governance & Voting Power"
                icon={Coins}
                bgColor="bg-gold-700"
                textColor="text-white"
                isLoading={isLoading}
              />

              <BalanceCard
                title="UnityCoin"
                symbol="UC"
                balance={balances?.uc}
                description="Community Currency"
                icon={BadgeDollarSign}
                bgColor="bg-red-700"
                textColor="text-white"
                isLoading={isLoading}
              />
            </View>
          ) : null}

          {/* Profile Summary */}
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Account Information
              </Text>

              <View className="gap-3">
                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide">
                    Email
                  </Text>
                  <Text className="text-base text-foreground">
                    {user?.email}
                  </Text>
                </View>

                {user?.phone && (
                  <View>
                    <Text className="text-xs text-muted-foreground uppercase tracking-wide">
                      Phone
                    </Text>
                    <Text className="text-base text-foreground">
                      {user.phone}
                    </Text>
                  </View>
                )}

                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide">
                    Status
                  </Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    <Text className="text-base text-foreground capitalize">
                      {user?.status.toLowerCase()}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide">
                    Member Since
                  </Text>
                  <Text className="text-base text-foreground">
                    {user?.createdAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
