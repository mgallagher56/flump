import { FontAwesome } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AccountDetailScreen from "../screens/AccountDetailScreen";
import AccountsScreen from "../screens/AccountsScreen";
import BudgetScreen from "../screens/BudgetScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ForecastScreen from "../screens/ForecastScreen";
import LoginScreen from "../screens/LoginScreen";
import MortgageScreen from "../screens/MortgageScreen";
import ProfileScreen from "../screens/ProfileScreen";
import TaxScreen from "../screens/TaxScreen";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  AccountDetail: { accountId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainContainer({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "accounts" | "mortgage" | "forecast" | "budget" | "profile" | "tax"
  >("dashboard");
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);

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
      case "tax":
        return <TaxScreen />;
    }
  };

  const isMoreActive = ["tax", "forecast", "mortgage", "profile"].includes(activeTab);

  const handleSelectMoreOption = (tabName: typeof activeTab) => {
    setActiveTab(tabName);
    setIsMoreMenuVisible(false);
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
          onPress={() => setIsMoreMenuVisible(true)}
          style={styles.tabItem}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome
            name="ellipsis-h"
            size={22}
            color={isMoreActive ? colors.indigo[600] : colors.slate[400]}
          />
          <Text
            style={[styles.tabText, isMoreActive ? styles.tabTextActive : styles.tabTextInactive]}
            numberOfLines={1}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* "More Options" Slide-up Modal Menu */}
      <Modal
        visible={isMoreMenuVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsMoreMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMoreMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalDragIndicator} />
              <Text style={styles.modalTitle}>More Options</Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Option: Taxes */}
              <TouchableOpacity
                onPress={() => handleSelectMoreOption("tax")}
                style={[styles.optionItem, activeTab === "tax" && styles.optionItemActive]}
              >
                <View style={styles.optionIconContainer}>
                  <FontAwesome name="percent" size={20} color={colors.indigo[400]} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Taxes & P&L</Text>
                  <Text style={styles.optionDescription}>
                    UK Self Assessment sole trader & rental property calculations
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option: Forecasts */}
              <TouchableOpacity
                onPress={() => handleSelectMoreOption("forecast")}
                style={[styles.optionItem, activeTab === "forecast" && styles.optionItemActive]}
              >
                <View style={styles.optionIconContainer}>
                  <FontAwesome name="line-chart" size={20} color={colors.indigo[400]} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Savings Forecasts</Text>
                  <Text style={styles.optionDescription}>
                    Compound interest growth projections & pay rise tax simulator
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option: Mortgages */}
              <TouchableOpacity
                onPress={() => handleSelectMoreOption("mortgage")}
                style={[styles.optionItem, activeTab === "mortgage" && styles.optionItemActive]}
              >
                <View style={styles.optionIconContainer}>
                  <FontAwesome name="home" size={20} color={colors.indigo[400]} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Mortgage Tracker</Text>
                  <Text style={styles.optionDescription}>
                    Amortization intervals, overpayments & mortgage vs savings analysis
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option: Profile */}
              <TouchableOpacity
                onPress={() => handleSelectMoreOption("profile")}
                style={[styles.optionItem, activeTab === "profile" && styles.optionItemActive]}
              >
                <View style={styles.optionIconContainer}>
                  <FontAwesome name="user" size={20} color={colors.indigo[400]} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>User Profile</Text>
                  <Text style={styles.optionDescription}>
                    Manage target settings, country and currency details
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setIsMoreMenuVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.slate[900],
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[6],
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      alignItems: "center",
      paddingVertical: spacing[3],
    },
    modalDragIndicator: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.slate[700],
      marginBottom: spacing[2],
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    modalScroll: {
      paddingBottom: spacing[4],
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      borderRadius: radii.md,
      marginBottom: spacing[2],
      backgroundColor: colors.slate[850] || "rgba(255, 255, 255, 0.02)",
      borderWidth: 1,
      borderColor: "transparent",
    },
    optionItemActive: {
      borderColor: colors.indigo[500],
      backgroundColor: "rgba(99, 102, 241, 0.05)",
    },
    optionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing[3],
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    optionDescription: {
      fontSize: 11,
      color: colors.slate[400],
      marginTop: 2,
      lineHeight: 14,
    },
    modalCloseBtn: {
      backgroundColor: colors.slate[800],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: spacing[2],
    },
    modalCloseBtnText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
  });
