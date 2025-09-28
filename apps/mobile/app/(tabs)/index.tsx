import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text
        variant="h1"
        className="mb-4 text-center text-3xl font-bold text-gray-800"
      >
        Soulaan Mobile
      </Text>

      <Text className="mb-8 text-center text-base text-gray-600">
        Tailwind CSS is now working! 🎉
      </Text>

      <Pressable className="mb-4 rounded-xl bg-amber-600 px-8 py-4">
        <Text className="text-lg font-semibold text-white">
          Tailwind Button
        </Text>
      </Pressable>

      <Button className="bg-gold-500">
        <Text className="font-medium text-white">Custom Gold Button</Text>
      </Button>
      <Button>
        <Text>Button</Text>
      </Button>
    </View>
  );
}
