import React from 'react';


import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OnboardingScreen from './screens/OnboardingScreen';
import TabNavigator from './navigation/TabNavigator';
import { AppProvider } from './providers/AppProvider';



const Stack = createStackNavigator();

export default function App() {


  return (
    <AppProvider>
      <SafeAreaProvider style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Onboarding"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen 
              name="Onboarding" 
              component={OnboardingScreen}
              options={{
                headerShown: false,
                cardStyle: { flex: 1 }
              }}
            />
            <Stack.Screen 
              name="MainApp" 
              component={TabNavigator}
              options={{
                headerShown: false,
                cardStyle: { flex: 1 }
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}