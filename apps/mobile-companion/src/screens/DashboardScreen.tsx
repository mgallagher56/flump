import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api/client";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";
import type { Account, AccountDetail, BankConnection, BudgetEntry, Transaction } from "../types";

interface DashboardScreenProps {
  setActiveTab: (
    tab: "dashboard" | "accounts" | "mortgage" | "forecast" | "budget" | "profile",
  ) => void;
}

export default function DashboardScreen({ setActiveTab }: DashboardScreenProps) {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountDetails, setAccountDetails] = useState<AccountDetail[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [accs, details, txs, conns, budget, userProfile] = await Promise.all([
        api.getAccounts(),
        api.getAccountDetails(),
        api.getTransactions(),
        api.getBankConnections(),
        api.getBudgetEntries(),
        api.getUserProfile(),
      ]);
      setAccounts(accs);
      setAccountDetails(details);
      setTransactions(txs);
      setBankConnections(conns);
      setBudgetEntries(budget);
      setProfile(userProfile);
    } catch (err) {
      console.warn("Error fetching dashboard data:", err);
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

  // Calculations
  const stats = React.useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    accounts.forEach((acc) => {
      const accDetails = accountDetails
        .filter((d) => d.accountId === acc.id)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });

      let balance = acc.balance;
      if (accDetails.length > 0) {
        const curIndex = accDetails.findIndex(
          (d) => d.month === currentMonth && d.year === currentYear,
        );
        balance =
          curIndex !== -1
            ? accDetails[curIndex].value
            : accountDetails[accountDetails.length - 1].value;
      }

      const isAsset = ["Current", "Saving", "Owed", "Investment"].includes(acc.type);
      if (isAsset) {
        assets += balance;
      } else {
        liabilities += Math.abs(balance);
      }
    });

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities,
    };
  }, [accounts, accountDetails]);

  // Mortgage Quick View
  const mortgageStats = React.useMemo(() => {
    const mortgageAcc = accounts.find((a) => a.type === "Mortgage");
    if (!mortgageAcc) return null;

    const details = accountDetails.filter((d) => d.accountId === mortgageAcc.id);
    const balance = details.length > 0 ? details[details.length - 1].value : mortgageAcc.balance;

    return {
      name: mortgageAcc.name,
      balance: Math.abs(balance),
      rate: 4.5, // Mock default interest rate
      monthly: Math.round(Math.abs(balance) * 0.0053), // Quick amortization estimate
    };
  }, [accounts, accountDetails]);

  // Forecast Quick View (10-Year projection)
  const forecastValue = React.useMemo(() => {
    // Current total savings
    let sum = 0;
    accounts.forEach((acc) => {
      if (["Current", "Saving", "Investment", "Owed"].includes(acc.type)) {
        sum += acc.balance;
      }
    });

    // Project 10 years at 5% interest with £250 monthly saving rate
    const r = 0.05 / 12;
    let projected = sum;
    for (let i = 0; i < 10 * 12; i++) {
      projected = projected * (1 + r) + 250;
    }
    return Math.round(projected);
  }, [accounts]);

  // Budget/Runway calculations
  const budgetStats = React.useMemo(() => {
    if (budgetEntries.length === 0) return null;

    const toMonthly = (entry: BudgetEntry) => {
      const amt = Number(entry.amount) || 0;
      if (entry.frequency === "annual") return amt / 12;
      if (entry.frequency === "weekly") return (amt * 52) / 12;
      return amt;
    };

    const income = budgetEntries
      .filter((e) => e.isIncome)
      .reduce((sum, e) => sum + toMonthly(e), 0);
    const expenses = budgetEntries
      .filter((e) => !e.isIncome)
      .reduce((sum, e) => sum + toMonthly(e), 0);
    const surplus = income - expenses;

    // Savings Pool
    let totalSavings = 0;
    accounts.forEach((acc) => {
      if (["Current", "Saving"].includes(acc.type)) {
        const details = accountDetails.filter((d) => d.accountId === acc.id);
        const bal = details.length > 0 ? details[details.length - 1].value : acc.balance;
        totalSavings += Math.max(0, bal);
      }
    });

    const essentialExpenses = budgetEntries
      .filter((e) => !e.isIncome && e.isEssential)
      .reduce((sum, e) => sum + toMonthly(e), 0);

    const monthlyBurn = essentialExpenses;
    const runwayMonths = monthlyBurn > 0 ? totalSavings / monthlyBurn : 0;

    let runwayText = "No Burn";
    if (runwayMonths > 0) {
      const years = Math.floor(runwayMonths / 12);
      const months = Math.round(runwayMonths % 12);
      if (years > 0) {
        runwayText = `${years}y ${months}m`;
      } else {
        runwayText = `${months}m`;
      }
    }

    return {
      surplus,
      runwayText,
    };
  }, [budgetEntries, accounts, accountDetails]);

  const handleConnectBank = async (institutionId: string) => {
    setConnectingId(institutionId);
    try {
      await api.connectBank(institutionId);
      await fetchData();
      setIsConnectModalVisible(false);
    } catch (err) {
      console.warn(err);
    } finally {
      setConnectingId(null);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.indigo[600]}
          />
        }
      >
        {/* Header Hero */}
        <View style={styles.headerHero}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Text style={styles.headerTitle}>Flump.</Text>
              {api.isMockMode() && (
                <View style={styles.demoBadge}>
                  <Text style={styles.demoText}>Demo Mode</Text>
                </View>
              )}
            </View>
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
          </View>
          <Text style={styles.netWorthLabel}>Total Net Worth</Text>
          <Text style={styles.netWorthVal}>{formatCurrency(stats.netWorth)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Assets</Text>
              <Text style={styles.assetVal}>{formatCurrency(stats.assets)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Liabilities</Text>
              <Text style={styles.liabilityVal}>{formatCurrency(stats.liabilities)}</Text>
            </View>
          </View>
        </View>

        {/* Bank Connection Empty state or sync status */}
        <View style={styles.section}>
          {bankConnections.length === 0 ? (
            <View style={styles.connectCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <FontAwesome name="bank" size={20} color={colors.indigo[600]} />
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Recommended</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>Connect your Bank Accounts</Text>
              <Text style={styles.cardDesc}>
                Sync balances and transactions automatically for current, savings, and mortgage
                accounts.
              </Text>
              <TouchableOpacity
                onPress={() => setIsConnectModalVisible(true)}
                style={styles.syncButton}
              >
                <Text style={styles.syncButtonText}>Sync Bank Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.syncStatusCard}>
              <View style={styles.rowItems}>
                <View style={styles.emeraldIconBox}>
                  <FontAwesome name="check-circle" size={16} color={colors.success[500]} />
                </View>
                <View>
                  <Text style={styles.syncTitle}>Bank Sync Active</Text>
                  <Text style={styles.syncDesc}>
                    {bankConnections.length} bank connection(s) configured
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsConnectModalVisible(true)}
                style={styles.manageButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.manageButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Feature Integration Quick Widgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tools</Text>

          {/* Mortgage Quick View Widget */}
          {mortgageStats ? (
            <TouchableOpacity onPress={() => setActiveTab("mortgage")} style={styles.quickWidget}>
              <View style={styles.quickWidgetLeft}>
                <View style={styles.violetIconBox}>
                  <FontAwesome name="home" size={18} color={colors.indigo[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickWidgetTitle}>{mortgageStats.name}</Text>
                  <Text style={styles.quickWidgetDesc}>
                    Monthly Pay: {formatCurrency(mortgageStats.monthly)} @ {mortgageStats.rate}%
                  </Text>
                </View>
              </View>
              <View style={styles.quickWidgetRight}>
                <Text style={styles.liabilityAmt}>-{formatCurrency(mortgageStats.balance)}</Text>
                <Text style={styles.actionLink}>Optimize →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setActiveTab("mortgage")} style={styles.quickWidget}>
              <View style={styles.quickWidgetLeft}>
                <View style={styles.slateIconBox}>
                  <FontAwesome name="home" size={18} color={colors.slate[400]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickWidgetTitle}>Mortgage Overpayment</Text>
                  <Text style={styles.quickWidgetDesc}>Calculate overpayment savings & terms</Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={12} color={colors.slate[500]} />
            </TouchableOpacity>
          )}

          {/* Forecast Quick View Widget */}
          <TouchableOpacity onPress={() => setActiveTab("forecast")} style={styles.quickWidget}>
            <View style={styles.quickWidgetLeft}>
              <View style={styles.emeraldIconBox}>
                <FontAwesome name="line-chart" size={18} color={colors.success[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickWidgetTitle}>10-Year Net Worth Forecast</Text>
                <Text style={styles.quickWidgetDesc}>Project savings growth compounding</Text>
              </View>
            </View>
            <View style={styles.quickWidgetRight}>
              <Text style={styles.assetAmt}>{formatCurrency(forecastValue)}</Text>
              <Text style={styles.actionLink}>Simulate →</Text>
            </View>
          </TouchableOpacity>

          {/* Budget Quick View Widget */}
          <TouchableOpacity onPress={() => setActiveTab("budget")} style={styles.quickWidget}>
            <View style={styles.quickWidgetLeft}>
              <View style={styles.amberIconBox}>
                <FontAwesome name="pie-chart" size={18} color={colors.warning[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickWidgetTitle}>Budget & Runway</Text>
                <Text style={styles.quickWidgetDesc}>
                  {budgetStats
                    ? `Surplus: ${formatCurrency(budgetStats.surplus)}/mo • Runway: ${budgetStats.runwayText}`
                    : "Configure your monthly budget planner"}
                </Text>
              </View>
            </View>
            <View style={styles.quickWidgetRight}>
              <Text style={styles.actionLink}>View →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Transactions list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          <View style={styles.listCard}>
            {transactions.slice(0, 5).map((tx) => (
              <View key={tx.id} style={styles.listItem}>
                <View style={styles.quickWidgetLeft}>
                  <View style={styles.listIconBox}>
                    <FontAwesome
                      name={tx.amount > 0 ? "arrow-up" : "shopping-bag"}
                      size={14}
                      color={tx.amount > 0 ? "#10b981" : colors.slate[400]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickWidgetTitle} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={styles.syncDesc}>{tx.category}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.amount > 0 ? styles.txAmountPositive : styles.txAmountNegative,
                  ]}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
            ))}

            {transactions.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No transactions recorded</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Connect Bank Wizard Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isConnectModalVisible}
        onRequestClose={() => setIsConnectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link Bank Account</Text>
              <TouchableOpacity
                onPress={() => setIsConnectModalVisible(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <FontAwesome name="times" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Select your institution to connect. We will retrieve account balances and transactions
              securely using open banking.
            </Text>

            {/* Bank list */}
            <ScrollView style={{ maxHeight: 300 }}>
              <View style={{ gap: 12 }}>
                {[
                  { id: "hsbc", name: "HSBC Bank" },
                  { id: "barclays", name: "Barclays Bank" },
                  { id: "monzo", name: "Monzo Bank" },
                  { id: "starling", name: "Starling Bank" },
                  { id: "revolut", name: "Revolut" },
                  { id: "chase", name: "Chase" },
                ].map((bank) => {
                  const isConnecting = connectingId === bank.id;
                  const isConnected = bankConnections.some((c) => c.institutionId === bank.id);

                  return (
                    <TouchableOpacity
                      key={bank.id}
                      disabled={isConnecting || isConnected}
                      onPress={() => handleConnectBank(bank.id)}
                      style={[
                        styles.bankItem,
                        isConnected ? styles.bankItemConnected : styles.bankItemNormal,
                      ]}
                    >
                      <View style={styles.rowItems}>
                        <FontAwesome
                          name="bank"
                          size={16}
                          color={colors.indigo[600]}
                          style={{ marginRight: 12 }}
                        />
                        <Text style={styles.syncTitle}>{bank.name}</Text>
                      </View>
                      {isConnecting ? (
                        <ActivityIndicator size="small" color={colors.indigo[600]} />
                      ) : isConnected ? (
                        <Text style={styles.connectedText}>Connected</Text>
                      ) : (
                        <FontAwesome name="chevron-right" size={12} color={colors.slate[500]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {bankConnections.length > 0 && (
                <TouchableOpacity
                  onPress={async () => {
                    for (const conn of bankConnections) {
                      await api.deleteBankConnection(conn.id);
                    }
                    await fetchData();
                  }}
                  style={styles.disconnectButton}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect All Bank Connections</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.emptyStateText}>
                Secure SSL encryption • Read-only transaction access
              </Text>
            </View>
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
    headerHero: {
      paddingHorizontal: spacing[6],
      paddingTop: spacing[6],
      paddingBottom: spacing[8],
      backgroundColor: "rgba(99, 102, 241, 0.05)",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(99, 102, 241, 0.1)",
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[6],
    },
    headerTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900",
    },
    themeToggle: {
      padding: 8,
      borderRadius: radii.full,
      backgroundColor: colors.slate[800],
    },
    demoBadge: {
      backgroundColor: "rgba(245, 158, 11, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(245, 158, 11, 0.2)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.full,
    },
    demoText: {
      color: "#f59e0b",
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    netWorthLabel: {
      color: colors.slate[400],
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    netWorthVal: {
      color: colors.text,
      fontSize: 36,
      fontWeight: "800",
      marginTop: 4,
      letterSpacing: -0.5,
    },
    statsRow: {
      flexDirection: "row",
      marginTop: spacing[6],
      paddingTop: spacing[6],
      borderTopWidth: 1,
      borderTopColor: "rgba(30, 41, 59, 0.3)",
    },
    statCol: {
      flex: 1,
    },
    statLabel: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    assetVal: {
      color: "#34d399",
      fontSize: 16,
      fontWeight: "800",
      marginTop: 2,
    },
    liabilityVal: {
      color: "#f87171",
      fontSize: 16,
      fontWeight: "800",
      marginTop: 2,
    },
    section: {
      paddingHorizontal: spacing[6],
      marginTop: spacing[6],
    },
    sectionTitle: {
      color: colors.slate[400],
      fontSize: 14,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
    },
    connectCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[6],
      borderRadius: radii.lg,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing[4],
    },
    iconBox: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      padding: spacing[3],
      borderRadius: radii.md,
    },
    badge: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.full,
    },
    badgeText: {
      color: colors.indigo[500],
      fontSize: 12,
      fontWeight: "700",
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    cardDesc: {
      color: colors.slate[400],
      fontSize: 12,
      marginTop: 4,
      lineHeight: 18,
    },
    syncButton: {
      backgroundColor: colors.indigo[600],
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },
    syncButtonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 14,
    },
    syncStatusCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rowItems: {
      flexDirection: "row",
      alignItems: "center",
    },
    emeraldIconBox: {
      backgroundColor: `${colors.success[500]}15`,
      padding: 10,
      borderRadius: radii.sm,
      marginRight: 12,
    },
    syncTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    syncDesc: {
      color: colors.slate[400],
      fontSize: 12,
      marginTop: 2,
    },
    manageButton: {
      backgroundColor: colors.slate[800],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.3)",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.sm,
    },
    manageButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    quickWidget: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    quickWidgetLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 16,
    },
    violetIconBox: {
      backgroundColor: `${colors.indigo[500]}15`,
      padding: spacing[3],
      borderRadius: radii.md,
      marginRight: 16,
    },
    slateIconBox: {
      backgroundColor: colors.slate[800],
      padding: spacing[3],
      borderRadius: radii.md,
      marginRight: 16,
    },
    amberIconBox: {
      backgroundColor: `${colors.warning[500]}15`,
      padding: spacing[3],
      borderRadius: radii.md,
      marginRight: 16,
    },
    quickWidgetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    quickWidgetDesc: {
      color: colors.slate[400],
      fontSize: 13,
      marginTop: 2,
    },
    quickWidgetRight: {
      alignItems: "flex-end",
    },
    liabilityAmt: {
      color: colors.destructive[400],
      fontSize: 15,
      fontWeight: "700",
    },
    assetAmt: {
      color: colors.success[400],
      fontSize: 15,
      fontWeight: "700",
    },
    actionLink: {
      color: colors.indigo[500],
      fontSize: 12,
      fontWeight: "700",
      marginTop: 2,
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
    listIconBox: {
      backgroundColor: colors.slate[800],
      padding: 10,
      borderRadius: radii.sm,
      marginRight: 12,
    },
    txAmount: {
      fontSize: 15,
      fontWeight: "700",
    },
    txAmountPositive: {
      color: "#34d399",
    },
    txAmountNegative: {
      color: colors.text,
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
      minHeight: 480,
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
    modalDesc: {
      color: colors.slate[400],
      fontSize: 13,
      marginBottom: 20,
      lineHeight: 18,
    },
    bankItem: {
      padding: 16,
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
    },
    bankItemNormal: {
      borderColor: colors.slate[800],
      backgroundColor: colors.slate[850],
    },
    bankItemConnected: {
      borderColor: "rgba(16, 185, 129, 0.2)",
      backgroundColor: "rgba(16, 185, 129, 0.05)",
      opacity: 0.6,
    },
    connectedText: {
      color: "#34d399",
      fontSize: 13,
      fontWeight: "700",
    },
    modalFooter: {
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.slate[800],
      paddingTop: 16,
      alignItems: "center",
    },
    disconnectButton: {
      width: "100%",
      backgroundColor: colors.slate[800],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.3)",
      paddingVertical: 12,
      borderRadius: radii.md,
      alignItems: "center",
      marginBottom: 8,
    },
    disconnectButtonText: {
      color: "#ef4444",
      fontWeight: "700",
      fontSize: 13,
    },
  });
