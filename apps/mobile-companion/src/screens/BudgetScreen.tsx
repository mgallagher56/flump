import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../api/client";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";
import type { Account, AccountDetail, BudgetEntry } from "../types";

export default function BudgetScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"budget" | "runway">("budget");

  // Data states
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountDetails, setAccountDetails] = useState<AccountDetail[]>([]);
  const [profile, setProfile] = useState<any>(null);

  // Toggles for runway calculator
  const [selectedSavings, setSelectedSavings] = useState<{ [key: string]: boolean }>({});
  const [selectedExpenses, setSelectedExpenses] = useState<{ [key: string]: boolean }>({});
  const [selectedIncomes, setSelectedIncomes] = useState<{ [key: string]: boolean }>({});

  const fetchData = async () => {
    try {
      const [budgetData, accountsData, detailsData, userProfile] = await Promise.all([
        api.getBudgetEntries(),
        api.getAccounts(),
        api.getAccountDetails(),
        api.getUserProfile(),
      ]);
      setProfile(userProfile);

      setEntries(budgetData);
      setAccounts(accountsData);
      setAccountDetails(detailsData);

      // Initialize runway toggles
      const initialSavings: { [key: string]: boolean } = {};
      accountsData.forEach((a) => {
        if (["Current", "Saving"].includes(a.type)) {
          initialSavings[a.id] = true;
        }
      });
      setSelectedSavings(initialSavings);

      const initialExpenses: { [key: string]: boolean } = {};
      budgetData.forEach((e) => {
        if (!e.isIncome) {
          initialExpenses[e.id] = e.isEssential; // keep essentials by default
        }
      });
      setSelectedExpenses(initialExpenses);

      const initialIncomes: { [key: string]: boolean } = {};
      budgetData.forEach((e) => {
        if (e.isIncome && !e.isPrimaryIncome) {
          initialIncomes[e.id] = true; // keep non-primary incomes by default
        }
      });
      setSelectedIncomes(initialIncomes);
    } catch (err) {
      console.warn("Failed to fetch budget/accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  // Normalise to monthly amount helper
  const toMonthly = (entry: BudgetEntry) => {
    const amt = Number(entry.amount) || 0;
    if (entry.frequency === "annual") return amt / 12;
    if (entry.frequency === "weekly") return (amt * 52) / 12;
    return amt;
  };

  // Calculations for budget dashboard
  const totals = useMemo(() => {
    const income = entries.filter((e) => e.isIncome).reduce((sum, e) => sum + toMonthly(e), 0);
    const expenses = entries.filter((e) => !e.isIncome).reduce((sum, e) => sum + toMonthly(e), 0);
    return { income, expenses, surplus: income - expenses };
  }, [entries]);

  // Expenses grouped by category
  const categoryBreakdown = useMemo(() => {
    const categories: { [key: string]: { total: number; count: number } } = {
      housing: { total: 0, count: 0 },
      bills: { total: 0, count: 0 },
      expenses: { total: 0, count: 0 },
      savings: { total: 0, count: 0 },
    };

    entries.forEach((e) => {
      if (!e.isIncome && categories[e.category]) {
        categories[e.category].total += toMonthly(e);
        categories[e.category].count += 1;
      }
    });

    return Object.entries(categories).map(([key, data]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      ...data,
    }));
  }, [entries]);

  // Runway Math
  const runwayStats = useMemo(() => {
    // 1. Savings Pool
    let totalSavings = 0;
    accounts.forEach((acc) => {
      if (selectedSavings[acc.id]) {
        const details = accountDetails.filter((d) => d.accountId === acc.id);
        const bal = details.length > 0 ? details[details.length - 1].value : acc.balance;
        totalSavings += Math.max(0, bal);
      }
    });

    // 2. Kept expenses
    let monthlyExpenses = 0;
    entries.forEach((e) => {
      if (!e.isIncome && selectedExpenses[e.id]) {
        monthlyExpenses += toMonthly(e);
      }
    });

    // 3. Kept incomes (non-primary)
    let monthlyIncomes = 0;
    entries.forEach((e) => {
      if (e.isIncome && !e.isPrimaryIncome && selectedIncomes[e.id]) {
        monthlyIncomes += toMonthly(e);
      }
    });

    const monthlyBurn = Math.max(0, monthlyExpenses - monthlyIncomes);
    const runwayMonths = monthlyBurn > 0 ? totalSavings / monthlyBurn : 999;

    let runwayText = "No Burn Rate";
    let runwayColor = colors.success[500];

    if (monthlyBurn > 0) {
      const years = Math.floor(runwayMonths / 12);
      const months = Math.round(runwayMonths % 12);
      if (years > 0) {
        runwayText = `${years} yr${years > 1 ? "s" : ""} ${months} mo${months !== 1 ? "s" : ""}`;
      } else {
        runwayText = `${months} month${months !== 1 ? "s" : ""}`;
      }

      if (runwayMonths < 3) runwayColor = colors.destructive[500];
      else if (runwayMonths < 6) runwayColor = colors.warning[500];
      else if (runwayMonths < 12) runwayColor = colors.warning[500];
    }

    return {
      totalSavings,
      monthlyBurn,
      runwayMonths,
      runwayText,
      runwayColor,
    };
  }, [
    accounts,
    accountDetails,
    entries,
    selectedSavings,
    selectedExpenses,
    selectedIncomes,
    colors,
  ]);

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

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "housing":
        return "home";
      case "bills":
        return "file-text-o";
      case "expenses":
        return "shopping-bag";
      case "savings":
        return "bank";
      case "income":
        return "money";
      default:
        return "folder";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "housing":
        return colors.indigo[500];
      case "bills":
        return colors.info[500];
      case "expenses":
        return colors.destructive[500];
      case "savings":
        return colors.success[500];
      case "income":
        return colors.indigo[400];
      default:
        return colors.slate[400];
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo[600]} />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.headerTitle}>Budget & Runway</Text>
          <Text style={styles.headerSubtitle}>Monitor burn rate and runway</Text>
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

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "budget" && styles.tabButtonActive]}
          onPress={() => setActiveTab("budget")}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.tabText, activeTab === "budget" && styles.tabTextActive]}>
            Budget Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "runway" && styles.tabButtonActive]}
          onPress={() => setActiveTab("runway")}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.tabText, activeTab === "runway" && styles.tabTextActive]}>
            Runway Calculator
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "budget" ? (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* KPI Dashboard */}
          <View style={styles.kpiContainer}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Income</Text>
              <Text style={[styles.kpiValue, { color: colors.success[400] }]}>
                {formatCurrency(totals.income)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Expenses</Text>
              <Text style={[styles.kpiValue, { color: colors.destructive[400] }]}>
                {formatCurrency(totals.expenses)}
              </Text>
            </View>
          </View>

          <View style={[styles.card, styles.surplusCard]}>
            <View>
              <Text style={styles.surplusLabel}>Monthly Surplus</Text>
              <Text
                style={[
                  styles.surplusValue,
                  { color: totals.surplus >= 0 ? colors.success[400] : colors.destructive[400] },
                ]}
              >
                {formatCurrency(totals.surplus)}
              </Text>
            </View>
            <FontAwesome
              name={totals.surplus >= 0 ? "arrow-up" : "arrow-down"}
              size={24}
              color={totals.surplus >= 0 ? colors.success[400] : colors.destructive[400]}
            />
          </View>

          {/* Category List */}
          <Text style={styles.sectionTitle}>Expense Categories</Text>
          {categoryBreakdown.map((item) => (
            <View key={item.key} style={styles.categoryCard}>
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${getCategoryColor(item.key)}15` },
                  ]}
                >
                  <FontAwesome
                    name={getCategoryIcon(item.key)}
                    size={16}
                    color={getCategoryColor(item.key)}
                  />
                </View>
                <View>
                  <Text style={styles.categoryName}>{item.label}</Text>
                  <Text style={styles.categoryCount}>
                    {item.count} item{item.count !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              <Text style={styles.categoryAmount}>{formatCurrency(item.total)}</Text>
            </View>
          ))}

          {/* Recent Items */}
          <Text style={styles.sectionTitle}>Budget Entries</Text>
          {entries.map((item) => (
            <View key={item.id} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryName}>{item.name}</Text>
                <Text style={styles.entryFrequency}>
                  {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} •{" "}
                  {item.isEssential ? "Essential" : "Discretionary"}
                </Text>
              </View>
              <Text
                style={[
                  styles.entryAmount,
                  { color: item.isIncome ? colors.success[400] : colors.text },
                ]}
              >
                {item.isIncome ? "+" : "-"}
                {formatCurrency(Number(item.amount))}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Result Card */}
          <View style={[styles.card, styles.runwayCard]}>
            <Text style={styles.runwayLabel}>ESTIMATED UNEMPLOYMENT RUNWAY</Text>
            <Text style={[styles.runwayValue, { color: runwayStats.runwayColor }]}>
              {runwayStats.runwayText}
            </Text>
            <View style={styles.divider} />
            <View style={styles.runwayDetailRow}>
              <View>
                <Text style={styles.runwayDetailLabel}>Savings Pool</Text>
                <Text style={styles.runwayDetailValue}>
                  {formatCurrency(runwayStats.totalSavings)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.runwayDetailLabel}>Monthly Burn</Text>
                <Text style={styles.runwayDetailValue}>
                  {formatCurrency(runwayStats.monthlyBurn)}
                </Text>
              </View>
            </View>
          </View>

          {/* Savings Toggles */}
          <Text style={styles.sectionTitle}>Include in Savings Pool</Text>
          {accounts
            .filter((acc) => ["Current", "Saving"].includes(acc.type))
            .map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={styles.toggleRow}
                onPress={() => setSelectedSavings((prev) => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={styles.toggleLeft}>
                  <FontAwesome
                    name={selectedSavings[acc.id] ? "check-square" : "square-o"}
                    size={22}
                    color={selectedSavings[acc.id] ? colors.indigo[500] : colors.textMuted}
                    style={{ marginRight: spacing[3] }}
                  />
                  <Text style={styles.toggleText}>{acc.name}</Text>
                </View>
                <Text style={styles.toggleAmount}>{formatCurrency(acc.balance)}</Text>
              </TouchableOpacity>
            ))}

          {/* Income Toggles */}
          {entries.filter((e) => e.isIncome && !e.isPrimaryIncome).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Kept Income Sources</Text>
              {entries
                .filter((e) => e.isIncome && !e.isPrimaryIncome)
                .map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.toggleRow}
                    onPress={() => setSelectedIncomes((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <View style={styles.toggleLeft}>
                      <FontAwesome
                        name={selectedIncomes[e.id] ? "check-square" : "square-o"}
                        size={22}
                        color={selectedIncomes[e.id] ? colors.indigo[500] : colors.textMuted}
                        style={{ marginRight: spacing[3] }}
                      />
                      <Text style={styles.toggleText}>{e.name}</Text>
                    </View>
                    <Text style={styles.toggleAmount}>{formatCurrency(toMonthly(e))}</Text>
                  </TouchableOpacity>
                ))}
            </>
          )}

          {/* Expense Toggles */}
          <Text style={styles.sectionTitle}>Expenses to Maintain</Text>
          {entries
            .filter((e) => !e.isIncome)
            .map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.toggleRow}
                onPress={() => setSelectedExpenses((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View style={styles.toggleLeft}>
                  <FontAwesome
                    name={selectedExpenses[e.id] ? "check-square" : "square-o"}
                    size={22}
                    color={selectedExpenses[e.id] ? colors.indigo[500] : colors.textMuted}
                    style={{ marginRight: spacing[3] }}
                  />
                  <Text style={styles.toggleText}>{e.name}</Text>
                </View>
                <Text style={styles.toggleAmount}>{formatCurrency(toMonthly(e))}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: spacing[3],
      color: colors.textMuted,
      fontSize: 14,
    },
    tabHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    themeToggle: {
      padding: 10,
      borderRadius: radii.full,
      backgroundColor: colors.slate[800],
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.slate[900],
      marginHorizontal: spacing[4],
      borderRadius: radii.lg,
      padding: 4,
      marginBottom: spacing[2],
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: radii.md,
    },
    tabButtonActive: {
      backgroundColor: colors.indigo[600],
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
    tabTextActive: {
      color: "#ffffff",
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing[4],
      paddingBottom: spacing[12],
    },
    kpiContainer: {
      flexDirection: "row",
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing[4],
    },
    kpiLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    kpiValue: {
      fontSize: 20,
      fontWeight: "bold",
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing[4],
      marginBottom: spacing[4],
    },
    surplusCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    surplusLabel: {
      fontSize: 14,
      color: colors.textMuted,
    },
    surplusValue: {
      fontSize: 24,
      fontWeight: "bold",
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.indigo[400],
      marginTop: spacing[4],
      marginBottom: spacing[3],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    categoryCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[3],
      marginBottom: spacing[2],
    },
    categoryLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing[3],
    },
    categoryName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    categoryCount: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    entryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    entryInfo: {
      flex: 1,
      marginRight: spacing[3],
    },
    entryName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    entryFrequency: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    entryAmount: {
      fontSize: 14,
      fontWeight: "700",
    },
    runwayCard: {
      alignItems: "center",
      paddingVertical: spacing[6],
    },
    runwayLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1,
    },
    runwayValue: {
      fontSize: 36,
      fontWeight: "900",
      marginVertical: spacing[3],
    },
    divider: {
      height: 1,
      width: "100%",
      backgroundColor: colors.borderLight,
      marginVertical: spacing[4],
    },
    runwayDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
    },
    runwayDetailLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    runwayDetailValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
    },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    toggleLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    toggleText: {
      fontSize: 15,
      color: colors.text,
    },
    toggleAmount: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },
  });
