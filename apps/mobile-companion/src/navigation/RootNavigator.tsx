import { FontAwesome } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AccountDetailScreen from "../screens/AccountDetailScreen";
import AccountsScreen from "../screens/AccountsScreen";
import BudgetScreen from "../screens/BudgetScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ForecastScreen from "../screens/ForecastScreen";
// Import Screens
import LoginScreen from "../screens/LoginScreen";
import MortgageScreen from "../screens/MortgageScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useTheme } from "../ThemeContext";
import { spacing } from "../theme";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  AccountDetail: { accountId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Custom Main Container with Bottom Tab Bar
function MainContainer({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "accounts" | "mortgage" | "forecast" | "budget" | "profile"
  >("dashboard");

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardScreen setActiveTab={(tab: any) => setActiveTab(tab)} />;
      case "accounts":
        return <AccountsScreen navigation={navigation} />;
      case "mortgage":
        return <MortgageScreen />;
      case "forecast":
        return <ForecastScreen />;
      case "budget":
        return <BudgetScreen />;
      case "profile":
        return <ProfileScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Active screen content */}
      <View style={styles.content}>{renderActiveScreen()}</View>

      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("dashboard")}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="th-large"
            size={22}
            color={activeTab === "dashboard" ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "dashboard" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
            numberOfLines={1}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("accounts")}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="credit-card"
            size={22}
            color={activeTab === "accounts" ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "accounts" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
            numberOfLines={1}
          >
            Accounts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("budget")}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="pie-chart"
            size={22}
            color={activeTab === "budget" ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "budget" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
            numberOfLines={1}
          >
            Budget
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("mortgage")}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="home"
            size={22}
            color={activeTab === "mortgage" ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "mortgage" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
            numberOfLines={1}
          >
            Mortgages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("forecast")}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="line-chart"
            size={22}
            color={activeTab === "forecast" ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "forecast" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
            numberOfLines={1}
          >
            Forecasts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("profile")}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="user"
            size={22}
            color={activeTab === "profile" ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "profile" ? styles.tabTextActive : styles.tabTextInactive,
            ]}
            numberOfLines={1}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainContainer} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} />
    </Stack.Navigator>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.slate[950],
    },
    content: {
      flex: 1,
    },
    tabBar: {
      backgroundColor: colors.slate[900],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    tabItem: {
      alignItems: "center",
      paddingVertical: spacing[1],
      flex: 1,
    },
    tabText: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: "600",
    },
    tabTextActive: {
      color: colors.indigo[500],
    },
    tabTextInactive: {
      color: colors.slate[400],
    },
  });
