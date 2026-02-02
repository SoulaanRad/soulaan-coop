import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, User, Send, Clock, Store } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthenticatedLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B45309',
        tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: '#FEF3C7',
              borderRadius: 12,
              padding: 8,
            } : { padding: 8 }}>
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
 
              <Store color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />


      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: '#FEF3C7',
              borderRadius: 12,
              padding: 8,
            } : { padding: 8 }}>
              <User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      {/* Hide these screens from tabs - accessed via navigation */}

      <Tabs.Screen
        name="pay"
        options={{ href: null }}
      /> 
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="bank-accounts" options={{ href: null }} />
      <Tabs.Screen name="payment-methods" options={{ href: null }} />
      <Tabs.Screen name="store-detail" options={{ href: null }} />
      <Tabs.Screen name="product-detail" options={{ href: null }} />
      <Tabs.Screen name="apply-store" options={{ href: null }} />
      <Tabs.Screen name="my-store" options={{ href: null }} />
      <Tabs.Screen name="add-product" options={{ href: null }} />
      <Tabs.Screen name="edit-product" options={{ href: null }} />
    </Tabs>
  );
}
