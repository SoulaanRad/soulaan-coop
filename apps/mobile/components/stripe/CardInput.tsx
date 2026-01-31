import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { X } from 'lucide-react-native';
import { CardField, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

interface CardInputProps {
  onSuccess: (card: { brand: string; last4: string }) => void;
  onCancel: () => void;
}

export default function CardInput({ onSuccess, onCancel }: CardInputProps) {
  const { user } = useAuth();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const [adding, setAdding] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id || !cardComplete) return;

    setAdding(true);
    try {
      const { clientSecret } = await api.createSetupIntent(user.id, user.walletAddress);

      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!setupIntent?.paymentMethodId) {
        throw new Error('Failed to create payment method');
      }

      const savedCard = await api.savePaymentMethod(user.id, setupIntent.paymentMethodId, user.walletAddress);
      onSuccess({ brand: savedCard.brand, last4: savedCard.last4 });
    } catch (err) {
      console.error('Error adding card:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add card');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="pt-14 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onCancel} className="p-2 -ml-2">
            <X size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-semibold text-gray-900 -ml-8">
            Add Card
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
          <Text className="text-gray-700 font-medium mb-3">Card Information</Text>
          <View className="border border-gray-300 rounded-lg p-3 bg-white">
            <CardField
              postalCodeEnabled={true}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#111827',
                placeholderColor: '#9CA3AF',
                borderWidth: 0,
                fontSize: 16,
              }}
              style={{ width: '100%', height: 50 }}
              onCardChange={(cardDetails) => setCardComplete(cardDetails.complete)}
            />
          </View>
        </View>

        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <Text className="text-gray-600 text-sm">
            Your card information is securely processed by Stripe. We never store your full card number.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={adding || !cardComplete}
          className={`py-4 rounded-xl items-center ${
            adding || !cardComplete ? 'bg-gray-300' : 'bg-amber-600'
          }`}
        >
          {adding ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Add Card</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
