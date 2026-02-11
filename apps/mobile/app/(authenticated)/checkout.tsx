import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Wallet,
  CreditCard,
  Check,
  AlertCircle,
  BadgeCheck,
  Plus,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

export default function CheckoutScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { user } = useAuth();
  const { getStoreItems, clearStoreItems } = useCart();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [store, setStore] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');

  const cartItems = storeId ? getStoreItems(storeId) : [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);
  const total = subtotal; // Could add taxes/fees here

  const hasEnoughBalance = balance >= total;

  const loadData = useCallback(async () => {
    if (!user?.walletAddress || !storeId) return;

    try {
      const [balanceResult, methodsResult, storeResult] = await Promise.all([
        api.getTokenBalances(user.walletAddress),
        api.getPaymentMethods(user.id, user.walletAddress),
        api.getStore(storeId),
      ]);

      setBalance(parseFloat(balanceResult?.uc || '0'));
      setPaymentMethods(methodsResult?.methods || []);
      setStore(storeResult);
    } catch (error) {
      console.error('Failed to load checkout data:', error);
      Alert.alert('Error', 'Failed to load checkout information.');
    } finally {
      setLoading(false);
    }
  }, [user, storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckout = async () => {
    if (!user?.walletAddress || !storeId || cartItems.length === 0) return;

    // If insufficient balance and no payment method, prompt to add card
    if (!hasEnoughBalance && paymentMethods.length === 0) {
      Alert.alert(
        'Payment Method Required',
        'You don\'t have enough balance. Please add a card to complete your purchase.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Card', onPress: () => router.push('/payment-methods') },
        ]
      );
      return;
    }

    setProcessing(true);

    try {
      const orderData = {
        storeId,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: shippingAddress || undefined,
        note: note || undefined,
      };

      const result = await api.createOrder(orderData, user.walletAddress);

      // Clear cart items for this store
      clearStoreItems(storeId);

      // Show success and navigate to order detail
      Alert.alert(
        'Order Placed!',
        `Your order for $${total.toFixed(2)} has been placed successfully.`,
        [
          {
            text: 'View Order',
            onPress: () => router.replace(`/order-detail?id=${result.orderId}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Checkout failed:', error);
      
      // Parse error message for better user feedback
      let errorTitle = 'Checkout Failed';
      let errorMessage = error.message || 'Unable to complete your order. Please try again.';
      
      // Check for specific error types
      if (errorMessage.includes('Daily limit not set')) {
        errorTitle = 'System Configuration Error';
        errorMessage = 'The payment system needs to be configured by an administrator. Please contact support.';
      } else if (errorMessage.includes('Daily minting limit exceeded')) {
        errorTitle = 'Daily Limit Reached';
        errorMessage = 'The daily minting limit has been reached. Please try again tomorrow or contact support.';
      } else if (errorMessage.includes('Recipient must be an active SC member')) {
        errorTitle = 'Membership Required';
        errorMessage = 'You need to be an active member to make purchases. Please contact support.';
      } else if (errorMessage.includes('Insufficient balance')) {
        errorTitle = 'Insufficient Balance';
        errorMessage = 'You don\'t have enough balance to complete this purchase. Please add funds or use a payment method.';
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'Amex',
      discover: 'Discover',
    };
    return brands[brand.toLowerCase()] || brand;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B45309" />
          <Text className="text-gray-500 dark:text-gray-400 mt-4">Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-row items-center px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white ml-4">
            Checkout
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <ShoppingBag size={48} color="#9CA3AF" />
          <Text className="text-lg font-medium text-gray-900 dark:text-white mt-4">
            No items to checkout
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/stores')}
            className="mt-4 bg-amber-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Browse Stores</Text>
          </TouchableOpacity>
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
          Checkout
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Store Info */}
        {store && (
          <View className="bg-white dark:bg-gray-800 mx-5 mt-5 rounded-xl p-4 flex-row items-center">
            {store.imageUrl ? (
              <Image
                source={{ uri: store.imageUrl }}
                className="w-12 h-12 rounded-lg"
              />
            ) : (
              <View className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
                <ShoppingBag size={24} color="#9CA3AF" />
              </View>
            )}
            <View className="flex-1 ml-3">
              <View className="flex-row items-center">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {store.name}
                </Text>
                {store.isScVerified && (
                  <BadgeCheck size={16} color="#B45309" className="ml-2" />
                )}
              </View>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Order Summary
          </Text>
          {cartItems.map((item) => (
            <View key={item.productId} className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-14 h-14 rounded-lg"
                />
              ) : (
                <View className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center">
                  <ShoppingBag size={20} color="#9CA3AF" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 dark:text-white font-medium" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm">
                  Qty: {item.quantity} x ${item.priceUSD.toFixed(2)}
                </Text>
              </View>
              <Text className="text-gray-900 dark:text-white font-semibold">
                ${(item.priceUSD * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Info */}
        <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment
          </Text>

          {/* Wallet Balance */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center">
              <Wallet size={20} color="#B45309" />
              <Text className="text-gray-900 dark:text-white ml-3">Wallet Balance</Text>
            </View>
            <Text className={`font-semibold ${hasEnoughBalance ? 'text-green-600' : 'text-gray-500'}`}>
              ${balance.toFixed(2)}
            </Text>
          </View>

          {/* Payment Info */}
          {hasEnoughBalance ? (
            <View className="flex-row items-center mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Check size={18} color="#16A34A" />
              <Text className="text-green-700 dark:text-green-400 ml-2 flex-1">
                Your wallet balance covers this purchase
              </Text>
            </View>
          ) : (
            <View className="mt-3">
              {paymentMethods.length > 0 ? (
                <View className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <View className="flex-row items-center">
                    <CreditCard size={18} color="#B45309" />
                    <Text className="text-amber-700 dark:text-amber-400 ml-2 flex-1">
                      ${(total - balance).toFixed(2)} will be charged to your card
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-2 ml-6">
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">
                      {formatCardBrand(paymentMethods[0].brand)} ****{paymentMethods[0].last4}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <View className="flex-row items-center">
                    <AlertCircle size={18} color="#DC2626" />
                    <Text className="text-red-700 dark:text-red-400 ml-2 flex-1">
                      Insufficient balance. Add a card to continue.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/payment-methods')}
                    className="flex-row items-center justify-center mt-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
                  >
                    <Plus size={16} color="#DC2626" />
                    <Text className="text-red-600 dark:text-red-400 font-medium ml-2">
                      Add Payment Method
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Shipping Address (Optional) */}
        <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Shipping Address (Optional)
          </Text>
          <TextInput
            value={shippingAddress}
            onChangeText={setShippingAddress}
            placeholder="Enter your shipping address..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-gray-900 dark:text-white"
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />
        </View>

        {/* Order Note (Optional) */}
        <View className="bg-white dark:bg-gray-800 mx-5 mt-4 rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Order Note (Optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note for the seller..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-gray-900 dark:text-white"
            style={{ textAlignVertical: 'top', minHeight: 60 }}
          />
        </View>
      </ScrollView>

      {/* Bottom - Total & Pay Button */}
      <View className="px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-600 dark:text-gray-400">Total</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            ${total.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={processing || (!hasEnoughBalance && paymentMethods.length === 0)}
          className={`py-4 rounded-xl items-center ${
            processing || (!hasEnoughBalance && paymentMethods.length === 0)
              ? 'bg-gray-300 dark:bg-gray-700'
              : 'bg-amber-500'
          }`}
        >
          {processing ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text className="text-white font-bold text-lg ml-2">Processing...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-lg">
              Pay ${total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
