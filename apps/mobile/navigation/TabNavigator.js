import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ProposalsScreen from '../screens/ProposalsScreen';
import CommunityScreen from '../screens/CommunityScreen';
import LearnScreen from '../screens/LearnScreen';
import SupportScreen from '../screens/SupportScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, color, focused }) => (
  <View style={styles.tabIconContainer}>
    <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
  </View>
);

const TabLabel = ({ label, color, focused }) => (
  <Text style={[
    styles.tabLabel, 
    { color },
    focused && styles.focusedTabLabel
  ]}>
    {label}
  </Text>
);

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🏠" color={color} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Home" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Proposals"
        component={ProposalsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="🗳️" color={color} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Proposals" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="👥" color={color} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Community" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Learn"
        component={LearnScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="📈" color={color} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Learn" color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="⭐" color={color} focused={focused} />
          ),
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Support" color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: 90,
    paddingBottom: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  focusedTabLabel: {
    fontWeight: 'bold',
  },
});
