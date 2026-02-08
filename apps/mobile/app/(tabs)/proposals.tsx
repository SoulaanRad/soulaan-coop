import { useState } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { Vote, CheckCircle, Clock, MessageCircle, ChevronRight } from "lucide-react-native";

import { Text } from "@/components/ui/text";

// Mock proposals data
const PROPOSALS = [
  {
    id: '1',
    title: 'Community Garden Expansion',
    description: 'Expand the community garden to include a greenhouse for year-round growing.',
    category: 'Infrastructure',
    status: 'deliberation',
    aiScore: 87,
    fundingAllocation: 2,
    budgetRequested: 15000,
    fundedSoFar: 8500,
    comments: 24,
    deliberationEnds: '3 days',
  },
  {
    id: '2',
    title: 'Youth Coding Program',
    description: 'Free coding classes for community youth ages 12-18.',
    category: 'Education',
    status: 'deliberation',
    aiScore: 92,
    fundingAllocation: 1.5,
    budgetRequested: 10000,
    fundedSoFar: 6200,
    comments: 18,
    deliberationEnds: '5 days',
  },
  {
    id: '3',
    title: 'Local Business Microloan Fund',
    description: 'Create a revolving microloan fund for new community businesses.',
    category: 'Economic',
    status: 'voting',
    aiScore: 95,
    fundingAllocation: 3,
    budgetRequested: 50000,
    fundedSoFar: 35000,
    comments: 42,
    votingEnds: '2 days',
    votesFor: 156,
    votesAgainst: 23,
  },
];

export default function ProposalsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'deliberation' | 'voting'>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch proposals
    setRefreshing(false);
  };

  const filteredProposals = filter === 'all'
    ? PROPOSALS
    : PROPOSALS.filter(p => p.status === filter);

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: '#FFFBEB' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B45309" />
      }
    >
      {/* Header */}
      <View className="px-4 pt-14 pb-4">
        <Text className="text-xl font-bold text-gray-800">Community Proposals</Text>
        <Text className="text-gray-500 text-sm">Vote and discuss community initiatives</Text>
      </View>

      {/* Filters */}
      <View className="flex-row px-4 mb-4 gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'deliberation', label: 'Deliberation' },
          { id: 'voting', label: 'Voting' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id as any)}
            className={`px-4 py-2 rounded-full ${
              filter === f.id ? 'bg-amber-600' : 'bg-white border border-amber-200'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === f.id ? 'text-white' : 'text-gray-700'
              }`}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Proposals List */}
      <View className="px-4">
        {filteredProposals.map((proposal) => (
          <TouchableOpacity
            key={proposal.id}
            className="bg-white rounded-2xl p-4 mb-3 border border-amber-100"
            activeOpacity={0.7}
          >
            {/* Header */}
            <View className="flex-row justify-between items-start mb-2">
              <Text className="text-base font-semibold text-gray-800 flex-1 mr-2">
                {proposal.title}
              </Text>
              <View className="bg-amber-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-amber-700 font-medium">{proposal.category}</Text>
              </View>
            </View>

            {/* Description */}
            <Text className="text-sm text-gray-600 mb-3">{proposal.description}</Text>

            {/* AI Review Badge */}
            <View className="flex-row items-center bg-green-50 p-2 rounded-lg mb-3">
              <CheckCircle size={16} color="#16A34A" />
              <Text className="text-xs text-green-700 font-medium ml-2">
                AI Approved (Score: {proposal.aiScore}/100)
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-gray-500">
                  {proposal.fundingAllocation}% transaction allocation
                </Text>
                <Text className="text-xs text-gray-500">
                  ${proposal.fundedSoFar.toLocaleString()} / ${proposal.budgetRequested.toLocaleString()}
                </Text>
              </View>
              <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(proposal.fundedSoFar / proposal.budgetRequested) * 100}%` }}
                />
              </View>
            </View>

            {/* Footer */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Clock size={14} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">
                  {proposal.status === 'voting' ? 'Voting ends' : 'Deliberation'}: {proposal.deliberationEnds || proposal.votingEnds}
                </Text>
              </View>
              <View className="flex-row items-center">
                <MessageCircle size={14} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">{proposal.comments}</Text>
                <ChevronRight size={16} color="#B45309" className="ml-2" />
              </View>
            </View>

            {/* Voting Status (if in voting phase) */}
            {proposal.status === 'voting' && (
              <View className="mt-3 pt-3 border-t border-gray-100 flex-row justify-between">
                <View className="flex-row items-center">
                  <Text className="text-green-600 font-semibold">{proposal.votesFor}</Text>
                  <Text className="text-gray-400 mx-1">for</Text>
                  <Text className="text-red-600 font-semibold">{proposal.votesAgainst}</Text>
                  <Text className="text-gray-400 ml-1">against</Text>
                </View>
                <TouchableOpacity className="bg-amber-600 px-4 py-1.5 rounded-full">
                  <Text className="text-white text-sm font-medium">Vote</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Proposal Button */}
      <View className="px-4 mb-8">
        <TouchableOpacity
          className="bg-red-600 rounded-xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold">Submit New Proposal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
