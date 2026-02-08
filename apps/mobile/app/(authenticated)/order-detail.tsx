import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Store,
  MapPin,
  FileText,
  ExternalLink,
  Copy,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

interface OrderDetail {
  id: string;
  subtotalUSD: number;
  discountUSD: number;
  totalUSD: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionHash: string | null;
  fulfillmentStatus: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  note: string | null;
  store: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    priceUSD: number;
    totalUSD: number;
  }>;
  isBuyer: boolean;
  isStoreOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  PENDING: { color: '#D97706', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: Clock, label: 'Pending' },
  PROCESSING: { color: '#2563EB', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Package, label: 'Processing' },
  SHIPPED: { color: '#7C3AED', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Truck, label: 'Shipped' },
  DELIVERED: { color: '#16A34A', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: '#DC2626', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle, label: 'Cancelled' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    if (!user?.walletAddress || !id) return;

    try {
      const result = await api.getOrder(id, user.walletAddress);
      setOrder(result);
    } catch (error) {
      console.error('Failed to load order:', error);
      Alert.alert('Error', 'Failed to load order details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B45309" />
          <Text className="text-gray-500 dark:text-gray-400 mt-4">Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-row items-center px-5 py-4">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const config = STATUS_CONFIG[order.fulfillmentStatus] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white ml-4">
          Order Details
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View className={`mx-5 mt-5 p-4 rounded-xl ${config.bgColor}`}>
          <View className="flex-row items-center">
            <StatusIcon size={24} color={config.color} />
            <View className="ml-3">
              <Text style={{ color: config.color }} className="text-lg font-bold">
                {config.label}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                {formatDate(order.updatedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <TouchableOpacity
          onPress={() => router.push(`/store-detail?id=${order.store.id}`)}
          className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4 flex-row items-center"
        >
          {order.store.imageUrl ? (
            <Image
              source={{ uri: order.store.imageUrl }}
              className="w-12 h-12 rounded-lg"
            />
          ) : (
            <View className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
              <Store size={24} color="#9CA3AF" />
            </View>
          )}
          <View className="flex-1 ml-3">
            <Text className="text-gray-900 dark:text-white font-semibold">
              {order.store.name}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              View Store
            </Text>
          </View>
          <ExternalLink size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Order Items */}
        <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Items
          </Text>
          {order.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/product-detail?id=${item.productId}`)}
              className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              {item.productImage ? (
                <Image
                  source={{ uri: item.productImage }}
                  className="w-16 h-16 rounded-lg"
                />
              ) : (
                <View className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
                  <ShoppingBag size={24} color="#9CA3AF" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 dark:text-white font-medium" numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  ${item.priceUSD.toFixed(2)} x {item.quantity}
                </Text>
              </View>
              <Text className="text-gray-900 dark:text-white font-semibold">
                ${item.totalUSD.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Totals */}
          <View className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500 dark:text-gray-400">Subtotal</Text>
              <Text className="text-gray-900 dark:text-white">
                ${order.subtotalUSD.toFixed(2)}
              </Text>
            </View>
            {order.discountUSD > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500 dark:text-gray-400">Discount</Text>
                <Text className="text-green-600">
                  -${order.discountUSD.toFixed(2)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <Text className="text-gray-900 dark:text-white font-semibold">Total</Text>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                ${order.totalUSD.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment
          </Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500 dark:text-gray-400">Method</Text>
            <Text className="text-gray-900 dark:text-white">
              {order.paymentMethod === 'CARD' ? 'Credit Card' : 'Wallet Balance'}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-500 dark:text-gray-400">Status</Text>
            <Text className="text-green-600 font-medium">
              {order.paymentStatus}
            </Text>
          </View>
          {order.transactionHash && (
            <TouchableOpacity
              onPress={() => copyToClipboard(order.transactionHash!, 'Transaction hash')}
              className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
            >
              <Text className="text-gray-500 dark:text-gray-400">Transaction</Text>
              <View className="flex-row items-center">
                <Text className="text-gray-900 dark:text-white text-sm" numberOfLines={1}>
                  {order.transactionHash.slice(0, 10)}...{order.transactionHash.slice(-6)}
                </Text>
                <Copy size={14} color="#9CA3AF" className="ml-2" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Shipping & Notes */}
        {(order.shippingAddress || order.trackingNumber || order.note) && (
          <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4 mb-6">
            {order.shippingAddress && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <MapPin size={16} color="#6B7280" />
                  <Text className="text-gray-500 dark:text-gray-400 ml-2">
                    Shipping Address
                  </Text>
                </View>
                <Text className="text-gray-900 dark:text-white ml-6">
                  {order.shippingAddress}
                </Text>
              </View>
            )}
            {order.trackingNumber && (
              <TouchableOpacity
                onPress={() => copyToClipboard(order.trackingNumber!, 'Tracking number')}
                className="mb-4"
              >
                <View className="flex-row items-center mb-2">
                  <Truck size={16} color="#6B7280" />
                  <Text className="text-gray-500 dark:text-gray-400 ml-2">
                    Tracking Number
                  </Text>
                </View>
                <View className="flex-row items-center ml-6">
                  <Text className="text-gray-900 dark:text-white">
                    {order.trackingNumber}
                  </Text>
                  <Copy size={14} color="#9CA3AF" className="ml-2" />
                </View>
              </TouchableOpacity>
            )}
            {order.note && (
              <View>
                <View className="flex-row items-center mb-2">
                  <FileText size={16} color="#6B7280" />
                  <Text className="text-gray-500 dark:text-gray-400 ml-2">
                    Order Note
                  </Text>
                </View>
                <Text className="text-gray-900 dark:text-white ml-6">
                  {order.note}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Order ID */}
        <View className="mx-5 mb-8">
          <TouchableOpacity
            onPress={() => copyToClipboard(order.id, 'Order ID')}
            className="flex-row items-center justify-center"
          >
            <Text className="text-gray-400 dark:text-gray-500 text-sm">
              Order ID: {order.id.slice(0, 8)}...
            </Text>
            <Copy size={12} color="#9CA3AF" className="ml-1" />
          </TouchableOpacity>
          <Text className="text-gray-400 dark:text-gray-500 text-sm text-center mt-1">
            Placed on {formatDate(order.createdAt)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
