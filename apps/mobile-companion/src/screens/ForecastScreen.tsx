import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";
import type { UserProfile } from "../types";

// Re-implement the exact UK Tax math
const calculateUKTax = (gross: number, pensionPercent: number, studentLoanPlan: string) => {
  const pension = gross * (pensionPercent / 100);
  const adjustedGross = Math.max(0, gross - pension);

  let personalAllowance = 12570;
  if (adjustedGross > 100000) {
    const reduction = (adjustedGross - 100000) / 2;
    personalAllowance = Math.max(0, 12570 - reduction);
  }

  const taxableIncome = Math.max(0, adjustedGross - personalAllowance);
  let incomeTax = 0;

  if (taxableIncome > 0) {
    if (taxableIncome <= 37700) {
      incomeTax = taxableIncome * 0.2;
    } else if (taxableIncome <= 125140) {
      incomeTax = 37700 * 0.2 + (taxableIncome - 37700) * 0.4;
    } else {
      incomeTax = 37700 * 0.2 + (125140 - 37700) * 0.4 + (taxableIncome - 125140) * 0.45;
    }
  }

  let ni = 0;
  if (adjustedGross > 12570) {
    if (adjustedGross <= 50270) {
      ni = (adjustedGross - 12570) * 0.08;
    } else {
      ni = (50270 - 12570) * 0.08 + (adjustedGross - 50270) * 0.02;
    }
  }

  let studentLoan = 0;
  if (studentLoanPlan !== "none") {
    let threshold = 0;
    let rate = 0.09;

    switch (studentLoanPlan) {
      case "plan1":
        threshold = 26900;
        break;
      case "plan2":
        threshold = 29385;
        break;
      case "plan4":
        threshold = 33795;
        break;
      case "plan5":
        threshold = 25000;
        break;
      case "postgrad":
        threshold = 21000;
        rate = 0.06;
        break;
    }

    if (adjustedGross > threshold) {
      studentLoan = (adjustedGross - threshold) * rate;
    }
  }

  const netPay = Math.max(0, gross - pension - incomeTax - ni - studentLoan);

  return {
    pension,
    incomeTax,
    ni,
    studentLoan,
    netPay,
    gross,
    adjustedGross,
    personalAllowance,
  };
};

export default function ForecastScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<"forecaster" | "calculator">("forecaster");

  // Forecaster state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [currentSavingRate, setCurrentSavingRate] = useState<number>(250);
  const [hypotheticalSavingRate, setHypotheticalSavingRate] = useState<number>(500);
  const [interestRate, setInterestRate] = useState<number>(5);
  const [projectionYears, setProjectionYears] = useState<number>(10);
  const [netSalaryIncrease, setNetSalaryIncrease] = useState<number>(0);

  // UK Tax state
  const [grossSalary, setGrossSalary] = useState<number>(45000);
  const [pensionPercent, setPensionPercent] = useState<number>(5);
  const [studentLoanPlan, setStudentLoanPlan] = useState<string>("none");
  const [salaryIncrease, setSalaryIncrease] = useState<number>(5000);

  // Prepopulate total assets from real database
  const fetchTotalAssets = async () => {
    try {
      const [accs, userProfile] = await Promise.all([api.getAccounts(), api.getUserProfile()]);
      setProfile(userProfile);
      if (userProfile.annualSalary) {
        setGrossSalary(userProfile.annualSalary);
      }
      let total = 0;
      accs.forEach((acc) => {
        if (["Current", "Saving", "Investment", "Owed"].includes(acc.type)) {
          total += acc.balance;
        }
      });
      setStartingBalance(total);
    } catch (err) {
      console.warn(err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTotalAssets();
    }, []),
  );

  // Compute UK Taxes for standard gross salary
  const taxResults = useMemo(() => {
    return calculateUKTax(grossSalary, pensionPercent, studentLoanPlan);
  }, [grossSalary, pensionPercent, studentLoanPlan]);

  // Compute UK Taxes for salary with raise
  const raiseResults = useMemo(() => {
    return calculateUKTax(grossSalary + salaryIncrease, pensionPercent, studentLoanPlan);
  }, [grossSalary, salaryIncrease, pensionPercent, studentLoanPlan]);

  const monthlyIncrease = useMemo(() => {
    const netCurrent = taxResults.netPay / 12;
    const netNew = raiseResults.netPay / 12;
    return Math.max(0, netNew - netCurrent);
  }, [taxResults, raiseResults]);

  const handleApplyIncrease = () => {
    setNetSalaryIncrease(monthlyIncrease);
    setHypotheticalSavingRate((prev) => prev + Math.round(monthlyIncrease));
    setActiveTab("forecaster");
  };

  // Compound Interest Calculation
  const projectionData = useMemo(() => {
    const data = [];
    const m = interestRate / 100 / 12;
    let balanceA = startingBalance;
    let balanceB = startingBalance;

    data.push({
      year: 0,
      current: Math.round(balanceA),
      hypothetical: Math.round(balanceB),
    });

    for (let y = 1; y <= projectionYears; y++) {
      for (let month = 1; month <= 12; month++) {
        balanceA = balanceA * (1 + m) + currentSavingRate;
        balanceB = balanceB * (1 + m) + hypotheticalSavingRate;
      }
      data.push({
        year: y,
        current: Math.round(balanceA),
        hypothetical: Math.round(balanceB),
      });
    }
    return data;
  }, [startingBalance, currentSavingRate, hypotheticalSavingRate, interestRate, projectionYears]);

  const latestProjected = projectionData[projectionData.length - 1];
  const maxProjectedVal = Math.max(latestProjected.hypothetical, latestProjected.current, 100);

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

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Savings & Tax Planner</Text>
          <Text style={styles.headerSubtitle}>Forecast returns & optimize income</Text>
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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(["forecaster", "calculator"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab ? styles.tabActive : styles.tabInactive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              {tab === "forecaster" ? "Savings Forecaster" : "UK Tax Calculator"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Tax Advice Disclaimer Banner */}
        {profile?.country && profile.country !== "GB" && (
          <View style={styles.disclaimerBanner}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#f59e0b"
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.disclaimerTitle}>Tax Calculations Notice</Text>
              <Text style={styles.disclaimerText}>
                Please note that tax calculations and rules on this platform are based on UK HMRC
                laws/rules/taxes. We plan to onboard support for other countries soon.
              </Text>
            </View>
          </View>
        )}
        {/* Tab 1: Savings Forecaster */}
        {activeTab === "forecaster" && (
          <View style={{ gap: 16 }}>
            {/* Pay raise applied banner */}
            {netSalaryIncrease > 0 && (
              <View style={styles.banner}>
                <View style={styles.bannerLeft}>
                  <FontAwesome
                    name="check-circle"
                    size={16}
                    color="#10b981"
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>UK Tax Pay Rise Applied</Text>
                    <Text style={styles.bannerDesc}>
                      Hypothetical savings rate boosted by +{formatCurrency(netSalaryIncrease)}/mo
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setHypotheticalSavingRate((prev) =>
                      Math.max(currentSavingRate, prev - Math.round(netSalaryIncrease)),
                    );
                    setNetSalaryIncrease(0);
                  }}
                  style={styles.clearButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Inputs Panel */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Forecast Inputs</Text>

              {/* Starting Balance */}
              <View style={styles.controllerGroup}>
                <View style={styles.controllerHeader}>
                  <Text style={styles.controllerLabel}>Starting Savings</Text>
                  <Text style={styles.controllerVal}>{formatCurrency(startingBalance)}</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setStartingBalance(Math.max(0, startingBalance - 2000))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>-£2k</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStartingBalance(startingBalance + 2000)}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>+£2k</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Monthly savings rates */}
              <View style={styles.flexRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.controllerHeader}>
                    <Text style={styles.subCardLabel}>Current Save</Text>
                    <Text style={[styles.controllerVal, { fontSize: 14 }]}>
                      {formatCurrency(currentSavingRate)}
                    </Text>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() => setCurrentSavingRate(Math.max(0, currentSavingRate - 50))}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>-£50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setCurrentSavingRate(currentSavingRate + 50)}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>+£50</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.controllerHeader}>
                    <Text style={styles.subCardLabel}>Hypothetical</Text>
                    <Text
                      style={[styles.controllerVal, { fontSize: 14, color: colors.indigo[400] }]}
                    >
                      {formatCurrency(hypotheticalSavingRate)}
                    </Text>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() =>
                        setHypotheticalSavingRate(Math.max(0, hypotheticalSavingRate - 50))
                      }
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>-£50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setHypotheticalSavingRate(hypotheticalSavingRate + 50)}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>+£50</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Interest rate & Projection term */}
              <View style={styles.flexRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.controllerHeader}>
                    <Text style={styles.subCardLabel}>ROI Rate</Text>
                    <Text style={styles.controllerValSmall}>{interestRate}%</Text>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() => setInterestRate(Math.max(0.5, interestRate - 0.5))}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>-0.5%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setInterestRate(interestRate + 0.5)}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>+0.5%</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.controllerHeader}>
                    <Text style={styles.subCardLabel}>Term Years</Text>
                    <Text style={styles.controllerValSmall}>{projectionYears} Yr</Text>
                  </View>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={() => setProjectionYears(Math.max(1, projectionYears - 5))}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>-5 Yr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setProjectionYears(projectionYears + 5)}
                      style={styles.adjustButtonMicro}
                    >
                      <Text style={styles.adjustButtonTextMicro}>+5 Yr</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Verdict Card */}
            <View style={styles.verdictCard}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.verdictLabel}>Compound Return Difference</Text>
                <Text style={styles.verdictDescText} numberOfLines={2}>
                  By saving {formatCurrency(hypotheticalSavingRate)}/mo instead of{" "}
                  {formatCurrency(currentSavingRate)}/mo, you will accumulate
                </Text>
              </View>
              <Text style={styles.verdictValue}>
                +{formatCurrency(latestProjected.hypothetical - latestProjected.current)}
              </Text>
            </View>

            {/* Custom Interactive Projection Chart */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Projected Growth Curve (5-Year Intervals)</Text>

              <View style={styles.chartArea}>
                {projectionData
                  .filter(
                    (d) =>
                      d.year % Math.max(1, Math.round(projectionYears / 5)) === 0 || d.year === 0,
                  )
                  .map((d) => {
                    const currentPct = Math.max(2, (d.current / maxProjectedVal) * 100);
                    const hypoPct = Math.max(2, (d.hypothetical / maxProjectedVal) * 100);

                    return (
                      <View key={d.year} style={{ alignItems: "center", flex: 1 }}>
                        <View style={styles.chartBarGroup}>
                          {/* Current Plan Bar */}
                          <View style={[styles.chartBarStd, { height: `${currentPct}%` }]} />
                          {/* Hypothetical Plan Bar */}
                          <View style={[styles.chartBarHypo, { height: `${hypoPct}%` }]} />
                        </View>
                        <Text style={styles.chartLabelText}>Yr {d.year}</Text>
                      </View>
                    );
                  })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: colors.slate[700] }]} />
                  <Text style={styles.legendText}>Current Plan</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: "#10b981" }]} />
                  <Text style={styles.legendText}>Hypothetical Plan</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tab 2: UK Income Tax Calculator */}
        {activeTab === "calculator" && (
          <View style={{ gap: 16 }}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Income Parameters</Text>

              {/* Gross Salary */}
              <View style={styles.controllerGroup}>
                <View style={styles.controllerHeader}>
                  <Text style={styles.controllerLabel}>Gross Annual Salary</Text>
                  <Text style={styles.controllerVal}>{formatCurrency(grossSalary)}</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setGrossSalary(Math.max(5000, grossSalary - 5000))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>-£5k</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setGrossSalary(grossSalary + 5000)}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>+£5k</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pension percent */}
              <View style={styles.controllerGroup}>
                <View style={styles.controllerHeader}>
                  <Text style={styles.controllerLabel}>Pension Contribution (Sacrifice)</Text>
                  <Text style={styles.controllerVal}>{pensionPercent}%</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setPensionPercent(Math.max(0, pensionPercent - 1))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>-1%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPensionPercent(pensionPercent + 1)}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>+1%</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Student Loan selectors */}
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.controllerLabelSub}>Student Loan repayment plan</Text>
                <View style={styles.wrapRow}>
                  {[
                    { id: "none", label: "None" },
                    { id: "plan1", label: "Plan 1" },
                    { id: "plan2", label: "Plan 2" },
                    { id: "plan4", label: "Plan 4" },
                    { id: "plan5", label: "Plan 5" },
                    { id: "postgrad", label: "Postgrad" },
                  ].map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      onPress={() => setStudentLoanPlan(plan.id)}
                      style={[
                        styles.planBadge,
                        studentLoanPlan === plan.id
                          ? styles.planBadgeActive
                          : styles.planBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.planBadgeText,
                          studentLoanPlan === plan.id
                            ? styles.planBadgeTextActive
                            : styles.planBadgeTextInactive,
                        ]}
                      >
                        {plan.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Calculations Breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Monthly Breakdown</Text>
              <View style={{ gap: 10 }}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { fontWeight: "600" }]}>
                    Net Take-Home Pay
                  </Text>
                  <Text
                    style={[
                      styles.breakdownVal,
                      { color: "#34d399", fontSize: 16, fontWeight: "900" },
                    ]}
                  >
                    {formatCurrency(taxResults.netPay / 12)}/mo
                  </Text>
                </View>
                <View style={styles.breakdownRowBordered}>
                  <Text style={styles.breakdownLabel}>Income Tax Paid</Text>
                  <Text style={[styles.breakdownVal, { color: "#f87171" }]}>
                    -{formatCurrency(taxResults.incomeTax / 12)}/mo
                  </Text>
                </View>
                <View style={styles.breakdownRowBordered}>
                  <Text style={styles.breakdownLabel}>National Insurance Paid</Text>
                  <Text style={[styles.breakdownVal, { color: "#f87171" }]}>
                    -{formatCurrency(taxResults.ni / 12)}/mo
                  </Text>
                </View>
                {taxResults.pension > 0 && (
                  <View style={styles.breakdownRowBordered}>
                    <Text style={styles.breakdownLabel}>Pension Contribution</Text>
                    <Text style={styles.breakdownVal}>
                      -{formatCurrency(taxResults.pension / 12)}/mo
                    </Text>
                  </View>
                )}
                {taxResults.studentLoan > 0 && (
                  <View style={styles.breakdownRowBordered}>
                    <Text style={styles.breakdownLabel}>Student Loan repayments</Text>
                    <Text style={styles.breakdownVal}>
                      -{formatCurrency(taxResults.studentLoan / 12)}/mo
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Pay rise simulator */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Simulate Salary Raise</Text>

              <View style={styles.controllerGroup}>
                <View style={styles.controllerHeader}>
                  <Text style={styles.controllerLabel}>Salary Increase</Text>
                  <Text style={styles.controllerVal}>+{formatCurrency(salaryIncrease)}/yr</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setSalaryIncrease(Math.max(1000, salaryIncrease - 1000))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>-£1k</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSalaryIncrease(salaryIncrease + 1000)}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>+£1k</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.raiseBadge}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.raiseBadgeTitle}>Net Monthly Pay Increase</Text>
                  <Text style={styles.raiseBadgeDesc}>
                    After tax, NI, pension, and student loan deductions
                  </Text>
                </View>
                <Text style={styles.raiseBadgeValue}>+{formatCurrency(monthlyIncrease)}/mo</Text>
              </View>

              <TouchableOpacity
                onPress={handleApplyIncrease}
                disabled={monthlyIncrease <= 0}
                style={[
                  styles.submitButton,
                  monthlyIncrease <= 0 ? styles.submitButtonDisabled : styles.submitButtonActive,
                ]}
              >
                <Text style={styles.submitButtonText}>Apply to Savings Forecaster</Text>
              </TouchableOpacity>
            </View>

            {/* General Tax Disclaimer */}
            <View style={styles.generalDisclaimer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.slate[400]}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={[styles.disclaimerText, { flex: 1, fontSize: 12, lineHeight: 16 }]}>
                These tax figures are estimates for guidance only. Rules used may be out of date
                compared to official guidance. Do not rely on these figures for tax returns or
                financial decisions. Consult HMRC (gov.uk) or a qualified adviser for exact figures.
                Flump accepts no liability for any loss from reliance on these estimates.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
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
      alignItems: "center",
      justifyContent: "space-between",
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
    tabsContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.slate[900],
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      borderBottomWidth: 2,
    },
    tabActive: {
      borderBottomColor: colors.indigo[500],
    },
    tabInactive: {
      borderBottomColor: "transparent",
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    tabTextActive: {
      color: colors.indigo[400],
    },
    tabTextInactive: {
      color: colors.slate[400],
    },
    banner: {
      backgroundColor: "rgba(16, 185, 129, 0.05)",
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.2)",
      padding: spacing[4],
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    bannerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 16,
    },
    bannerTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    bannerDesc: {
      color: colors.slate[400],
      fontSize: 12,
      marginTop: 2,
    },
    clearButton: {
      backgroundColor: colors.slate[800],
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.sm,
    },
    clearButtonText: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "700",
    },
    card: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.lg,
    },
    cardLabel: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 16,
    },
    subCardLabel: {
      color: colors.slate[400],
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    controllerGroup: {
      marginBottom: 16,
    },
    controllerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    controllerLabel: {
      color: colors.slate[300],
      fontSize: 14,
      fontWeight: "700",
    },
    controllerLabelSub: {
      color: colors.slate[300],
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 8,
    },
    controllerVal: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    controllerValSmall: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 8,
    },
    adjustButtonSmall: {
      backgroundColor: colors.slate[800],
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      alignItems: "center",
    },
    adjustButtonMicro: {
      backgroundColor: colors.slate[800],
      flex: 1,
      paddingVertical: 8,
      borderRadius: radii.sm,
      alignItems: "center",
    },
    adjustButtonText: {
      color: colors.slate[300],
      fontSize: 12,
      fontWeight: "700",
    },
    adjustButtonTextMicro: {
      color: colors.slate[300],
      fontSize: 11,
      fontWeight: "700",
    },
    flexRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 16,
    },
    verdictCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    verdictLabel: {
      color: colors.slate[400],
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    verdictDescText: {
      color: colors.slate[300],
      fontSize: 14,
      marginTop: 6,
      lineHeight: 18,
    },
    verdictValue: {
      color: "#34d399",
      fontSize: 22,
      fontWeight: "900",
    },
    chartArea: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-end",
      height: 144,
      paddingTop: 16,
      paddingHorizontal: 4,
    },
    chartBarGroup: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      width: 40,
      height: 96,
    },
    chartBarStd: {
      width: 12,
      backgroundColor: colors.slate[700],
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      marginRight: 2,
    },
    chartBarHypo: {
      width: 12,
      backgroundColor: "#10b981",
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
    },
    chartLabelText: {
      color: colors.slate[400],
      fontSize: 11,
      marginTop: 8,
      fontWeight: "600",
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 24,
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "rgba(30, 41, 59, 0.3)",
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    legendIndicator: {
      width: 10,
      height: 10,
      borderRadius: 2,
      marginRight: 8,
    },
    legendText: {
      color: colors.slate[400],
      fontSize: 11,
      fontWeight: "600",
    },
    wrapRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    planBadge: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    planBadgeActive: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderColor: colors.indigo[500],
    },
    planBadgeInactive: {
      backgroundColor: colors.slate[850],
      borderColor: colors.slate[800],
    },
    planBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    planBadgeTextActive: {
      color: colors.indigo[400],
    },
    planBadgeTextInactive: {
      color: colors.slate[400],
    },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    breakdownRowBordered: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "rgba(30, 41, 59, 0.3)",
      paddingTop: 10,
    },
    breakdownLabel: {
      color: colors.slate[400],
      fontSize: 14,
    },
    breakdownVal: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    raiseBadge: {
      backgroundColor: colors.slate[950],
      padding: spacing[4],
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    raiseBadgeTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    raiseBadgeDesc: {
      color: colors.slate[400],
      fontSize: 11,
      marginTop: 2,
    },
    raiseBadgeValue: {
      color: "#34d399",
      fontSize: 16,
      fontWeight: "900",
    },
    submitButton: {
      width: "100%",
      borderRadius: radii.md,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
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
    disclaimerBanner: {
      backgroundColor: `${colors.warning[500]}0d`,
      borderColor: colors.warning[600],
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[3],
      marginBottom: spacing[3],
      flexDirection: "row",
      alignItems: "center",
    },
    disclaimerTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.warning[500],
      marginBottom: 2,
    },
    disclaimerText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    generalDisclaimer: {
      flexDirection: "row",
      marginTop: spacing[4],
      padding: spacing[3],
      backgroundColor: colors.slate[900],
      borderColor: colors.slate[800],
      borderWidth: 1,
      borderRadius: radii.md,
    },
  });
