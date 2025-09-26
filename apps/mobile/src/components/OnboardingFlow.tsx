import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
  ChevronRight,
  ChevronLeft,
  Users,
  TrendingUp,
  Store,
  Vote,
  Shield,
  Coins,
  Heart,
  Building,
  Eye,
  EyeOff,
  Award,
} from 'lucide-react-native';

interface OnboardingFlowProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToCoopValues: false,
    // Identity & Eligibility
    identity: '',
    agreeToMission: '',
    // Spending Habits & Demand
    spendingCategories: [] as string[],
    monthlyCommitment: '',
    // Commitment & Participation
    useUC: '',
    acceptFees: '',
    voteOnInvestments: '',
    // Trust & Accountability
    coopExperience: '',
    transparentTransactions: '',
    // Short Answer
    motivation: '',
    desiredService: '',
  });

  const splashScreens = [
    {
      title: 'Welcome to Soulaan',
      subtitle: 'Building Black Economic Sovereignty',
      description:
        'Join our cooperative community to invest together, support local businesses, and build generational wealth.',
      icon: <Heart size={64} color="#D4AF37" />,
      gradient: 'bg-gradient-to-br from-yellow-600 to-red-600',
    },
    {
      title: 'Community Investment',
      subtitle: 'Your Money, Your Neighborhood',
      description:
        'Vote on and fund local projects that create jobs, improve infrastructure, and strengthen our community.',
      icon: <Vote size={64} color="#B91C1C" />,
      gradient: 'bg-gradient-to-br from-red-700 to-gray-800',
    },
    {
      title: 'Support Black Businesses',
      subtitle: 'Shop Local, Build Wealth',
      description:
        'Pay with Unity Coin at local businesses and earn Soulaan Coins for community participation and voting.',
      icon: <Store size={64} color="#D4AF37" />,
      gradient: 'bg-gradient-to-br from-yellow-100 to-yellow-600',
    },
    {
      title: 'Collective Economic Power',
      subtitle: 'Stronger Together',
      description:
        'Track community spending, earnings, and wealth building as we grow our economic sovereignty together.',
      icon: <TrendingUp size={64} color="#B91C1C" />,
      gradient: 'bg-gradient-to-br from-yellow-600 to-red-600',
    },
    {
      title: 'Your Voice Matters',
      subtitle: 'Democratic Governance',
      description:
        'Use your Soulaan Coins to vote on community decisions and shape the future of our economic sovereignty.',
      icon: <Users size={64} color="#D4AF37" />,
      gradient: 'bg-gradient-to-br from-red-700 to-gray-800',
    },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < splashScreens.length + 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToLogin = () => {
    setCurrentStep(splashScreens.length + 3);
  };

  const goToSignup = () => {
    setCurrentStep(splashScreens.length);
  };

  const renderSplashScreen = (index: number) => {
    const screen = splashScreens[index];
    return (
      <View className="min-h-screen flex flex-col items-center justify-center p-6">
        <Card className={`${screen.gradient} w-full max-w-sm border-0`}>
          <CardContent className="p-8">
            <View className="flex justify-center mb-6">{screen.icon}</View>
            <Text className="text-2xl font-bold text-white mb-2 text-center">{screen.title}</Text>
            <Text className="text-lg font-semibold text-yellow-100 mb-4 text-center">{screen.subtitle}</Text>
            <Text className="text-yellow-100 text-sm leading-relaxed text-center">{screen.description}</Text>
          </CardContent>
        </Card>

        {/* Progress Dots */}
        <View className="flex-row space-x-2 mt-8">
          {splashScreens.map((_, i) => (
            <View
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === index ? 'bg-yellow-600 w-6' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>

        {/* Navigation */}
        <View className="flex-row justify-between items-center w-full max-w-sm mt-8">
          <Button
            variant="ghost"
            onPress={prevStep}
            className={`text-gray-600 ${index === 0 ? 'invisible' : ''}`}
          >
            <ChevronLeft size={16} color="#4B5563" />
            <Text className="ml-1">Back</Text>
          </Button>

          <Button
            onPress={index === splashScreens.length - 1 ? goToSignup : nextStep}
            className="bg-yellow-600"
          >
            <Text className="text-white">
              {index === splashScreens.length - 1 ? 'Join Soulaan' : 'Next'}
            </Text>
            <ChevronRight size={16} color="white" />
          </Button>
        </View>

        {/* Skip to Login */}
        {index < splashScreens.length - 1 && (
          <View className="mt-4">
            <Button variant="ghost" onPress={goToLogin}>
              <Text className="text-gray-500">Already a member? Sign In</Text>
            </Button>
            {onSkip && (
              <Button variant="ghost" onPress={async () => {
                try {
                  await AsyncStorage.setItem('hasSeenOnboarding', 'true');
                  onSkip();
                } catch (error) {
                  console.error('Error saving onboarding status:', error);
                  onSkip();
                }
              }} className="mt-2">
                <Text className="text-gray-400">Skip for now</Text>
              </Button>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPersonalInfo = () => (
    <ScrollView className="min-h-screen flex flex-col justify-center p-6">
      <View className="w-full max-w-md mx-auto">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="flex justify-center mb-4">
            <View className="bg-yellow-600 p-3 rounded-full">
              <Building size={32} color="white" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">Join Soulaan Cooperative</Text>
          <Text className="text-gray-600 text-center">Step 1 of 3: Personal Information</Text>
        </View>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <View className="space-y-4">
              {/* Name Fields */}
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChangeText={(text) => handleInputChange('firstName', text)}
                    placeholder="Marcus"
                    className="mt-1"
                  />
                </View>
                <View className="flex-1">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChangeText={(text) => handleInputChange('lastName', text)}
                    placeholder="Johnson"
                    className="mt-1"
                  />
                </View>
              </View>

              {/* Email */}
              <View>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  placeholder="marcus@example.com"
                  className="mt-1"
                />
              </View>

              {/* Phone */}
              <View>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </View>

              {/* Password */}
              <View>
                <Label>Password</Label>
                <View className="relative mt-1">
                  <Input
                    type="password"
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    placeholder="Create a strong password"
                    className="pr-10"
                  />
                </View>
              </View>

              {/* Confirm Password */}
              <View>
                <Label>Confirm Password</Label>
                <View className="relative mt-1">
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    placeholder="Confirm your password"
                    className="pr-10"
                  />
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Navigation */}
        <View className="flex-row justify-between items-center mt-6">
          <Button variant="ghost" onPress={prevStep}>
            <ChevronLeft size={16} color="#4B5563" />
            <Text className="ml-1 text-gray-600">Back</Text>
          </Button>
          <Button
            onPress={nextStep}
            disabled={
              !formData.firstName ||
              !formData.lastName ||
              !formData.email ||
              !formData.password ||
              !formData.confirmPassword
            }
            className="bg-red-700"
          >
            <Text className="text-white">Continue</Text>
            <ChevronRight size={16} color="white" />
          </Button>
        </View>

        {/* Login Link */}
        <View className="items-center mt-6">
          <Button variant="ghost" onPress={goToLogin}>
            <Text className="text-gray-600">
              Already a member? <Text className="font-semibold text-yellow-700">Sign In</Text>
            </Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );

  const renderApplicationQuestions = () => (
    <ScrollView className="min-h-screen flex flex-col justify-center p-6">
      <View className="w-full max-w-md mx-auto">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="flex justify-center mb-4">
            <View className="bg-red-700 p-3 rounded-full">
              <Heart size={32} color="white" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">Application Questions</Text>
          <Text className="text-gray-600 text-center">Step 2 of 3: Tell us about yourself</Text>
        </View>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <View className="space-y-6">
              {/* Identity & Eligibility */}
              <View>
                <Label className="font-medium mb-3">Are you applying as: *</Label>
                <View className="space-y-2">
                  {[
                    { value: 'black-american', label: 'Black American (African American)' },
                    { value: 'afro-caribbean', label: 'Afro-Caribbean' },
                    { value: 'african-immigrant', label: 'African immigrant' },
                    { value: 'ally', label: 'Ally (non-voting)' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleInputChange('identity', option.value)}
                      className="flex-row items-center space-x-2 py-2"
                    >
                      <View className={`w-4 h-4 rounded-full border-2 ${
                        formData.identity === option.value ? 'bg-red-600 border-red-600' : 'border-gray-300'
                      }`}>
                        {formData.identity === option.value && (
                          <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </View>
                      <Text className="text-sm text-gray-700 flex-1">{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Mission Agreement */}
              <View>
                <Label className="font-medium mb-3">
                  Do you agree that the mission of the Co-op is to circulate and grow Black wealth through collective
                  buying power? *
                </Label>
                <View className="space-y-2">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleInputChange('agreeToMission', option.value)}
                      className="flex-row items-center space-x-2 py-2"
                    >
                      <View className={`w-4 h-4 rounded-full border-2 ${
                        formData.agreeToMission === option.value ? 'bg-red-600 border-red-600' : 'border-gray-300'
                      }`}>
                        {formData.agreeToMission === option.value && (
                          <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </View>
                      <Text className="text-sm text-gray-700">{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Spending Categories */}
              <View>
                <Label className="font-medium mb-3">
                  What categories do you spend the most on monthly? (Select all that apply) *
                </Label>
                <View className="space-y-2">
                  {[
                    'Rent/Housing',
                    'Groceries',
                    'Utilities/Phone/Internet',
                    'Transportation (gas, rideshare, car service)',
                    'Healthcare/Insurance',
                    'Retail/Shopping',
                  ].map((category) => (
                    <View key={category} className="flex-row items-center space-x-2 py-2">
                      <Checkbox
                        checked={formData.spendingCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleInputChange('spendingCategories', [...formData.spendingCategories, category]);
                          } else {
                            handleInputChange(
                              'spendingCategories',
                              formData.spendingCategories.filter((c) => c !== category),
                            );
                          }
                        }}
                      />
                      <Text className="text-sm text-gray-700 flex-1">{category}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Monthly Commitment */}
              <View>
                <Label className="font-medium mb-3">
                  Roughly how much of your monthly spending could you commit to route through the Co-op (in UC)? *
                </Label>
                <View className="space-y-2">
                  {[
                    { value: 'less-250', label: 'Less than $250' },
                    { value: '250-500', label: '$250–$500' },
                    { value: '500-1000', label: '$500–$1,000' },
                    { value: 'over-1000', label: 'Over $1,000' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleInputChange('monthlyCommitment', option.value)}
                      className="flex-row items-center space-x-2 py-2"
                    >
                      <View className={`w-4 h-4 rounded-full border-2 ${
                        formData.monthlyCommitment === option.value ? 'bg-red-600 border-red-600' : 'border-gray-300'
                      }`}>
                        {formData.monthlyCommitment === option.value && (
                          <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </View>
                      <Text className="text-sm text-gray-700">{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Navigation */}
        <View className="flex-row justify-between items-center mt-6">
          <Button variant="ghost" onPress={prevStep}>
            <ChevronLeft size={16} color="#4B5563" />
            <Text className="ml-1 text-gray-600">Back</Text>
          </Button>
          <Button
            onPress={nextStep}
            disabled={
              !formData.identity ||
              !formData.agreeToMission ||
              formData.spendingCategories.length === 0 ||
              !formData.monthlyCommitment
            }
            className="bg-red-700"
          >
            <Text className="text-white">Continue</Text>
            <ChevronRight size={16} color="white" />
          </Button>
        </View>
      </View>
    </ScrollView>
  );

  const renderCommitmentQuestions = () => (
    <ScrollView className="min-h-screen flex flex-col justify-center p-6">
      <View className="w-full max-w-md mx-auto">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="flex justify-center mb-4">
            <View className="bg-yellow-600 p-3 rounded-full">
              <Shield size={32} color="white" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">Commitment & Trust</Text>
          <Text className="text-gray-600 text-center">Step 3 of 3: Final questions</Text>
        </View>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <View className="space-y-6">
              {/* Commitment Questions */}
              <View className="bg-red-50 border border-red-200 rounded-lg p-4">
                <Text className="font-semibold text-gray-800 mb-4">Are you willing to:</Text>

                <View className="space-y-4">
                  <View>
                    <Label className="font-medium mb-2">
                      Use UC (the co-op's stablecoin) for purchases and rent? *
                    </Label>
                    <View className="flex-row space-x-4">
                      {['yes', 'no'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange('useUC', option)}
                          className="flex-row items-center space-x-2"
                        >
                          <View className={`w-4 h-4 rounded-full border-2 ${
                            formData.useUC === option ? 'bg-red-600 border-red-600' : 'border-gray-300'
                          }`}>
                            {formData.useUC === option && (
                              <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </View>
                          <Text className="text-sm text-gray-700 capitalize">{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Label className="font-medium mb-2">
                      Accept small fees that go into the Co-op's wealth fund? *
                    </Label>
                    <View className="flex-row space-x-4">
                      {['yes', 'no'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange('acceptFees', option)}
                          className="flex-row items-center space-x-2"
                        >
                          <View className={`w-4 h-4 rounded-full border-2 ${
                            formData.acceptFees === option ? 'bg-red-600 border-red-600' : 'border-gray-300'
                          }`}>
                            {formData.acceptFees === option && (
                              <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </View>
                          <Text className="text-sm text-gray-700 capitalize">{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Label className="font-medium mb-2">
                      Vote on how the Co-op invests surplus funds (if eligible)? *
                    </Label>
                    <View className="flex-row space-x-4">
                      {['yes', 'no'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange('voteOnInvestments', option)}
                          className="flex-row items-center space-x-2"
                        >
                          <View className={`w-4 h-4 rounded-full border-2 ${
                            formData.voteOnInvestments === option ? 'bg-red-600 border-red-600' : 'border-gray-300'
                          }`}>
                            {formData.voteOnInvestments === option && (
                              <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </View>
                          <Text className="text-sm text-gray-700 capitalize">{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Trust & Accountability */}
              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <Text className="font-semibold text-gray-800 mb-4">Trust & Accountability</Text>

                <View className="space-y-4">
                  <View>
                    <Label className="font-medium mb-2">
                      Have you ever participated in a co-op, credit union, or sou-sou (rotating savings club)? *
                    </Label>
                    <View className="flex-row space-x-4">
                      {['yes', 'no'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange('coopExperience', option)}
                          className="flex-row items-center space-x-2"
                        >
                          <View className={`w-4 h-4 rounded-full border-2 ${
                            formData.coopExperience === option ? 'bg-red-600 border-red-600' : 'border-gray-300'
                          }`}>
                            {formData.coopExperience === option && (
                              <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </View>
                          <Text className="text-sm text-gray-700 capitalize">{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Label className="font-medium mb-2">
                      Are you willing to make your Co-op transactions visible on-chain (pseudonymous, but transparent to
                      the community) to support trust? *
                    </Label>
                    <View className="flex-row space-x-4">
                      {['yes', 'no'].map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => handleInputChange('transparentTransactions', option)}
                          className="flex-row items-center space-x-2"
                        >
                          <View className={`w-4 h-4 rounded-full border-2 ${
                            formData.transparentTransactions === option ? 'bg-red-600 border-red-600' : 'border-gray-300'
                          }`}>
                            {formData.transparentTransactions === option && (
                              <View className="w-2 h-2 bg-white rounded-full m-0.5" />
                            )}
                          </View>
                          <Text className="text-sm text-gray-700 capitalize">{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Optional Short Answers */}
              <View className="space-y-4">
                <View>
                  <Label className="font-medium">Why do you want to join the Soulaan Co-op? (Optional)</Label>
                  <TextInput
                    value={formData.motivation}
                    onChangeText={(text) => handleInputChange('motivation', text)}
                    placeholder="Share your motivation for joining..."
                    multiline
                    numberOfLines={3}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </View>

                <View>
                  <Label className="font-medium">
                    What's one product or service you'd most like to see offered through the Co-op first? (Optional)
                  </Label>
                  <TextInput
                    value={formData.desiredService}
                    onChangeText={(text) => handleInputChange('desiredService', text)}
                    placeholder="What would you like to see offered first..."
                    multiline
                    numberOfLines={3}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </View>
              </View>

              {/* Terms Agreement */}
              <View className="space-y-3 pt-4 border-t border-gray-200">
                <View className="flex-row items-start space-x-3">
                  <Checkbox
                    checked={formData.agreeToCoopValues}
                    onCheckedChange={(checked) => handleInputChange('agreeToCoopValues', checked as boolean)}
                  />
                  <View className="flex-1">
                    <Label className="font-medium">
                      I align with Soulaan's values and mission
                    </Label>
                  </View>
                </View>

                <View className="flex-row items-start space-x-3">
                  <Checkbox
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                  />
                  <View className="flex-1">
                    <Label className="font-medium">
                      I agree to the Terms of Service and Community Charter
                    </Label>
                  </View>
                </View>

                <View className="flex-row items-start space-x-3">
                  <Checkbox
                    checked={formData.agreeToPrivacy}
                    onCheckedChange={(checked) => handleInputChange('agreeToPrivacy', checked as boolean)}
                  />
                  <View className="flex-1">
                    <Label className="font-medium">
                      I agree to the Privacy Policy
                    </Label>
                  </View>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Navigation */}
        <View className="flex-row justify-between items-center mt-6">
          <Button variant="ghost" onPress={prevStep}>
            <ChevronLeft size={16} color="#4B5563" />
            <Text className="ml-1 text-gray-600">Back</Text>
          </Button>
          <Button
            onPress={nextStep}
            disabled={
              !formData.useUC ||
              !formData.acceptFees ||
              !formData.voteOnInvestments ||
              !formData.coopExperience ||
              !formData.transparentTransactions ||
              !formData.agreeToCoopValues ||
              !formData.agreeToTerms ||
              !formData.agreeToPrivacy
            }
            className="bg-red-700"
          >
            <Text className="text-white">Submit Application</Text>
            <ChevronRight size={16} color="white" />
          </Button>
        </View>
      </View>
    </ScrollView>
  );

  const renderApplicationSubmitted = () => (
    <View className="min-h-screen flex flex-col justify-center p-6">
      <View className="w-full max-w-md mx-auto">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="flex justify-center mb-4">
            <View className="bg-green-600 p-4 rounded-full">
              <Award size={40} color="white" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">Application Submitted!</Text>
          <Text className="text-gray-600 text-center">Welcome to the Soulaan community review process</Text>
        </View>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <Text className="font-semibold text-green-800 mb-4">What happens next?</Text>
            <View className="space-y-4">
              <View className="flex-row items-start space-x-3">
                <View className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <Text className="text-sm font-bold text-white">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">Community Review</Text>
                  <Text className="text-sm text-gray-600">
                    Current Soulaan members will review your application (1-2 weeks)
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start space-x-3">
                <View className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <Text className="text-sm font-bold text-white">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">Community Interview</Text>
                  <Text className="text-sm text-gray-600">You may be invited to meet with community members</Text>
                </View>
              </View>
              <View className="flex-row items-start space-x-3">
                <View className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <Text className="text-sm font-bold text-white">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">Welcome to Soulaan</Text>
                  <Text className="text-sm text-gray-600">
                    If approved, you'll receive onboarding materials and access
                  </Text>
                </View>
              </View>
            </View>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200 mt-6">
          <CardContent className="p-4">
            <View className="flex-row items-center space-x-2">
              <Building size={20} color="#D4AF37" />
              <View className="flex-1">
                <Text className="font-medium text-yellow-800">
                  Application Reference: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                </Text>
                <Text className="text-sm text-yellow-700">Save this reference number for your records</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Action Button */}
        <View className="mt-8">
          <Button className="w-full bg-yellow-600" onPress={async () => {
            if (onComplete) {
              // Save that user has completed onboarding
              try {
                await AsyncStorage.setItem('hasSeenOnboarding', 'true');
                onComplete();
              } catch (error) {
                console.error('Error saving onboarding status:', error);
                onComplete();
              }
            } else {
              goToLogin();
            }
          }}>
            <Text className="text-white">Continue to Sign In</Text>
          </Button>
        </View>

        {/* Community Message */}
        <View className="mt-6 items-center">
          <Badge className="bg-red-700">
            <Text className="text-white">Building Black Economic Sovereignty Together</Text>
          </Badge>
        </View>
      </View>
    </View>
  );

  const renderLogin = () => (
    <View className="min-h-screen flex flex-col justify-center p-6">
      <View className="w-full max-w-md mx-auto">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="flex justify-center mb-4">
            <View className="bg-red-700 p-3 rounded-full">
              <Coins size={32} color="white" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">Welcome Back</Text>
          <Text className="text-gray-600 text-center">Continue building community wealth with Soulaan</Text>
        </View>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-6">
            <View className="space-y-5">
              {/* Email */}
              <View>
                <Label>Email</Label>
                <Input
                  type="email"
                  value=""
                  onChangeText={() => {}}
                  placeholder="marcus@example.com"
                  className="mt-1"
                />
              </View>

              {/* Password */}
              <View>
                <Label>Password</Label>
                <View className="relative mt-1">
                  <Input
                    type="password"
                    value=""
                    onChangeText={() => {}}
                    placeholder="Enter your password"
                    className="pr-10"
                  />
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-2">
                  <Checkbox checked={false} onCheckedChange={() => {}} />
                  <Text className="text-sm text-gray-600">Remember me</Text>
                </View>
                <Button variant="ghost">
                  <Text className="text-sm text-yellow-700">Forgot password?</Text>
                </Button>
              </View>

              {/* Submit Button */}
              <Button className="w-full bg-red-700 py-3">
                <Text className="text-white">Sign In to Soulaan</Text>
              </Button>
            </View>

            {/* Divider */}
            <View className="relative my-6">
              <View className="absolute inset-0 flex items-center">
                <View className="w-full border-t border-gray-300" />
              </View>
              <View className="relative flex justify-center">
                <Text className="px-2 bg-white text-gray-500 text-sm">Or continue with</Text>
              </View>
            </View>

            {/* Social Login Options */}
            <View className="space-y-3">
              <Button variant="outline" className="w-full border-gray-300">
                <Text className="text-gray-700">Continue with Google</Text>
              </Button>
              <Button variant="outline" className="w-full border-gray-300">
                <Text className="text-gray-700">Continue with Facebook</Text>
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Signup Link */}
        <View className="items-center mt-6">
          <Button variant="ghost" onPress={goToSignup}>
            <Text className="text-gray-600">
              Not a member yet? <Text className="font-semibold text-yellow-700">Join Soulaan</Text>
            </Text>
          </Button>
        </View>

        {/* Community Notice */}
        <View className="mt-8 items-center">
          <Badge className="bg-red-700">
            <Text className="text-white">Building Black Economic Sovereignty</Text>
          </Badge>
        </View>
      </View>
    </View>
  );

  // Determine which step to render
  const renderCurrentStep = () => {
    if (currentStep < splashScreens.length) {
      return renderSplashScreen(currentStep);
    } else if (currentStep === splashScreens.length) {
      return renderPersonalInfo();
    } else if (currentStep === splashScreens.length + 1) {
      return renderApplicationQuestions();
    } else if (currentStep === splashScreens.length + 2) {
      return renderCommitmentQuestions();
    } else if (currentStep === splashScreens.length + 3) {
      return renderApplicationSubmitted();
    } else {
      return renderLogin();
    }
  };

  return renderCurrentStep();
}
