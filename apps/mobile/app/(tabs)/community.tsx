import { useState } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, Image } from "react-native";
import { Users, Award, TrendingUp, Star, ChevronRight } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { useAuth } from "@/contexts/auth-context";

// Mock data
const LEADERBOARD = [
  { id: '1', name: 'Marcus J.', level: 'Community Leader', sc: 1250, rank: 1 },
  { id: '2', name: 'Sarah T.', level: 'Builder', sc: 980, rank: 2 },
  { id: '3', name: 'David K.', level: 'Builder', sc: 875, rank: 3 },
  { id: '4', name: 'Lisa M.', level: 'Contributor', sc: 650, rank: 4 },
  { id: '5', name: 'James R.', level: 'Contributor', sc: 520, rank: 5 },
];

const ACHIEVEMENTS = [
  { id: '1', name: 'First Purchase', description: 'Made your first community purchase', earned: true },
  { id: '2', name: 'Voter', description: 'Voted on 5 proposals', earned: true },
  { id: '3', name: 'Community Builder', description: 'Referred 3 members', earned: false },
  { id: '4', name: 'Top Spender', description: 'Spent $1000 at community stores', earned: false },
];

const MEMBER_LEVELS = [
  { level: 'New Member', minSC: 0, benefits: ['Basic voting rights', 'Store access'] },
  { level: 'Contributor', minSC: 100, benefits: ['1x vote weight', 'Event discounts'] },
  { level: 'Builder', minSC: 500, benefits: ['2x vote weight', 'Priority proposals'] },
  { level: 'Community Leader', minSC: 1000, benefits: ['3x vote weight', 'Governance access'] },
];

export default function CommunityScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'achievements' | 'levels'>('leaderboard');

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch community data
    setRefreshing(false);
  };

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
        <Text className="text-xl font-bold text-gray-800">Community</Text>
        <Text className="text-gray-500 text-sm">Connect and grow together</Text>
      </View>

      {/* Stats Cards */}
      <View className="px-4 flex-row gap-3 mb-4">
        <View className="flex-1 bg-white rounded-2xl p-4 border border-amber-100">
          <Users size={20} color="#B45309" />
          <Text className="text-2xl font-bold text-gray-800 mt-2">1,247</Text>
          <Text className="text-xs text-gray-500">Members</Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 border border-amber-100">
          <TrendingUp size={20} color="#16A34A" />
          <Text className="text-2xl font-bold text-gray-800 mt-2">+48</Text>
          <Text className="text-xs text-gray-500">This Month</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row px-4 mb-4">
        {[
          { id: 'leaderboard', label: 'Leaderboard' },
          { id: 'achievements', label: 'Achievements' },
          { id: 'levels', label: 'Levels' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === tab.id ? 'border-amber-600' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.id ? 'text-amber-700' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View className="px-4">
        {activeTab === 'leaderboard' && (
          <View className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
            {LEADERBOARD.map((member, index) => (
              <TouchableOpacity
                key={member.id}
                className={`flex-row items-center p-4 ${
                  index < LEADERBOARD.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                {/* Rank */}
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  member.rank === 1 ? 'bg-amber-500' :
                  member.rank === 2 ? 'bg-gray-400' :
                  member.rank === 3 ? 'bg-amber-700' : 'bg-gray-200'
                }`}>
                  <Text className={`font-bold ${member.rank <= 3 ? 'text-white' : 'text-gray-600'}`}>
                    {member.rank}
                  </Text>
                </View>

                {/* Member Info */}
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800">{member.name}</Text>
                  <Text className="text-xs text-gray-500">{member.level}</Text>
                </View>

                {/* SC Amount */}
                <View className="items-end">
                  <Text className="font-bold text-amber-700">{member.sc} SC</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'achievements' && (
          <View className="space-y-3">
            {ACHIEVEMENTS.map((achievement) => (
              <View
                key={achievement.id}
                className={`bg-white rounded-2xl p-4 border flex-row items-center ${
                  achievement.earned ? 'border-green-200 bg-green-50' : 'border-amber-100'
                }`}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  achievement.earned ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  <Award size={24} color={achievement.earned ? 'white' : '#9CA3AF'} />
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold ${achievement.earned ? 'text-green-800' : 'text-gray-800'}`}>
                    {achievement.name}
                  </Text>
                  <Text className={`text-sm ${achievement.earned ? 'text-green-600' : 'text-gray-500'}`}>
                    {achievement.description}
                  </Text>
                </View>
                {achievement.earned && (
                  <Star size={20} color="#16A34A" fill="#16A34A" />
                )}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'levels' && (
          <View className="space-y-3">
            {MEMBER_LEVELS.map((level, index) => (
              <View
                key={level.level}
                className="bg-white rounded-2xl p-4 border border-amber-100"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-semibold text-gray-800">{level.level}</Text>
                  <Text className="text-amber-700 font-medium">{level.minSC}+ SC</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {level.benefits.map((benefit, i) => (
                    <View key={i} className="bg-amber-50 px-2 py-1 rounded-full">
                      <Text className="text-xs text-amber-700">{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
