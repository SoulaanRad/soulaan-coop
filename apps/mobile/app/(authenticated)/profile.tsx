import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Copy, Check } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import * as Clipboard from 'expo-clipboard';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [copiedAddress, setCopiedAddress] = React.useState(false);

  const handleCopyAddress = async () => {
    if (user?.walletAddress) {
      await Clipboard.setStringAsync(user.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleLogout = async () => {
    console.log('Logout button pressed!');
    try {
      console.log('Calling logout()...');
      await logout();
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-foreground mb-1">
              Profile
            </Text>
            <Text className="text-base text-muted-foreground">
              Your account information
            </Text>
          </View>

          {/* Personal Information */}
          <Card className="border-gray-200 mb-6">
            <CardContent className="p-6">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Personal Information
              </Text>

              <View className="gap-4">
                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Name
                  </Text>
                  <Text className="text-base text-foreground">
                    {user?.name || 'Not provided'}
                  </Text>
                </View>

                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Email
                  </Text>
                  <Text className="text-base text-foreground">
                    {user?.email}
                  </Text>
                </View>

                {user?.phone && (
                  <View>
                    <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Phone
                    </Text>
                    <Text className="text-base text-foreground">
                      {user.phone}
                    </Text>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Wallet Information */}
          <Card className="border-gray-200 mb-6">
            <CardContent className="p-6">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Wallet Information
              </Text>

              {user?.walletAddress ? (
                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Wallet Address
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyAddress}
                    className="flex-row items-center justify-between bg-gray-100 p-3 rounded-lg"
                  >
                    <Text className="text-sm font-mono text-foreground">
                      {shortenAddress(user.walletAddress)}
                    </Text>
                    {copiedAddress ? (
                      <Check size={16} color="#10B981" />
                    ) : (
                      <Copy size={16} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                  {copiedAddress && (
                    <Text className="text-xs text-green-600 mt-1">
                      Address copied to clipboard
                    </Text>
                  )}
                </View>
              ) : (
                <View className="bg-yellow-50 p-4 rounded-lg">
                  <Text className="text-yellow-800 text-sm">
                    Your wallet is being set up. It will be available shortly.
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="border-gray-200 mb-6">
            <CardContent className="p-6">
              <Text className="text-lg font-semibold text-foreground mb-4">
                Account Status
              </Text>

              <View className="gap-3">
                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
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
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Role
                  </Text>
                  <Text className="text-base text-foreground capitalize">
                    {user?.roles.join(', ')}
                  </Text>
                </View>

                <View>
                  <Text className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
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

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-600 flex-row items-center justify-center gap-2 p-4 rounded-lg active:opacity-80"
            activeOpacity={0.8}
          >
            <LogOut size={20} color="white" />
            <Text className="text-white font-semibold">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
