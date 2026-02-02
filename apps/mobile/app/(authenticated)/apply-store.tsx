import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Store,
  Building2,
  User,
  Heart,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  BadgeCheck,
  Percent,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { coopConfig, coopName } from '@/lib/coop-config';

// Store categories
const STORE_CATEGORIES = [
  { value: 'FOOD_BEVERAGE', label: 'Food & Beverage' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'HEALTH_WELLNESS', label: 'Health & Wellness' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'HOME_GARDEN', label: 'Home & Garden' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'OTHER', label: 'Other' },
];

const REVENUE_RANGES = [
  { value: 'under_10k', label: 'Under $10,000' },
  { value: '10k_50k', label: '$10,000 - $50,000' },
  { value: '50k_100k', label: '$50,000 - $100,000' },
  { value: '100k_500k', label: '$100,000 - $500,000' },
  { value: 'over_500k', label: 'Over $500,000' },
];

type Step = 'store' | 'business' | 'owner' | 'community' | 'review';

export default function ApplyStoreScreen() {
  const { user } = useAuth();
  const config = coopConfig();
  const [currentStep, setCurrentStep] = useState<Step>('store');
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRevenuePicker, setShowRevenuePicker] = useState(false);
  const [showCommitmentPicker, setShowCommitmentPicker] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Store info
    storeName: '',
    storeDescription: '',
    category: '',

    // Business info
    businessName: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessZip: '',

    // Owner info
    ownerName: user?.name || '',
    ownerEmail: user?.email || '',
    ownerPhone: user?.phone || '',

    // Community details
    communityBenefitStatement: '',
    communityCommitmentPercent: config.defaultStoreCommitment,
    estimatedMonthlyRevenue: '',
    websiteUrl: '',
  });

  const updateField = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: 'store', label: 'Store', icon: Store },
    { key: 'business', label: 'Business', icon: Building2 },
    { key: 'owner', label: 'Owner', icon: User },
    { key: 'community', label: 'Community', icon: Heart },
    { key: 'review', label: 'Review', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 'store':
        if (!formData.storeName.trim()) {
          Alert.alert('Required', 'Please enter your store name');
          return false;
        }
        if (!formData.category) {
          Alert.alert('Required', 'Please select a category');
          return false;
        }
        if (!formData.storeDescription.trim() || formData.storeDescription.length < 10) {
          Alert.alert('Required', 'Please describe what your store offers (at least 10 characters)');
          return false;
        }
        return true;
      case 'business':
        if (!formData.businessName.trim()) {
          Alert.alert('Required', 'Please enter your business name');
          return false;
        }
        if (!formData.businessAddress.trim() || !formData.businessCity.trim() ||
            !formData.businessState.trim() || !formData.businessZip.trim()) {
          Alert.alert('Required', 'Please enter your complete business address');
          return false;
        }
        return true;
      case 'owner':
        if (!formData.ownerName.trim() || !formData.ownerEmail.trim() || !formData.ownerPhone.trim()) {
          Alert.alert('Required', 'Please enter all owner information');
          return false;
        }
        return true;
      case 'community':
        if (!formData.communityBenefitStatement.trim() || formData.communityBenefitStatement.length < 20) {
          Alert.alert('Required', 'Please describe how your store will benefit the community (at least 20 characters)');
          return false;
        }
        if (formData.communityCommitmentPercent < config.minStoreCommitment) {
          Alert.alert('Required', `Community commitment must be at least ${config.minStoreCommitment}%`);
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleSubmit = async () => {
    if (!user?.walletAddress) {
      Alert.alert('Error', 'Please ensure you have a wallet address');
      return;
    }

    setLoading(true);
    try {
      // Normalize website URL - add https:// if missing and not empty
      let websiteUrl = formData.websiteUrl?.trim();
      if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${websiteUrl}`;
      }

      await api.applyForStore({
        storeName: formData.storeName,
        storeDescription: formData.storeDescription,
        category: formData.category,
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        businessCity: formData.businessCity,
        businessState: formData.businessState,
        businessZip: formData.businessZip,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        communityBenefitStatement: formData.communityBenefitStatement,
        communityCommitmentPercent: formData.communityCommitmentPercent,
        estimatedMonthlyRevenue: formData.estimatedMonthlyRevenue || undefined,
        websiteUrl: websiteUrl || undefined,
      }, user.walletAddress);

      Alert.alert(
        'Application Submitted!',
        'Your store application has been submitted for review. You will be notified once it is approved.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/stores'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    return STORE_CATEGORIES.find((c) => c.value === value)?.label || 'Select Category';
  };

  const getRevenueLabel = (value: string) => {
    return REVENUE_RANGES.find((r) => r.value === value)?.label || 'Select Range';
  };

  const renderStoreStep = () => (
    <View className="px-5">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Store Information
      </Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Store Name *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="Enter your store name"
          placeholderTextColor="#9CA3AF"
          value={formData.storeName}
          onChangeText={(v) => updateField('storeName', v)}
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category *
        </Text>
        <TouchableOpacity
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex-row items-center justify-between"
        >
          <Text className={formData.category ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
            {getCategoryLabel(formData.category)}
          </Text>
          <ChevronDown size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {showCategoryPicker && (
          <View className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mt-2 overflow-hidden">
            {STORE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => {
                  updateField('category', cat.value);
                  setShowCategoryPicker(false);
                }}
                className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${
                  formData.category === cat.value ? 'bg-amber-50 dark:bg-amber-900/30' : ''
                }`}
              >
                <Text className={`${
                  formData.category === cat.value
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What does your store offer? *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white h-24"
          placeholder="Describe the products or services your store will offer..."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          value={formData.storeDescription}
          onChangeText={(v) => updateField('storeDescription', v)}
        />
        <Text className="text-xs text-gray-500 mt-1">
          {formData.storeDescription.length}/10 minimum characters
        </Text>
      </View>
    </View>
  );

  const renderBusinessStep = () => (
    <View className="px-5">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Business Information
      </Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Name *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="Legal or DBA business name"
          placeholderTextColor="#9CA3AF"
          value={formData.businessName}
          onChangeText={(v) => updateField('businessName', v)}
        />
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Business Address *
      </Text>
      <TextInput
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white mb-3"
        placeholder="Street Address"
        placeholderTextColor="#9CA3AF"
        value={formData.businessAddress}
        onChangeText={(v) => updateField('businessAddress', v)}
      />
      <View className="flex-row gap-3 mb-3">
        <TextInput
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="City"
          placeholderTextColor="#9CA3AF"
          value={formData.businessCity}
          onChangeText={(v) => updateField('businessCity', v)}
        />
        <TextInput
          className="w-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="State"
          placeholderTextColor="#9CA3AF"
          value={formData.businessState}
          onChangeText={(v) => updateField('businessState', v)}
          maxLength={2}
          autoCapitalize="characters"
        />
      </View>
      <TextInput
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white mb-4"
        placeholder="ZIP Code"
        placeholderTextColor="#9CA3AF"
        value={formData.businessZip}
        onChangeText={(v) => updateField('businessZip', v)}
        keyboardType="numeric"
        maxLength={10}
      />
    </View>
  );

  const renderOwnerStep = () => (
    <View className="px-5">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Owner Information
      </Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Name *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="Your full name"
          placeholderTextColor="#9CA3AF"
          value={formData.ownerName}
          onChangeText={(v) => updateField('ownerName', v)}
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="your@email.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.ownerEmail}
          onChangeText={(v) => updateField('ownerEmail', v)}
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="(555) 555-5555"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={formData.ownerPhone}
          onChangeText={(v) => updateField('ownerPhone', v)}
        />
      </View>
    </View>
  );

  const renderCommunityStep = () => (
    <View className="px-5">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Community Commitment
      </Text>

      <View className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 mb-6">
        <View className="flex-row items-center mb-2">
          <Heart size={20} color="#B45309" />
          <Text className="text-amber-800 dark:text-amber-200 font-semibold ml-2">
            Building Together
          </Text>
        </View>
        <Text className="text-amber-700 dark:text-amber-300 text-sm">
          As a {coopName()} store, you commit a percentage of your profits back to the cooperative
          to help grow our community and support other members.
        </Text>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Community Benefit Statement *
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white h-32"
          placeholder="How will your store benefit the community? What impact do you hope to make?"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          value={formData.communityBenefitStatement}
          onChangeText={(v) => updateField('communityBenefitStatement', v)}
        />
        <Text className="text-xs text-gray-500 mt-1">
          {formData.communityBenefitStatement.length}/20 minimum characters
        </Text>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Community Commitment *
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Select the percentage of profits you'll contribute back to the coop
        </Text>
        <TouchableOpacity
          onPress={() => setShowCommitmentPicker(!showCommitmentPicker)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Percent size={18} color="#B45309" />
            <Text className="text-gray-900 dark:text-white font-semibold ml-2">
              {formData.communityCommitmentPercent}%
            </Text>
          </View>
          <ChevronDown size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {showCommitmentPicker && (
          <View className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mt-2 overflow-hidden">
            {config.storeCommitmentOptions.map((percent) => (
              <TouchableOpacity
                key={percent}
                onPress={() => {
                  updateField('communityCommitmentPercent', percent);
                  setShowCommitmentPicker(false);
                }}
                className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between ${
                  formData.communityCommitmentPercent === percent ? 'bg-amber-50 dark:bg-amber-900/30' : ''
                }`}
              >
                <Text className={`${
                  formData.communityCommitmentPercent === percent
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {percent}%
                </Text>
                {percent === config.defaultStoreCommitment && (
                  <Text className="text-xs text-gray-500">(Recommended)</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Estimated Monthly Revenue (Optional)
        </Text>
        <TouchableOpacity
          onPress={() => setShowRevenuePicker(!showRevenuePicker)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex-row items-center justify-between"
        >
          <Text className={formData.estimatedMonthlyRevenue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
            {getRevenueLabel(formData.estimatedMonthlyRevenue)}
          </Text>
          <ChevronDown size={20} color="#9CA3AF" />
        </TouchableOpacity>
        {showRevenuePicker && (
          <View className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mt-2 overflow-hidden">
            {REVENUE_RANGES.map((range) => (
              <TouchableOpacity
                key={range.value}
                onPress={() => {
                  updateField('estimatedMonthlyRevenue', range.value);
                  setShowRevenuePicker(false);
                }}
                className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 ${
                  formData.estimatedMonthlyRevenue === range.value ? 'bg-amber-50 dark:bg-amber-900/30' : ''
                }`}
              >
                <Text className={`${
                  formData.estimatedMonthlyRevenue === range.value
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Website URL (Optional)
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white"
          placeholder="yourwebsite.com or https://yourwebsite.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="url"
          autoCapitalize="none"
          value={formData.websiteUrl}
          onChangeText={(v) => updateField('websiteUrl', v)}
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          We'll add https:// if needed
        </Text>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View className="px-5">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Review Your Application
      </Text>

      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
          Store Information
        </Text>
        <Text className="text-gray-900 dark:text-white font-medium">{formData.storeName}</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm">
          {getCategoryLabel(formData.category)}
        </Text>
        <Text className="text-gray-600 dark:text-gray-300 text-sm mt-1">
          {formData.storeDescription}
        </Text>
      </View>

      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
          Business Information
        </Text>
        <Text className="text-gray-900 dark:text-white font-medium">{formData.businessName}</Text>
        <Text className="text-gray-600 dark:text-gray-300 text-sm mt-1">
          {formData.businessAddress}, {formData.businessCity}, {formData.businessState} {formData.businessZip}
        </Text>
      </View>

      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
          Owner Information
        </Text>
        <Text className="text-gray-900 dark:text-white font-medium">{formData.ownerName}</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm">{formData.ownerEmail}</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm">{formData.ownerPhone}</Text>
      </View>

      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
          Community Commitment
        </Text>
        <View className="flex-row items-center mb-2">
          <Percent size={16} color="#16A34A" />
          <Text className="text-green-600 dark:text-green-400 font-bold ml-1">
            {formData.communityCommitmentPercent}% of profits
          </Text>
        </View>
        <Text className="text-gray-600 dark:text-gray-300 text-sm">
          {formData.communityBenefitStatement}
        </Text>
      </View>

      <View className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 mb-4">
        <View className="flex-row items-center mb-2">
          <BadgeCheck size={20} color="#B45309" />
          <Text className="text-amber-800 dark:text-amber-200 font-semibold ml-2">
            SC Verification
          </Text>
        </View>
        <Text className="text-amber-700 dark:text-amber-300 text-sm">
          Once approved, your store may be eligible for SC Verification, allowing you to
          earn SC tokens from customer purchases and participate in the cooperative economy.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Become a Store
          </Text>
          <View className="w-6" />
        </View>

        {/* Progress Steps */}
        <View className="bg-white dark:bg-gray-800 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;

              return (
                <React.Fragment key={step.key}>
                  <View className="items-center">
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        isActive
                          ? 'bg-amber-500'
                          : isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={20} color="white" />
                      ) : (
                        <Icon size={18} color={isActive ? 'white' : '#9CA3AF'} />
                      )}
                    </View>
                    <Text
                      className={`text-xs mt-1 ${
                        isActive
                          ? 'text-amber-600 dark:text-amber-400 font-semibold'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.label}
                    </Text>
                  </View>
                  {index < steps.length - 1 && (
                    <View
                      className={`flex-1 h-0.5 mx-2 ${
                        index < currentStepIndex
                          ? 'bg-green-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 py-4" showsVerticalScrollIndicator={false}>
          {currentStep === 'store' && renderStoreStep()}
          {currentStep === 'business' && renderBusinessStep()}
          {currentStep === 'owner' && renderOwnerStep()}
          {currentStep === 'community' && renderCommunityStep()}
          {currentStep === 'review' && renderReviewStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View className="px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row gap-3">
            {currentStepIndex > 0 && (
              <TouchableOpacity
                onPress={prevStep}
                className="flex-1 bg-gray-100 dark:bg-gray-700 py-4 rounded-xl"
              >
                <Text className="text-center text-gray-700 dark:text-gray-300 font-semibold">
                  Back
                </Text>
              </TouchableOpacity>
            )}
            {currentStep === 'review' ? (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className="flex-1 bg-amber-500 py-4 rounded-xl"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-white font-bold">Submit Application</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={nextStep}
                className="flex-1 bg-amber-500 py-4 rounded-xl flex-row items-center justify-center"
              >
                <Text className="text-white font-bold mr-2">Continue</Text>
                <ChevronRight size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
