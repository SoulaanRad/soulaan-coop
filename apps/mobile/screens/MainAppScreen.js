import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function MainAppScreen() {
  const [activeTab, setActiveTab] = useState('home');
  const [unityBalance] = useState(2450.75);
  const [soulaanBalance] = useState(180.25);
  const [userLevel] = useState('Community Builder');
  const [communitySpending] = useState(1250.0);
  const [wealthBuilding] = useState(2140.5);

  const proposals = [
    {
      id: 1,
      title: 'Community Garden & Fresh Market',
      description: 'Establish a community garden and weekly farmers market to improve food access and create local jobs.',
      requestedAmount: 15000,
      currentFunding: 8750,
      votes: 127,
      status: 'active',
      timeLeft: '5 days',
      category: 'Food Security',
    },
    {
      id: 2,
      title: 'Youth Tech Training Center',
      description: 'Create a technology training center offering coding bootcamps and digital literacy programs for youth.',
      requestedAmount: 25000,
      currentFunding: 18200,
      votes: 203,
      status: 'active',
      timeLeft: '12 days',
      category: 'Education',
    },
  ];

  const communityBusinesses = [
    {
      name: "Maya's Soul Kitchen",
      category: 'Restaurant',
      cashback: '5% UC',
      distance: '0.3 miles',
      rating: 4.8,
    },
    {
      name: 'Brothers Barbershop',
      category: 'Personal Care',
      cashback: '3% UC',
      distance: '0.5 miles',
      rating: 4.9,
    },
    {
      name: 'Unity Fitness Center',
      category: 'Health & Wellness',
      cashback: '4% UC',
      distance: '0.7 miles',
      rating: 4.7,
    },
  ];

  const upcomingEvents = [
    {
      title: 'Quarterly Soulaan Day',
      date: 'March 15',
      time: '2:00 PM',
      location: 'Community Center',
      scReward: 25,
    },
    {
      title: 'Builder Assembly Meeting',
      date: 'March 20',
      time: '6:00 PM',
      location: 'Virtual',
      scReward: 15,
    },
  ];

  const learningModules = [
    {
      title: 'Building Generational Wealth',
      progress: 75,
      reward: 10,
      category: 'Financial Literacy',
    },
    {
      title: 'Starting a Co-op Business',
      progress: 30,
      reward: 15,
      category: 'Entrepreneurship',
    },
  ];

  const renderHome = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.welcomeText}>Welcome back, Marcus</Text>
          <Text style={styles.welcomeSubtext}>Building community wealth together</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Overview */}
      <View style={styles.walletContainer}>
        <Card style={[styles.walletCard, styles.unityCard]}>
          <CardContent style={styles.walletContent}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletIcon}>🪙</Text>
              <Text style={styles.walletLabel}>Unity Coin</Text>
            </View>
            <Text style={styles.walletAmount}>{unityBalance.toFixed(2)} UC</Text>
            <Text style={styles.walletUsd}>≈ ${(unityBalance * 1.2).toFixed(2)} USD</Text>
          </CardContent>
        </Card>

        <Card style={[styles.walletCard, styles.soulaanCard]}>
          <CardContent style={styles.walletContent}>
            <View style={styles.walletHeader}>
              <Text style={styles.walletIcon}>📈</Text>
              <Text style={styles.walletLabel}>Soulaan Coin</Text>
            </View>
            <Text style={styles.walletAmount}>{soulaanBalance.toFixed(2)} SC</Text>
            <Text style={styles.walletUsd}>Rewards earned</Text>
          </CardContent>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { icon: '💰', label: 'Send' },
          { icon: '💳', label: 'Receive' },
          { icon: '➕', label: 'Invest' },
          { icon: '📱', label: 'QR Pay' },
        ].map((action, index) => (
          <TouchableOpacity key={index} style={styles.actionButton}>
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Crowdfunding CTA */}
      <Card style={styles.crowdfundingCard}>
        <CardContent style={styles.crowdfundingContent}>
          <View style={styles.crowdfundingIcon}>
            <Text style={styles.crowdfundingIconText}>⭐</Text>
          </View>
          <View style={styles.crowdfundingText}>
            <Text style={styles.crowdfundingTitle}>Support Our Mission</Text>
            <Text style={styles.crowdfundingSubtitle}>Get exclusive badges and help build the future</Text>
          </View>
          <Button
            onPress={() => setActiveTab('support')}
            variant="secondary"
            size="sm"
            style={styles.crowdfundingButton}
          >
            💎 Support
          </Button>
        </CardContent>
      </Card>

      {/* Active Proposals */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Proposals</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        </CardHeader>
        <CardContent>
          {proposals.filter(p => p.status === 'active').slice(0, 2).map(proposal => (
            <View key={proposal.id} style={styles.proposalItem}>
              <View style={styles.proposalHeader}>
                <Text style={styles.proposalTitle}>{proposal.title}</Text>
                <Badge style={styles.categoryBadge}>{proposal.category}</Badge>
              </View>
              <Text style={styles.proposalDescription}>{proposal.description}</Text>
              <View style={styles.proposalProgress}>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    ${proposal.currentFunding.toLocaleString()} raised
                  </Text>
                  <Text style={styles.progressText}>{proposal.timeLeft} left</Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { width: `${(proposal.currentFunding / proposal.requestedAmount) * 100}%` }
                    ]}
                  />
                </View>
                <View style={styles.proposalActions}>
                  <Text style={styles.votesText}>{proposal.votes} votes</Text>
                  <Button size="sm" style={styles.voteButton}>
                    🗳️ Vote
                  </Button>
                </View>
              </View>
            </View>
          ))}
        </CardContent>
      </Card>

      {/* Community Impact */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.sectionTitle}>Community Impact</Text>
        </CardHeader>
        <CardContent>
          <View style={styles.impactGrid}>
            <View style={styles.impactItem}>
              <Text style={styles.impactNumber}>$127K</Text>
              <Text style={styles.impactLabel}>Total Invested</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactNumber}>23</Text>
              <Text style={styles.impactLabel}>Projects Funded</Text>
            </View>
            <View style={styles.impactItem}>
              <Text style={styles.impactNumber}>1,247</Text>
              <Text style={styles.impactLabel}>Community Members</Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderCommunity = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.pageTitle}>Community Businesses</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* SC Earning Explanation */}
      <Card style={styles.scExplanationCard}>
        <CardContent style={styles.scExplanationContent}>
          <View style={styles.scExplanationIcon}>
            <Text style={styles.scExplanationIconText}>🪙</Text>
          </View>
          <View>
            <Text style={styles.scExplanationTitle}>Earn Soulaan Coins</Text>
            <Text style={styles.scExplanationSubtitle}>Get SC rewards when you shop at verified community businesses</Text>
          </View>
        </CardContent>
      </Card>

      {/* Community Businesses */}
      <View style={styles.businessList}>
        {communityBusinesses.map((business, index) => (
          <Card key={index} style={styles.businessCard}>
            <CardContent style={styles.businessContent}>
              <View style={styles.businessInfo}>
                <View style={styles.businessIcon}>
                  <Text style={styles.businessIconText}>{business.name.charAt(0)}</Text>
                </View>
                <View style={styles.businessDetails}>
                  <Text style={styles.businessName}>{business.name}</Text>
                  <Text style={styles.businessCategory}>{business.category}</Text>
                  <View style={styles.businessMeta}>
                    <Text style={styles.businessDistance}>{business.distance}</Text>
                    <Text style={styles.businessRating}>⭐ {business.rating}</Text>
                    <Badge variant="outline" style={styles.scEligibleBadge}>SC Eligible</Badge>
                  </View>
                </View>
              </View>
              <View style={styles.businessActions}>
                <Badge variant="outline" style={styles.cashbackBadge}>
                  {business.cashback}
                </Badge>
                <Button size="sm" style={styles.payButton}>
                  Pay with UC
                </Button>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Add Business CTA */}
      <Card style={styles.addBusinessCard}>
        <CardContent style={styles.addBusinessContent}>
          <Text style={styles.addBusinessIcon}>➕</Text>
          <Text style={styles.addBusinessTitle}>Know a Community Business?</Text>
          <Text style={styles.addBusinessSubtitle}>Help us verify and add it to earn SC</Text>
          <Button variant="outline" size="sm" style={styles.submitBusinessButton}>
            Submit Business
          </Button>
        </CardContent>
      </Card>
    </ScrollView>
  );

  const renderLearn = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.pageTitle}>Learn & Earn</Text>
        <Badge variant="outline" style={styles.userLevelBadge}>
          {userLevel}
        </Badge>
      </View>

      {/* Progress Overview */}
      <Card style={styles.progressCard}>
        <CardContent style={styles.progressOverviewContent}>
          <View>
            <Text style={styles.progressOverviewTitle}>Your Learning Journey</Text>
            <Text style={styles.progressOverviewSubtitle}>Complete modules to earn SC</Text>
          </View>
          <View style={styles.progressOverviewStats}>
            <Text style={styles.progressOverviewNumber}>35 SC</Text>
            <Text style={styles.progressOverviewLabel}>Total earned</Text>
          </View>
        </CardContent>
      </Card>

      {/* Learning Modules */}
      <Text style={styles.sectionSubtitle}>Available Courses</Text>
      {learningModules.map((module, index) => (
        <Card key={index} style={styles.moduleCard}>
          <CardContent>
            <View style={styles.moduleHeader}>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Badge variant="outline" style={styles.moduleCategoryBadge}>
                  {module.category}
                </Badge>
              </View>
              <Badge style={styles.moduleRewardBadge}>
                +{module.reward} SC
              </Badge>
            </View>
            <View style={styles.moduleProgress}>
              <View style={styles.moduleProgressInfo}>
                <Text style={styles.moduleProgressLabel}>Progress</Text>
                <Text style={styles.moduleProgressPercent}>{module.progress}%</Text>
              </View>
              <View style={styles.moduleProgressBar}>
                <View 
                  style={[
                    styles.moduleProgressFill,
                    { width: `${module.progress}%` }
                  ]}
                />
              </View>
              <Button
                size="sm"
                style={[
                  styles.moduleButton,
                  module.progress === 100 ? styles.moduleCompleteButton : styles.moduleContinueButton
                ]}
              >
                {module.progress === 100 ? 'Completed ✓' : 'Continue Learning'}
              </Button>
            </View>
          </CardContent>
        </Card>
      ))}
    </ScrollView>
  );

  const renderEvents = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Community Events</Text>

      {/* Financial Impact */}
      <Card style={styles.financialImpactCard}>
        <CardContent>
          <Text style={styles.financialImpactTitle}>Your Financial Impact</Text>
          <View style={styles.financialImpactGrid}>
            <View style={styles.financialImpactItem}>
              <Text style={styles.financialImpactNumber}>${communitySpending.toFixed(0)}</Text>
              <Text style={styles.financialImpactLabel}>Community Spending</Text>
            </View>
            <View style={styles.financialImpactItem}>
              <Text style={styles.financialImpactNumber}>${wealthBuilding.toFixed(0)}</Text>
              <Text style={styles.financialImpactLabel}>Wealth Building</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Text style={styles.sectionSubtitle}>Upcoming Events</Text>
      {upcomingEvents.map((event, index) => (
        <Card key={index} style={styles.eventCard}>
          <CardContent style={styles.eventContent}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.eventDetails}>
                <Text style={styles.eventDetail}>📅 {event.date}</Text>
                <Text style={styles.eventDetail}>🕐 {event.time}</Text>
              </View>
              <Text style={styles.eventDetail}>📍 {event.location}</Text>
            </View>
            <View style={styles.eventActions}>
              <Badge style={styles.eventRewardBadge}>+{event.scReward} SC</Badge>
              <Button size="sm" style={styles.rsvpButton}>
                RSVP
              </Button>
            </View>
          </CardContent>
        </Card>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Main Content */}
      <View style={styles.mainContent}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'proposals' && renderHome()} {/* TODO: Create proposals screen */}
        {activeTab === 'community' && renderCommunity()}
        {activeTab === 'learn' && renderLearn()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'support' && renderHome()} {/* TODO: Create support screen */}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'proposals', icon: '🗳️', label: 'Proposals' },
          { id: 'community', icon: '👥', label: 'Community' },
          { id: 'learn', icon: '📈', label: 'Learn' },
          { id: 'support', icon: '⭐', label: 'Support' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.bottomNavTab,
              activeTab === tab.id && styles.activeBottomNavTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.bottomNavIcon,
              activeTab === tab.id && styles.activeBottomNavIcon
            ]}>
              {tab.icon}
            </Text>
            <Text style={[
              styles.bottomNavLabel,
              activeTab === tab.id && styles.activeBottomNavLabel
            ]}>
              {tab.label}
            </Text>
            {tab.id === 'support' && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>!</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainContent: {
    flex: 1,
    paddingBottom: 80, // Space for fixed bottom navigation
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20, // Extra space at bottom of scrollable content
  },

  // Home Screen
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  iconText: {
    fontSize: 16,
  },

  // Wallet Cards
  walletContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  walletCard: {
    flex: 1,
    borderWidth: 0,
  },
  unityCard: {
    backgroundColor: '#DC2626',
  },
  soulaanCard: {
    backgroundColor: '#F59E0B',
  },
  walletContent: {
    padding: 20,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  walletUsd: {
    fontSize: 12,
    color: '#F3F4F6',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },

  // Crowdfunding CTA
  crowdfundingCard: {
    backgroundColor: '#7C2D12',
    borderWidth: 0,
    marginBottom: 24,
  },
  crowdfundingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crowdfundingIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  crowdfundingIconText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  crowdfundingText: {
    flex: 1,
  },
  crowdfundingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  crowdfundingSubtitle: {
    fontSize: 14,
    color: '#F3F4F6',
  },
  crowdfundingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Section Cards
  sectionCard: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },

  // Proposals
  proposalItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#F59E0B',
  },
  proposalDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  proposalProgress: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  proposalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  votesText: {
    fontSize: 12,
    color: '#6B7280',
  },
  voteButton: {
    backgroundColor: 'transparent',
    borderColor: '#DC2626',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // Impact Grid
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactItem: {
    alignItems: 'center',
  },
  impactNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  impactLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  // Community Screen
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  // SC Explanation Card
  scExplanationCard: {
    backgroundColor: '#7C2D12',
    borderWidth: 0,
    marginBottom: 24,
  },
  scExplanationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scExplanationIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  scExplanationIconText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  scExplanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  scExplanationSubtitle: {
    fontSize: 14,
    color: '#F3F4F6',
  },

  // Business List
  businessList: {
    gap: 16,
    marginBottom: 24,
  },
  businessCard: {
    backgroundColor: '#FFFFFF',
  },
  businessContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  businessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  businessIconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  businessCategory: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessDistance: {
    fontSize: 12,
    color: '#6B7280',
  },
  businessRating: {
    fontSize: 12,
    color: '#6B7280',
  },
  scEligibleBadge: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  businessActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cashbackBadge: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  payButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // Add Business Card
  addBusinessCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(254, 243, 199, 0.5)',
  },
  addBusinessContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  addBusinessIcon: {
    fontSize: 32,
    color: '#F59E0B',
    marginBottom: 8,
  },
  addBusinessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  addBusinessSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  submitBusinessButton: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
  },

  // Learn Screen
  userLevelBadge: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  progressCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0,
    marginBottom: 24,
  },
  progressOverviewContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressOverviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  progressOverviewSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  progressOverviewStats: {
    alignItems: 'flex-end',
  },
  progressOverviewNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  progressOverviewLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },

  // Learning Modules
  moduleCard: {
    marginBottom: 16,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  moduleCategoryBadge: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  moduleRewardBadge: {
    backgroundColor: '#F59E0B',
  },
  moduleProgress: {
    gap: 12,
  },
  moduleProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moduleProgressLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  moduleProgressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  moduleProgressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  moduleProgressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  moduleButton: {
    marginTop: 8,
  },
  moduleCompleteButton: {
    backgroundColor: '#10B981',
  },
  moduleContinueButton: {
    backgroundColor: '#DC2626',
  },

  // Events Screen
  financialImpactCard: {
    backgroundColor: '#7C2D12',
    borderWidth: 0,
    marginBottom: 24,
  },
  financialImpactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  financialImpactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  financialImpactItem: {
    alignItems: 'center',
  },
  financialImpactNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  financialImpactLabel: {
    fontSize: 14,
    color: '#F3F4F6',
    marginTop: 4,
  },

  // Events
  eventCard: {
    marginBottom: 16,
  },
  eventContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  eventDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  eventActions: {
    alignItems: 'flex-end',
    gap: 12,
  },
  eventRewardBadge: {
    backgroundColor: '#F59E0B',
  },
  rsvpButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 20, // Extra padding for safe area
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomNavTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    position: 'relative',
  },
  activeBottomNavTab: {
    backgroundColor: '#F59E0B',
  },
  bottomNavIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  activeBottomNavIcon: {
    color: '#FFFFFF',
  },
  bottomNavLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeBottomNavLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});