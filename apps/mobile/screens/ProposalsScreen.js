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
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function ProposalsScreen() {
  const [filter, setFilter] = useState('all');

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
    {
      id: 3,
      title: 'Small Business Microloan Fund',
      description: 'Establish a revolving loan fund to support Black-owned small businesses with startup capital.',
      requestedAmount: 50000,
      currentFunding: 45000,
      votes: 356,
      status: 'funded',
      timeLeft: 'Funded',
      category: 'Economic Development',
    },
  ];

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'funded', label: 'Funded' },
    { id: 'pending', label: 'Pending' },
  ];

  const filteredProposals = proposals.filter(proposal => 
    filter === 'all' || proposal.status === filter
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Community Proposals</Text>
          <Text style={styles.subtitle}>Vote on projects that matter to our community</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterTabs}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.filterTab,
                    filter === option.id && styles.activeFilterTab
                  ]}
                  onPress={() => setFilter(option.id)}
                >
                  <Text style={[
                    styles.filterText,
                    filter === option.id && styles.activeFilterText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Proposals List */}
        <View style={styles.proposalsContainer}>
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} style={styles.proposalCard}>
              <CardContent>
                <View style={styles.proposalHeader}>
                  <Badge style={[
                    styles.categoryBadge,
                    proposal.status === 'funded' && styles.fundedBadge
                  ]}>
                    {proposal.category}
                  </Badge>
                  <Text style={[
                    styles.timeLeft,
                    proposal.status === 'funded' && styles.fundedText
                  ]}>
                    {proposal.timeLeft}
                  </Text>
                </View>
                
                <Text style={styles.proposalTitle}>{proposal.title}</Text>
                <Text style={styles.proposalDescription}>{proposal.description}</Text>
                
                <View style={styles.fundingInfo}>
                  <View style={styles.fundingProgress}>
                    <View style={styles.fundingBar}>
                      <View 
                        style={[
                          styles.fundingFill, 
                          { width: `${Math.min((proposal.currentFunding / proposal.requestedAmount) * 100, 100)}%` },
                          proposal.status === 'funded' && styles.fundedFill
                        ]} 
                      />
                    </View>
                    <View style={styles.fundingDetails}>
                      <Text style={styles.fundingText}>
                        ${proposal.currentFunding.toLocaleString()} of ${proposal.requestedAmount.toLocaleString()}
                      </Text>
                      <Text style={styles.fundingPercentage}>
                        {Math.round((proposal.currentFunding / proposal.requestedAmount) * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.proposalFooter}>
                  <Text style={styles.voteCount}>👥 {proposal.votes} votes</Text>
                  <Button 
                    style={[
                      styles.voteButton,
                      proposal.status === 'funded' && styles.fundedButton
                    ]}
                    disabled={proposal.status === 'funded'}
                  >
                    {proposal.status === 'funded' ? 'Funded ✓' : 'Vote & Fund'}
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Create Proposal Button */}
        <View style={styles.createProposalContainer}>
          <Button style={styles.createProposalButton}>
            ➕ Create New Proposal
          </Button>
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
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Filter Tabs
  filterContainer: {
    marginBottom: 20,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterTab: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },

  // Proposals
  proposalsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom tabs
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
  fundedBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  timeLeft: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  fundedText: {
    color: '#10B981',
  },
  proposalTitle: {
    fontSize: 18,
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
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fundingFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  fundedFill: {
    backgroundColor: '#10B981',
  },
  fundingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fundingText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  fundingPercentage: {
    fontSize: 14,
    color: '#6B7280',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  fundedButton: {
    backgroundColor: '#10B981',
  },

  // Create Proposal
  createProposalContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  createProposalButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
  },
});
