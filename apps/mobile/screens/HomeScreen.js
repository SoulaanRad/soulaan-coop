import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function HomeScreen() {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.userName}>Marcus Johnson</Text>
            <Badge style={styles.levelBadge}>{userLevel}</Badge>
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

        {/* Wallet Cards */}
        <View style={styles.walletContainer}>
          <Card style={styles.walletCard}>
            <CardContent>
              <View style={styles.walletHeader}>
                <Text style={styles.walletTitle}>Unity Coin (UC)</Text>
                <Text style={styles.walletIcon}>🪙</Text>
              </View>
              <Text style={styles.balance}>${unityBalance.toLocaleString()}</Text>
              <Text style={styles.balanceLabel}>Community Spending Power</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '65%' }]} />
                </View>
                <Text style={styles.progressText}>+12% this month</Text>
              </View>
            </CardContent>
          </Card>

          <Card style={styles.walletCard}>
            <CardContent>
              <View style={styles.walletHeader}>
                <Text style={styles.walletTitle}>Soulaan Coin (SC)</Text>
                <Text style={styles.walletIcon}>📈</Text>
              </View>
              <Text style={styles.balance}>${soulaanBalance.toLocaleString()}</Text>
              <Text style={styles.balanceLabel}>Wealth Building</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: '45%' }]} />
                </View>
                <Text style={styles.progressText}>+8% this month</Text>
              </View>
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

        {/* Impact Summary */}
        <Card style={styles.impactCard}>
          <CardHeader>
            <Text style={styles.cardTitle}>Your Community Impact</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.impactStats}>
              <View style={styles.impactStat}>
                <Text style={styles.statNumber}>${communitySpending.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Community Spending</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.statNumber}>${wealthBuilding.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Wealth Building</Text>
              </View>
            </View>
            <Text style={styles.impactDescription}>
              You've contributed to 12 local businesses and 3 community projects this month! 🎉
            </Text>
          </CardContent>
        </Card>

        {/* Active Proposals */}
        <View style={styles.proposalsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Proposals</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {proposals.slice(0, 2).map((proposal) => (
            <Card key={proposal.id} style={styles.proposalCard}>
              <CardContent>
                <View style={styles.proposalHeader}>
                  <Badge style={styles.categoryBadge}>{proposal.category}</Badge>
                  <Text style={styles.timeLeft}>{proposal.timeLeft} left</Text>
                </View>
                <Text style={styles.proposalTitle}>{proposal.title}</Text>
                <Text style={styles.proposalDescription}>{proposal.description}</Text>
                
                <View style={styles.fundingInfo}>
                  <View style={styles.fundingProgress}>
                    <View style={styles.fundingBar}>
                      <View 
                        style={[
                          styles.fundingFill, 
                          { width: `${(proposal.currentFunding / proposal.requestedAmount) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.fundingText}>
                      ${proposal.currentFunding.toLocaleString()} of ${proposal.requestedAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.proposalFooter}>
                  <Text style={styles.voteCount}>👥 {proposal.votes} votes</Text>
                  <Button style={styles.voteButton}>
                    Vote & Fund
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#F59E0B',
    alignSelf: 'flex-start',
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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  walletCard: {
    flex: 1,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  walletIcon: {
    fontSize: 20,
  },
  balance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  progressText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 70,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },

  // Impact Card
  impactCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  impactStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  impactStat: {
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  impactDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  // Proposals Section
  proposalsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra space for bottom tabs
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  proposalCard: {
    marginBottom: 16,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  timeLeft: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  fundingInfo: {
    marginBottom: 16,
  },
  fundingProgress: {
    gap: 8,
  },
  fundingBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fundingFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  fundingText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  proposalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  voteButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
