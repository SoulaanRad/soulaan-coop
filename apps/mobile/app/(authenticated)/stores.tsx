import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Store,
  Search,
  BadgeCheck,
  ChevronRight,
  Star,
  Plus,
  Minus,
  Package,
  ShoppingCart,
  Sparkles,
  ArrowLeft,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/contexts/auth-context';
import { useCoin } from '@/contexts/platform-config-context';
import { useCart } from '@/contexts/cart-context';
import { api } from '@/lib/api';
import { coopConfig } from '@/lib/coop-config';
import { resolveBrandColor, withAlpha } from '@/lib/brand-colors';


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

type ViewMode = 'stores' | 'products';

export default function StoresScreen() {
  const { user } = useAuth();
  const coin = useCoin();
  const config = coopConfig();
  const primaryColor = resolveBrandColor(user?.coop?.primaryColor || config.primaryColor, '#B45309');
  const accentColor = resolveBrandColor(user?.coop?.accentColor || config.accentColor, '#0F766E');
  const coopShortName = user?.coop?.shortName || config.shortName;
  const rewardLabel = `${coin.name} (${coin.symbol})`;
  const { items: cartItems, addItem, updateQuantity, removeItem, totalItems } = useCart();

  const getCartQuantity = (productId: string) => {
    const item = cartItems.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [stores, setStores] = useState<StoreData[]>([]);
  const [featuredStores, setFeaturedStores] = useState<StoreData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [myStore, setMyStore] = useState<any>(null);
  const [storeCategories, setStoreCategories] = useState<{ key: string; label: string }[]>([]);
  const hasLoadedRef = React.useRef(false);

  const handleAddToCart = (product: ProductData) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        priceUSD: product.priceUSD,
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
      // Load all stores once, then derive featured locally. This avoids
      // showing an empty featured carousel when no store has been explicitly
      // marked as featured yet.
      const allResult = await api.getStores({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      const allStores: StoreData[] = allResult.stores || [];
      setStores(allStores);

      const featuredOnly = allStores.filter((s) => s.isFeatured);
      setFeaturedStores(
        (featuredOnly.length > 0 ? featuredOnly : allStores).slice(0, 5)
      );
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  }, [selectedCategory, searchQuery]);

  const loadProducts = useCallback(async () => {
    try {
      // Fetch all products in this coop, then prefer featured ones for the
      // popular tab. Falling back to recent products keeps the section from
      // appearing empty when nothing is explicitly featured yet.
      const result = await api.getProducts({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      const all: ProductData[] = result.products || [];
      const featured = all.filter((p) => p.isFeatured);
      setProducts(featured.length > 0 ? featured : all);
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
      if (!hasLoadedRef.current) {
        setLoading(true);
      }
      await Promise.all([loadStores(), loadProducts(), loadMyStore()]);
      hasLoadedRef.current = true;
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

  const filteredProducts = products.filter(p => selectedCategory === null || p.category === selectedCategory);
  const filteredStores = stores.filter(s => selectedCategory === null || s.category === selectedCategory);
  const selectedCategoryLabel = selectedCategory ? getCategoryLabel(selectedCategory) : 'All';

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={primaryColor} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="p-5 pb-28">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-3">
              <TouchableOpacity onPress={() => router.back()} className="mr-3">
                <ArrowLeft size={24} color="#374151" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">Marketplace</Text>
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {stores.length} stores • {products.length} goods
                </Text>
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
                  onPress={() => router.push('/my-stores')}
                  className="px-3 py-2 rounded-lg flex-row items-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Store size={16} color="white" />
                  <Text className="text-white font-semibold text-sm ml-1">Mine</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/apply-store')}
                  className="px-3 py-2 rounded-lg flex-row items-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus size={16} color="white" />
                  <Text className="text-white font-semibold text-sm ml-1">Apply</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Marketplace Brief */}
          <View className="rounded-2xl overflow-hidden mb-4">
            <LinearGradient
              colors={['#111827', accentColor, primaryColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <View className="flex-row items-start mb-4">
                <View className="w-11 h-11 bg-white/20 rounded-full items-center justify-center mr-3">
                  <Sparkles size={22} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-white text-lg mb-1">Shop the network</Text>
                  <Text className="text-xs text-white leading-5">
                    Discover {coopShortName} stores, compare local goods, and support sellers eligible for {rewardLabel} rewards.
                  </Text>
                </View>
              </View>
              <View className="flex-row">
                <View className="flex-1 bg-white/15 rounded-xl p-3 mr-2 border border-white/10">
                  <Text className="text-white text-lg font-bold">{stores.length}</Text>
                  <Text className="text-gray-100 text-xs">Stores</Text>
                </View>
                <View className="flex-1 bg-white/15 rounded-xl p-3 border border-white/10">
                  <Text className="text-white text-lg font-bold">{products.length}</Text>
                  <Text className="text-gray-100 text-xs">Products</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Search */}
          <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm flex-row items-center border border-gray-100">
            <Search size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={viewMode === 'stores' ? 'Search stores, categories, cities' : 'Search products and stores'}
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-3 text-gray-900"
              returnKeyType="search"
            />
          </View>

          {/* View Switch */}
          <View className="flex-row bg-gray-200 rounded-2xl p-1 mb-4">
            <TouchableOpacity
              onPress={() => setViewMode('products')}
              className={`flex-1 py-3 rounded-xl items-center ${
                viewMode === 'products' ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${
                viewMode === 'products' ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Products
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('stores')}
              className={`flex-1 py-3 rounded-xl items-center ${
                viewMode === 'stores' ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${
                viewMode === 'stores' ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Stores
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Filter */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-700">Category</Text>
              <Text className="text-xs text-gray-500">{selectedCategoryLabel}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                className={`mx-1 px-3 py-2 rounded-full border ${
                  selectedCategory === null
                    ? 'border-transparent'
                    : 'bg-white border-gray-200'
                }`}
                style={selectedCategory === null ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
              >
                <Text className={`text-xs font-medium ${
                  selectedCategory === null ? 'text-white' : 'text-gray-600'
                }`}>
                  All
                </Text>
              </TouchableOpacity>
              {storeCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  className={`mx-1 px-3 py-2 rounded-full border ${
                    selectedCategory === cat.key
                      ? 'border-transparent'
                      : 'bg-white border-gray-200'
                  }`}
                  style={selectedCategory === cat.key ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
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

          {/* Browse Stores View */}
          {viewMode === 'stores' && (
            <>
              {/* Featured Stores */}
              {featuredStores.length > 0 && (
                <View className="mb-5">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-base font-bold text-gray-900">Start here</Text>
                    <Text className="text-xs text-gray-500">Featured picks</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                    {featuredStores.map((store) => (
                      <TouchableOpacity
                        key={store.id}
                        onPress={() => router.push(`/store-detail?id=${store.id}`)}
                        className="bg-white rounded-2xl mr-3 shadow-sm overflow-hidden border border-gray-100"
                        style={{ width: 224 }}
                      >
                        <View className="h-24 bg-gray-100">
                          {store.imageUrl ? (
                            <Image
                              source={{ uri: store.imageUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <LinearGradient
                              colors={[withAlpha(accentColor, '33'), primaryColor]}
                              className="w-full h-full items-center justify-center"
                            >
                              <Store size={30} color="white" />
                            </LinearGradient>
                          )}
                        </View>
                        <View className="p-3">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 mr-2">
                              <Text className="font-bold text-gray-900" numberOfLines={1}>
                                {store.name}
                              </Text>
                              <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                                {getCategoryLabel(store.category)}
                              </Text>
                            </View>
                            {store.isScVerified && (
                              <View className="rounded-full p-1" style={{ backgroundColor: withAlpha(accentColor, '22') }}>
                                <BadgeCheck size={14} color={accentColor} />
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center justify-between mt-3">
                            <Text className="text-xs text-gray-500">{store.productCount} products</Text>
                            <View className="flex-row items-center">
                              <Text className="text-xs font-bold" style={{ color: primaryColor }}>Visit</Text>
                              <ChevronRight size={12} color={primaryColor} />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* All Stores List */}
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-gray-900">Community stores</Text>
                  <Text className="text-xs text-gray-500">{filteredStores.length} shown</Text>
                </View>
                {filteredStores.length === 0 ? (
                  <View className="items-center py-12 bg-white rounded-2xl">
                    <Store size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 text-center mt-4">
                      No stores found{'\n'}Try another search or category
                    </Text>
                  </View>
                ) : (
                  filteredStores.map((store) => (
                    <TouchableOpacity
                      key={store.id}
                      onPress={() => router.push(`/store-detail?id=${store.id}`)}
                      className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden border border-gray-100"
                    >
                      <View className="p-4">
                        <View className="flex-row">
                          {/* Store Avatar */}
                          <View className="w-16 h-16 rounded-2xl items-center justify-center mr-3 overflow-hidden" style={{ backgroundColor: primaryColor }}>
                            {store.imageUrl ? (
                              <Image
                                source={{ uri: store.imageUrl }}
                                className="w-full h-full"
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
                            <View className="flex-row items-start justify-between">
                              <Text className="font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                                {store.name}
                              </Text>
                              <View className="flex-row items-center">
                                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                <Text className="text-xs font-medium text-gray-700 ml-1">
                                  {store.rating?.toFixed(1) || 'New'}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center flex-wrap mt-2 gap-1">
                              <View className="bg-gray-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-gray-600">
                                  {getCategoryLabel(store.category)}
                                </Text>
                              </View>
                              {store.isScVerified ? (
                                <View className="px-2 py-0.5 rounded flex-row items-center" style={{ backgroundColor: withAlpha(accentColor, '22') }}>
                                  <BadgeCheck size={11} color={accentColor} />
                                  <Text className="text-xs ml-1" style={{ color: accentColor }}>{coin.symbol} rewards</Text>
                                </View>
                              ) : (
                                <View className="bg-gray-100 px-2 py-0.5 rounded">
                                  <Text className="text-gray-600 text-xs">Community listed</Text>
                                </View>
                              )}
                            </View>
                            {store.description && (
                              <Text className="text-xs text-gray-500 mt-2" numberOfLines={2}>
                                {store.description}
                              </Text>
                            )}
                            <View className="flex-row items-center justify-between mt-3">
                              <Text className="text-xs text-gray-500">
                                {store.productCount} products{store.city ? ` • ${store.city}` : ''}
                              </Text>
                              <View className="flex-row items-center">
                                <Text className="text-xs font-bold" style={{ color: primaryColor }}>Open</Text>
                                <ChevronRight size={14} color={primaryColor} />
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}

          {/* Products View */}
          {viewMode === 'products' && (
            <>
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-bold text-gray-900">Popular products</Text>
                  <Text className="text-xs text-gray-500">{filteredProducts.length} shown</Text>
                </View>
                {filteredProducts.length === 0 ? (
                  <View className="items-center py-12 bg-white rounded-2xl">
                    <Package size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 text-center mt-4">
                      No products found{'\n'}Try another search or category
                    </Text>
                  </View>
                ) : (
                  filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      onPress={() => router.push(`/product-detail?id=${product.id}`)}
                      className="bg-white rounded-2xl mb-3 shadow-sm overflow-hidden border border-gray-100"
                    >
                      <View className="p-4">
                        <View className="flex-row">
                          {/* Product Image */}
                          <View className="w-20 h-20 bg-gray-100 rounded-xl items-center justify-center mr-3 overflow-hidden">
                            {product.imageUrl ? (
                              <Image
                                source={{ uri: product.imageUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <Package size={32} color="#D1D5DB" />
                            )}
                          </View>

                          {/* Product Info */}
                          <View className="flex-1">
                            <Text className="font-bold text-sm text-gray-900" numberOfLines={2}>
                              {product.name}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <View className="w-4 h-4 rounded-full items-center justify-center mr-1" style={{ backgroundColor: primaryColor }}>
                                <Text className="text-white text-xs font-bold">
                                  {product.store.name.charAt(0)}
                                </Text>
                              </View>
                              <Text className="text-xs text-gray-500">{product.store.name}</Text>
                              {product.store.isScVerified && (
                                <View className="ml-2 px-1.5 py-0.5 rounded flex-row items-center" style={{ backgroundColor: withAlpha(accentColor, '22') }}>
                                  <BadgeCheck size={10} color={accentColor} />
                                  <Text className="text-xs ml-1" style={{ color: accentColor }}>{coin.symbol}</Text>
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
                          <Text className="text-lg font-bold" style={{ color: primaryColor }}>
                            ${formatPrice(product.priceUSD)}
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
                                <Minus size={16} color={primaryColor} />
                              </TouchableOpacity>
                              <Text className="font-bold text-sm min-w-[24px] text-center" style={{ color: primaryColor }}>
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
                                <Plus size={16} color={primaryColor} />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleAddToCart(product)}
                              className="px-4 py-2 rounded-lg flex-row items-center"
                              style={{ backgroundColor: primaryColor }}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
