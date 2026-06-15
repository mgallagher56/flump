import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api/client";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";
import type { Account } from "../types";

export default function AccountsScreen({ navigation }: any) {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "assets" | "liabilities">("all");

  // Modal State for Manual Account addition
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<Account["type"]>("Current");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchData = async () => {
    try {
      const [accs, userProfile] = await Promise.all([api.getAccounts(), api.getUserProfile()]);
      setAccounts(accs);
      setProfile(userProfile);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAddAccount = async () => {
    if (!newAccName || !newAccBalance) return;
    const balanceNum = parseFloat(newAccBalance);
    if (Number.isNaN(balanceNum)) return;

    setIsAdding(true);
    try {
      // For liabilities, set balance negative automatically if user entered positive
      let finalBalance = balanceNum;
      if (["Mortgage", "Loan", "Credit Card"].includes(newAccType) && balanceNum > 0) {
        finalBalance = -balanceNum;
      }

      await api.addManualAccount(newAccName, newAccType, finalBalance);
      await fetchData();
      setIsAddModalVisible(false);
      setNewAccName("");
      setNewAccBalance("");
      setNewAccType("Current");
    } catch (err) {
      console.warn(err);
    } finally {
      setIsAdding(false);
    }
  };

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((acc) => {
      const isAsset = ["Current", "Saving", "Investment", "Owed"].includes(acc.type);
      if (activeFilter === "assets") return isAsset;
      if (activeFilter === "liabilities") return !isAsset;
      return true;
    });
  }, [accounts, activeFilter]);

  const formatCurrency = (val: number) => {
    const currency = profile?.currency || "GBP";
    const getLocale = (curr: string) => {
      switch (curr) {
        case "USD":
          return "en-US";
        case "EUR":
          return "de-DE";
        case "AUD":
          return "en-AU";
        case "CAD":
          return "en-CA";
        case "NZD":
          return "en-NZ";
        case "JPY":
          return "ja-JP";
        case "INR":
          return "en-IN";
        case "ZAR":
          return "en-ZA";
        case "SGD":
          return "en-SG";
        case "CHF":
          return "de-CH";
        default:
          return "en-GB";
      }
    };
    return Intl.NumberFormat(getLocale(currency), {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getAccountTypeColor = (type: Account["type"]) => {
    if (["Current", "Saving", "Investment"].includes(type)) return "#34d399";
    if (["Mortgage", "Loan", "Credit Card"].includes(type)) return "#f87171";
    return colors.slate[400];
  };

  const getAccountIcon = (type: Account["type"]) => {
    switch (type) {
      case "Current":
        return "wallet";
      case "Saving":
        return "piggy-bank";
      case "Investment":
        return "chart-line";
      case "Mortgage":
        return "home";
      case "Loan":
        return "hand-holding-usd";
      case "Credit Card":
        return "credit-card";
      default:
        return "briefcase";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.headerTitle}>My Accounts</Text>
          <Text style={styles.headerSubtitle}>Manage balances and entries</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.themeToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={22}
              color={isDark ? "#f59e0b" : "#6363F1"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsAddModalVisible(true)}
            style={styles.addButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome5
              name="plus"
              size={12}
              color={colors.indigo[500]}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.addButtonText}>Add Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Filter */}
      <View style={styles.filterContainer}>
        {(["all", "assets", "liabilities"] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
              styles.filterTab,
              activeFilter === filter ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Accounts List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.indigo[600]}
          />
        }
      >
        <View style={{ gap: 12 }}>
          {filteredAccounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => navigation.navigate("AccountDetail", { accountId: acc.id })}
              style={styles.accountCard}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconBox}>
                  <FontAwesome5
                    name={getAccountIcon(acc.type)}
                    size={16}
                    color={colors.indigo[600]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={styles.accountType}>{acc.type}</Text>
                </View>
              </View>

              <View style={styles.cardRight}>
                <Text style={[styles.balanceText, { color: getAccountTypeColor(acc.type) }]}>
                  {formatCurrency(acc.balance)}
                </Text>
                <Text style={styles.actionText}>Details →</Text>
              </View>
            </TouchableOpacity>
          ))}

          {filteredAccounts.length === 0 && (
            <View style={styles.emptyState}>
              <FontAwesome5 name="folder-open" size={24} color="#475569" />
              <Text style={styles.emptyStateText}>No accounts in this category</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Manual Account Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddModalVisible}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Manual Account</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <FontAwesome5 name="times" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 16 }}>
              {/* Account Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name</Text>
                <TextInput
                  value={newAccName}
                  onChangeText={setNewAccName}
                  placeholder="e.g. Barclays Checking"
                  placeholderTextColor="#475569"
                  style={styles.textInput}
                />
              </View>

              {/* Account Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Type</Text>
                <View style={styles.wrapRow}>
                  {["Current", "Saving", "Investment", "Mortgage", "Loan", "Credit Card"].map(
                    (type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setNewAccType(type as Account["type"])}
                        style={[
                          styles.typeBadge,
                          newAccType === type ? styles.typeBadgeActive : styles.typeBadgeInactive,
                        ]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            newAccType === type
                              ? styles.typeBadgeTextActive
                              : styles.typeBadgeTextInactive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              {/* Starting Balance */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Starting Balance (£)</Text>
                <TextInput
                  value={newAccBalance}
                  onChangeText={setNewAccBalance}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <TouchableOpacity
                onPress={handleAddAccount}
                disabled={isAdding || !newAccName || !newAccBalance}
                style={[
                  styles.submitButton,
                  isAdding || !newAccName || !newAccBalance
                    ? styles.submitButtonDisabled
                    : styles.submitButtonActive,
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.slate[950],
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      flex: 1,
      backgroundColor: colors.slate[950],
    },
    header: {
      paddingHorizontal: spacing[6],
      paddingTop: spacing[6],
      paddingBottom: spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: colors.slate[900],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    headerSubtitle: {
      color: colors.slate[400],
      fontSize: 14,
      marginTop: 2,
    },
    themeToggle: {
      padding: 10,
      borderRadius: radii.full,
      backgroundColor: colors.slate[800],
    },
    addButton: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(99, 102, 241, 0.2)",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.md,
      flexDirection: "row",
      alignItems: "center",
    },
    addButtonText: {
      color: colors.indigo[500],
      fontSize: 13,
      fontWeight: "600",
    },
    filterContainer: {
      flexDirection: "row",
      paddingHorizontal: spacing[6],
      marginVertical: 16,
      gap: 8,
    },
    filterTab: {
      paddingVertical: 12,
      borderRadius: radii.md,
      flex: 1,
      alignItems: "center",
      borderWidth: 1,
    },
    filterTabActive: {
      backgroundColor: colors.slate[800],
      borderColor: colors.slate[700],
    },
    filterTabInactive: {
      backgroundColor: "rgba(15, 23, 42, 0.25)",
      borderColor: colors.slate[950],
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    filterTabTextActive: {
      color: colors.text,
    },
    filterTabTextInactive: {
      color: colors.slate[400],
    },
    accountCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 16,
    },
    iconBox: {
      backgroundColor: colors.slate[800],
      padding: 10,
      borderRadius: radii.sm,
      marginRight: 14,
    },
    accountName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    accountType: {
      color: colors.slate[400],
      fontSize: 12,
      marginTop: 2,
    },
    cardRight: {
      alignItems: "flex-end",
    },
    balanceText: {
      fontSize: 16,
      fontWeight: "700",
    },
    actionText: {
      color: colors.slate[500],
      fontSize: 12,
      marginTop: 2,
    },
    emptyState: {
      padding: 48,
      alignItems: "center",
      backgroundColor: "rgba(15, 23, 42, 0.25)",
      borderRadius: radii.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.slate[800],
      gap: 8,
    },
    emptyStateText: {
      color: colors.slate[500],
      fontSize: 13,
      textAlign: "center",
      marginTop: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.slate[900],
      borderTopLeftRadius: radii.lg * 1.5,
      borderTopRightRadius: radii.lg * 1.5,
      borderTopWidth: 1,
      borderTopColor: "rgba(30, 41, 59, 0.8)",
      padding: spacing[6],
      minHeight: 420,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[6],
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    modalCloseButton: {
      backgroundColor: colors.slate[800],
      padding: 8,
      borderRadius: radii.full,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      color: colors.slate[400],
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    textInput: {
      backgroundColor: colors.slate[850],
      borderWidth: 1,
      borderColor: colors.slate[800],
      borderRadius: radii.md,
      padding: 12,
      color: colors.text,
      fontSize: 15,
    },
    wrapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    typeBadge: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    typeBadgeActive: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderColor: colors.indigo[500],
    },
    typeBadgeInactive: {
      backgroundColor: colors.slate[850],
      borderColor: colors.slate[800],
    },
    typeBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    typeBadgeTextActive: {
      color: colors.indigo[500],
    },
    typeBadgeTextInactive: {
      color: colors.slate[400],
    },
    submitButton: {
      width: "100%",
      borderRadius: radii.md,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },
    submitButtonActive: {
      backgroundColor: colors.indigo[600],
    },
    submitButtonDisabled: {
      backgroundColor: "rgba(99, 102, 241, 0.4)",
      opacity: 0.7,
    },
    submitButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
