import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { ArrowLeft, User, Search, X, Check, AlertCircle, CheckCircle } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { authenticateForPayment } from '@/lib/biometric';
import { coopConfig } from '@/lib/coop-config';

type PaymentStep = 'recipient' | 'amount' | 'confirm';

interface Recipient {
  id?: string;
  name?: string;
  phone: string;
  isSoulaanUser: boolean;
}

export default function PayScreen() {
  const { user } = useAuth();
  const config = coopConfig();
  const [step, setStep] = useState<PaymentStep>('recipient');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceFormatted, setBalanceFormatted] = useState<string>('$0.00');

  // Recipient state
  const [searchQuery, setSearchQuery] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);

  // Amount state
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadBalance();
    }
  }, [user?.id]);

  const loadBalance = async () => {
    if (!user?.id) return;

    try {
      const result = await api.getUSDBalance(user.id, user.walletAddress);
      setBalance(result.balance);
      setBalanceFormatted(result.formatted);
    } catch (err) {
      console.error('Error loading balance:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Check if it looks like a phone number
    const isPhoneNumber = /^[\d\s\-\+\(\)]+$/.test(query) && query.replace(/\D/g, '').length >= 7;

    if (isPhoneNumber) {
      const cleanPhone = query.replace(/\D/g, '');
      // Try to look up by phone first
      setSearching(true);
      try {
        const result = await api.lookupRecipient(cleanPhone, 'phone', user?.walletAddress);
        if (result.found && result.isSoulaanUser && result.userId) {
          setSearchResults([
            {
              id: result.userId,
              name: result.displayName || undefined,
              phone: cleanPhone,
              isSoulaanUser: true,
            },
          ]);
        } else {
          // Not a user, allow sending to this phone
          setSearchResults([
            {
              phone: cleanPhone,
              isSoulaanUser: false,
            },
          ]);
        }
      } catch (err) {
        // If lookup fails, still allow sending to phone
        setSearchResults([
          {
            phone: cleanPhone,
            isSoulaanUser: false,
          },
        ]);
      } finally {
        setSearching(false);
      }
    } else {
      // Search for users by username
      setSearching(true);
      try {
        const result = await api.lookupRecipient(query, 'username', user?.walletAddress);
        if (result.found && result.isSoulaanUser && result.userId) {
          setSearchResults([
            {
              id: result.userId,
              name: result.displayName || undefined,
              phone: query, // Username as placeholder since we don't have phone
              isSoulaanUser: true,
            },
          ]);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Error searching:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }
  };

  const selectRecipient = (r: Recipient) => {
    setRecipient(r);
    setSearchQuery('');
    setSearchResults([]);
    setStep('amount');
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
  };

  const canProceedToConfirm = () => {
    const amountNum = parseFloat(amount);
    return amountNum > 0 && amountNum <= 10000;
  };

  const resetForm = () => {
    setStep('recipient');
    setRecipient(null);
    setAmount('');
    setNote('');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleConfirm = async () => {
    if (!user?.id || !recipient) return;

    const amountNum = parseFloat(amount);

    // Biometric authentication
    const authResult = await authenticateForPayment(`$${amountNum.toFixed(2)}`);
    if (!authResult.success) {
      if (authResult.error) {
        setErrorMessage(authResult.error);
        setShowErrorModal(true);
      }
      return;
    }

    setLoading(true);
    try {
      // Determine recipient type and value
      const recipientType = recipient.isSoulaanUser ? 'userId' : 'phone';
      const recipientValue = recipient.isSoulaanUser ? recipient.id! : recipient.phone;

      const result = await api.sendPayment(
        user.id,
        recipientValue,
        recipientType,
        amountNum,
        note || undefined,
        user.walletAddress
      );

      if (result.success) {
        const msg = recipient.isSoulaanUser
          ? `$${amountNum.toFixed(2)} sent to ${recipient.name || recipient.phone}`
          : `$${amountNum.toFixed(2)} sent to ${recipient.phone}. They'll receive a text to claim it.`;
        setSuccessMessage(msg);
        setShowSuccessModal(true);
      } else {
        setErrorMessage(result.error || 'Something went wrong. Please try again.');
        setShowErrorModal(true);
        resetForm();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setErrorMessage(errMsg);
      setShowErrorModal(true);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'amount') {
      setStep('recipient');
      setRecipient(null);
    } else if (step === 'confirm') {
      setStep('amount');
    }
    // Don't navigate back from recipient step - it's a tab
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="pt-14 pb-4 px-4 border-b border-gray-100">
          <View className="flex-row items-center">
            {step !== 'recipient' ? (
              <TouchableOpacity onPress={goBack} className="p-2 -ml-2">
                <ArrowLeft size={24} color="#111827" />
              </TouchableOpacity>
            ) : (
              <View className="w-10" />
            )}
            <Text className="flex-1 text-center text-lg font-semibold text-gray-900">
              {step === 'recipient' && 'Send Money'}
              {step === 'amount' && 'Enter Amount'}
              {step === 'confirm' && 'Confirm Payment'}
            </Text>
            <View className="w-10" />
          </View>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Step 1: Recipient Selection */}
          {step === 'recipient' && (
            <View className="p-4">
              {/* Search Input */}
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
                <Search size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-3 text-gray-900 text-base"
                  placeholder="Phone number or username"
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {searching && (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#6B7280" />
                </View>
              )}

              {!searching && searchResults.length > 0 && (
                <View className="bg-white rounded-xl border border-gray-200">
                  {searchResults.map((r, index) => (
                    <TouchableOpacity
                      key={r.id || r.phone}
                      onPress={() => selectRecipient(r)}
                      className={`flex-row items-center p-4 ${
                        index < searchResults.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-3">
                        <User size={24} color="#6B7280" />
                      </View>
                      <View className="flex-1">
                        {r.name && (
                          <Text className="text-gray-900 font-medium">{r.name}</Text>
                        )}
                        <Text className={r.name ? 'text-gray-500 text-sm' : 'text-gray-900 font-medium'}>
                          {r.phone}
                        </Text>
                        {r.isSoulaanUser && (
                          <View className="flex-row items-center mt-1">
                            <Check size={12} color="#16A34A" />
                            <Text className="text-green-600 text-xs ml-1">{config.shortName} member</Text>
                          </View>
                        )}
                        {!r.isSoulaanUser && (
                          <Text className="text-gray-400 text-xs mt-1">
                            They&apos;ll receive a text to claim
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Instructions */}
              {searchQuery.length === 0 && (
                <View className="mt-8 items-center">
                  <Text className="text-gray-500 text-center">
                    Enter a phone number or username to send money
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step 2: Amount Entry */}
          {step === 'amount' && recipient && (
            <View className="p-4">
              {/* Recipient Display */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl mb-6">
                <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center mr-3">
                  <User size={24} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    {recipient.name || recipient.phone}
                  </Text>
                  {recipient.name && (
                    <Text className="text-gray-500 text-sm">{recipient.phone}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setStep('recipient')}>
                  <Text className="text-amber-700">Change</Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View className="items-center py-8">
                <View className="flex-row items-center">
                  <Text className="text-gray-400 text-5xl">$</Text>
                  <TextInput
                    className="text-gray-900 text-5xl font-bold min-w-[100px]"
                    placeholder="0"
                    placeholderTextColor="#D1D5DB"
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    autoFocus
                    textAlign="center"
                  />
                </View>
                <Text className="text-gray-500 mt-2">Available: {balanceFormatted}</Text>
              </View>

              {/* Note Input */}
              <View className="mb-6">
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="Add a note (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={note}
                  onChangeText={setNote}
                  maxLength={100}
                />
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={() => setStep('confirm')}
                disabled={!canProceedToConfirm()}
                className={`py-4 rounded-xl items-center ${
                  canProceedToConfirm() ? 'bg-amber-600' : 'bg-gray-300'
                }`}
              >
                <Text className="text-white font-bold text-lg">Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && recipient && (
            <View className="p-4">
              {/* Summary Card */}
              <View className="bg-gray-50 rounded-xl p-6 mb-6">
                <Text className="text-gray-500 text-center mb-2">You&apos;re sending</Text>
                <Text className="text-gray-900 text-4xl font-bold text-center mb-4">
                  ${parseFloat(amount).toFixed(2)}
                </Text>
                <Text className="text-gray-500 text-center mb-1">to</Text>
                <Text className="text-gray-900 text-lg font-medium text-center">
                  {recipient.name || recipient.phone}
                </Text>
                {note && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <Text className="text-gray-500 text-sm text-center">
                      &quot;{note}&quot;
                    </Text>
                  </View>
                )}
              </View>

              {/* Non-user notice */}
              {!recipient.isSoulaanUser && (
                <View className="bg-amber-50 rounded-xl p-4 mb-6">
                  <Text className="text-amber-800 text-sm">
                    {recipient.phone} isn&apos;t on {config.shortName} yet. They&apos;ll receive a text message
                    with a link to claim this payment.
                  </Text>
                </View>
              )}

              {/* Funding source */}
              {parseFloat(amount) > balance && (
                <View className="bg-yellow-50 rounded-xl p-4 mb-6">
                  <Text className="text-yellow-800 text-sm font-medium">
                    Your default payment method will be charged for the difference.
                  </Text>
                </View>
              )}

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={loading}
                className={`py-4 rounded-xl items-center ${loading ? 'bg-amber-400' : 'bg-amber-600'}`}
              >
                {loading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold text-lg ml-2">Sending...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Pay ${parseFloat(amount).toFixed(2)}
                  </Text>
                )}
              </TouchableOpacity>

              <Text className="text-gray-400 text-xs text-center mt-4">
                You&apos;ll be asked to confirm with Face ID or fingerprint
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.back();
        }}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
                <CheckCircle size={32} color="#16a34a" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">Payment Sent!</Text>
            </View>
            <Text className="text-gray-600 text-center mb-6">{successMessage}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              className="bg-green-600 py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
                <AlertCircle size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">Payment Failed</Text>
            </View>
            <Text className="text-gray-600 text-center mb-6">{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setShowErrorModal(false)}
              className="bg-gray-900 py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
