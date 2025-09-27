import { useState } from 'react';
import { ScrollView, View, Pressable, TextInput } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  Heart,
  Users,
  TrendingUp,
  Store,
  Vote,
  Shield,
  Building,
  Eye,
  EyeOff,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  agreeToCoopValues: boolean;
  // Identity & Eligibility
  identity: string;
  agreeToMission: string;
  // Spending Habits & Demand
  spendingCategories: string[];
  monthlyCommitment: string;
  // Commitment & Participation
  useUC: string;
  acceptFees: string;
  voteOnInvestments: string;
  // Trust & Accountability
  coopExperience: string;
  transparentTransactions: string;
  // Short Answer
  motivation: string;
  desiredService: string;
}

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
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
    spendingCategories: [],
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
      icon: Heart,
      bgColor: 'bg-gradient-to-br from-gold-600 to-red-700',
    },
    {
      title: 'Community Investment',
      subtitle: 'Your Money, Your Neighborhood',
      description:
        'Vote on and fund local projects that create jobs, improve infrastructure, and strengthen our community.',
      icon: Vote,
      bgColor: 'bg-gradient-to-br from-red-700 to-charcoal-800',
    },
    {
      title: 'Support Black Businesses',
      subtitle: 'Shop Local, Build Wealth',
      description:
        'Pay with Unity Coin at local businesses and earn Soulaan Coins for community participation and voting.',
      icon: Store,
      bgColor: 'bg-gradient-to-br from-cream-200 to-gold-600',
    },
    {
      title: 'Collective Economic Power',
      subtitle: 'Stronger Together',
      description:
        'Track community spending, earnings, and wealth building as we grow our economic sovereignty together.',
      icon: TrendingUp,
      bgColor: 'bg-gradient-to-br from-gold-600 to-red-700',
    },
    {
      title: 'Your Voice Matters',
      subtitle: 'Democratic Governance',
      description:
        'Use your Soulaan Coins to vote on community decisions and shape the future of our economic sovereignty.',
      icon: Users,
      bgColor: 'bg-gradient-to-br from-red-700 to-charcoal-800',
    },
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < splashScreens.length + 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToLogin = () => {
    setCurrentStep(splashScreens.length + 4);
  };

  const goToSignup = () => {
    setCurrentStep(splashScreens.length);
  };

  const renderSplashScreen = (index: number) => {
    const screen = splashScreens[index];
    return (
      <ScrollView className="flex-1 bg-background">
        <View className="min-h-screen flex-1 items-center justify-center p-6">
          <Card className={`${screen.bgColor} border-0 w-full max-w-sm shadow-lg`}>
            <CardContent className="p-8">
              <View className="flex items-center justify-center mb-6">
                <Icon as={screen.icon} size={64} className="text-white" />
              </View>
              <Text className="text-2xl font-bold text-white mb-2 text-center">{screen.title}</Text>
              <Text className="text-lg font-semibold text-cream-100 mb-4 text-center">{screen.subtitle}</Text>
              <Text className="text-cream-100 text-sm leading-relaxed text-center">{screen.description}</Text>
            </CardContent>
          </Card>

          {/* Progress Dots */}
          <View className="flex flex-row gap-2 mt-8">
            {splashScreens.map((_, i) => (
              <View
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'bg-gold-600 w-6' : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </View>

          {/* Navigation */}
          <View className="flex flex-row justify-between items-center w-full max-w-sm mt-8">
            <Button
              variant="ghost"
              onPress={prevStep}
              className={`${index === 0 ? 'opacity-0' : 'opacity-100'}`}
              disabled={index === 0}
            >
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
            </Button>

            <Button
              onPress={index === splashScreens.length - 1 ? goToSignup : nextStep}
              className="bg-gold-600"
            >
              <Text className="text-white font-semibold">
                {index === splashScreens.length - 1 ? 'Join Soulaan' : 'Next'}
              </Text>
              <Icon as={ChevronRight} size={16} className="text-white ml-1" />
            </Button>
          </View>

          {/* Skip to Login */}
          {index < splashScreens.length - 1 && (
            <Button variant="ghost" onPress={goToLogin} className="mt-4">
              <Text className="text-charcoal-500">Already a member? </Text>
              <Text className="text-gold-600 font-semibold">Sign In</Text>
            </Button>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderPersonalInfo = () => (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-gold-600 p-3 rounded-full mb-4">
              <Icon as={Building} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Join Soulaan Cooperative</Text>
            <Text className="text-charcoal-600 text-center">Step 1 of 3: Personal Information</Text>
          </View>

          <Card className="bg-white border-cream-200">
            <CardContent className="p-6">
              <View className="gap-4">
                {/* Name Fields */}
                <View className="flex flex-row gap-3">
                  <View className="flex-1">
                    <Label className="text-charcoal-700">First Name</Label>
                    <Input
                      value={formData.firstName}
                      onChangeText={(text) => handleInputChange('firstName', text)}
                      className="mt-1 border-cream-300"
                      placeholder="Marcus"
                    />
                  </View>
                  <View className="flex-1">
                    <Label className="text-charcoal-700">Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChangeText={(text) => handleInputChange('lastName', text)}
                      className="mt-1 border-cream-300"
                      placeholder="Johnson"
                    />
                  </View>
                </View>

                {/* Email */}
                <View>
                  <Label className="text-charcoal-700">Email</Label>
                  <Input
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    className="mt-1 border-cream-300"
                    placeholder="marcus@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Phone */}
                <View>
                  <Label className="text-charcoal-700">Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    className="mt-1 border-cream-300"
                    placeholder="(555) 123-4567"
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Password */}
                <View>
                  <Label className="text-charcoal-700">Password</Label>
                  <View className="relative mt-1">
                    <Input
                      value={formData.password}
                      onChangeText={(text) => handleInputChange('password', text)}
                      className="border-cream-300 pr-12"
                      placeholder="Create a strong password"
                      secureTextEntry={!showPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-0 h-full justify-center"
                    >
                      <Icon
                        as={showPassword ? EyeOff : Eye}
                        size={16}
                        className="text-charcoal-500"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password */}
                <View>
                  <Label className="text-charcoal-700">Confirm Password</Label>
                  <View className="relative mt-1">
                    <Input
                      value={formData.confirmPassword}
                      onChangeText={(text) => handleInputChange('confirmPassword', text)}
                      className="border-cream-300 pr-12"
                      placeholder="Confirm your password"
                      secureTextEntry={!showConfirmPassword}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-0 h-full justify-center"
                    >
                      <Icon
                        as={showConfirmPassword ? EyeOff : Eye}
                        size={16}
                        className="text-charcoal-500"
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Navigation */}
          <View className="flex flex-row justify-between items-center mt-6">
            <Button variant="ghost" onPress={prevStep}>
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
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
              <Text className="text-white font-semibold">Continue</Text>
              <Icon as={ChevronRight} size={16} className="text-white ml-1" />
            </Button>
          </View>

          {/* Login Link */}
          <View className="items-center mt-6">
            <Button variant="ghost" onPress={goToLogin}>
              <Text className="text-charcoal-600">Already a member? </Text>
              <Text className="font-semibold text-gold-700">Sign In</Text>
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderApplicationQuestions = () => (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-red-700 p-3 rounded-full mb-4">
              <Icon as={Heart} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Application Questions</Text>
            <Text className="text-charcoal-600 text-center">Step 2 of 3: Tell us about yourself</Text>
          </View>

          <Card className="bg-white border-cream-200">
            <CardContent className="p-6">
              <View className="gap-6">
                {/* Identity & Eligibility */}
                <View>
                  <Label className="text-charcoal-700 font-medium mb-3">Are you applying as: *</Label>
                  <View className="gap-2">
                    {[
                      { value: 'black-american', label: 'Black American (African American)' },
                      { value: 'afro-caribbean', label: 'Afro-Caribbean' },
                      { value: 'african-immigrant', label: 'African immigrant' },
                      { value: 'ally', label: 'Ally (non-voting)' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={formData.identity === option.value ? 'default' : 'outline'}
                        onPress={() => handleInputChange('identity', option.value)}
                        className="justify-start"
                      >
                        <Text className={formData.identity === option.value ? 'text-white' : 'text-charcoal-700'}>
                          {option.label}
                        </Text>
                      </Button>
                    ))}
                  </View>
                </View>

                {/* Mission Agreement */}
                <View>
                  <Label className="text-charcoal-700 font-medium mb-3">
                    Do you agree that the mission of the Co-op is to circulate and grow Black wealth through collective
                    buying power? *
                  </Label>
                  <View className="flex flex-row gap-4">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={formData.agreeToMission === option.value ? 'default' : 'outline'}
                        onPress={() => handleInputChange('agreeToMission', option.value)}
                        className="flex-1"
                      >
                        <Text className={formData.agreeToMission === option.value ? 'text-white' : 'text-charcoal-700'}>
                          {option.label}
                        </Text>
                      </Button>
                    ))}
                  </View>
                </View>

                {/* Spending Categories */}
                <View>
                  <Label className="text-charcoal-700 font-medium mb-3">
                    What categories do you spend the most on monthly? (Select all that apply) *
                  </Label>
                  <View className="gap-2">
                    {[
                      'Rent/Housing',
                      'Groceries',
                      'Utilities/Phone/Internet',
                      'Transportation (gas, rideshare, car service)',
                      'Healthcare/Insurance',
                      'Retail/Shopping',
                    ].map((category) => (
                      <View key={category} className="flex flex-row items-center gap-2">
                        <Checkbox
                          checked={formData.spendingCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleInputChange('spendingCategories', [...formData.spendingCategories, category]);
                            } else {
                              handleInputChange(
                                'spendingCategories',
                                formData.spendingCategories.filter((c) => c !== category)
                              );
                            }
                          }}
                        />
                        <Text className="text-sm text-charcoal-700 flex-1">{category}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Monthly Commitment */}
                <View>
                  <Label className="text-charcoal-700 font-medium mb-3">
                    Roughly how much of your monthly spending could you commit to route through the Co-op (in UC)? *
                  </Label>
                  <View className="gap-2">
                    {[
                      { value: 'less-250', label: 'Less than $250' },
                      { value: '250-500', label: '$250–$500' },
                      { value: '500-1000', label: '$500–$1,000' },
                      { value: 'over-1000', label: 'Over $1,000' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={formData.monthlyCommitment === option.value ? 'default' : 'outline'}
                        onPress={() => handleInputChange('monthlyCommitment', option.value)}
                        className="justify-start"
                      >
                        <Text className={formData.monthlyCommitment === option.value ? 'text-white' : 'text-charcoal-700'}>
                          {option.label}
                        </Text>
                      </Button>
                    ))}
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Navigation */}
          <View className="flex flex-row justify-between items-center mt-6">
            <Button variant="ghost" onPress={prevStep}>
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
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
              <Text className="text-white font-semibold">Continue</Text>
              <Icon as={ChevronRight} size={16} className="text-white ml-1" />
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderCommitmentQuestions = () => (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-gold-600 p-3 rounded-full mb-4">
              <Icon as={Shield} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Commitment & Trust</Text>
            <Text className="text-charcoal-600 text-center">Step 3 of 3: Final questions</Text>
          </View>

          <Card className="bg-white border-cream-200">
            <CardContent className="p-6">
              <View className="gap-6">
                {/* Commitment Questions */}
                <View className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <Text className="font-semibold text-charcoal-800 mb-4">Are you willing to:</Text>

                  <View className="gap-4">
                    <View>
                      <Label className="text-charcoal-700 font-medium mb-2">
                        Use UC (the co-op&apos;s stablecoin) for purchases and rent? *
                      </Label>
                      <View className="flex flex-row gap-4">
                        {['yes', 'no'].map((option) => (
                          <Button
                            key={option}
                            variant={formData.useUC === option ? 'default' : 'outline'}
                            onPress={() => handleInputChange('useUC', option)}
                            className="flex-1"
                          >
                            <Text className={formData.useUC === option ? 'text-white' : 'text-charcoal-700'}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>
                    </View>

                    <View>
                      <Label className="text-charcoal-700 font-medium mb-2">
                        Accept small fees that go into the Co-op&apos;s wealth fund? *
                      </Label>
                      <View className="flex flex-row gap-4">
                        {['yes', 'no'].map((option) => (
                          <Button
                            key={option}
                            variant={formData.acceptFees === option ? 'default' : 'outline'}
                            onPress={() => handleInputChange('acceptFees', option)}
                            className="flex-1"
                          >
                            <Text className={formData.acceptFees === option ? 'text-white' : 'text-charcoal-700'}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>
                    </View>

                    <View>
                      <Label className="text-charcoal-700 font-medium mb-2">
                        Vote on how the Co-op invests surplus funds (if eligible)? *
                      </Label>
                      <View className="flex flex-row gap-4">
                        {['yes', 'no'].map((option) => (
                          <Button
                            key={option}
                            variant={formData.voteOnInvestments === option ? 'default' : 'outline'}
                            onPress={() => handleInputChange('voteOnInvestments', option)}
                            className="flex-1"
                          >
                            <Text className={formData.voteOnInvestments === option ? 'text-white' : 'text-charcoal-700'}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Trust & Accountability */}
                <View className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                  <Text className="font-semibold text-charcoal-800 mb-4">Trust & Accountability</Text>

                  <View className="gap-4">
                    <View>
                      <Label className="text-charcoal-700 font-medium mb-2">
                        Have you ever participated in a co-op, credit union, or sou-sou (rotating savings club)? *
                      </Label>
                      <View className="flex flex-row gap-4">
                        {['yes', 'no'].map((option) => (
                          <Button
                            key={option}
                            variant={formData.coopExperience === option ? 'default' : 'outline'}
                            onPress={() => handleInputChange('coopExperience', option)}
                            className="flex-1"
                          >
                            <Text className={formData.coopExperience === option ? 'text-white' : 'text-charcoal-700'}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>
                    </View>

                    <View>
                      <Label className="text-charcoal-700 font-medium mb-2">
                        Are you willing to make your Co-op transactions visible on-chain (pseudonymous, but transparent to
                        the community) to support trust? *
                      </Label>
                      <View className="flex flex-row gap-4">
                        {['yes', 'no'].map((option) => (
                          <Button
                            key={option}
                            variant={formData.transparentTransactions === option ? 'default' : 'outline'}
                            onPress={() => handleInputChange('transparentTransactions', option)}
                            className="flex-1"
                          >
                            <Text className={formData.transparentTransactions === option ? 'text-white' : 'text-charcoal-700'}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Optional Short Answers */}
                <View className="gap-4">
                  <View>
                    <Label className="text-charcoal-700 font-medium">
                      Why do you want to join the Soulaan Co-op? (Optional)
                    </Label>
                    <TextInput
                      value={formData.motivation}
                      onChangeText={(text) => handleInputChange('motivation', text)}
                      placeholder="Share your motivation for joining..."
                      multiline
                      numberOfLines={3}
                      className="mt-2 w-full px-3 py-2 border border-cream-300 rounded-md text-base text-foreground"
                      style={{ textAlignVertical: 'top' }}
                    />
                  </View>

                  <View>
                    <Label className="text-charcoal-700 font-medium">
                      What&apos;s one product or service you&apos;d most like to see offered through the Co-op first? (Optional)
                    </Label>
                    <TextInput
                      value={formData.desiredService}
                      onChangeText={(text) => handleInputChange('desiredService', text)}
                      placeholder="What would you like to see offered first..."
                      multiline
                      numberOfLines={3}
                      className="mt-2 w-full px-3 py-2 border border-cream-300 rounded-md text-base text-foreground"
                      style={{ textAlignVertical: 'top' }}
                    />
                  </View>
                </View>

                {/* Terms Agreement */}
                <View className="gap-3 pt-4 border-t border-cream-200">
                  <View className="flex flex-row items-start gap-3">
                    <Checkbox
                      checked={formData.agreeToCoopValues}
                      onCheckedChange={(checked) => handleInputChange('agreeToCoopValues', !!checked)}
                    />
                    <Text className="text-charcoal-800 font-medium flex-1">
                      I align with Soulaan&apos;s values and mission
                    </Text>
                  </View>

                  <View className="flex flex-row items-start gap-3">
                    <Checkbox
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeToTerms', !!checked)}
                    />
                    <Text className="text-charcoal-800 font-medium flex-1">
                      I agree to the Terms of Service and Community Charter
                    </Text>
                  </View>

                  <View className="flex flex-row items-start gap-3">
                    <Checkbox
                      checked={formData.agreeToPrivacy}
                      onCheckedChange={(checked) => handleInputChange('agreeToPrivacy', !!checked)}
                    />
                    <Text className="text-charcoal-800 font-medium flex-1">
                      I agree to the Privacy Policy
                    </Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Navigation */}
          <View className="flex flex-row justify-between items-center mt-6">
            <Button variant="ghost" onPress={prevStep}>
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
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
              <Text className="text-white font-semibold">Submit Application</Text>
              <Icon as={ChevronRight} size={16} className="text-white ml-1" />
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderApplicationSubmitted = () => (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-green-600 p-4 rounded-full mb-4">
              <Icon as={Award} size={40} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Application Submitted!</Text>
            <Text className="text-charcoal-600 text-center">Welcome to the Soulaan community review process</Text>
          </View>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <Text className="font-semibold text-green-800 mb-4">What happens next?</Text>
              <View className="gap-4">
                <View className="flex flex-row items-start gap-3">
                  <View className="bg-green-600 rounded-full w-6 h-6 items-center justify-center">
                    <Text className="text-sm font-bold text-white">1</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-charcoal-800">Community Review</Text>
                    <Text className="text-sm text-charcoal-600">
                      Current Soulaan members will review your application (1-2 weeks)
                    </Text>
                  </View>
                </View>
                <View className="flex flex-row items-start gap-3">
                  <View className="bg-green-600 rounded-full w-6 h-6 items-center justify-center">
                    <Text className="text-sm font-bold text-white">2</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-charcoal-800">Community Interview</Text>
                    <Text className="text-sm text-charcoal-600">You may be invited to meet with community members</Text>
                  </View>
                </View>
                <View className="flex flex-row items-start gap-3">
                  <View className="bg-green-600 rounded-full w-6 h-6 items-center justify-center">
                    <Text className="text-sm font-bold text-white">3</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-charcoal-800">Welcome to Soulaan</Text>
                    <Text className="text-sm text-charcoal-600">
                      If approved, you&apos;ll receive onboarding materials and access
                    </Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>

          <Card className="bg-gold-50 border-gold-200 mt-6">
            <CardContent className="p-4">
              <View className="flex flex-row items-center gap-2">
                <Icon as={Building} size={20} className="text-gold-600" />
                <View className="flex-1">
                  <Text className="font-medium text-gold-800">
                    Application Reference: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                  </Text>
                  <Text className="text-sm text-gold-700">Save this reference number for your records</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Action Button */}
          <View className="mt-8">
            <Button className="w-full bg-gold-600" onPress={goToLogin}>
              <Text className="text-white font-semibold">Continue to Sign In</Text>
            </Button>
          </View>

          {/* Community Message */}
          <View className="items-center mt-6">
            <Badge className="bg-red-700">
              <Text className="text-white font-medium">Building Black Economic Sovereignty Together</Text>
            </Badge>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderLogin = () => (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-red-700 p-3 rounded-full mb-4">
              <Icon as={Building} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Welcome Back</Text>
            <Text className="text-charcoal-600 text-center">Continue building community wealth with Soulaan</Text>
          </View>

          <Card className="bg-white border-cream-200">
            <CardContent className="p-6">
              <View className="gap-5">
                {/* Email */}
                <View>
                  <Label className="text-charcoal-700">Email</Label>
                  <Input
                    className="mt-1 border-cream-300"
                    placeholder="marcus@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Password */}
                <View>
                  <Label className="text-charcoal-700">Password</Label>
                  <View className="relative mt-1">
                    <Input
                      className="border-cream-300 pr-12"
                      placeholder="Enter your password"
                      secureTextEntry={!showPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-0 h-full justify-center"
                    >
                      <Icon
                        as={showPassword ? EyeOff : Eye}
                        size={16}
                        className="text-charcoal-500"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Remember Me & Forgot Password */}
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-2">
                    <Checkbox checked={false} onCheckedChange={function (checked: boolean): void {
                                          throw new Error('Function not implemented.');
                                      } } />
                    <Label className="text-sm text-charcoal-600">Remember me</Label>
                  </View>
                  <Button variant="ghost" className="p-0">
                    <Text className="text-sm text-gold-700">Forgot password?</Text>
                  </Button>
                </View>

                {/* Submit Button */}
                <Button className="w-full bg-red-700 py-3">
                  <Text className="text-white font-semibold">Sign In to Soulaan</Text>
                </Button>
              </View>

              {/* Divider */}
              <View className="relative my-6">
                <View className="absolute inset-0 flex items-center">
                  <View className="w-full border-t border-cream-300" />
                </View>
                <View className="relative flex justify-center">
                  <Text className="px-2 bg-white text-charcoal-500 text-sm">Or continue with</Text>
                </View>
              </View>

              {/* Social Login Options */}
              <View className="gap-3">
                <Button variant="outline" className="w-full border-cream-300">
                  <Text className="text-charcoal-700">Continue with Google</Text>
                </Button>
                <Button variant="outline" className="w-full border-cream-300">
                  <Text className="text-charcoal-700">Continue with Facebook</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {/* Signup Link */}
          <View className="items-center mt-6">
            <Button variant="ghost" onPress={goToSignup}>
              <Text className="text-charcoal-600">Not a member yet? </Text>
              <Text className="font-semibold text-gold-700">Join Soulaan</Text>
            </Button>
          </View>

          {/* Community Notice */}
          <View className="items-center mt-8">
            <Badge className="bg-red-700">
              <Text className="text-white font-medium">Building Black Economic Sovereignty</Text>
            </Badge>
          </View>
        </View>
      </View>
    </ScrollView>
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