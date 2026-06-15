import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";

function getCurrencySymbol(curr: string): string {
  switch (curr) {
    case "USD":
    case "CAD":
    case "AUD":
    case "NZD":
    case "SGD":
      return "$";
    case "EUR":
      return "€";
    case "JPY":
      return "¥";
    case "INR":
      return "₹";
    case "ZAR":
      return "R";
    case "CHF":
      return "CHF";
    default:
      return "£";
  }
}

function LineSegment({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const xMid = (x1 + x2) / 2;
  const yMid = (y1 + y2) / 2;

  return (
    <View
      style={{
        position: "absolute",
        left: xMid - length / 2,
        top: yMid - 1,
        width: length,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

function formatYAxisVal(val: number, symbol: string = "£") {
  if (val === 0) return `${symbol}0`;
  if (val >= 1000000) {
    return `${symbol}${(val / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  return `${symbol}${Math.round(val / 1000)}k`;
}

export default function MortgageScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<"tracker" | "simulator" | "compare">("tracker");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api
      .getUserProfile()
      .then((p) => {
        setProfile(p);
      })
      .catch(console.warn);
  }, []);

  const symbol = getCurrencySymbol(profile?.currency || "GBP");

  // State values
  const [loanAmount, setLoanAmount] = useState<number>(150000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [remainingTerm, setRemainingTerm] = useState<number>(25);
  const [overpayment, setOverpayment] = useState<number>(200);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);

  // Compare states
  const [savingsRate, setSavingsRate] = useState<number>(4.8);
  const [taxBracket, setTaxBracket] = useState<"isa" | "basic" | "higher" | "additional">("isa");
  const [horizonYears, setHorizonYears] = useState<number>(10);

  // Adjust selectedYear if it exceeds remainingTerm
  const activeSelectedYear = useMemo(() => {
    if (selectedYear === null || selectedYear > remainingTerm) return null;
    return selectedYear;
  }, [selectedYear, remainingTerm]);

  // Amortization Calculations
  const calculations = useMemo(() => {
    if (loanAmount <= 0 || interestRate <= 0 || remainingTerm <= 0) {
      return {
        monthlyPayment: 0,
        totalPaid: 0,
        totalInterest: 0,
        standardBalances: [],
        overpayBalances: [],
        monthsSaved: 0,
        yearsSaved: 0,
        remMonthsSaved: 0,
        interestSaved: 0,
      };
    }

    const r = interestRate / 100;
    const i = r / 12;
    const totalMonths = remainingTerm * 12;

    const monthlyPayment = (loanAmount * i * (1 + i) ** totalMonths) / ((1 + i) ** totalMonths - 1);
    const totalPaid = monthlyPayment * totalMonths;
    const totalInterest = Math.max(0, totalPaid - loanAmount);

    // Standard plan schedule
    const standardBalances: number[] = [loanAmount];
    let standardBalance = loanAmount;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = standardBalance * i;
      const principal = Math.min(standardBalance, monthlyPayment - interest);
      standardBalance = Math.max(0, standardBalance - principal);
      standardBalances.push(standardBalance);
    }

    // Overpayment plan schedule
    const overpayBalances: number[] = [loanAmount];
    let overpayBalance = loanAmount;
    let overpayTotalInterest = 0;
    let overpayMonthsToZero = totalMonths;
    let finishedOverpay = false;

    for (let m = 1; m <= totalMonths; m++) {
      if (overpayBalance <= 0) {
        if (!finishedOverpay) {
          overpayMonthsToZero = m - 1;
          finishedOverpay = true;
        }
        overpayBalances.push(0);
        continue;
      }

      const interest = overpayBalance * i;
      const totalPayment = monthlyPayment + overpayment;
      const principal = Math.min(overpayBalance, totalPayment - interest);

      overpayBalance = Math.max(0, overpayBalance - principal);
      overpayTotalInterest += interest;
      overpayBalances.push(overpayBalance);
    }

    if (overpayBalance <= 0 && !finishedOverpay) {
      overpayMonthsToZero = totalMonths;
    }

    const monthsSaved = Math.max(0, totalMonths - overpayMonthsToZero);
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remMonthsSaved = monthsSaved % 12;
    const interestSaved = Math.max(0, totalInterest - overpayTotalInterest);

    return {
      monthlyPayment,
      totalPaid,
      totalInterest,
      standardBalances,
      overpayBalances,
      monthsSaved,
      yearsSaved,
      remMonthsSaved,
      interestSaved,
    };
  }, [loanAmount, interestRate, remainingTerm, overpayment]);

  // ISA Compare calculations
  const compareCalculations = useMemo(() => {
    const taxBrackets = {
      isa: 1.0,
      basic: 0.8,
      higher: 0.6,
      additional: 0.55,
    };
    const netSavingsRate = savingsRate * taxBrackets[taxBracket];
    const H = Math.min(horizonYears, remainingTerm);
    const totalMonths = H * 12;

    const im = interestRate / 100 / 12;
    const is = netSavingsRate / 100 / 12;

    // Amortize standard mortgage for H years
    let standardBalance = loanAmount;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = standardBalance * im;
      const principal = Math.min(standardBalance, calculations.monthlyPayment - interest);
      standardBalance = Math.max(0, standardBalance - principal);
    }

    // Amortize overpayment mortgage for H years
    let overpayBalance = loanAmount;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = overpayBalance * im;
      const principal = Math.min(
        overpayBalance,
        calculations.monthlyPayment + overpayment - interest,
      );
      overpayBalance = Math.max(0, overpayBalance - principal);
    }

    const debtReduction = Math.max(0, standardBalance - overpayBalance);

    // Savings Accumulation
    let savingsBalance = 0;
    for (let m = 1; m <= totalMonths; m++) {
      savingsBalance = savingsBalance * (1 + is) + overpayment;
    }

    const isOverpayBetter = debtReduction > savingsBalance;
    const diff = Math.abs(debtReduction - savingsBalance);

    return {
      netSavingsRate,
      debtReduction,
      savingsBalance,
      isOverpayBetter,
      diff,
      totalInvested: overpayment * totalMonths,
    };
  }, [
    loanAmount,
    interestRate,
    remainingTerm,
    overpayment,
    savingsRate,
    taxBracket,
    horizonYears,
    calculations.monthlyPayment,
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

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mortgage Tools</Text>
          <Text style={styles.headerSubtitle}>Simulate overpayments & strategies</Text>
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
        {(["tracker", "simulator", "compare"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab ? styles.tabActive : styles.tabInactive]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              {tab === "compare" ? "ISA Compare" : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Loan Controllers */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Mortgage Parameters</Text>

          {/* Loan Amount */}
          <View style={styles.controllerGroup}>
            <View style={styles.controllerHeader}>
              <Text style={styles.controllerLabel}>Mortgage Balance</Text>
              <Text style={styles.controllerVal}>{formatCurrency(loanAmount)}</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setLoanAmount(Math.max(10000, loanAmount - 10000))}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>-{symbol}10k</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLoanAmount(loanAmount + 10000)}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>+{symbol}10k</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interest Rate */}
          <View style={styles.controllerGroup}>
            <View style={styles.controllerHeader}>
              <Text style={styles.controllerLabel}>Interest Rate</Text>
              <Text style={styles.controllerVal}>{interestRate.toFixed(2)}%</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setInterestRate(Math.max(0.1, interestRate - 0.25))}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>-0.25%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setInterestRate(interestRate + 0.25)}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>+0.25%</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Remaining Term */}
          <View style={{ marginBottom: 8 }}>
            <View style={styles.controllerHeader}>
              <Text style={styles.controllerLabel}>Remaining Term</Text>
              <Text style={styles.controllerVal}>{remainingTerm} Years</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => setRemainingTerm(Math.max(1, remainingTerm - 1))}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>-1 Year</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRemainingTerm(remainingTerm + 1)}
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>+1 Year</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab 1: Tracker View */}
        {activeTab === "tracker" && (
          <View style={{ gap: 16 }}>
            <View style={styles.paymentHero}>
              <Text style={styles.paymentHeroLabel}>Scheduled Monthly Payment</Text>
              <Text style={styles.paymentHeroText}>
                {formatCurrency(calculations.monthlyPayment)}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Mortgage Cost Breakdown</Text>
              <View style={{ gap: 10 }}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Principal</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(loanAmount)}</Text>
                </View>
                <View style={styles.breakdownRowBordered}>
                  <Text style={styles.breakdownLabel}>Total Interest Paid</Text>
                  <Text style={[styles.breakdownVal, { color: "#f87171" }]}>
                    {formatCurrency(calculations.totalInterest)}
                  </Text>
                </View>
                <View style={styles.breakdownRowBordered}>
                  <Text style={styles.breakdownLabel}>Total Lifetime Cost</Text>
                  <Text style={[styles.breakdownVal, { fontWeight: "800", color: colors.text }]}>
                    {formatCurrency(calculations.totalPaid)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <FontAwesome
                name="info-circle"
                size={14}
                color="#818cf8"
                style={{ marginTop: 2, marginRight: 10 }}
              />
              <Text style={styles.infoBoxText}>
                Your monthly payment is calculated using a standard amortizing mortgage formula,
                assuming a fixed rate over the remaining term.
              </Text>
            </View>
          </View>
        )}

        {/* Tab 2: Simulator View */}
        {activeTab === "simulator" && (
          <View style={{ gap: 16 }}>
            {/* Overpayment Controller */}
            <View style={styles.card}>
              <View style={styles.controllerHeader}>
                <Text style={styles.controllerLabel}>Monthly Overpayment</Text>
                <Text style={[styles.controllerVal, { color: "#34d399" }]}>
                  {formatCurrency(overpayment)}/mo
                </Text>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => setOverpayment(Math.max(0, overpayment - 50))}
                  style={styles.adjustButton}
                >
                  <Text style={styles.adjustButtonText}>-{symbol}50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOverpayment(overpayment + 50)}
                  style={styles.adjustButton}
                >
                  <Text style={styles.adjustButtonText}>+{symbol}50</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Savings Cards */}
            <View style={styles.flexRow}>
              <View style={styles.savingCard}>
                <Text style={styles.savingCardLabel}>Interest Saved</Text>
                <Text style={styles.savingCardValAsset}>
                  {formatCurrency(calculations.interestSaved)}
                </Text>
              </View>

              <View style={styles.savingCard}>
                <Text style={styles.savingCardLabel}>Time Saved</Text>
                <Text style={styles.savingCardValTime}>
                  {calculations.yearsSaved > 0 ? `${calculations.yearsSaved} yr ` : ""}
                  {calculations.remMonthsSaved} mo
                </Text>
              </View>
            </View>

            {/* Custom Interactive Amortization Line Chart */}
            {calculations.standardBalances.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Amortization Comparison (5-Year Intervals)</Text>

                <View
                  style={styles.chartArea}
                  onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                >
                  {chartWidth > 0 &&
                    (() => {
                      const plotHeight = 100;
                      const paddingLeft = 48;
                      const paddingRight = 16;
                      const innerWidth = chartWidth - paddingLeft - paddingRight;
                      const years = [0, 5, 10, 15, 20, 25].filter((y) => y <= remainingTerm);
                      if (years.length <= 1) return null;

                      return (
                        <>
                          {/* Horizontal Grid Lines and Y-Axis Labels */}
                          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                            const y = 10 + plotHeight * pct;
                            const val = loanAmount * (1 - pct);
                            return (
                              <Fragment key={idx}>
                                {/* Y-Axis Label */}
                                <Text
                                  style={[
                                    styles.yAxisLabel,
                                    {
                                      position: "absolute",
                                      left: 0,
                                      width: paddingLeft - 8,
                                      top: y - 6,
                                      textAlign: "right",
                                    },
                                  ]}
                                >
                                  {formatYAxisVal(val, symbol)}
                                </Text>
                                {/* Grid Line */}
                                <View
                                  style={[
                                    styles.gridLine,
                                    {
                                      position: "absolute",
                                      left: paddingLeft,
                                      right: paddingRight,
                                      top: y,
                                    },
                                  ]}
                                />
                              </Fragment>
                            );
                          })}

                          {/* Line Segments */}
                          {years.slice(0, -1).map((year, i) => {
                            const x1 = paddingLeft + i * (innerWidth / (years.length - 1));
                            const x2 = paddingLeft + (i + 1) * (innerWidth / (years.length - 1));

                            const stdVal1 = calculations.standardBalances[year * 12] ?? 0;
                            const stdVal2 = calculations.standardBalances[years[i + 1] * 12] ?? 0;
                            const ovpVal1 = calculations.overpayBalances[year * 12] ?? 0;
                            const ovpVal2 = calculations.overpayBalances[years[i + 1] * 12] ?? 0;

                            const y1Std = 10 + plotHeight * (1 - stdVal1 / loanAmount);
                            const y2Std = 10 + plotHeight * (1 - stdVal2 / loanAmount);
                            const y1Ovp = 10 + plotHeight * (1 - ovpVal1 / loanAmount);
                            const y2Ovp = 10 + plotHeight * (1 - ovpVal2 / loanAmount);

                            return (
                              <Fragment key={year}>
                                {/* Standard Plan Line Segment */}
                                <LineSegment
                                  x1={x1}
                                  y1={y1Std}
                                  x2={x2}
                                  y2={y2Std}
                                  color={colors.slate[700]}
                                />
                                {/* Overpayment Plan Line Segment */}
                                <LineSegment
                                  x1={x1}
                                  y1={y1Ovp}
                                  x2={x2}
                                  y2={y2Ovp}
                                  color={colors.indigo[500]}
                                />
                              </Fragment>
                            );
                          })}

                          {/* Interactive Dot Markers & Labels */}
                          {years.map((year, i) => {
                            const x = paddingLeft + i * (innerWidth / (years.length - 1));
                            const stdVal = calculations.standardBalances[year * 12] ?? 0;
                            const ovpVal = calculations.overpayBalances[year * 12] ?? 0;

                            const yStd = 10 + plotHeight * (1 - stdVal / loanAmount);
                            const yOvp = 10 + plotHeight * (1 - ovpVal / loanAmount);

                            const isSelected = activeSelectedYear === year;

                            return (
                              <View
                                key={year}
                                style={{
                                  position: "absolute",
                                  left: x - 15,
                                  top: 0,
                                  bottom: 0,
                                  width: 30,
                                  alignItems: "center",
                                  zIndex: 10,
                                }}
                              >
                                {/* Selection Guideline */}
                                {isSelected && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      top: 10,
                                      bottom: 24,
                                      width: 1,
                                      borderStyle: "dashed",
                                      borderWidth: 0.5,
                                      borderColor: colors.indigo[500],
                                      opacity: 0.5,
                                    }}
                                  />
                                )}

                                {/* Standard Dot */}
                                <View
                                  style={[
                                    styles.chartDotStd,
                                    {
                                      top: yStd - 4,
                                      transform: [{ scale: isSelected ? 1.4 : 1 }],
                                      backgroundColor: isSelected
                                        ? colors.slate[400]
                                        : colors.slate[700],
                                    },
                                  ]}
                                />

                                {/* Overpayment Dot */}
                                <View
                                  style={[
                                    styles.chartDotOvp,
                                    {
                                      top: yOvp - 4,
                                      transform: [{ scale: isSelected ? 1.4 : 1 }],
                                      backgroundColor: isSelected
                                        ? colors.indigo[400]
                                        : colors.indigo[500],
                                      borderColor: isSelected ? colors.text : "transparent",
                                      borderWidth: isSelected ? 1 : 0,
                                    },
                                  ]}
                                />

                                {/* Label */}
                                <Text
                                  style={[
                                    styles.chartLabelText,
                                    {
                                      position: "absolute",
                                      bottom: 0,
                                      width: 40,
                                      textAlign: "center",
                                    },
                                    isSelected && {
                                      color: colors.indigo[400],
                                      fontWeight: "800",
                                    },
                                  ]}
                                >
                                  Yr {year}
                                </Text>

                                {/* Click target */}
                                <TouchableOpacity
                                  activeOpacity={0.6}
                                  onPress={() => setSelectedYear(year)}
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    bottom: 20,
                                    left: 0,
                                    right: 0,
                                  }}
                                />
                              </View>
                            );
                          })}
                        </>
                      );
                    })()}
                </View>

                {/* Selected Year Details Box */}
                {activeSelectedYear !== null && (
                  <View style={styles.chartDetailsBox}>
                    <View style={styles.chartDetailsRow}>
                      <Text style={styles.chartDetailsTitle}>
                        Year {activeSelectedYear} Projection
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedYear(null)}>
                        <Text style={styles.chartDetailsClose}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.chartDetailsGrid}>
                      <View>
                        <Text style={styles.chartDetailsLabel}>Standard Balance</Text>
                        <Text style={styles.chartDetailsValStd}>
                          {formatCurrency(
                            calculations.standardBalances[activeSelectedYear * 12] ?? 0,
                          )}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.chartDetailsLabel}>Overpayment Balance</Text>
                        <Text style={styles.chartDetailsValOvp}>
                          {formatCurrency(
                            calculations.overpayBalances[activeSelectedYear * 12] ?? 0,
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendIndicator, { backgroundColor: colors.slate[700] }]}
                    />
                    <Text style={styles.legendText}>Standard Plan</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendIndicator, { backgroundColor: colors.indigo[500] }]}
                    />
                    <Text style={styles.legendText}>With Overpayment</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tab 3: Compare View */}
        {activeTab === "compare" && (
          <View style={{ gap: 16 }}>
            {/* Control Inputs */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Comparison Variables</Text>

              {/* Savings Interest Rate */}
              <View style={styles.controllerGroup}>
                <View style={styles.controllerHeader}>
                  <Text style={styles.controllerLabel}>Savings Gross Rate</Text>
                  <Text style={styles.controllerVal}>{savingsRate.toFixed(2)}%</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setSavingsRate(Math.max(0.1, savingsRate - 0.25))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>-0.25%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSavingsRate(savingsRate + 0.25)}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>+0.25%</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tax Bracket Selection */}
              <View style={styles.controllerGroup}>
                <Text style={styles.controllerLabelSub}>Tax Status (on savings)</Text>
                <View style={styles.wrapRow}>
                  {[
                    { id: "isa", label: "ISA (0%)" },
                    { id: "basic", label: "Basic (20%)" },
                    { id: "higher", label: "Higher (40%)" },
                    { id: "additional", label: "Additional (45%)" },
                  ].map((bracket) => (
                    <TouchableOpacity
                      key={bracket.id}
                      onPress={() => setTaxBracket(bracket.id as any)}
                      style={[
                        styles.taxBadge,
                        taxBracket === bracket.id ? styles.taxBadgeActive : styles.taxBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.taxBadgeText,
                          taxBracket === bracket.id
                            ? styles.taxBadgeTextActive
                            : styles.taxBadgeTextInactive,
                        ]}
                      >
                        {bracket.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Timeline Horizon */}
              <View>
                <View style={styles.controllerHeader}>
                  <Text style={styles.controllerLabel}>Horizon Timeline</Text>
                  <Text style={styles.controllerVal}>{horizonYears} Years</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    onPress={() => setHorizonYears(Math.max(1, horizonYears - 1))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>-1 Year</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setHorizonYears(Math.min(remainingTerm, horizonYears + 1))}
                    style={styles.adjustButtonSmall}
                  >
                    <Text style={styles.adjustButtonText}>+1 Year</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Verdict Card */}
            <View
              style={[
                styles.verdictCard,
                compareCalculations.isOverpayBetter ? styles.verdictOverpay : styles.verdictSavings,
              ]}
            >
              <Text style={styles.verdictLabel}>Our Strategy Verdict</Text>
              <Text style={styles.verdictTitle}>
                {compareCalculations.isOverpayBetter
                  ? "Overpaying Mortgage is better"
                  : "Investing in Savings is better"}
              </Text>
              <Text style={styles.verdictDesc}>
                By choosing this option, you are projected to be{" "}
                <Text style={{ fontWeight: "800", color: colors.text }}>
                  {formatCurrency(compareCalculations.diff)}
                </Text>{" "}
                better off over a {horizonYears}-year period!
              </Text>
            </View>

            {/* Comparison Cards */}
            <View style={{ gap: 12 }}>
              {/* Overpayment value */}
              <View style={styles.compareItem}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.compareItemTitle}>Mortgage Overpayment Value</Text>
                  <Text style={styles.compareItemDesc}>
                    Guaranteed, tax-free return @ {interestRate.toFixed(2)}%
                  </Text>
                </View>
                <Text style={styles.compareItemValueAsset}>
                  {formatCurrency(compareCalculations.debtReduction)}
                </Text>
              </View>

              {/* Savings value */}
              <View style={styles.compareItem}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.compareItemTitle}>Savings/ISA Asset Value</Text>
                  <Text style={styles.compareItemDesc}>
                    Net compounded return @ {compareCalculations.netSavingsRate.toFixed(2)}%
                  </Text>
                </View>
                <Text style={styles.compareItemValueSavings}>
                  {formatCurrency(compareCalculations.savingsBalance)}
                </Text>
              </View>
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
    card: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.lg,
      marginBottom: 20,
    },
    cardLabel: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 16,
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
    buttonRow: {
      flexDirection: "row",
      gap: 8,
    },
    adjustButton: {
      backgroundColor: colors.slate[800],
      flex: 1,
      paddingVertical: 11,
      borderRadius: radii.md,
      alignItems: "center",
    },
    adjustButtonSmall: {
      backgroundColor: colors.slate[800],
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      alignItems: "center",
    },
    adjustButtonText: {
      color: colors.slate[300],
      fontSize: 13,
      fontWeight: "700",
    },
    paymentHero: {
      backgroundColor: "rgba(99, 102, 241, 0.05)",
      borderWidth: 1,
      borderColor: "rgba(99, 102, 241, 0.1)",
      padding: spacing[5],
      borderRadius: radii.lg,
      alignItems: "center",
    },
    paymentHeroLabel: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    paymentHeroText: {
      color: colors.indigo[400],
      fontSize: 32,
      fontWeight: "900",
      marginTop: 8,
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
    infoBox: {
      backgroundColor: "rgba(99, 102, 241, 0.05)",
      borderWidth: 1,
      borderColor: "rgba(99, 102, 241, 0.1)",
      padding: spacing[4],
      borderRadius: radii.md,
      flexDirection: "row",
      alignItems: "flex-start",
    },
    infoBoxText: {
      color: colors.indigo[300],
      fontSize: 12,
      lineHeight: 17,
      flex: 1,
    },
    flexRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 8,
    },
    savingCard: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.lg,
      flex: 1,
      alignItems: "center",
    },
    savingCardLabel: {
      color: colors.slate[400],
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    savingCardValAsset: {
      color: "#34d399",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4,
    },
    savingCardValTime: {
      color: colors.indigo[400],
      fontSize: 18,
      fontWeight: "900",
      marginTop: 4,
    },
    chartArea: {
      position: "relative",
      height: 160,
      marginTop: 8,
      marginBottom: 12,
    },
    gridLine: {
      height: 0.5,
      backgroundColor: "rgba(71, 85, 105, 0.2)",
    },
    yAxisLabel: {
      color: colors.slate[500],
      fontSize: 11,
      fontWeight: "600",
    },
    chartDotStd: {
      position: "absolute",
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.slate[700],
    },
    chartDotOvp: {
      position: "absolute",
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.indigo[500],
    },
    chartLabelText: {
      color: colors.slate[400],
      fontSize: 11,
      marginTop: 8,
      fontWeight: "600",
    },
    chartDetailsBox: {
      backgroundColor: colors.slate[850],
      borderWidth: 1,
      borderColor: "rgba(71, 85, 105, 0.2)",
      padding: spacing[3],
      borderRadius: radii.md,
      marginTop: 12,
      marginBottom: 12,
    },
    chartDetailsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    chartDetailsTitle: {
      color: colors.indigo[400],
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    chartDetailsClose: {
      color: colors.slate[400],
      fontSize: 12,
      fontWeight: "600",
    },
    chartDetailsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    chartDetailsLabel: {
      color: colors.slate[400],
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    chartDetailsValStd: {
      color: colors.slate[300],
      fontSize: 15,
      fontWeight: "700",
    },
    chartDetailsValOvp: {
      color: "#34d399",
      fontSize: 15,
      fontWeight: "800",
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
      width: 16,
      height: 3,
      borderRadius: 1.5,
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
    taxBadge: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    taxBadgeActive: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderColor: colors.indigo[500],
    },
    taxBadgeInactive: {
      backgroundColor: colors.slate[850],
      borderColor: colors.slate[800],
    },
    taxBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    taxBadgeTextActive: {
      color: colors.indigo[400],
    },
    taxBadgeTextInactive: {
      color: colors.slate[400],
    },
    verdictCard: {
      padding: spacing[5],
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: 16,
    },
    verdictOverpay: {
      backgroundColor: "rgba(16, 185, 129, 0.05)",
      borderColor: "rgba(16, 185, 129, 0.2)",
    },
    verdictSavings: {
      backgroundColor: "rgba(99, 102, 241, 0.05)",
      borderColor: "rgba(99, 102, 241, 0.2)",
    },
    verdictLabel: {
      color: colors.slate[400],
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.5,
    },
    verdictTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginTop: 8,
    },
    verdictDesc: {
      color: colors.slate[300],
      fontSize: 14,
      marginTop: 4,
      lineHeight: 20,
    },
    compareItem: {
      backgroundColor: colors.slate[900],
      borderWidth: 1,
      borderColor: "rgba(30, 41, 59, 0.5)",
      padding: spacing[4],
      borderRadius: radii.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    compareItemTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    compareItemDesc: {
      color: colors.slate[400],
      fontSize: 11,
      marginTop: 2,
    },
    compareItemValueAsset: {
      color: "#34d399",
      fontSize: 16,
      fontWeight: "900",
    },
    compareItemValueSavings: {
      color: colors.indigo[400],
      fontSize: 16,
      fontWeight: "900",
    },
  });
