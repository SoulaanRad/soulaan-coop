import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubmitApplication } from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import { getApiUrl } from '@/lib/config';
import type { ApplicationData } from '@/lib/api';
import { api } from '@/lib/api';
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
  CheckCircle2,
  Mail,
} from 'lucide-react-native';

const COLOR_MAP: Record<string, string> = {
  'bg-red-700': '#B91C1C',
  'bg-red-800': '#991B1B',
  'bg-red-900': '#7F1D1D',
  'bg-gold-600': '#D97706',
  'bg-gold-700': '#B45309',
  'bg-amber-500': '#F59E0B',
  'bg-amber-600': '#D97706',
  'bg-blue-600': '#2563EB',
  'bg-blue-700': '#1D4ED8',
  'bg-blue-800': '#1E40AF',
  'bg-purple-600': '#9333EA',
  'bg-purple-700': '#7E22CE',
  'bg-purple-800': '#6B21A8',
  'bg-green-600': '#16A34A',
  'bg-green-700': '#15803D',
  'bg-charcoal-800': '#1F2937',
  'bg-charcoal-900': '#111827',
};

function resolveBrandColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (value.startsWith('#')) return value;
  return COLOR_MAP[value] || COLOR_MAP[value.replace(/^bg-/, 'bg-')] || fallback;
}

function isDarkColor(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.56;
}

type CoopBrand = {
  primary: string;
  accent: string;
  onPrimary: string;
  softBg: string;
  softBorder: string;
};

function getCoopBrand(coop?: { bgColor?: string; accentColor?: string }): CoopBrand {
  const primary = resolveBrandColor(coop?.bgColor, '#7F1D1D');
  const accent = resolveBrandColor(coop?.accentColor, '#F59E0B');
  return {
    primary,
    accent,
    onPrimary: isDarkColor(primary) ? '#FFFFFF' : '#111827',
    softBg: `${accent}14`,
    softBorder: `${accent}35`,
  };
}

function getCoopClassColor(value: string | undefined, fallback = 'bg-red-700') {
  return value?.startsWith('#') ? fallback : value || fallback;
}


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
  // Media uploads
  videoCID: string;
  photoCID: string;
  // Dynamic question answers stored as key-value pairs
  dynamicAnswers: Record<string, any>;
}

interface ApplicationQuestion {
  id: string;
  type: string;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: Record<string, unknown>;
}

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCoopId, setSelectedCoopId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({
    email: '',
    code: '',
  });
  const [codeSent, setCodeSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [loginError, setLoginError] = useState<string>('');
  const [waitlistData, setWaitlistData] = useState({
    name: '',
    email: '',
    suggestedCoop: '',
  });
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [waitlistMessage, setWaitlistMessage] = useState('');

  // API hooks
  const { submitApplication, isLoading: isSubmitting, error: submitError, clearError: clearSubmitError } = useSubmitApplication();
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const { login } = useAuth();

  // Fetch available coops from backend
  const [availableCoops, setAvailableCoops] = useState<{
    id: string;
    name: string;
    tagline: string;
    description: string;
    mission: string;
    features: { title: string; description: string }[];
    eligibility: string;
    bgColor: string;
    accentColor: string;
  }[]>([]);
  const [isLoadingCoops, setIsLoadingCoops] = useState(true);
  
  // Dynamic application questions
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    const fetchCoops = async () => {
      try {
        const coops = await api.listAvailableCoops();
        console.log('Fetched coops from backend:', coops);
        setAvailableCoops(coops);
      } catch (error) {
        console.error('Failed to load coops:', error);
        const fallbackCoops: any[] = [];
        console.log('Using fallback coops:', fallbackCoops);
        setAvailableCoops(fallbackCoops);
      } finally {
        setIsLoadingCoops(false);
      }
    };
    fetchCoops();
  }, []);

  // Fetch application questions when a coop is selected
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedCoopId) return;
      
      setIsLoadingQuestions(true);
      try {
        const result = await api.getApplicationQuestions(selectedCoopId);
        setApplicationQuestions(result.questions);
        console.log('Loaded questions for coop:', selectedCoopId, result.questions);
      } catch (error) {
        console.error('Failed to fetch application questions:', error);
        // Use empty questions array as fallback
        setApplicationQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [selectedCoopId]);

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
    videoCID: '',
    photoCID: '',
    dynamicAnswers: {},
  });

  // Generic platform introduction screens
  const splashScreens = [
    {
      title: 'Find a community that fits',
      subtitle: 'Start with a community built to move together',
      description:
        'Browse active co-ops, learn what each one stands for, and choose the community that matches your goals.',
      icon: Heart,
      bgColor: 'bg-gold-600',
    },
    {
      title: 'Members have a say',
      subtitle: 'Not just access, real voice',
      description:
        'Members help shape priorities, support local businesses, and participate in decisions that affect the shared economy.',
      icon: Users,
      bgColor: 'bg-red-700',
    },
    {
      title: 'Shop, vote, and build together',
      subtitle: 'Everything supports the community',
      description:
        'Each co-op can bring together member stores, community proposals, rewards, and shared projects around its mission.',
      icon: TrendingUp,
      bgColor: 'bg-gold-600',
    },
    {
      title: 'Apply to join',
      subtitle: 'Every co-op is a little different',
      description:
        'Each community has its own mission, joining requirements, and questions so members can get to know you.',
      icon: Vote,
      bgColor: 'bg-red-700',
    },
  ];

  // Add icons to features from backend data - memoized to prevent infinite re-renders
  const coopsWithIcons = useMemo(() => {
    return availableCoops?.map(coop => ({
      ...coop,
      features: coop.features.map((feature) => {
        // Map feature titles to appropriate icons
        let icon = Store; // default
        if (feature.title.includes('Coin') || feature.title.includes('Governance')) icon = Vote;
        if (feature.title.includes('AI') || feature.title.includes('Proposal')) icon = TrendingUp;
        if (feature.title.includes('Housing')) icon = Building;
        if (feature.title.includes('Employment') || feature.title.includes('Network')) icon = Users;
        if (feature.title.includes('Venue') || feature.title.includes('Ownership')) icon = Store;
        
        return { ...feature, icon };
      }),
    })) || [];
  }, [availableCoops]);

  // Debug logging - only on mount or when values change
  useEffect(() => {
    console.log('availableCoops:', availableCoops);
    console.log('coopsWithIcons:', coopsWithIcons);
    console.log('isLoadingCoops:', isLoadingCoops);
  }, [availableCoops, coopsWithIcons, isLoadingCoops]);

  const handleInputChange = (field: keyof FormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDynamicAnswerChange = (questionId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      dynamicAnswers: {
        ...prev.dynamicAnswers,
        [questionId]: value,
      },
    }));
    setErrorMessage('');
  };

  const handleWaitlistSignup = async () => {
    if (waitlistStatus === 'submitting') return;

    const email = waitlistData.email.trim();
    if (!email.includes('@')) {
      setWaitlistStatus('error');
      setWaitlistMessage('Enter a valid email to join the waitlist.');
      return;
    }

    setWaitlistStatus('submitting');
    setWaitlistMessage('');

    try {
      const result = await api.submitWaitlist({
        email,
        name: waitlistData.name.trim() || undefined,
        suggestedCoop: waitlistData.suggestedCoop.trim() || undefined,
      });
      setWaitlistStatus('success');
      setWaitlistMessage(result.message || "You're on the list. We'll be in touch soon.");
    } catch (error) {
      console.error('Waitlist signup error:', error);
      setWaitlistStatus('error');
      setWaitlistMessage(error instanceof Error ? error.message : 'Could not join the waitlist. Please try again.');
    }
  };

  const renderDynamicQuestion = (question: ApplicationQuestion) => {
    const answer = formData.dynamicAnswers[question.id];
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    const brand = getCoopBrand(selectedCoop);

    switch (question.type) {
      case 'radio':
        return (
          <View key={question.id}>
            <Label className="text-charcoal-700 font-medium mb-3">
              {question.label} {question.required && '*'}
            </Label>
            {question.description && (
              <Text className="text-sm text-charcoal-600 mb-2">{question.description}</Text>
            )}
            <View className={question.options && question.options.length > 2 ? "gap-2" : "flex flex-row gap-4"}>
              {question.options?.map((option) => (
                <Button
                  key={option.value}
                  variant={answer === option.value ? 'default' : 'outline'}
                  onPress={() => handleDynamicAnswerChange(question.id, option.value)}
                  className={question.options && question.options.length > 2 ? "justify-start rounded-2xl" : "flex-1 rounded-2xl"}
                  style={answer === option.value ? { backgroundColor: brand.primary } : undefined}
                >
                  <Text className={answer === option.value ? 'text-white' : 'text-charcoal-700'}>
                    {option.label}
                  </Text>
                </Button>
              ))}
            </View>
          </View>
        );

      case 'select':
        return (
          <View key={question.id}>
            <Label className="text-charcoal-700 font-medium mb-3">
              {question.label} {question.required && '*'}
            </Label>
            {question.description && (
              <Text className="text-sm text-charcoal-600 mb-2">{question.description}</Text>
            )}
            <View className="gap-2">
              {question.options?.map((option) => (
                <Button
                  key={option.value}
                  variant={answer === option.value ? 'default' : 'outline'}
                  onPress={() => handleDynamicAnswerChange(question.id, option.value)}
                  className="justify-start rounded-2xl"
                  style={answer === option.value ? { backgroundColor: brand.primary } : undefined}
                >
                  <Text className={answer === option.value ? 'text-white' : 'text-charcoal-700'}>
                    {option.label}
                  </Text>
                </Button>
              ))}
            </View>
          </View>
        );

      case 'multiselect':
        const selectedValues = (answer as string[]) || [];
        return (
          <View key={question.id}>
            <Label className="text-charcoal-700 font-medium mb-3">
              {question.label} {question.required && '*'}
            </Label>
            {question.description && (
              <Text className="text-sm text-charcoal-600 mb-2">{question.description}</Text>
            )}
            <View className="gap-2">
              {question.options?.map((option) => (
                <View key={option.value} className="flex flex-row items-center gap-2">
                  <Checkbox
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleDynamicAnswerChange(question.id, [...selectedValues, option.value]);
                      } else {
                        handleDynamicAnswerChange(
                          question.id,
                          selectedValues.filter((v) => v !== option.value)
                        );
                      }
                    }}
                  />
                  <Text className="text-sm text-charcoal-700 flex-1">{option.label}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'textarea':
        return (
          <View key={question.id}>
            <Label className="text-charcoal-700 font-medium">
              {question.label} {question.required && '*'}
            </Label>
            {question.description && (
              <Text className="text-sm text-charcoal-600 mt-1">{question.description}</Text>
            )}
            <TextInput
              value={answer || ''}
              onChangeText={(text) => handleDynamicAnswerChange(question.id, text)}
              placeholder={question.placeholder || ''}
              multiline
              numberOfLines={3}
              className="mt-2 w-full px-4 py-3 border border-cream-300 rounded-2xl text-base text-foreground bg-white"
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        );

      case 'text':
      case 'email':
      case 'phone':
      default:
        return (
          <View key={question.id}>
            <Label className="text-charcoal-700 font-medium">
              {question.label} {question.required && '*'}
            </Label>
            {question.description && (
              <Text className="text-sm text-charcoal-600 mt-1">{question.description}</Text>
            )}
            <TextInput
              value={answer || ''}
              onChangeText={(text) => handleDynamicAnswerChange(question.id, text)}
              placeholder={question.placeholder || ''}
              keyboardType={question.type === 'email' ? 'email-address' : question.type === 'phone' ? 'phone-pad' : 'default'}
              className="mt-2 w-full px-4 py-3 border border-cream-300 rounded-2xl text-base text-foreground bg-white"
            />
          </View>
        );
    }
  };

  const nextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToLogin = () => {
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
      
      // Validate dynamic questions
      applicationQuestions.forEach((question) => {
        if (question.required) {
          const answer = formData.dynamicAnswers[question.id];
          if (!answer || (question.type === 'multiselect' && (answer as string[]).length === 0)) {
            missingFields.push(question.label);
          }
        }
      });
      
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

      // Prepare application data with dynamic answers
      const applicationData: ApplicationData = {
        coopId: selectedCoopId!,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        // Include all dynamic answers
        ...formData.dynamicAnswers,
        videoCID: formData.videoCID || undefined,
        photoCID: formData.photoCID || undefined,
        agreeToCoopValues: formData.agreeToCoopValues,
        agreeToTerms: formData.agreeToTerms,
        agreeToPrivacy: formData.agreeToPrivacy,
      } as any;

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
          setSubmittedApplicationId(result.applicationId || null);
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
    const primary = resolveBrandColor(screen.bgColor, '#7F1D1D');
    const accent = index % 2 === 0 ? '#F59E0B' : '#16A34A';

    return (
      <ScrollView className="flex-1 bg-[#F7F4EF]" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="min-h-screen flex-1 justify-between p-6">
          <View className="w-full max-w-md mx-auto pt-10">
            <View className="mb-8 flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-black uppercase tracking-[2px] text-charcoal-500">Cahootz</Text>
                <Text className="text-3xl font-black text-charcoal-900">Co-op Network</Text>
              </View>
              <Pressable onPress={goToLogin} className="rounded-full bg-white px-4 py-2">
                <Text className="text-sm font-black text-charcoal-800">Sign in</Text>
              </Pressable>
            </View>

            <View className="overflow-hidden rounded-[32px]" style={{ shadowColor: primary, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 10 }}>
              <LinearGradient
                colors={[primary, accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 28, minHeight: 390, justifyContent: 'space-between' }}
              >
                <View>
                  <View className="mb-8 h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                    <Icon as={screen.icon} size={34} className="text-white" />
                  </View>
                  <Text className="text-4xl font-black leading-tight text-white">{screen.title}</Text>
                  <Text className="mt-3 text-lg font-bold text-white/80">{screen.subtitle}</Text>
                  <Text className="mt-5 text-base leading-7 text-white/80">{screen.description}</Text>
                </View>

                <View className="mt-10 flex-row gap-2">
                  {splashScreens.map((_, i) => (
                    <View
                      key={i}
                      className="h-2 rounded-full"
                      style={{
                        width: i === index ? 34 : 8,
                        backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                      }}
                    />
                  ))}
                </View>
              </LinearGradient>
            </View>
          </View>

          <View className="w-full max-w-md mx-auto pb-4">
            <View className="mb-4 rounded-[24px] bg-white p-4">
              <Text className="text-sm font-bold text-charcoal-900">What happens here?</Text>
              <Text className="mt-1 text-sm leading-5 text-charcoal-500">
                Choose a co-op, learn what it stands for, answer a few questions, then sign in after you are approved.
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
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
              className="h-12 rounded-2xl px-5"
              style={{ backgroundColor: primary }}
            >
              <Text className="text-white font-semibold">
                {index === splashScreens.length - 1 ? 'Choose a co-op' : 'Next'}
              </Text>
              <Icon as={ChevronRight} size={16} className="text-white ml-1" />
            </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderWaitlistCard = () => (
    <Card className="bg-charcoal-800 border-gold-600/30 shadow-lg overflow-hidden">
      <CardContent className="p-5">
        <View className="flex-row items-start gap-3 mb-4">
          <View className="h-11 w-11 rounded-2xl bg-gold-600/20 items-center justify-center">
            <Icon as={Mail} size={20} className="text-gold-400" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-black">Join the waitlist</Text>
            <Text className="text-charcoal-300 text-sm leading-5 mt-1">
              Not sure which co-op fits yet? Get early access and updates first.
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Input
            value={waitlistData.email}
            onChangeText={(email) => {
              setWaitlistData((prev) => ({ ...prev, email }));
              setWaitlistStatus('idle');
              setWaitlistMessage('');
            }}
            className="flex-1 h-12 rounded-xl border-white/10 bg-white text-charcoal-900"
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            onPress={handleWaitlistSignup}
            disabled={waitlistStatus === 'submitting' || !waitlistData.email.trim()}
            className="h-12 rounded-xl bg-gold-600 px-4"
          >
            <Text className="text-charcoal-900 font-black">
              {waitlistStatus === 'submitting' ? 'Joining...' : 'Join'}
            </Text>
          </Button>
        </View>

        {waitlistMessage ? (
          <View
            className={`mt-4 rounded-xl border p-3 ${
              waitlistStatus === 'success'
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}
          >
            <View className="flex-row gap-2">
              <Icon
                as={waitlistStatus === 'success' ? CheckCircle2 : Shield}
                size={16}
                className={waitlistStatus === 'success' ? 'text-green-400' : 'text-red-300'}
              />
              <Text className={`flex-1 text-sm ${waitlistStatus === 'success' ? 'text-green-100' : 'text-red-100'}`}>
                {waitlistMessage}
              </Text>
            </View>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );

  const renderBrowseCoops = () => (
    <View className="flex-1 bg-[#F7F4EF]">
      {/* Sticky Header */}
      <View className="p-6 pb-4">
        <View className="w-full max-w-md mx-auto">
          <View className="rounded-[30px] bg-charcoal-900 p-6">
            <View className="bg-white/10 p-3 rounded-2xl mb-5 self-start">
              <Icon as={Store} size={28} className="text-white" />
            </View>
            <Text className="text-xs font-black uppercase tracking-[2px] text-white/50">Step one</Text>
            <Text className="text-3xl font-black text-white mt-1 mb-2">Choose your co-op</Text>
            <Text className="text-white/70 leading-6">
              Compare communities, learn what they care about, and choose where you want to apply.
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Co-op List */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 24 }}>
        <View className="w-full max-w-md mx-auto">
          <View className="mb-4">
            {renderWaitlistCard()}
          </View>

          {/* Loading State */}
          {isLoadingCoops && (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#7F1D1D" />
              <Text className="text-charcoal-500 mt-4">Loading available co-ops...</Text>
            </View>
          )}

          {/* Co-op Cards */}
          {!isLoadingCoops && coopsWithIcons.length > 0 && (
            <View className="gap-4">
              {coopsWithIcons.map((coop) => {
                const brand = getCoopBrand(coop);
                
                return (
                  <Pressable key={coop.id} onPress={() => selectCoop(coop.id)}>
                    <Card className="border-0 bg-transparent py-0 shadow-lg overflow-hidden rounded-[28px]">
                      <CardContent className="p-0">
                        <LinearGradient
                          colors={[brand.primary, brand.accent]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ padding: 22, borderRadius: 28 }}
                        >
                        <View className="flex-row items-start justify-between gap-4 mb-4">
                          <View className="flex-1">
                            <Text className="text-xs font-black uppercase tracking-[1.5px] text-white/60">Open for applications</Text>
                            <Text className="text-2xl font-black text-white mt-1 mb-1">{coop.name}</Text>
                            <Text className="text-white/80 font-semibold">{coop.tagline}</Text>
                          </View>
                          <View className="h-11 w-11 rounded-2xl bg-white/15 items-center justify-center">
                            <Icon as={ChevronRight} size={20} className="text-white" />
                          </View>
                        </View>
                        <Text className="text-white/80 text-sm leading-6 mb-4">{coop.description}</Text>
                        <View className="flex flex-row items-center justify-between">
                          <Badge className="bg-white/20 border-white/10">
                            <Text className="text-xs text-white">Learn more</Text>
                          </Badge>
                        </View>
                        </LinearGradient>
                      </CardContent>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* No Coops Available */}
          {!isLoadingCoops && coopsWithIcons.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-charcoal-500 text-center">No cooperatives available at this time.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View className="bg-[#F7F4EF] border-t border-charcoal-900/5 p-6 pt-4">
        <View className="w-full max-w-md mx-auto">
          <View className="flex flex-row justify-between items-center">
            <Button variant="ghost" onPress={prevStep}>
              <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
              <Text className="text-charcoal-600 ml-1">Back</Text>
            </Button>
            <Button variant="ghost" onPress={goToLogin}>
              <Text className="text-charcoal-500">Already a member? </Text>
              <Text className="text-red-900 font-semibold">Sign In</Text>
            </Button>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCoopDetails = () => {
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    if (!selectedCoop) return null;
    const brand = getCoopBrand(selectedCoop);

    return (
      <ScrollView className="flex-1 bg-[#F7F4EF]">
        <View className="min-h-screen flex-1 p-6">
          <View className="w-full max-w-md mx-auto">
            {/* Header */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-5">
                <Button variant="ghost" onPress={prevStep} className="px-0">
                  <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
                  <Text className="text-charcoal-600 ml-1">Co-ops</Text>
                </Button>
                <Button variant="ghost" onPress={goToLogin} className="px-0">
                  <Text className="font-semibold" style={{ color: brand.primary }}>Sign in</Text>
                </Button>
              </View>
              <View className="overflow-hidden rounded-[32px]" style={{ shadowColor: brand.primary, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 26, elevation: 9 }}>
                <LinearGradient
                  colors={[brand.primary, brand.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 24 }}
                >
                  <View className="bg-white/15 p-3 rounded-2xl mb-6 self-start">
                    <Icon as={Heart} size={28} className="text-white" />
                  </View>
                  <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">Community profile</Text>
                  <Text className="text-4xl font-black text-white mt-2 mb-3">{selectedCoop.name}</Text>
                  <Text className="text-lg text-white/80 font-semibold">{selectedCoop.tagline}</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Mission */}
            <Card className="bg-white border-white mb-4 rounded-[24px]">
              <CardContent className="p-5">
                <Text className="font-black text-charcoal-900 mb-2">Mission</Text>
                <Text className="text-charcoal-600 text-sm leading-relaxed">{selectedCoop.mission}</Text>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="bg-white border-white mb-4 rounded-[24px]">
              <CardContent className="p-5">
                <Text className="font-black text-charcoal-900 mb-4">What membership unlocks</Text>
                <View className="gap-4">
                  {selectedCoop.features.map((feature, index) => (
                    <View key={index} className="flex flex-row gap-3">
                      <View className="p-2 rounded-2xl h-11 w-11 items-center justify-center" style={{ backgroundColor: brand.softBg }}>
                        <Icon as={feature.icon} size={20} color={brand.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-charcoal-900">{feature.title}</Text>
                        <Text className="text-sm text-charcoal-600 leading-5">{feature.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>

            {/* Eligibility */}
            <Card className="mb-6 rounded-[24px]" style={{ backgroundColor: brand.softBg, borderColor: brand.softBorder }}>
              <CardContent className="p-4">
                <View className="flex flex-row items-start gap-2">
                  <Icon as={Shield} size={20} color={brand.primary} />
                  <View className="flex-1">
                    <Text className="font-bold mb-1" style={{ color: brand.primary }}>Who can join</Text>
                    <Text className="text-sm text-charcoal-700">{selectedCoop.eligibility}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <View className="gap-3 mb-6">
              <Button className="h-12 rounded-2xl" style={{ backgroundColor: brand.primary }} onPress={startApplication}>
                <Text className="font-black" style={{ color: brand.onPrimary }}>Apply to {selectedCoop.name}</Text>
                <Icon as={ChevronRight} size={16} color={brand.onPrimary} />
              </Button>
              <Button variant="outline" onPress={prevStep} className="border-charcoal-200 bg-white h-12 rounded-2xl">
                <Icon as={ChevronLeft} size={16} className="text-charcoal-600" />
                <Text className="text-charcoal-600 ml-1">Back to Co-ops</Text>
              </Button>
            </View>

            {/* Login Link */}
            <View className="items-center">
              <Button variant="ghost" onPress={goToLogin}>
                <Text className="text-charcoal-500">Already a member? </Text>
                <Text className="font-semibold" style={{ color: brand.primary }}>Sign In</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPersonalInfo = () => {
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    const brand = getCoopBrand(selectedCoop);
    
    return (
    <ScrollView className="flex-1 bg-[#F7F4EF]">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="mb-6 rounded-[30px] p-6" style={{ backgroundColor: brand.primary }}>
            <View className="bg-white/15 p-3 rounded-2xl mb-5 self-start">
              <Icon as={Building} size={30} className="text-white" />
            </View>
            <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">Application</Text>
            <Text className="text-3xl font-black text-white mt-1 mb-2">
              Let&apos;s get your basics
            </Text>
            <Text className="text-white/70 leading-5">Step 1 of 4 for {selectedCoop?.name || 'this co-op'}</Text>
          </View>

          <Card className="bg-white border-white rounded-[24px]">
            <CardContent className="p-6">
              <View className="gap-4">
                {/* Name Fields */}
                <View className="flex flex-row gap-3">
                  <View className="flex-1">
                    <Label className="text-charcoal-700">First Name</Label>
                    <Input
                      value={formData.firstName}
                      onChangeText={(text) => handleInputChange('firstName', text)}
                      className="mt-1 border-cream-300 rounded-2xl h-12"
                      placeholder="First name"
                    />
                  </View>
                  <View className="flex-1">
                    <Label className="text-charcoal-700">Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChangeText={(text) => handleInputChange('lastName', text)}
                      className="mt-1 border-cream-300 rounded-2xl h-12"
                      placeholder="Last name"
                    />
                  </View>
                </View>

                {/* Email */}
                <View>
                  <Label className="text-charcoal-700">Email</Label>
                  <Input
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    className="mt-1 border-cream-300 rounded-2xl h-12"
                    placeholder="you@example.com"
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
                    className="mt-1 border-cream-300 rounded-2xl h-12"
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
                      className="border-cream-300 pr-12 rounded-2xl h-12"
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
                      className="border-cream-300 pr-12 rounded-2xl h-12"
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
              className="rounded-2xl"
              style={{ backgroundColor: brand.primary }}
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
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    const brand = getCoopBrand(selectedCoop);
    
    return (
    <ScrollView className="flex-1 bg-[#F7F4EF]">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="mb-6 rounded-[30px] p-6" style={{ backgroundColor: brand.primary }}>
            <View className="bg-white/15 p-3 rounded-2xl mb-5 self-start">
              <Icon as={Heart} size={30} className="text-white" />
            </View>
            <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">A few questions</Text>
            <Text className="text-3xl font-black text-white mt-1 mb-2">Tell the co-op who you are</Text>
            <Text className="text-white/70 leading-5">Step 2 of 4. Your answers help members get to know you.</Text>
          </View>

          {isLoadingQuestions ? (
            <Card className="bg-white border-white rounded-[24px]">
              <CardContent className="p-6">
                <View className="items-center justify-center py-8">
                  <ActivityIndicator size="large" color={brand.primary} />
                  <Text className="text-charcoal-600 mt-4">Loading questions...</Text>
                </View>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-white rounded-[24px]">
              <CardContent className="p-6">
                <View className="gap-6">
                  {applicationQuestions.map((question) => renderDynamicQuestion(question))}
                  
                  {applicationQuestions.length === 0 && (
                    <View className="items-center py-8">
                      <Text className="text-charcoal-600">No questions available for this cooperative.</Text>
                    </View>
                  )}
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
              onPress={nextStep}
              disabled={
                isLoadingQuestions ||
                applicationQuestions.some((q) => {
                  if (!q.required) return false;
                  const answer = formData.dynamicAnswers[q.id];
                  if (q.type === 'multiselect') {
                    return !answer || (answer as string[]).length === 0;
                  }
                  return !answer || answer === '';
                })
              }
              className="rounded-2xl"
              style={{ backgroundColor: brand.primary }}
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
    const apiUrl = getApiUrl();
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    const brand = getCoopBrand(selectedCoop);

    return (
      <ScrollView className="flex-1 bg-[#F7F4EF]">
        <View className="min-h-screen flex-1 justify-center p-6">
          <View className="w-full max-w-md mx-auto">
            {/* Header */}
            <View className="mb-6 rounded-[30px] p-6" style={{ backgroundColor: brand.primary }}>
              <View className="bg-white/15 p-3 rounded-2xl mb-5 self-start">
                <Icon as={Camera} size={30} className="text-white" />
              </View>
              <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">Optional media</Text>
              <Text className="text-3xl font-black text-white mt-1 mb-2">
                Add a personal touch
              </Text>
              <Text className="text-white/70 leading-5">
                Step 3 of 4. A quick video or photo can help members recognize the person behind the application.
              </Text>
            </View>

            <Card className="bg-white border-white rounded-[24px]">
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
                <View className="border rounded-2xl p-4 mt-6" style={{ backgroundColor: brand.softBg, borderColor: brand.softBorder }}>
                  <Text className="text-sm text-charcoal-800 font-semibold mb-2">Why upload media?</Text>
                  <Text className="text-sm text-charcoal-600">
                    • Helps members get to know you{'\n'}
                    • Helps members connect a name to a person{'\n'}
                    • Builds trust before community review
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
                className="rounded-2xl"
                style={{ backgroundColor: brand.primary }}
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
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    const brand = getCoopBrand(selectedCoop);

    return (
    <ScrollView className="flex-1 bg-[#F7F4EF]">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="mb-6 rounded-[30px] p-6" style={{ backgroundColor: brand.primary }}>
            <View className="bg-white/15 p-3 rounded-2xl mb-5 self-start">
              <Icon as={Shield} size={30} className="text-white" />
            </View>
            <Text className="text-xs font-black uppercase tracking-[2px] text-white/60">Review</Text>
            <Text className="text-3xl font-black text-white mt-1 mb-2">Confirm your commitments</Text>
            <Text className="text-white/70 leading-5">Step 4 of 4. Review the shared expectations before you send your application.</Text>
          </View>

          <Card className="bg-white border-white rounded-[24px]">
            <CardContent className="p-6">
              <View className="gap-6">
                {/* Terms Agreement */}
                <View className="gap-3 pt-4 border-t border-cream-200">
                  <View className="flex flex-row items-start gap-3">
                    <Checkbox
                      checked={formData.agreeToCoopValues}
                      onCheckedChange={(checked) => handleInputChange('agreeToCoopValues', !!checked)}
                    />
                    <Text className="text-charcoal-800 font-medium flex-1">
                      I align with this co-op&apos;s values and mission
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
                !formData.agreeToCoopValues ||
                !formData.agreeToTerms ||
                !formData.agreeToPrivacy
              }
              className={
                submissionStatus === 'success' 
                  ? 'bg-green-600' 
                  : submissionStatus === 'error'
                  ? 'bg-red-800'
                  : ''
              }
              style={submissionStatus === 'idle' ? { backgroundColor: brand.primary } : undefined}
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
    const selectedCoop = coopsWithIcons.find(c => c.id === selectedCoopId);
    const brand = getCoopBrand(selectedCoop);
    
    return (
    <ScrollView className="flex-1 bg-[#F7F4EF]">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8 rounded-[30px] p-6" style={{ backgroundColor: brand.primary }}>
            <View className="bg-white/15 p-4 rounded-3xl mb-4">
              <Icon as={Award} size={40} className="text-white" />
            </View>
            <Text className="text-3xl font-black text-white mb-2 text-center">Application submitted</Text>
            <Text className="text-white/70 text-center">
              You&apos;re now in the {selectedCoop?.name} community review process.
            </Text>
          </View>

          <Card className="bg-white border-white rounded-[24px]">
            <CardContent className="p-6">
              <Text className="font-black text-charcoal-900 mb-4">What happens next?</Text>
              <View className="gap-4">
                <View className="flex flex-row items-start gap-3">
                  <View className="rounded-full w-6 h-6 items-center justify-center" style={{ backgroundColor: brand.primary }}>
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
                  <View className="rounded-full w-6 h-6 items-center justify-center" style={{ backgroundColor: brand.primary }}>
                    <Text className="text-sm font-bold text-white">2</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-charcoal-800">Community Interview</Text>
                    <Text className="text-sm text-charcoal-600">You may be invited to meet with community members</Text>
                  </View>
                </View>
                <View className="flex flex-row items-start gap-3">
                  <View className="rounded-full w-6 h-6 items-center justify-center" style={{ backgroundColor: brand.primary }}>
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

          {submittedApplicationId && (
          <Card className="mt-6 rounded-[24px]" style={{ backgroundColor: brand.softBg, borderColor: brand.softBorder }}>
            <CardContent className="p-4">
              <View className="flex flex-row items-center gap-2">
                <Icon as={Building} size={20} color={brand.primary} />
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: brand.primary }}>
                    Application reference: {submittedApplicationId}
                  </Text>
                  <Text className="text-sm text-charcoal-600">Keep this reference for your records.</Text>
                </View>
              </View>
            </CardContent>
          </Card>
          )}

          {/* Action Button */}
          <View className="mt-8">
            <Button className="w-full rounded-2xl" style={{ backgroundColor: brand.primary }} onPress={goToLogin}>
              <Text className="text-white font-semibold">Continue to Sign In</Text>
            </Button>
          </View>

          {/* Community Message */}
          <View className="items-center mt-6">
            <Badge className={getCoopClassColor(selectedCoop?.bgColor)}>
              <Text className="text-white font-medium">{selectedCoop?.tagline || 'Building Community Wealth Together'}</Text>
            </Badge>
          </View>
        </View>
      </View>
    </ScrollView>
    );
  };

  const renderLogin = () => (
    <ScrollView className="flex-1 bg-[#F7F4EF]">
      <View className="min-h-screen flex-1 justify-center p-6">
        <View className="w-full max-w-md mx-auto">
          {/* Header */}
          <View className="items-center mb-8 rounded-[30px] bg-charcoal-900 p-6">
            <View className="bg-white/10 p-3 rounded-2xl mb-4">
              <Icon as={Building} size={32} className="text-white" />
            </View>
            <Text className="text-3xl font-black text-white mb-2 text-center">Welcome back</Text>
            <Text className="text-white/70 text-center">
              {codeSent ? 'Enter the code we sent to your email.' : 'Use your email to access your co-op membership.'}
            </Text>
          </View>

          <Card className="bg-white border-white rounded-[24px]">
            <CardContent className="p-6">
              <View className="gap-5">
                {/* Email */}
                <View>
                  <Label className="text-charcoal-700">Email</Label>
                  <Input
                    value={loginData.email}
                    onChangeText={(text) => setLoginData(prev => ({ ...prev, email: text }))}
                    className="mt-1 border-cream-300 rounded-2xl h-12"
                    placeholder="you@example.com"
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
                      className="mt-1 border-cream-300 rounded-2xl h-12"
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
                    className="w-full bg-red-900 py-3 rounded-2xl"
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
                      className="w-full bg-red-900 py-3 rounded-2xl"
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
                      className="w-full border-cream-300 rounded-2xl"
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
