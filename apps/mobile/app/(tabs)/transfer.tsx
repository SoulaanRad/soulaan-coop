import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { api } from '~/lib/api';
import QRScanner from '~/components/qr-scanner';

export default function TransferScreen() {
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [recipientMethod, setRecipientMethod] = useState<'username' | 'address'>('username');
  const [recipientInput, setRecipientInput] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // TODO: Get from auth context
  const userId = 'PLACEHOLDER_USER_ID';

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const wallet = await api.getWalletInfo(userId);
      setWalletInfo(wallet);

      if (wallet.hasWallet && wallet.address) {
        const balanceData = await api.getUCBalance(wallet.address);
        setBalance(balanceData.balanceFormatted);
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
      Alert.alert('Error', 'Failed to load wallet information');
    }
  };

  const validateRecipient = async () => {
    if (!recipientInput.trim()) {
      setValidationError('Please enter a recipient');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      if (recipientMethod === 'username') {
        // Find user by username
        const user = await api.getUserByUsername(recipientInput.trim());
        if (user) {
          setRecipientAddress(user.walletAddress);
          setRecipientName(user.displayName);
          setValidationError(null);
        } else {
          setValidationError('Username not found');
          setRecipientAddress('');
          setRecipientName('');
        }
      } else {
        // Validate address
        const validation = await api.validateRecipient(recipientInput.trim());
        if (validation.isValid) {
          setRecipientAddress(recipientInput.trim());
          setRecipientName('');
          setValidationError(null);
        } else {
          setValidationError(validation.error || 'Invalid recipient');
          setRecipientAddress('');
        }
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Validation failed');
      setRecipientAddress('');
      setRecipientName('');
    } finally {
      setIsValidating(false);
    }
  };

  const handleTransfer = async () => {
    if (!recipientAddress) {
      Alert.alert('Error', 'Please validate the recipient first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    Alert.alert(
      'Confirm Transfer',
      `Send ${amount} UC to ${recipientName || recipientAddress.slice(0, 10) + '...'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await api.executeTransfer(userId, recipientAddress, amount);

              Alert.alert('Success', result.message, [
                {
                  text: 'View Details',
                  onPress: () => router.push('/(tabs)/history'),
                },
                { text: 'OK' },
              ]);

              // Reset form
              setRecipientInput('');
              setAmount('');
              setRecipientAddress('');
              setRecipientName('');
              loadWalletData();
            } catch (err) {
              Alert.alert('Transfer Failed', err instanceof Error ? err.message : 'Unknown error');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!walletInfo?.hasWallet) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-xl font-bold text-gray-900 mb-4">No Wallet</Text>
        <Text className="text-center text-gray-600">
          You need a wallet to send Unity Coins
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Balance Display */}
      <View className="bg-white p-4 border-b border-gray-200">
        <Text className="text-gray-500 text-sm">Available Balance</Text>
        <Text className="text-2xl font-bold text-gray-900">{balance} UC</Text>
      </View>

      <View className="p-4">
        {/* Recipient Method Selection */}
        <Text className="text-gray-900 font-semibold mb-3">Send To</Text>
        <View className="flex-row mb-4 bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => {
              setRecipientMethod('username');
              setRecipientInput('');
              setRecipientAddress('');
              setValidationError(null);
            }}
            className={`flex-1 py-2 rounded-md ${recipientMethod === 'username' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-center font-medium ${recipientMethod === 'username' ? 'text-blue-600' : 'text-gray-600'}`}>
              Username
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setRecipientMethod('address');
              setRecipientInput('');
              setRecipientAddress('');
              setValidationError(null);
            }}
            className={`flex-1 py-2 rounded-md ${recipientMethod === 'address' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`text-center font-medium ${recipientMethod === 'address' ? 'text-blue-600' : 'text-gray-600'}`}>
              Address
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recipient Input */}
        <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 font-medium">
              {recipientMethod === 'username' ? 'Username' : 'Wallet Address'}
            </Text>
            {recipientMethod === 'address' && (
              <TouchableOpacity
                onPress={() => setShowQRScanner(true)}
                className="bg-gray-100 px-3 py-1 rounded-md"
              >
                <Text className="text-blue-600 text-sm font-medium">📷 Scan QR</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              placeholder={recipientMethod === 'username' ? 'Enter username' : '0x...'}
              value={recipientInput}
              onChangeText={setRecipientInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={validateRecipient}
              disabled={isValidating}
              className="ml-2 bg-blue-600 px-4 py-3 rounded-lg items-center justify-center"
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">Verify</Text>
              )}
            </TouchableOpacity>
          </View>

          {validationError && (
            <Text className="text-red-600 text-sm mt-2">{validationError}</Text>
          )}

          {recipientAddress && !validationError && (
            <View className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <Text className="text-green-800 font-medium">✓ Recipient Verified</Text>
              {recipientName && (
                <Text className="text-green-700 text-sm mt-1">{recipientName}</Text>
              )}
              <Text className="text-green-600 text-xs mt-1 font-mono">
                {recipientAddress.slice(0, 20)}...
              </Text>
            </View>
          )}
        </View>

        {/* Amount Input */}
        <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 font-medium">Amount</Text>
            <TouchableOpacity
              onPress={() => setAmount(balance)}
              className="bg-gray-100 px-3 py-1 rounded-md"
            >
              <Text className="text-blue-600 text-sm font-medium">Max</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center border border-gray-300 rounded-lg px-4 py-3">
            <TextInput
              className="flex-1 text-gray-900 text-lg"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 font-medium ml-2">UC</Text>
          </View>

          {amount && parseFloat(amount) > 0 && (
            <View className="mt-3 flex-row justify-between">
              <Text className="text-gray-500 text-sm">Transfer Fee (0.1%)</Text>
              <Text className="text-gray-700 text-sm font-medium">
                {(parseFloat(amount) * 0.001).toFixed(4)} UC
              </Text>
            </View>
          )}
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleTransfer}
          disabled={loading || !recipientAddress || !amount}
          className={`py-4 rounded-xl items-center ${
            loading || !recipientAddress || !amount ? 'bg-gray-300' : 'bg-blue-600'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Send UC</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        onRequestClose={() => setShowQRScanner(false)}
      >
        <QRScanner
          onScan={(address: string) => {
            setRecipientInput(address);
            setShowQRScanner(false);
            // Auto-validate the scanned address
            setTimeout(() => validateRecipient(), 100);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      </Modal>
    </ScrollView>
  );
}
