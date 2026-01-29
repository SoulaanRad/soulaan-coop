import React, { useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Alert } from 'react-native';
import { useSubmitApplication } from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import { getApiUrl } from '@/lib/config';
import type { ApplicationData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import VideoUpload from '@/components/video-upload';
import PhotoUpload from '@/components/photo-upload';
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
  Camera,
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
  // Media uploads
  videoCID: string;
  photoCID: string;
}

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCoopId, setSelectedCoopId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loginData, setLoginData] = useState({
    email: '',
    code: '',
  });
  const [codeSent, setCodeSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [loginError, setLoginError] = useState<string>('');

  // API hooks
  const { submitApplication, isLoading: isSubmitting, error: submitError, clearError: clearSubmitError } = useSubmitApplication();
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const { login } = useAuth();

  // Display errors if they exist
  if (submitError) {
    console.error('Submit error:', submitError);
  }
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
    // Media uploads
    videoCID: '',
    photoCID: '',
  });

  // Generic platform introduction screens
  const splashScreens = [
    {
      title: 'Welcome to Coop',
      subtitle: 'Where Communities Build Together',
      description:
        'Join cooperative communities that invest together, support local businesses, and build shared wealth through collective economic power.',
      icon: Heart,
      bgColor: 'bg-gold-600',
    },
    {
      title: 'What is a Co-op?',
      subtitle: 'Democracy Meets Economics',
      description:
        'A cooperative is owned and governed by its members. Your voice matters, your spending builds community wealth, and everyone shares in the success.',
      icon: Users,
      bgColor: 'bg-red-700',
    },
    {
      title: 'Pool Your Power',
      subtitle: 'Collective Buying Strength',
      description:
        'By combining resources with others in your co-op, you unlock better prices, support local businesses, and create jobs in your community.',
      icon: TrendingUp,
      bgColor: 'bg-gold-600',
    },
    {
      title: 'AI-Powered Governance',
      subtitle: 'Smart Proposals, Better Decisions',
      description:
        'Every co-op has an AI proposal engine that helps members create, evaluate, and vote on projects. Make informed decisions backed by data and community wisdom.',
      icon: Vote,
      bgColor: 'bg-red-700',
    },
  ];

  // Co-op specific information (currently only Soulaan, but designed to be extensible)
  const availableCoops = [
    {
      id: 'soulaan',
      name: 'Soulaan Co-op',
      tagline: 'Building Black Economic Sovereignty',
      description: 'A cooperative focused on circulating and growing Black wealth through collective buying power and community investment.',
      mission: 'To empower Black communities by building economic sovereignty through cooperative ownership, local investment, and democratic governance.',
      features: [
        {
          title: 'Unity Coin (UC)',
          description: 'Stable digital currency for rent, retail, and routing co-op fees. Pegged 70% to USD, 30% to community goods.',
          icon: Store,
        },
        {
          title: 'SoulaaniCoin (SC)',
          description: 'Earn non-transferable governance tokens by spending UC, paying rent, or working on projects. Vote on proposals and earn yield.',
          icon: Vote,
        },
        {
          title: 'AI Proposal Engine',
          description: 'Submit and evaluate funding proposals with AI-powered charter compliance scoring and community feedback.',
          icon: TrendingUp,
        },
      ],
      eligibility: 'Open to Black Americans, Afro-Caribbean, African immigrants, and allies (non-voting)',
      bgColor: 'bg-red-700',
      accentColor: 'bg-gold-600',
    },
  ];

  const handleInputChange = (field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    // Total steps: splash screens + browse coops + coop details + personal info + questions + commitment + success + login
      setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToLogin = () => {
    // Login is at: splashScreens + 1 (browse) + 1 (details) + 4 (form steps) + 1 (success) = index 10
    setCurrentStep(splashScreens.length + 7);
  };

  const goToBrowseCoops = () => {
    setCurrentStep(splashScreens.length);
  };

  const selectCoop = (coopId: string) => {
    setSelectedCoopId(coopId);
    nextStep(); // Go to coop details
  };

  const startApplication = () => {
    nextStep(); // Go to personal info form
  };

  const handleSubmitApplication = async () => {
    if (isSubmitting) return;
    
    // Clear any previous errors
    clearSubmitError();
    
    try {
      // Detailed validation with specific error messages
      const missingFields: string[] = [];
      
      if (!formData.firstName) missingFields.push('First Name');
      if (!formData.lastName) missingFields.push('Last Name');
      if (!formData.email) missingFields.push('Email');
      if (!formData.phone) missingFields.push('Phone Number');
      if (!formData.password) missingFields.push('Password');
      if (!formData.confirmPassword) missingFields.push('Confirm Password');
      
      if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
        setErrorMessage('Your passwords do not match. Please make sure both password fields are identical.');
        setSubmissionStatus('error');
        setTimeout(() => {
          setErrorMessage('');
          setSubmissionStatus('idle');
        }, 5000);
        return;
      }
      
      if (formData.password && formData.password.length < 8) {
        setErrorMessage('Your password must be at least 8 characters long.');
        setSubmissionStatus('error');
        setTimeout(() => {
          setErrorMessage('');
          setSubmissionStatus('idle');
        }, 5000);
        return;
      }
      
      if (!formData.identity) missingFields.push('Identity Selection');
      if (!formData.agreeToMission) missingFields.push('Mission Agreement');
      if (formData.spendingCategories.length === 0) missingFields.push('Spending Categories');
      if (!formData.monthlyCommitment) missingFields.push('Monthly Commitment');
      if (!formData.useUC) missingFields.push('UC Usage Agreement');
      if (!formData.acceptFees) missingFields.push('Fees Agreement');
      if (!formData.voteOnInvestments) missingFields.push('Voting Agreement');
      if (!formData.coopExperience) missingFields.push('Co-op Experience');
      if (!formData.transparentTransactions) missingFields.push('Transaction Transparency Agreement');
      
      if (!formData.agreeToCoopValues) missingFields.push('Co-op Values Agreement');
      if (!formData.agreeToTerms) missingFields.push('Terms of Service Agreement');
      if (!formData.agreeToPrivacy) missingFields.push('Privacy Policy Agreement');
      
      if (missingFields.length > 0) {
        setErrorMessage(`Please complete the following fields:\n• ${missingFields.join('\n• ')}`);
        setSubmissionStatus('error');
        setTimeout(() => {
          setErrorMessage('');
          setSubmissionStatus('idle');
        }, 5000);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setErrorMessage('Please enter a valid email address.');
        setSubmissionStatus('error');
        setTimeout(() => {
          setErrorMessage('');
          setSubmissionStatus('idle');
        }, 5000);
        return;
      }

      // Prepare application data
      const applicationData: ApplicationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        identity: formData.identity as any,
        agreeToMission: formData.agreeToMission as any,
        spendingCategories: formData.spendingCategories,
        monthlyCommitment: formData.monthlyCommitment as any,
        useUC: formData.useUC as any,
        acceptFees: formData.acceptFees as any,
        voteOnInvestments: formData.voteOnInvestments as any,
        coopExperience: formData.coopExperience as any,
        transparentTransactions: formData.transparentTransactions as any,
        motivation: formData.motivation,
        desiredService: formData.desiredService,
        videoCID: formData.videoCID || undefined,
        photoCID: formData.photoCID || undefined,
        agreeToCoopValues: formData.agreeToCoopValues,
        agreeToTerms: formData.agreeToTerms,
        agreeToPrivacy: formData.agreeToPrivacy,
      };

      // Submit application using hook
      // Sanitize sensitive fields before logging
      const sanitizedApplicationData = {
        ...applicationData,
        password: '[REDACTED]',
        confirmPassword: '[REDACTED]'
      };
      console.log('📤 Submitting application data:', sanitizedApplicationData);
      
      setSubmissionStatus('submitting');
      

      
      try {
      const result = await submitApplication(applicationData);
        console.log('✅ Application submitted successfully:', result);
      
      if (result.success) {
          setSubmissionStatus('success');
          // Success! Move to success screen
          setTimeout(() => {
        setCurrentStep(currentStep + 1);
            setSubmissionStatus('idle');
          }, 1000); // Show success state for 1 second before transitioning
      } else {
          setSubmissionStatus('error');
          setErrorMessage(result.message || 'Submission failed. Please try again.');
          console.error('❌ Submission failed:', result);
          setTimeout(() => {
            setErrorMessage('');
            setSubmissionStatus('idle');
          }, 5000);
        }
      } catch (submitError) {
        console.error('❌ Application submission error:', submitError);
        
        // Parse the error to show detailed message
        let errorMessage = 'Failed to submit application. Please try again.';
        let errorDetails = '';
        
        if (submitError instanceof Error) {
          errorMessage = submitError.message;
          
          // Try to parse tRPC error details
          try {
            const errorJson = JSON.parse(submitError.message);
            if (errorJson.error) {
              errorMessage = errorJson.error.message || errorMessage;
              errorDetails = JSON.stringify(errorJson.error, null, 2);
            }
          } catch {
            // Not a JSON error, use the error message as is
          }
        }
        
        console.error('💥 Error details:', errorDetails || errorMessage);
        
        setSubmissionStatus('error');
        setErrorMessage(errorMessage || 'Failed to submit application. Please try again.');
        setTimeout(() => {
          setErrorMessage('');
          setSubmissionStatus('idle');
        }, 5000);
      }
    } catch (error) {
      console.error('💥 Outer catch - Application submission error:', error);
      setSubmissionStatus('error');
      setErrorMessage('Unexpected error occurred. Please try again.');
      setTimeout(() => {
        setErrorMessage('');
        setSubmissionStatus('idle');
      }, 5000);
    }
  };

  // Resend timer effect
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleRequestCode = async () => {
    if (isRequestingCode || !loginData.email) return;

    setIsRequestingCode(true);
    setLoginError('');

    try {
      const response = await fetch(`${getApiUrl()}/trpc/auth.requestLoginCode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
        }),
      });

      const data = await response.json();

      if (data.result?.data?.success) {
        setCodeSent(true);
        setCanResend(false);
        setResendTimer(60); // 60 second cooldown
        Alert.alert('Code Sent', data.result.data.message || 'Check your email for the login code');
      } else {
        setLoginError(data.error?.message || 'Failed to send code');
      }
    } catch (error) {
      console.error('Request code error:', error);
      setLoginError('Failed to send code. Please try again.');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (isVerifyingCode || !loginData.email || !loginData.code) return;

    setIsVerifyingCode(true);
    setLoginError('');

    try {
      const response = await fetch(`${getApiUrl()}/trpc/auth.verifyLoginCode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          code: loginData.code,
        }),
      });

      const data = await response.json();
      console.log('📥 Verify code response:', JSON.stringify(data, null, 2));

      if (data.result?.data?.success && data.result?.data?.user) {
        console.log('✅ Code verified successfully, logging in...');
        const user = data.result.data.user;
        // Convert createdAt to Date object
        user.createdAt = new Date(user.createdAt);
        console.log('👤 User data:', user);
        await login(user);
        console.log('🎉 Login complete!');
        // Navigation is handled by AuthContext
      } else {
        const errorMsg = data.error?.message || 'Invalid code';
        console.error('❌ Verification failed:', errorMsg);
        console.error('📦 Full response:', data);
        setLoginError(errorMsg);
      }
    } catch (error) {
      console.error('Verify code error:', error);
      setLoginError('Failed to verify code. Please try again.');
    } finally {
      setIsVerifyingCode(false);
    }
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
              onPress={index === splashScreens.length - 1 ? goToBrowseCoops : nextStep}
              className="bg-gold-600"
            >
              <Text className="text-white font-semibold">
                {index === splashScreens.length - 1 ? 'Browse Co-ops' : 'Next'}
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

  const renderBrowseCoops = () => (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-gold-600 p-3 rounded-full mb-4">
              <Icon as={Store} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Choose Your Co-op</Text>
            <Text className="text-charcoal-600 text-center">
              Select a cooperative community to join. Each co-op has its own mission and benefits.
            </Text>
          </View>

          {/* Co-op Cards */}
          <View className="gap-4">
            {availableCoops.map((coop) => (
              <Pressable key={coop.id} onPress={() => selectCoop(coop.id)}>
                <Card className={`${coop.bgColor} border-0 shadow-lg`}>
                  <CardContent className="p-6">
                    <Text className="text-xl font-bold text-white mb-1">{coop.name}</Text>
                    <Text className="text-cream-100 font-semibold mb-3">{coop.tagline}</Text>
                    <Text className="text-cream-100 text-sm mb-4">{coop.description}</Text>
                    <View className="flex flex-row items-center justify-between">
                      <Badge className="bg-white/20">
                        <Text className="text-white text-xs">Learn More</Text>
                      </Badge>
                      <Icon as={ChevronRight} size={20} className="text-white" />
                    </View>
                  </CardContent>
                </Card>
              </Pressable>
            ))}
          </View>

          {/* Navigation */}
          <View className="flex flex-row justify-between items-center mt-6">
            <Button variant="ghost" onPress={prevStep}>
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
            </Button>
            <Button variant="ghost" onPress={goToLogin}>
              <Text className="text-charcoal-600">Already a member? </Text>
              <Text className="text-gold-600 font-semibold">Sign In</Text>
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderCoopDetails = () => {
    const selectedCoop = availableCoops.find(c => c.id === selectedCoopId);
    if (!selectedCoop) return null;

    return (
      <ScrollView className="flex-1 bg-background">
        <View className="min-h-screen flex-1 p-6">
          <View className="w-full max-w-md mx-auto">
            {/* Header */}
            <View className="items-center mb-6">
              <View className={`${selectedCoop.accentColor} p-3 rounded-full mb-4`}>
                <Icon as={Heart} size={32} className="text-white" />
              </View>
              <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">{selectedCoop.name}</Text>
              <Text className="text-lg text-charcoal-600 text-center">{selectedCoop.tagline}</Text>
            </View>

            {/* Mission */}
            <Card className="bg-white border-cream-200 mb-4">
              <CardContent className="p-5">
                <Text className="font-semibold text-charcoal-800 mb-2">Our Mission</Text>
                <Text className="text-charcoal-600 text-sm leading-relaxed">{selectedCoop.mission}</Text>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white border-cream-200 mb-4">
              <CardContent className="p-5">
                <Text className="font-semibold text-charcoal-800 mb-4">What You Get</Text>
                <View className="gap-4">
                  {selectedCoop.features.map((feature, index) => (
                    <View key={index} className="flex flex-row gap-3">
                      <View className={`${selectedCoop.accentColor} p-2 rounded-lg h-10 w-10 items-center justify-center`}>
                        <Icon as={feature.icon} size={20} className="text-white" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium text-charcoal-800">{feature.title}</Text>
                        <Text className="text-sm text-charcoal-600">{feature.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>

            {/* Eligibility */}
            <Card className="bg-gold-50 border-gold-200 mb-6">
              <CardContent className="p-4">
                <View className="flex flex-row items-start gap-2">
                  <Icon as={Shield} size={20} className="text-gold-600 mt-0.5" />
                  <View className="flex-1">
                    <Text className="font-medium text-gold-800 mb-1">Eligibility</Text>
                    <Text className="text-sm text-gold-700">{selectedCoop.eligibility}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <View className="gap-3 mb-6">
              <Button className={selectedCoop.bgColor} onPress={startApplication}>
                <Text className="text-white font-semibold">Apply to Join {selectedCoop.name}</Text>
                <Icon as={ChevronRight} size={16} className="text-white ml-2" />
              </Button>
              <Button variant="outline" onPress={prevStep}>
                <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
                <Text className="text-charcoal-600 ml-1">Back to Co-ops</Text>
              </Button>
            </View>

            {/* Login Link */}
            <View className="items-center">
              <Button variant="ghost" onPress={goToLogin}>
                <Text className="text-charcoal-600">Already a member? </Text>
                <Text className="text-gold-600 font-semibold">Sign In</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPersonalInfo = () => {
    const selectedCoop = availableCoops.find(c => c.id === selectedCoopId);
    
    return (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-gold-600 p-3 rounded-full mb-4">
              <Icon as={Building} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">
              Join {selectedCoop?.name || 'Co-op'}
            </Text>
            <Text className="text-charcoal-600 text-center">Step 1 of 4: Personal Information</Text>
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
              <Text className="text-charcoal-600">Have an account? </Text>
              <Text className="font-semibold text-gold-700">Sign In</Text>
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
    );
  };

  const renderApplicationQuestions = () => {
    const selectedCoop = availableCoops.find(c => c.id === selectedCoopId);
    
    return (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-red-700 p-3 rounded-full mb-4">
              <Icon as={Heart} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">
              {selectedCoop?.name} Application
            </Text>
            <Text className="text-charcoal-600 text-center">Step 2 of 4: Tell us about yourself</Text>
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
  };

  const renderMediaUpload = () => {
    const selectedCoop = availableCoops.find(c => c.id === selectedCoopId);
    const apiUrl = getApiUrl();

    return (
      <ScrollView className="flex-1 bg-background">
        <View className="min-h-screen flex-1 justify-center p-6">
          <View className="w-full max-w-md mx-auto">
            {/* Header */}
            <View className="items-center mb-8">
              <View className="bg-amber-500 p-3 rounded-full mb-4">
                <Icon as={Camera} size={32} className="text-white" />
              </View>
              <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">
                Introduce Yourself
              </Text>
              <Text className="text-charcoal-600 text-center">
                Step 3 of 4: Share a video and photo (optional but recommended)
              </Text>
            </View>

            <Card className="bg-white border-cream-200">
              <CardContent className="p-6">
                {/* Video Upload */}
                <View className="mb-6">
                  <VideoUpload
                    onUploadComplete={(cid, url) => {
                      handleInputChange('videoCID', cid);
                    }}
                    apiUrl={apiUrl}
                  />
                </View>

                {/* Photo Upload */}
                <View className="border-t border-cream-200 pt-6">
                  <PhotoUpload
                    onUploadComplete={(cid, url) => {
                      handleInputChange('photoCID', cid);
                    }}
                    apiUrl={apiUrl}
                    title="Profile Photo"
                    description="Upload a clear photo of yourself"
                  />
                </View>

                {/* Info */}
                <View className="bg-cream-100 border border-cream-300 rounded-lg p-4 mt-6">
                  <Text className="text-sm text-charcoal-800 font-semibold mb-2">Why upload media?</Text>
                  <Text className="text-sm text-charcoal-600">
                    • Helps community members get to know you{'\n'}
                    • Increases your application approval chances{'\n'}
                    • Builds trust in the cooperative{'\n'}
                    • Shows commitment to transparency
                  </Text>
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
                className="bg-amber-500"
              >
                <Text className="text-white font-semibold">
                  {formData.videoCID && formData.photoCID ? 'Continue' : 'Skip for Now'}
                </Text>
                <Icon as={ChevronRight} size={16} className="text-white ml-1" />
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderCommitmentQuestions = () => {
    const selectedCoop = availableCoops.find(c => c.id === selectedCoopId);

    return (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-gold-600 p-3 rounded-full mb-4">
              <Icon as={Shield} size={32} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">
              {selectedCoop?.name} Application
            </Text>
            <Text className="text-charcoal-600 text-center">Step 4 of 4: Commitment & Trust</Text>
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

          {/* Error Message Display */}
          {errorMessage && (
            <Card className="bg-red-50 border-red-300 mt-6">
              <CardContent className="p-4">
                <View className="flex flex-row items-start gap-3">
                  <Text className="text-2xl">⚠️</Text>
                  <View className="flex-1">
                    <Text className="font-bold text-red-800 mb-1">Validation Error</Text>
                    <Text className="text-red-700 text-sm whitespace-pre-line">{errorMessage}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <View className="flex flex-row justify-between items-center mt-6">
            <Button variant="ghost" onPress={prevStep}>
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
            </Button>
            <Button
              onPress={handleSubmitApplication}
              disabled={
                submissionStatus !== 'idle' ||
                isSubmitting ||
                !formData.useUC ||
                !formData.acceptFees ||
                !formData.voteOnInvestments ||
                !formData.coopExperience ||
                !formData.transparentTransactions ||
                !formData.agreeToCoopValues ||
                !formData.agreeToTerms ||
                !formData.agreeToPrivacy
              }
              className={
                submissionStatus === 'success' 
                  ? 'bg-green-600' 
                  : submissionStatus === 'error'
                  ? 'bg-red-800'
                  : 'bg-red-700'
              }
            >
              <Text className="text-white font-semibold">
                {submissionStatus === 'submitting' && '⏳ Submitting...'}
                {submissionStatus === 'success' && '✅ Success!'}
                {submissionStatus === 'error' && '❌ Error - Try Again'}
                {submissionStatus === 'idle' && 'Submit Application'}
              </Text>
              {submissionStatus === 'idle' && <Icon as={ChevronRight} size={16} className="text-white ml-1" />}
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
    );
  };

  const renderApplicationSubmitted = () => {
    const selectedCoop = availableCoops.find(c => c.id === selectedCoopId);
    
    return (
    <ScrollView className="flex-1 bg-background">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="bg-green-600 p-4 rounded-full mb-4">
              <Icon as={Award} size={40} className="text-white" />
            </View>
            <Text className="text-2xl font-bold text-charcoal-800 mb-2 text-center">Application Submitted!</Text>
            <Text className="text-charcoal-600 text-center">
              Welcome to the {selectedCoop?.name} community review process
            </Text>
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
                      Current {selectedCoop?.name} members will review your application (1-2 weeks)
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
                    <Text className="font-medium text-charcoal-800">Welcome to {selectedCoop?.name}</Text>
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
            <Badge className={selectedCoop?.bgColor || 'bg-gold-600'}>
              <Text className="text-white font-medium">{selectedCoop?.tagline || 'Building Community Wealth Together'}</Text>
            </Badge>
          </View>
        </View>
      </View>
    </ScrollView>
    );
  };

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
            <Text className="text-charcoal-600 text-center">
              {codeSent ? 'Enter the code sent to your email' : 'Sign in to access your co-op membership'}
            </Text>
          </View>

          <Card className="bg-white border-cream-200">
            <CardContent className="p-6">
              <View className="gap-5">
                {/* Email */}
                <View>
                  <Label className="text-charcoal-700">Email</Label>
                  <Input
                    value={loginData.email}
                    onChangeText={(text) => setLoginData(prev => ({ ...prev, email: text }))}
                    className="mt-1 border-cream-300"
                    placeholder="marcus@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!codeSent}
                  />
                </View>

                {/* Code Input - shown after code is sent */}
                {codeSent && (
                  <View>
                    <Label className="text-charcoal-700">Verification Code</Label>
                    <Input
                      value={loginData.code}
                      onChangeText={(text) => setLoginData(prev => ({ ...prev, code: text }))}
                      className="mt-1 border-cream-300"
                      placeholder="Enter 6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                )}

                {/* Error Message */}
                {loginError && (
                  <View className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <Text className="text-red-700 text-sm">{loginError}</Text>
                  </View>
                )}

                {/* Submit Button */}
                {!codeSent ? (
                  <Button
                    className="w-full bg-red-700 py-3"
                    onPress={handleRequestCode}
                    disabled={isRequestingCode || !loginData.email}
                  >
                    <Text className="text-white font-semibold">
                      {isRequestingCode ? 'Sending Code...' : 'Send Login Code'}
                    </Text>
                  </Button>
                ) : (
                  <View className="gap-3">
                    <Button
                      className="w-full bg-red-700 py-3"
                      onPress={handleVerifyCode}
                      disabled={isVerifyingCode || !loginData.code || loginData.code.length !== 6}
                    >
                      <Text className="text-white font-semibold">
                        {isVerifyingCode ? 'Verifying...' : 'Verify & Sign In'}
                      </Text>
                    </Button>

                    {/* Resend Code Button */}
                    <Button
                      variant="outline"
                      className="w-full border-cream-300"
                      onPress={handleRequestCode}
                      disabled={!canResend || isRequestingCode}
                    >
                      <Text className="text-charcoal-700">
                        {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
                      </Text>
                    </Button>

                    {/* Change Email Button */}
                    <Button
                      variant="ghost"
                      className="w-full"
                      onPress={() => {
                        setCodeSent(false);
                        setLoginData(prev => ({ ...prev, code: '' }));
                        setLoginError('');
                      }}
                    >
                      <Text className="text-gold-700">Change Email</Text>
                    </Button>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Signup Link */}
          <View className="items-center mt-6">
            <Button variant="ghost" onPress={goToBrowseCoops}>
              <Text className="text-charcoal-600">Don&apos;t have an account? </Text>
              <Text className="font-semibold text-gold-700">Join a Co-op</Text>
            </Button>
          </View>

          {/* Community Notice */}
          <View className="items-center mt-8">
            <Badge className="bg-gold-600">
              <Text className="text-white font-medium">Building Community Wealth Together</Text>
            </Badge>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Determine which step to render
  // Flow: Splash Screens → Browse Co-ops → Co-op Details → Personal Info → Questions → Media Upload → Commitment → Success → Login
  const renderCurrentStep = () => {
    const splashEnd = splashScreens.length;
    const browseCoopsStep = splashEnd;
    const coopDetailsStep = splashEnd + 1;
    const personalInfoStep = splashEnd + 2;
    const questionsStep = splashEnd + 3;
    const mediaUploadStep = splashEnd + 4;
    const commitmentStep = splashEnd + 5;
    const successStep = splashEnd + 6;

    if (currentStep < splashEnd) {
      return renderSplashScreen(currentStep);
    } else if (currentStep === browseCoopsStep) {
      return renderBrowseCoops();
    } else if (currentStep === coopDetailsStep) {
      return renderCoopDetails();
    } else if (currentStep === personalInfoStep) {
      return renderPersonalInfo();
    } else if (currentStep === questionsStep) {
      return renderApplicationQuestions();
    } else if (currentStep === mediaUploadStep) {
      return renderMediaUpload();
    } else if (currentStep === commitmentStep) {
      return renderCommitmentQuestions();
    } else if (currentStep === successStep) {
      return renderApplicationSubmitted();
    } else {
      return renderLogin();
    }
  };

  return renderCurrentStep();
}