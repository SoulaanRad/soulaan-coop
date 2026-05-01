import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, User, Store, FileText } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ACTIVE = '#7F1D1D';
const ACTIVE_BG = '#FFF7ED';
const INACTIVE_LIGHT = '#94A3B8';
const INACTIVE_DARK = '#64748B';

export default function AuthenticatedLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: isDark ? INACTIVE_DARK : INACTIVE_LIGHT,
        tabBarStyle: {
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 14,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderTopWidth: 0,
          borderRadius: 28,
          elevation: 18,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.16,
          shadowRadius: 22,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 10,
        },
        tabBarItemStyle: {
          borderRadius: 22,
          minHeight: 52,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: ACTIVE_BG,
              borderRadius: 18,
              padding: 9,
            } : { padding: 9 }}>
              <Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: ACTIVE_BG,
              borderRadius: 18,
              padding: 9,
            } : { padding: 9 }}>
              <Store color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />


      <Tabs.Screen
        name="proposals"
        options={{
          title: 'Proposals',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: ACTIVE_BG,
              borderRadius: 18,
              padding: 9,
            } : { padding: 9 }}>
              <FileText color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: ACTIVE_BG,
              borderRadius: 18,
              padding: 9,
            } : { padding: 9 }}>
              <User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      {/* Hide these screens from tabs - accessed via navigation */}
      <Tabs.Screen name="stripe-onboarding" options={{ href: null }} />
      <Tabs.Screen name="apply-sc-verification" options={{ href: null }} />

      <Tabs.Screen name="store-orders" options={{ href: null }} />
      <Tabs.Screen name="pay" options={{ href: null }} />
      <Tabs.Screen name="scan-pay" options={{ href: null }} />
      <Tabs.Screen name="quick-pay" options={{ href: null }} />
      <Tabs.Screen name="accept-payment" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="bank-accounts" options={{ href: null }} />
      <Tabs.Screen name="payment-methods" options={{ href: null }} />
      <Tabs.Screen name="store-detail" options={{ href: null }} />
      <Tabs.Screen name="product-detail" options={{ href: null }} />
      <Tabs.Screen name="apply-store" options={{ href: null }} />
      <Tabs.Screen name="my-store" options={{ href: null }} />
      <Tabs.Screen name="my-stores" options={{ href: null }} />
      <Tabs.Screen name="store-payments" options={{ href: null }} />
      <Tabs.Screen name="add-product" options={{ href: null }} />
      <Tabs.Screen name="edit-product" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="order-detail" options={{ href: null }} />
      <Tabs.Screen name="fund-wallet" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="proposal-detail" options={{ href: null }} />
    </Tabs>
  );
}
