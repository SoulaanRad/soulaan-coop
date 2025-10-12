import {  View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text
        className="mb-4 text-center text-3xl font-bold text-gray-800"
      >
        Soulaan Mobile
      </Text>


      <Button>
        <Text>Button</Text>
      </Button>
    </View>
  );
}
