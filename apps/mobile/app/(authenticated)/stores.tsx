import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Store,
  Search,
  BadgeCheck,
  ChevronRight,
  ShoppingBag,
  Star,
  Plus,
  Minus,
  Package,
  CheckCircle,
  ShoppingCart,
  X,
  Sparkles,
  ArrowLeft,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import { api } from '@/lib/api';


interface StoreData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  isScVerified: boolean;
  acceptsUC: boolean;
  ucDiscountPercent: number;
  isFeatured: boolean;
  rating: number | null;
  reviewCount: number;
  productCount: number;
  city: string | null;
  state: string | null;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  priceUSD: number;
  compareAtPrice: number | null;
  quantity: number;
  isActive: boolean;
  isFeatured: boolean;
  store: {
    id: string;
    name: string;
    isScVerified: boolean;
    acceptsUC: boolean;
    ucDiscountPercent: number;
  };
}

type ViewMode = 'popular' | 'stores';

export default function StoresScreen() {
  const { user } = useAuth();
  const { items: cartItems, addItem, updateQuantity, removeItem, totalItems } = useCart();

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find(i => i.productId === productId);
    return item?.quantity || 0;
  };
  const [viewMode, setViewMode] = useState<ViewMode>('popular');
  const [stores, setStores] = useState<StoreData[]>([]);
  const [featuredStores, setFeaturedStores] = useState<StoreData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [myStore, setMyStore] = useState<any>(null);
  const [storeCategories, setStoreCategories] = useState<Array<{ key: string; label: string }>>([]);

  const handleAddToCart = (product: ProductData) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        priceUSD: product.priceUSD,
        store: {
          id: product.store.id,
          name: product.store.name,
          isScVerified: product.store.isScVerified,
        },
      },
      {
        id: product.store.id,
        name: product.store.name,
        isScVerified: product.store.isScVerified,
      }
    );
  };

  const loadStores = useCallback(async () => {
    try {
      // Load featured stores
      const featuredResult = await api.getStores({ featured: true, limit: 5 });
      setFeaturedStores(featuredResult.stores);

      // Load all stores with filters
      const allResult = await api.getStores({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setStores(allResult.stores);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  }, [selectedCategory, searchQuery]);

  const loadProducts = useCallback(async () => {
    try {
      const result = await api.getProducts({
        featured: true,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setProducts(result.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, [selectedCategory, searchQuery]);

  const loadMyStore = useCallback(async () => {
    if (!user?.walletAddress) return;
    try {
      const result = await api.getMyStore(user.walletAddress);
      setMyStore(result);
    } catch (error) {
      setMyStore(null);
    }
  }, [user?.walletAddress]);

  // Load store categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categories = await api.getStoreCategories(false);
        setStoreCategories(categories);
      } catch (error) {
        console.error('Failed to load store categories:', error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStores(), loadProducts(), loadMyStore()]);
      setLoading(false);
    };
    init();
  }, [loadStores, loadProducts, loadMyStore]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStores(), loadProducts(), loadMyStore()]);
    setRefreshing(false);
  };

  const getCategoryLabel = (value: string) => {
    return storeCategories.find(c => c.key === value)?.label || value;
  };

  const getStoreInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#B45309" />
          <Text className="text-gray-500 mt-4">Loading marketplace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B45309" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.back()} className="mr-3">
                <ArrowLeft size={24} color="#374151" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-bold text-gray-800">Co-op Store</Text>
                <Text className="text-sm text-gray-500">Community-owned marketplace</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              {/* Cart Button */}
              <TouchableOpacity
                onPress={() => router.push('/(authenticated)/cart')}
                className="mr-3 relative"
              >
                <ShoppingCart size={24} color="#374151" />
                {totalItems > 0 && (
                  <View className="absolute -top-2 -right-2 bg-red-600 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {totalItems > 99 ? '99+' : totalItems}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            {myStore ? (
              <TouchableOpacity
                onPress={() => router.push('/my-store')}
                className="bg-amber-600 px-3 py-2 rounded-lg flex-row items-center"
              >
                <Store size={16} color="white" />
                <Text className="text-white font-semibold text-sm ml-1">My Store</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/apply-store')}
                className="bg-red-700 px-3 py-2 rounded-lg flex-row items-center"
              >
                <Plus size={16} color="white" />
                <Text className="text-white font-semibold text-sm ml-1">Create Store</Text>
              </TouchableOpacity>
            )}
            </View>
          </View>

          {/* Store Info Banner */}
          <View className="rounded-2xl overflow-hidden mb-4">
            <LinearGradient
              colors={['#D97706', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16 }}
            >
              <View className="flex-row items-start">
                <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                  <ShoppingBag size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-white mb-1">Support Local, Build Wealth</Text>
                  <Text className="text-xs text-amber-100 leading-5">
                    Every purchase supports community members. SC Verified stores earn SC from every transaction.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* SC Eligibility Info */}
          <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <View className="flex-row items-start">
              <CheckCircle size={16} color="#16A34A" style={{ marginTop: 2 }} />
              <View className="flex-1 ml-2">
                <Text className="text-xs text-green-800 leading-5">
                  <Text className="font-bold">Want to earn SC from sales?</Text> Create a store and submit a proposal. Only stores that pass AI review and community deliberation become SC Verified and earn SC from purchases.
                </Text>
              </View>
            </View>
          </View>

          {/* View Tabs */}
          <View className="flex-row border-b border-gray-200 mb-4">
            <TouchableOpacity
              onPress={() => setViewMode('popular')}
              className={`px-4 py-3 mr-2 rounded-t-lg ${
                viewMode === 'popular' ? 'bg-amber-600' : 'bg-transparent'
              }`}
            >
              <Text className={`text-sm font-medium ${
                viewMode === 'popular' ? 'text-white' : 'text-gray-600'
              }`}>
                Popular Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('stores')}
              className={`px-4 py-3 rounded-t-lg ${
                viewMode === 'stores' ? 'bg-amber-600' : 'bg-transparent'
              }`}
            >
              <Text className={`text-sm font-medium ${
                viewMode === 'stores' ? 'text-white' : 'text-gray-600'
              }`}>
                Browse Stores
              </Text>
            </TouchableOpacity>
          </View>

          {/* Popular Products View */}
          {viewMode === 'popular' && (
            <>
              {/* Category Filter */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Shop by Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(null)}
                    className={`mx-1 px-3 py-2 rounded-full border ${
                      selectedCategory === null
                        ? 'bg-amber-600 border-amber-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${
                      selectedCategory === null ? 'text-white' : 'text-gray-600'
                    }`}>
                      All Items
                    </Text>
                  </TouchableOpacity>
                  {storeCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setSelectedCategory(cat.key)}
                      className={`mx-1 px-3 py-2 rounded-full border ${
                        selectedCategory === cat.key
                          ? 'bg-amber-600 border-amber-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${
                        selectedCategory === cat.key ? 'text-white' : 'text-gray-600'
                      }`}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Product Grid */}
              <View>
                {products.length === 0 ? (
                  <View className="items-center py-12 bg-white rounded-2xl">
                    <Package size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 text-center mt-4">
                      No products found{'\n'}Try adjusting your filters
                    </Text>
                  </View>
                ) : (
                  products.filter(p => selectedCategory === null || p.category === selectedCategory).map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      onPress={() => router.push(`/product-detail?id=${product.id}`)}
                      className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden"
                    >
                      <View className="p-4">
                        <View className="flex-row">
                          {/* Product Image */}
                          <View className="w-20 h-20 bg-gray-100 rounded-lg items-center justify-center mr-3">
                            {product.imageUrl ? (
                              <Image
                                source={{ uri: product.imageUrl }}
                                className="w-full h-full rounded-lg"
                                resizeMode="cover"
                              />
                            ) : (
                              <Package size={32} color="#D1D5DB" />
                            )}
                          </View>

                          {/* Product Info */}
                          <View className="flex-1">
                            <Text className="font-semibold text-sm text-gray-800" numberOfLines={1}>
                              {product.name}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <View className="w-4 h-4 bg-amber-600 rounded-full items-center justify-center mr-1">
                                <Text className="text-white text-xs font-bold">
                                  {product.store.name.charAt(0)}
                                </Text>
                              </View>
                              <Text className="text-xs text-gray-500">{product.store.name}</Text>
                              {product.store.isScVerified && (
                                <View className="bg-green-100 ml-2 px-1.5 py-0.5 rounded">
                                  <Text className="text-green-700 text-xs">SC Verified</Text>
                                </View>
                              )}
                            </View>
                            {product.description && (
                              <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
                                {product.description}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Price Section */}
                        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <Text className="text-lg font-bold text-amber-700">
                            ${product.priceUSD.toFixed(2)}
                          </Text>
                          {getCartQuantity(product.id) > 0 ? (
                            <View className="flex-row items-center bg-gray-100 rounded-lg">
                              <TouchableOpacity
                                onPress={() => {
                                  const qty = getCartQuantity(product.id);
                                  if (qty <= 1) {
                                    removeItem(product.id);
                                  } else {
                                    updateQuantity(product.id, qty - 1);
                                  }
                                }}
                                className="p-2"
                                activeOpacity={0.7}
                              >
                                <Minus size={16} color="#B45309" />
                              </TouchableOpacity>
                              <Text className="text-amber-700 font-bold text-sm min-w-[24px] text-center">
                                {getCartQuantity(product.id)}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  const qty = getCartQuantity(product.id);
                                  updateQuantity(product.id, qty + 1);
                                }}
                                className="p-2"
                                activeOpacity={0.7}
                              >
                                <Plus size={16} color="#B45309" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleAddToCart(product)}
                              className="bg-red-700 px-4 py-2 rounded-lg flex-row items-center"
                              activeOpacity={0.7}
                            >
                              <ShoppingCart size={14} color="white" />
                              <Text className="text-white font-semibold text-sm ml-1">Add</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}

          {/* Browse Stores View */}
          {viewMode === 'stores' && (
            <>
              {/* Featured Stores */}
              {featuredStores.length > 0 && (
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">Featured Stores</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                    {featuredStores.map((store) => (
                      <TouchableOpacity
                        key={store.id}
                        onPress={() => router.push(`/store-detail?id=${store.id}`)}
                        className="bg-white rounded-2xl mr-3 shadow-sm overflow-hidden"
                        style={{ width: 200 }}
                      >
                        <View className="p-3">
                          <View className="flex-row items-center mb-2">
                            <View className="w-12 h-12 bg-red-700 rounded-full items-center justify-center mr-3">
                              {store.imageUrl ? (
                                <Image
                                  source={{ uri: store.imageUrl }}
                                  className="w-full h-full rounded-full"
                                  resizeMode="cover"
                                />
                              ) : (
                                <Text className="text-white font-semibold">
                                  {getStoreInitials(store.name)}
                                </Text>
                              )}
                            </View>
                            <View className="flex-1">
                              <Text className="font-semibold text-sm text-gray-800" numberOfLines={1}>
                                {store.name}
                              </Text>
                              <View className="flex-row items-center">
                                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                <Text className="text-xs text-gray-600 ml-1">
                                  {store.rating?.toFixed(1) || 'New'}
                                </Text>
                                {store.isScVerified && (
                                  <View className="bg-green-100 ml-2 px-1 py-0.5 rounded">
                                    <Text className="text-green-700 text-xs">SC</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                          <Text className="text-xs text-gray-500 mb-2" numberOfLines={2}>
                            {store.description || getCategoryLabel(store.category)}
                          </Text>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs text-gray-400">{store.productCount} products</Text>
                            <TouchableOpacity className="flex-row items-center border border-amber-600 px-2 py-1 rounded">
                              <Text className="text-amber-700 text-xs font-medium">Visit</Text>
                              <ChevronRight size={12} color="#B45309" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Category Filter */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Filter by Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(null)}
                    className={`mx-1 px-3 py-2 rounded-full border ${
                      selectedCategory === null
                        ? 'bg-amber-600 border-amber-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${
                      selectedCategory === null ? 'text-white' : 'text-gray-600'
                    }`}>
                      All Stores
                    </Text>
                  </TouchableOpacity>
                  {storeCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setSelectedCategory(cat.key)}
                      className={`mx-1 px-3 py-2 rounded-full border ${
                        selectedCategory === cat.key
                          ? 'bg-amber-600 border-amber-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text className={`text-xs font-medium ${
                        selectedCategory === cat.key ? 'text-white' : 'text-gray-600'
                      }`}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* All Stores List */}
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-3">All Community Stores</Text>
                {stores.length === 0 ? (
                  <View className="items-center py-12 bg-white rounded-2xl">
                    <Store size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 text-center mt-4">
                      No stores found{'\n'}Try adjusting your filters
                    </Text>
                  </View>
                ) : (
                  stores.filter(s => selectedCategory === null || s.category === selectedCategory).map((store) => (
                    <TouchableOpacity
                      key={store.id}
                      onPress={() => router.push(`/store-detail?id=${store.id}`)}
                      className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden"
                    >
                      <View className="p-4">
                        <View className="flex-row">
                          {/* Store Avatar */}
                          <View className="w-14 h-14 bg-red-700 rounded-full items-center justify-center mr-3">
                            {store.imageUrl ? (
                              <Image
                                source={{ uri: store.imageUrl }}
                                className="w-full h-full rounded-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <Text className="text-white font-semibold text-lg">
                                {getStoreInitials(store.name)}
                              </Text>
                            )}
                          </View>

                          {/* Store Info */}
                          <View className="flex-1">
                            <Text className="font-semibold text-gray-800">{store.name}</Text>
                            <View className="flex-row items-center flex-wrap mt-1 gap-1">
                              <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-600">
                                  {getCategoryLabel(store.category)}
                                </Text>
                              </View>
                              {store.isScVerified && (
                                <View className="bg-green-100 px-2 py-0.5 rounded">
                                  <Text className="text-green-700 text-xs">SC Verified</Text>
                                </View>
                              )}
                            </View>
                            {store.description && (
                              <Text className="text-xs text-gray-500 mt-2" numberOfLines={2}>
                                {store.description}
                              </Text>
                            )}
                            <View className="flex-row items-center mt-2">
                              <Star size={12} color="#F59E0B" fill="#F59E0B" />
                              <Text className="text-xs font-medium text-gray-700 ml-1">
                                {store.rating?.toFixed(1) || 'New'}
                              </Text>
                              {store.reviewCount > 0 && (
                                <Text className="text-xs text-gray-400 ml-1">({store.reviewCount})</Text>
                              )}
                              <Text className="text-xs text-gray-400 mx-2">•</Text>
                              <Text className="text-xs text-gray-500">{store.productCount} products</Text>
                              {store.city && (
                                <>
                                  <Text className="text-xs text-gray-400 mx-2">•</Text>
                                  <Text className="text-xs text-gray-500">{store.city}</Text>
                                </>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Visit Button */}
                        <TouchableOpacity className="bg-red-700 mt-3 py-3 rounded-xl flex-row items-center justify-center">
                          <Text className="text-white font-semibold">Visit Store</Text>
                          <ChevronRight size={16} color="white" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
