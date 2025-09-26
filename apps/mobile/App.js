import React from 'react';
import { View } from 'react-native';
import LaunchScreen from './src/components/LaunchScreen';

export default function App() {
  console.log("app loading")
  return (
    <View style={{ flex: 1 }}>
      <LaunchScreen />
    </View>
  );
}
