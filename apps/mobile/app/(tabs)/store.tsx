import { useState, useCallback, useEffect } from "react";
import { View, ScrollView, RefreshControl, TouchableOpacity, Image } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Search, MapPin, Star, ShoppingBag } from "lucide-react-native";

import { Text } from "@/components/ui/text";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

// Mock data for stores
const FEATURED_STORES = [
  {
    id: '1',
    name: "Joe's Coffee",
    category: 'Food & Drink',
    rating: 4.8,
    reviews: 124,
    distance: '0.3 mi',
    isScVerified: true,
    imageUrl: null,
  },
  {
    id: '2',
    name: 'Urban Books',
    category: 'Retail',
    rating: 4.9,
    reviews: 89,
    distance: '0.5 mi',
    isScVerified: true,
    imageUrl: null,
  },
  {
    id: '3',
    name: 'Fresh Market',
    category: 'Grocery',
    rating: 4.6,
    reviews: 256,
    distance: '0.8 mi',
    isScVerified: false,
    imageUrl: null,
  },
];

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  'FOUNDER_PACKAGE': '🎖️',
  'FOOD_BEVERAGE': '🍔',
  'RETAIL': '🛍️',
  'SERVICES': '✂️',
  'HEALTH_WELLNESS': '💊',
  'ENTERTAINMENT': '🎭',
  'EDUCATION': '📚',
  'PROFESSIONAL': '💼',
  'HOME_GARDEN': '🏡',
  'AUTOMOTIVE': '🚗',
  'OTHER': '📦',
};

export default function StoreScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [storeCategories, setStoreCategories] = useState<Array<{ key: string; label: string }>>([]);

  // Load store categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await api.getStoreCategories(true); // Include admin-only for viewing
        setStoreCategories(categories);
      } catch (error) {
        console.error('Failed to load store categories:', error);
      }
    };
    loadCategories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch stores
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
        <Text className="text-xl font-bold text-gray-800">Community Store</Text>
        <Text className="text-gray-500 text-sm">Support local businesses, earn SC rewards</Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 mb-4">
        <TouchableOpacity
          className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-amber-200"
          activeOpacity={0.7}
        >
          <Search size={20} color="#9CA3AF" />
          <Text className="ml-3 text-gray-400 flex-1">Search stores...</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
      >
        {/* All Categories */}
        <TouchableOpacity
          onPress={() => setSelectedCategory(null)}
          className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
            selectedCategory === null
              ? 'bg-amber-600'
              : 'bg-white border border-amber-200'
          }`}
        >
          <Text className="mr-1">🏪</Text>
          <Text
            className={`text-sm font-medium ${
              selectedCategory === null ? 'text-white' : 'text-gray-700'
            }`}
          >
            All
          </Text>
        </TouchableOpacity>

        {/* Dynamic Categories */}
        {storeCategories.map((category) => (
          <TouchableOpacity
            key={category.key}
            onPress={() => setSelectedCategory(category.key)}
            className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
              selectedCategory === category.key
                ? 'bg-amber-600'
                : 'bg-white border border-amber-200'
            }`}
          >
            <Text className="mr-1">{CATEGORY_ICONS[category.key] || '📦'}</Text>
            <Text
              className={`text-sm font-medium ${
                selectedCategory === category.key ? 'text-white' : 'text-gray-700'
              }`}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured Stores */}
      <View className="px-4">
        <Text className="text-lg font-semibold text-gray-800 mb-3">Featured Stores</Text>

        {FEATURED_STORES.map((store) => (
          <TouchableOpacity
            key={store.id}
            className="bg-white rounded-2xl p-4 mb-3 border border-amber-100"
            activeOpacity={0.7}
            onPress={() => {/* TODO: Navigate to store */}}
          >
            <View className="flex-row">
              {/* Store Image */}
              <View className="w-16 h-16 rounded-xl bg-amber-100 items-center justify-center mr-3">
                <ShoppingBag size={24} color="#B45309" />
              </View>

              {/* Store Info */}
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-semibold text-gray-800">{store.name}</Text>
                  {store.isScVerified && (
                    <View className="ml-2 bg-green-100 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-green-700 font-medium">SC</Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm text-gray-500">{store.category}</Text>

                <View className="flex-row items-center mt-1">
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {store.rating} ({store.reviews})
                  </Text>
                  <View className="flex-row items-center ml-3">
                    <MapPin size={12} color="#9CA3AF" />
                    <Text className="text-sm text-gray-400 ml-1">{store.distance}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* SC Verified Info */}
      <View className="mx-4 mt-4 mb-8 bg-green-50 rounded-2xl p-4 border border-green-200">
        <Text className="text-green-800 font-semibold mb-2">Earn SC Rewards</Text>
        <Text className="text-green-700 text-sm">
          Shop at SC-verified stores and earn 1% back in Soulaan Coin on every purchase!
        </Text>
      </View>
    </ScrollView>
  );
}
