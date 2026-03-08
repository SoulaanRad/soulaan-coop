import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Alert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  Check,
  AlertCircle,
  BadgeCheck,
  Info,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';

interface CheckoutHybridProps {
  storeId: string;
}

export default function CheckoutHybrid({ storeId }: CheckoutHybridProps) {
  const { user } = useAuth();
  const { getStoreItems, clearStoreItems } = useCart();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [businessReadiness, setBusinessReadiness] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [note, setNote] = useState('');

  const cartItems = storeId ? getStoreItems(storeId) : [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);

  const loadData = useCallback(async () => {
    if (!user?.id || !storeId) return;

    try {
      const [storeResult, readinessResult] = await Promise.all([
        api.getStore(storeId),
        // Get business readiness to check SC eligibility
        fetch(`/api/trpc/stripeConnect.getBusinessReadiness?input=${encodeURIComponent(JSON.stringify({ businessId: storeId }))}`)
          .then(res => res.json())
          .catch(() => null),
      ]);

      setStore(storeResult);
      setBusinessReadiness(readinessResult?.result?.data);

      // Get checkout preview
      if (subtotal > 0) {
        const previewResult = await fetch(
          `/api/trpc/commerce.previewCheckout?input=${encodeURIComponent(JSON.stringify({
            userId: user.id,
            businessId: storeId,
            listedAmountCents: Math.round(subtotal * 100),
            currency: 'USD',
          }))}`
        ).then(res => res.json());

        setPreview(previewResult?.result?.data);
      }
    } catch (error) {
      console.error('Failed to load checkout data:', error);
      Alert.alert('Error', 'Failed to load checkout information.');
    } finally {
      setLoading(false);
    }
  }, [user, storeId, subtotal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckout = async () => {
    if (!user?.id || !storeId || cartItems.length === 0) return;

    setProcessing(true);

    try {
      // Create commerce transaction
      const checkoutResult = await fetch('/api/trpc/commerce.createCheckout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          businessId: storeId,
          listedAmountCents: Math.round(subtotal * 100),
          currency: 'USD',
          metadata: {
            items: cartItems.map(item => ({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              priceUSD: item.priceUSD,
            })),
            shippingAddress: shippingAddress || undefined,
            note: note || undefined,
          },
        }),
      }).then(res => res.json());

      if (checkoutResult.error) {
        throw new Error(checkoutResult.error.message);
      }

      const { transactionId, clientSecret } = checkoutResult.result.data;

      // TODO: Integrate Stripe Payment Sheet for card payment
      // For now, show success message
      clearStoreItems(storeId);

      let successMsg = `Your order for $${(preview.totalChargedCents / 100).toFixed(2)} has been placed.`;
      
      if (preview?.customerReward?.eligible) {
        successMsg += `\n\n🪙 You'll earn ${preview.customerReward.estimatedAmount} SC when payment completes!`;
      } else if (businessReadiness?.scRewardEligible === false) {
        successMsg += `\n\nℹ️ This merchant is not yet SC-verified, so no rewards for this purchase.`;
      }

      Alert.alert('Order Placed!', successMsg, [
        {
          text: 'View Order',
          onPress: () => router.replace(`/order-detail?id=${transactionId}`),
        },
      ]);
    } catch (error: any) {
      console.error('Checkout failed:', error);
      Alert.alert('Checkout Failed', error.message || 'An error occurred during checkout.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!store || cartItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="flex-1 items-center justify-center px-6">
          <ShoppingBag size={64} color="#64748b" />
          <Text className="text-slate-400 text-center mt-4">
            Your cart is empty
          </Text>
          <TouchableOpacity
            className="mt-6 bg-orange-500 px-6 py-3 rounded-xl"
            onPress={() => router.back()}
          >
            <Text className="text-white font-semibold">Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-800">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Store Info */}
        <View className="px-6 py-4 border-b border-slate-800">
          <Text className="text-lg font-bold text-white">{store.name}</Text>
          <Text className="text-slate-400 text-sm mt-1">{store.category}</Text>
        </View>

        {/* Non-eligible merchant notice */}
        {businessReadiness && !businessReadiness.scRewardEligible && (
          <View className="mx-6 mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <View className="flex-row items-start gap-3">
              <Info size={20} color="#f59e0b" />
              <View className="flex-1">
                <Text className="text-amber-400 font-semibold">No SC Rewards</Text>
                <Text className="text-slate-400 text-sm mt-1">
                  This merchant is not yet SC-verified. You will not earn governance tokens from this purchase.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Cart Items */}
        <View className="px-6 py-4">
          <Text className="text-white font-semibold mb-3">Order Items</Text>
          {cartItems.map((item) => (
            <View key={item.productId} className="flex-row justify-between items-center py-3 border-b border-slate-800">
              <View className="flex-1">
                <Text className="text-white font-medium">{item.name}</Text>
                <Text className="text-slate-400 text-sm">Qty: {item.quantity}</Text>
              </View>
              <Text className="text-white font-semibold">
                ${(item.priceUSD * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Price Breakdown */}
        {preview && (
          <View className="px-6 py-4 bg-slate-900/50">
            <Text className="text-white font-semibold mb-3">Price Breakdown</Text>
            
            <View className="space-y-2">
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Subtotal</Text>
                <Text className="text-white">${(preview.listedAmountCents / 100).toFixed(2)}</Text>
              </View>
              
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Platform Fee</Text>
                <Text className="text-slate-400">${(preview.platformMarkupCents / 100).toFixed(2)}</Text>
              </View>
              
              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Wealth Fund Contribution</Text>
                <Text className="text-slate-400">${(preview.treasuryFeeCents / 100).toFixed(2)}</Text>
              </View>
              
              <View className="h-px bg-slate-800 my-2" />
              
              <View className="flex-row justify-between py-2">
                <Text className="text-white font-bold">Total</Text>
                <Text className="text-white font-bold text-lg">
                  ${(preview.totalChargedCents / 100).toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between py-2">
                <Text className="text-slate-400">Merchant Receives</Text>
                <Text className="text-green-400 font-semibold">
                  ${(preview.merchantSettlementCents / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* SC Reward Preview */}
        {preview?.customerReward?.eligible && (
          <View className="mx-6 mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <View className="flex-row items-center gap-2 mb-2">
              <BadgeCheck size={20} color="#f97316" />
              <Text className="text-orange-400 font-semibold">SC Reward</Text>
            </View>
            <Text className="text-white text-lg font-bold">
              +{preview.customerReward.estimatedAmount} SC
            </Text>
            <Text className="text-slate-400 text-sm mt-1">
              Governance tokens earned from this purchase
            </Text>
          </View>
        )}

        {/* Shipping Address */}
        <View className="px-6 py-4">
          <Text className="text-white font-semibold mb-2">Shipping Address (Optional)</Text>
          <TextInput
            className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800"
            placeholder="Enter shipping address..."
            placeholderTextColor="#64748b"
            value={shippingAddress}
            onChangeText={setShippingAddress}
            multiline
          />
        </View>

        {/* Note */}
        <View className="px-6 py-4">
          <Text className="text-white font-semibold mb-2">Order Note (Optional)</Text>
          <TextInput
            className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800"
            placeholder="Add a note for the merchant..."
            placeholderTextColor="#64748b"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View className="px-6 py-4 border-t border-slate-800 bg-slate-950">
        <TouchableOpacity
          className={`py-4 rounded-xl flex-row items-center justify-center ${
            processing ? 'bg-slate-700' : 'bg-orange-500'
          }`}
          onPress={handleCheckout}
          disabled={processing}
        >
          {processing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white font-bold text-lg ml-2">Processing...</Text>
            </>
          ) : (
            <>
              <Check size={20} color="#fff" />
              <Text className="text-white font-bold text-lg ml-2">
                Pay ${preview ? (preview.totalChargedCents / 100).toFixed(2) : subtotal.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text className="text-slate-500 text-xs text-center mt-3">
          Payment processed via Stripe
        </Text>
      </View>
    </SafeAreaView>
  );
}
