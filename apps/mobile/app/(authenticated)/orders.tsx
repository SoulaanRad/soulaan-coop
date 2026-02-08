import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

interface Order {
  id: string;
  totalUSD: number;
  fulfillmentStatus: string;
  itemCount: number;
  store: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  items: Array<{
    productName: string;
    productImage: string | null;
    quantity: number;
    priceUSD: number;
  }>;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  PENDING: { color: '#D97706', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: Clock, label: 'Pending' },
  PROCESSING: { color: '#2563EB', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Package, label: 'Processing' },
  SHIPPED: { color: '#7C3AED', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Truck, label: 'Shipped' },
  DELIVERED: { color: '#16A34A', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: '#DC2626', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Cancelled' },
};

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const config = STATUS_CONFIG[order.fulfillmentStatus] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3"
    >
      {/* Header - Store & Status */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          {order.store.imageUrl ? (
            <Image
              source={{ uri: order.store.imageUrl }}
              className="w-10 h-10 rounded-lg"
            />
          ) : (
            <View className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
              <ShoppingBag size={18} color="#9CA3AF" />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-gray-900 dark:text-white font-semibold" numberOfLines={1}>
              {order.store.name}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              {orderDate}
            </Text>
          </View>
        </View>
        <View className={`flex-row items-center px-3 py-1.5 rounded-full ${config.bgColor}`}>
          <StatusIcon size={14} color={config.color} />
          <Text style={{ color: config.color }} className="text-xs font-medium ml-1">
            {config.label}
          </Text>
        </View>
      </View>

      {/* Items Preview */}
      <View className="flex-row items-center mb-3">
        {order.items.slice(0, 3).map((item, index) => (
          <View
            key={index}
            className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden"
            style={{ marginLeft: index > 0 ? -8 : 0 }}
          >
            {item.productImage ? (
              <Image
                source={{ uri: item.productImage }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <ShoppingBag size={16} color="#9CA3AF" />
              </View>
            )}
          </View>
        ))}
        {order.itemCount > 3 && (
          <View className="ml-2">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              +{order.itemCount - 3} more
            </Text>
          </View>
        )}
      </View>

      {/* Footer - Total & Arrow */}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <Text className="text-gray-600 dark:text-gray-400">
          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mr-2">
            ${order.totalUSD.toFixed(2)}
          </Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.walletAddress) return;

    try {
      const result = await api.getMyOrders(user.walletAddress);
      setOrders(result?.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B45309" />
          <Text className="text-gray-500 dark:text-gray-400 mt-4">Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white ml-4">
          My Orders
        </Text>
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
            <Package size={40} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            No orders yet
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
            Your order history will appear here after your first purchase.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/stores')}
            className="bg-amber-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 py-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#B45309"
            />
          }
        >
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/order-detail?id=${order.id}`)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
