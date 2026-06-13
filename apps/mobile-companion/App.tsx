import { StatusBar } from "expo-status-bar";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-slate-900 justify-center items-center px-6">
      <StatusBar style="light" />
      <View className="items-center max-w-[320px]">
        <Text className="text-white text-3xl font-extrabold mb-4 text-center">Flump.</Text>
        <Text className="text-slate-400 text-lg text-center mb-8">
          Personal Finance Companion. View your transactions, accounts, and budgets on the go.
        </Text>
        <TouchableOpacity
          className="w-full bg-indigo-600 rounded-full py-4 items-center justify-center shadow-lg active:bg-indigo-700"
          onPress={() => console.log("Sign In Pressed")}
        >
          <Text className="text-white font-semibold text-lg">Sign In with AuthKit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
