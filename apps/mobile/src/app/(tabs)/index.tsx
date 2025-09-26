import { ScrollView, StyleSheet, Text as T, TouchableOpacity } from "react-native";
import { AnimatedStyleUpdateExample } from "@/components/AnimatedStyledUpdateExample";
import EditScreenInfo from "@/components/EditScreenInfo";
import { Separator } from "@/components/Separator";
import { Text, View } from "@/components/Themed";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabOneScreen() {
  const router = useRouter();

  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('hasSeenOnboarding');
      router.replace('/onboarding');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return (
    <View className="flex flex-1">
      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.title}>Welcome to Soulaan</Text>
          <T className="text-center text-gray-600 mb-4">
            Building Black Economic Sovereignty Together
          </T>

          <EditScreenInfo path="app/(tabs)/index.tsx" />
          <Separator />
          <Text style={styles.title}>Reanimated Example</Text>
          <AnimatedStyleUpdateExample />
          
          <TouchableOpacity 
            onPress={handleResetOnboarding}
            className="mt-4 p-3 bg-yellow-600 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">
              Reset Onboarding (Dev)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
});
