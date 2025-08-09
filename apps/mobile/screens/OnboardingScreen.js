import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCoop, setSelectedCoop] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    businessAccount: false,
    agreeToTerms: false,
  });

  const splashScreens = [
    {
      title: 'Welcome to Co-op Economy',
      subtitle: 'Building Community Wealth Together',
      description: 'Join a cooperative movement that puts community ownership and economic sovereignty first.',
      icon: '🤝',
      gradient: '#F59E0B', // gold-500
    },
    {
      title: 'Community Investment',
      subtitle: 'Your Money, Your Neighborhood',
      description: 'Vote on and fund local projects that create jobs, improve infrastructure, and strengthen your community.',
      icon: '🗳️',
      gradient: '#DC2626', // red-600
    },
    {
      title: 'Support Local Businesses',
      subtitle: 'Shop Local, Earn Rewards',
      description: 'Discover community businesses, pay with co-op currency, and earn rewards for every purchase.',
      icon: '🏪',
      gradient: '#F59E0B', // gold-500
    },
    {
      title: 'Crypto-Powered Economy',
      subtitle: 'Your Wallet, Your Control',
      description: 'Co-op currencies are built on blockchain for transparency, security, and true community ownership.',
      icon: '💰',
      gradient: '#DC2626', // red-600
    },
    {
      title: 'Democratic Governance',
      subtitle: 'Your Community, Your Voice',
      description: 'Participate in democratic decision-making and help shape the future of your cooperative economy.',
      icon: '👥',
      gradient: '#F59E0B', // gold-500
    },
  ];

  const availableCoops = [
    {
      id: 'soulaan',
      name: 'Soulaan Co-op',
      description: 'Building Black Economic Sovereignty',
      location: 'Nationwide',
      members: '1,247+ members',
      icon: '🏛️',
      featured: true,
    },
  ];

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

  const connectWallet = () => {
    setWalletConnected(true);
    setTimeout(() => {
      navigation.replace('MainApp');
    }, 2000);
  };

  const renderSplashScreen = (index) => {
    const screen = splashScreens[index];
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            contentContainerStyle={styles.splashScrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.splashCard, { backgroundColor: screen.gradient }]}>
              <Text style={styles.splashIcon}>{screen.icon}</Text>
              <Text style={styles.splashTitle}>{screen.title}</Text>
              <Text style={styles.splashSubtitle}>{screen.subtitle}</Text>
              <Text style={styles.splashDescription}>{screen.description}</Text>
            </View>

            {/* Progress Dots */}
            <View style={styles.progressDots}>
              {splashScreens.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === index ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>

            {/* Navigation */}
            <View style={styles.navigationContainer}>
              <Button
                variant="ghost"
                onPress={prevStep}
                style={[styles.navButton, index === 0 && styles.invisible]}
              >
                ← Back
              </Button>

              <Button
                onPress={index === splashScreens.length - 1 ? () => setCurrentStep(splashScreens.length) : nextStep}
                style={styles.primaryButton}
              >
                {index === splashScreens.length - 1 ? 'Choose Co-op' : 'Next'} →
              </Button>
            </View>

            {index < splashScreens.length - 1 && (
              <TouchableOpacity 
                onPress={() => navigation.replace('MainApp')}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  const renderCoopSelection = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🌍</Text>
            <Text style={styles.headerTitle}>Choose Your Co-op</Text>
            <Text style={styles.headerSubtitle}>Select the cooperative community you'd like to join</Text>
          </View>

          <Card style={styles.benefitsCard}>
            <CardContent>
              <Text style={styles.benefitsTitle}>🎯 How Co-ops Help You</Text>
              {[
                'Keep money circulating in your community',
                'Democratic control over economic decisions',
                'Shared ownership and collective benefits',
                'Support for local businesses and entrepreneurs',
                'Building generational wealth together',
              ].map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Text style={styles.benefitCheck}>✅</Text>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </CardContent>
          </Card>

          {availableCoops.map((coop) => (
            <TouchableOpacity
              key={coop.id}
              onPress={() => setSelectedCoop(coop.id)}
              style={[
                styles.coopCard,
                selectedCoop === coop.id && styles.selectedCoopCard
              ]}
            >
              <View style={styles.coopHeader}>
                <Text style={styles.coopIcon}>{coop.icon}</Text>
                <View style={styles.coopInfo}>
                  <View style={styles.coopTitleRow}>
                    <Text style={styles.coopName}>{coop.name}</Text>
                    {coop.featured && (
                      <Badge style={styles.featuredBadge}>Featured</Badge>
                    )}
                  </View>
                  <Text style={styles.coopDescription}>{coop.description}</Text>
                </View>
                {selectedCoop === coop.id && (
                  <Text style={styles.checkmark}>✅</Text>
                )}
              </View>
              <Text style={styles.coopDetails}>📍 {coop.location} • 👥 {coop.members}</Text>
            </TouchableOpacity>
          ))}

          <Button
            onPress={nextStep}
            disabled={!selectedCoop}
            style={[styles.continueButton, !selectedCoop && styles.disabledButton]}
          >
            Continue with {selectedCoop ? availableCoops.find(c => c.id === selectedCoop)?.name : 'Selected Co-op'}
          </Button>

          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back to Introduction</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderSignup = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.signupScrollContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🏗️</Text>
          <Text style={styles.headerTitle}>Join Soulaan Co-op</Text>
          <Text style={styles.headerSubtitle}>Building Black Economic Sovereignty</Text>
        </View>

        <Card>
          <CardContent style={styles.cardContent}>
            {/* Account Type Selection */}
            <Text style={styles.sectionTitle}>Account Type</Text>

            <View style={styles.accountTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.accountTypeButton,
                  !formData.businessAccount && styles.accountTypeSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, businessAccount: false }))}
              >
                <Text style={styles.accountTypeIcon}>👥</Text>
                <Text style={styles.accountTypeText}>Personal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.accountTypeButton,
                  formData.businessAccount && styles.accountTypeSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, businessAccount: true }))}
              >
                <Text style={styles.accountTypeIcon}>🏪</Text>
                <Text style={styles.accountTypeText}>Business</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {formData.businessAccount ? 'Business Name' : 'First Name'}
              </Text>
              <Input
                value={formData.firstName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                placeholder={formData.businessAccount ? "Maya's Soul Kitchen" : "Marcus"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {formData.businessAccount ? 'Owner Name' : 'Last Name'}
              </Text>
              <Input
                value={formData.lastName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                placeholder={formData.businessAccount ? "Maya Johnson" : "Johnson"}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <Input
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder={formData.businessAccount ? "maya@soulkitchen.com" : "marcus@example.com"}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <Input
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <Input
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                placeholder="Create a strong password"
                secureTextEntry
              />
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setFormData(prev => ({ ...prev, agreeToTerms: !prev.agreeToTerms }))}
            >
              <Text style={[styles.checkbox, formData.agreeToTerms && styles.checkedBox]}>
                {formData.agreeToTerms ? '☑️' : '☐'}
              </Text>
              <Text style={styles.checkboxText}>
                I agree to the Terms of Service and Co-op Charter
              </Text>
            </TouchableOpacity>

            {/* Verification Notice */}
            <View style={styles.verificationNotice}>
              <Text style={styles.verificationIcon}>🛡️</Text>
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>Co-op Verification</Text>
                <Text style={styles.verificationDescription}>
                  Your account will be reviewed to ensure alignment with co-op values and mission.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={nextStep}
              disabled={!formData.agreeToTerms || !formData.email || !formData.firstName}
              style={[
                styles.continueButtonFixed,
                (!formData.agreeToTerms || !formData.email || !formData.firstName) && styles.disabledButton
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.continueButtonText}>Continue to Wallet Setup</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>

        {/* Login Link */}
        <TouchableOpacity onPress={() => navigation.replace('MainApp')} style={styles.backButton}>
          <Text style={styles.backButtonText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderWalletSetup = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.walletScrollContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💰</Text>
          <Text style={styles.headerTitle}>Connect Your Wallet</Text>
          <Text style={styles.headerSubtitle}>Secure access to Unity Coin (UC) & Soulaan Coin (SC)</Text>
        </View>

        {!walletConnected ? (
          <Card>
            <CardContent>
              <Button
                onPress={connectWallet}
                style={styles.walletButton}
              >
                <View style={styles.walletOption}>
                  <Text style={styles.walletIcon}>📱</Text>
                  <View>
                    <Text style={styles.walletTitle}>Email Wallet</Text>
                    <Text style={styles.walletSubtitle}>Secure, easy setup with your email</Text>
                  </View>
                </View>
              </Button>

              <View style={styles.securityNotice}>
                <Text style={styles.securityIcon}>🛡️</Text>
                <View>
                  <Text style={styles.securityTitle}>Your Keys, Your Crypto</Text>
                  <Text style={styles.securityDescription}>
                    We use advanced encryption to secure your wallet. You maintain full control of your assets.
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Wallet Connected!</Text>
              <Text style={styles.successSubtitle}>
                Your secure wallet is ready for Unity Coin (UC) & Soulaan Coin (SC)
              </Text>

              <View style={styles.walletAddress}>
                <Text style={styles.addressLabel}>Wallet Address</Text>
                <Text style={styles.addressText}>0x742d...d8e9</Text>
              </View>

              <View style={styles.initialTokens}>
                <View style={styles.tokenCard}>
                  <Text style={styles.tokenIcon}>🪙</Text>
                  <Text style={styles.tokenLabel}>Welcome Bonus</Text>
                  <Text style={styles.tokenAmount}>10 UC</Text>
                </View>
                <View style={styles.tokenCard}>
                  <Text style={styles.tokenIcon}>📈</Text>
                  <Text style={styles.tokenLabel}>Starter Reward</Text>
                  <Text style={styles.tokenAmount}>5 SC</Text>
                </View>
              </View>

              <Button
                onPress={() => navigation.replace('MainApp')}
                style={styles.completeButton}
              >
                Complete Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <TouchableOpacity onPress={prevStep} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Account Setup</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Render based on current step
  if (currentStep < splashScreens.length) {
    return renderSplashScreen(currentStep);
  } else if (currentStep === splashScreens.length) {
    return renderCoopSelection();
  } else if (currentStep === splashScreens.length + 1) {
    return renderSignup();
  } else {
    return renderWalletSetup();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  splashScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: height - 120,
  },
  signupScrollContainer: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  walletScrollContainer: {
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  
  // Splash Screen Styles
  splashCard: {
    width: width - 48,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  splashIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    textAlign: 'center',
    marginBottom: 16,
  },
  splashDescription: {
    fontSize: 14,
    color: '#F3F4F6',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  progressDots: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#F59E0B',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#D1D5DB',
  },
  
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  navButton: {
    backgroundColor: 'transparent',
  },
  invisible: {
    opacity: 0,
  },
  primaryButton: {
    backgroundColor: '#F59E0B',
  },
  
  skipButton: {
    marginTop: 16,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
  },

  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: 16, // Reduced from 32
  },
  headerIcon: {
    fontSize: 32, // Reduced from 48
    marginBottom: 8, // Reduced from 16
  },
  headerTitle: {
    fontSize: 22, // Reduced from 28
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4, // Reduced from 8
  },
  headerSubtitle: {
    fontSize: 14, // Reduced from 16
    color: '#6B7280',
    textAlign: 'center',
  },

  // Benefits Card
  benefitsCard: {
    marginBottom: 24,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitCheck: {
    marginRight: 8,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  // Co-op Card
  coopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  selectedCoopCard: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  coopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  coopIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  coopInfo: {
    flex: 1,
  },
  coopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 8,
  },
  featuredBadge: {
    backgroundColor: '#F59E0B',
  },
  coopDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 24,
    marginLeft: 12,
  },
  coopDetails: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Form Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16, // Reduced from 24
    gap: 8, // Reduced from 12
  },
  accountTypeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  accountTypeSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  accountTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  accountTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  
  inputGroup: {
    marginBottom: 12, // Reduced from 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  checkbox: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  checkedBox: {
    color: '#DC2626',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  verificationNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12, // Reduced from 16
    marginBottom: 16, // Reduced from 20
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  verificationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  verificationDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Wallet Setup
  walletButton: {
    backgroundColor: '#F59E0B',
    marginBottom: 20,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  walletSubtitle: {
    fontSize: 12,
    color: '#F3F4F6',
  },

  securityNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  // Success Screen
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  walletAddress: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#111827',
  },
  
  initialTokens: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tokenCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  tokenIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tokenLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  tokenAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },

  // Common Buttons
  continueButton: {
    backgroundColor: '#DC2626',
    marginTop: 8,
  },
  continueButtonFixed: {
    backgroundColor: '#DC2626',
    paddingVertical: 14, // Slightly reduced
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16, // Reduced from 20
    marginBottom: 16, // Reduced from 20
    minHeight: 50, // Reduced from 56
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeButton: {
    backgroundColor: '#DC2626',
    width: '100%',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardContent: {
    padding: 16, // Compact padding inside card
  },
});