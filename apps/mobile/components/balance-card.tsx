import React from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import type { LucideIcon } from 'lucide-react-native';

interface BalanceCardProps {
  title: string;
  symbol: string;
  balance: string | undefined;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  textColor?: string;
  isLoading?: boolean;
}

export function BalanceCard({
  title,
  symbol,
  balance,
  description,
  icon,
  bgColor,
  textColor = 'text-white',
  isLoading = false,
}: BalanceCardProps) {
  return (
    <Card className={`${bgColor} border-0 shadow-lg`}>
      <CardContent className="p-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className={`text-lg font-semibold ${textColor}`}>
            {title}
          </Text>
          <Icon as={icon} size={32} className={textColor} />
        </View>

        {isLoading ? (
          <View className="h-16 bg-white/20 rounded-lg mb-2" />
        ) : (
          <Text className={`text-4xl font-bold ${textColor} mb-2`}>
            {balance ? parseFloat(balance).toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 0
            }) : '0'}
          </Text>
        )}

        <Text className={`text-sm ${textColor} opacity-80 mb-1`}>
          {symbol}
        </Text>

        <Text className={`text-xs ${textColor} opacity-70`}>
          {description}
        </Text>
      </CardContent>
    </Card>
  );
}
