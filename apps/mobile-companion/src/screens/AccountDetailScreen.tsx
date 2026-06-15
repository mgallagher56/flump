import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
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
import type { Account, AccountDetail } from "../types";

export default function AccountDetailScreen({ route, navigation }: any) {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { accountId } = route.params;
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [details, setDetails] = useState<AccountDetail[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Modal State for adding detail
  const [isAddDetailVisible, setIsAddDetailVisible] = useState(false);
  const [detailMonth, setDetailMonth] = useState("");
  const [detailYear, setDetailYear] = useState("");
  const [detailValue, setDetailValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchData = async () => {
    try {
      const [accs, allDetails, userProfile] = await Promise.all([
        api.getAccounts(),
        api.getAccountDetails(),
        api.getUserProfile(),
      ]);
      setProfile(userProfile);
      const acc = accs.find((a) => a.id === accountId);
      if (acc) {
        setAccount(acc);
        const filtered = allDetails
          .filter((d) => d.accountId === accountId)
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
          });
        setDetails(filtered);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [accountId]),
  );

  const handleAddDetail = async () => {
    if (!detailMonth || !detailYear || !detailValue) return;
    const m = parseInt(detailMonth, 10);
    const y = parseInt(detailYear, 10);
    const v = parseFloat(detailValue);

    if (Number.isNaN(m) || m < 1 || m > 12) {
      Alert.alert("Invalid Month", "Month must be between 1 and 12.");
      return;
    }
    if (Number.isNaN(y) || y < 2000) {
      Alert.alert("Invalid Year", "Year must be a valid number.");
      return;
    }
    if (Number.isNaN(v)) {
      Alert.alert("Invalid Value", "Value must be a valid number.");
      return;
    }

    setIsAdding(true);
    try {
      // If it's a liability, automatically apply negative if entered positive
      let finalVal = v;
      if (account && ["Mortgage", "Loan", "Credit Card"].includes(account.type) && v > 0) {
        finalVal = -v;
      }

      await api.addAccountDetail(accountId, m, y, finalVal);
      await fetchData();
      setIsAddDetailVisible(false);
      setDetailMonth("");
      setDetailYear("");
      setDetailValue("");
    } catch (err) {
      console.warn(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account? All transaction and balance histories will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.deleteAccount(accountId);
              navigation.goBack();
            } catch (err) {
              console.warn(err);
              setLoading(false);
            }
          },
        },
      ],
    );
  };

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

  const getMonthName = (month: number) => {
    const dates = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return dates[month - 1] || "";
  };

  // Custom Chart Data Calculations
  const chartHeight = 120;
  const chartDetails = React.useMemo(() => {
    // Take the last 6 months for chart representation
    return details.slice(-6);
  }, [details]);

  const maxChartVal = React.useMemo(() => {
    if (chartDetails.length === 0) return 1;
    // Map values as absolute to handle negative liabilities correctly
    const absVals = chartDetails.map((d) => Math.abs(d.value));
    return Math.max(...absVals, 100);
  }, [chartDetails]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo[600]} />
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Account not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.goBackButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.submitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLiability = ["Mortgage", "Loan", "Credit Card"].includes(account.type);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header back bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome name="arrow-left" size={18} color={colors.indigo[500]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account details</Text>
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={styles.deleteButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FontAwesome name="trash" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        {/* Account Header Hero */}
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>{account.type}</Text>
          <Text style={styles.heroName}>{account.name}</Text>
          <Text style={[styles.heroBalance, { color: isLiability ? "#f87171" : "#34d399" }]}>
            {formatCurrency(account.balance)}
          </Text>
        </View>

        {/* Custom Visual Sparkline/Chart */}
        {chartDetails.length > 0 && (
          <View style={styles.section}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Balance Trend (Last 6 Months)</Text>

              <View style={[styles.sparkline, { height: chartHeight }]}>
                {chartDetails.map((detail) => {
                  const absVal = Math.abs(detail.value);
                  const pct = Math.max(8, (absVal / maxChartVal) * 100);

                  return (
                    <View key={detail.id} style={styles.sparklineBarCol}>
                      <Text style={styles.sparklineValText}>{formatCurrency(detail.value)}</Text>
                      {/* Visual Bar */}
                      <View
                        style={[
                          styles.sparklineBar,
                          isLiability ? styles.barLiability : styles.barAsset,
                          { height: `${pct}%` },
                        ]}
                      />
                      <Text style={styles.sparklineLabelText}>
                        {getMonthName(detail.month)} '{String(detail.year).slice(-2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Balance History List */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Balance History</Text>
            <TouchableOpacity
              onPress={() => setIsAddDetailVisible(true)}
              style={styles.addButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome
                name="plus"
                size={12}
                color={colors.indigo[500]}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.addButtonText}>Add Entry</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            {[...details].reverse().map((detail) => (
              <View key={detail.id} style={styles.listItem}>
                <View style={styles.rowItems}>
                  <View style={styles.listIconBox}>
                    <FontAwesome name="calendar" size={12} color={colors.slate[400]} />
                  </View>
                  <Text style={styles.itemTitle}>
                    {getMonthName(detail.month)} {detail.year}
                  </Text>
                </View>
                <Text style={[styles.itemValue, { color: isLiability ? "#f87171" : "#34d399" }]}>
                  {formatCurrency(detail.value)}
                </Text>
              </View>
            ))}

            {details.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No balance history recorded</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddDetailVisible}
        onRequestClose={() => setIsAddDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Balance Entry</Text>
              <TouchableOpacity
                onPress={() => setIsAddDetailVisible(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <FontAwesome name="times" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16 }}>
              <View style={styles.flexRow}>
                {/* Month */}
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Month (1-12)</Text>
                  <TextInput
                    value={detailMonth}
                    onChangeText={setDetailMonth}
                    placeholder="e.g. 6"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                {/* Year */}
                <View style={styles.flex1}>
                  <Text style={styles.inputLabel}>Year</Text>
                  <TextInput
                    value={detailYear}
                    onChangeText={setDetailYear}
                    placeholder="e.g. 2026"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Value */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Balance Value (£)</Text>
                <TextInput
                  value={detailValue}
                  onChangeText={setDetailValue}
                  placeholder="e.g. 1540"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <TouchableOpacity
                onPress={handleAddDetail}
                disabled={isAdding || !detailMonth || !detailYear || !detailValue}
                style={[
                  styles.submitButton,
                  isAdding || !detailMonth || !detailYear || !detailValue
                    ? styles.submitButtonDisabled
                    : styles.submitButtonActive,
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Entry</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    notFoundContainer: {
      flex: 1,
      backgroundColor: colors.slate[950],
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing[6],
    },
    notFoundText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    goBackButton: {
      backgroundColor: colors.indigo[600],
      borderRadius: radii.md,
      paddingHorizontal: 28,
      paddingVertical: 14,
      marginTop: 16,
    },
    container: {
      flex: 1,
      backgroundColor: colors.slate[950],
    },
    header: {
      paddingHorizontal: spacing[6],
      paddingVertical: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.slate[900],
    },
    backButton: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: colors.slate[800],
      padding: 12,
      borderRadius: radii.md,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    deleteButton: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.2)",
      padding: 12,
      borderRadius: radii.md,
    },
    heroHeader: {
      paddingHorizontal: spacing[6],
      paddingVertical: 24,
      alignItems: "center",
      backgroundColor: "rgba(99, 102, 241, 0.02)",
      borderBottomWidth: 1,
      borderBottomColor: colors.slate[900],
    },
    heroLabel: {
      color: colors.slate[400],
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    heroName: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "900",
      marginTop: 4,
      textAlign: "center",
    },
    heroBalance: {
      fontSize: 32,
      fontWeight: "900",
      marginTop: 12,
    },
    section: {
      paddingHorizontal: spacing[6],
      marginTop: spacing[6],
    },
    chartCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.lg,
    },
    chartTitle: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 24,
    },
    sparkline: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      paddingHorizontal: 8,
    },
    sparklineBarCol: {
      alignItems: "center",
      flex: 1,
    },
    sparklineValText: {
      color: colors.slate[500],
      fontSize: 11,
      marginBottom: 4,
      fontWeight: "700",
    },
    sparklineBar: {
      width: 20,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    barAsset: {
      backgroundColor: colors.indigo[600],
    },
    barLiability: {
      backgroundColor: "rgba(239, 68, 68, 0.4)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.2)",
    },
    sparklineLabelText: {
      color: colors.slate[400],
      fontSize: 11,
      marginTop: 8,
      fontWeight: "700",
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      color: colors.slate[400],
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    addButton: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(99, 102, 241, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radii.md,
      flexDirection: "row",
      alignItems: "center",
    },
    addButtonText: {
      color: colors.indigo[400],
      fontSize: 12,
      fontWeight: "700",
    },
    listCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      borderRadius: radii.lg,
      overflow: "hidden",
    },
    listItem: {
      padding: spacing[4],
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(30, 41, 59, 0.3)",
    },
    rowItems: {
      flexDirection: "row",
      alignItems: "center",
    },
    listIconBox: {
      backgroundColor: colors.slate[800],
      padding: 8,
      borderRadius: radii.sm,
      marginRight: 12,
    },
    itemTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    itemValue: {
      fontSize: 15,
      fontWeight: "700",
    },
    emptyState: {
      padding: 32,
      alignItems: "center",
    },
    emptyStateText: {
      color: colors.slate[500],
      fontSize: 13,
      textAlign: "center",
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
      minHeight: 380,
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
    flexRow: {
      flexDirection: "row",
      gap: 16,
    },
    flex1: {
      flex: 1,
      gap: 8,
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
