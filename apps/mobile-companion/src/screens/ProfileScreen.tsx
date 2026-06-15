import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COUNTRIES = [
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "NZ", name: "New Zealand", currency: "NZD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
] as const;

const CURRENCIES = [
  "GBP",
  "USD",
  "EUR",
  "AUD",
  "CAD",
  "NZD",
  "JPY",
  "INR",
  "ZAR",
  "SGD",
  "CHF",
] as const;

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

import { api } from "../api/client";
import { useTheme } from "../ThemeContext";
import { radii, spacing } from "../theme";

interface TaxBreakdown {
  gross: number;
  pension: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  ni: number;
  netAnnual: number;
  monthlyTakeHome: number;
}

// Re-implement the exact UK and Irish Tax math for profile auto-calculation
const calculateNetTakeHome = (
  gross: number,
  employmentType: "employed" | "self-employed" | "other" | null,
  pensionPercent = 5,
  isSalarySacrifice = true,
  country = "GB",
): TaxBreakdown => {
  const defaultResult = {
    gross: gross || 0,
    pension: 0,
    personalAllowance: 0,
    taxableIncome: 0,
    incomeTax: 0,
    ni: 0,
    netAnnual: gross || 0,
    monthlyTakeHome: gross ? Math.round(gross / 12) : 0,
  };

  if (!gross || gross <= 0) return defaultResult;

  if (country !== "GB" && country !== "IE") {
    return defaultResult;
  }

  if (employmentType !== "employed" && employmentType !== "self-employed") {
    return defaultResult;
  }

  if (country === "IE") {
    // Republic of Ireland 2026 calculations
    const standardBandSingle = 44000;
    const standardRate = 0.2;
    const higherRate = 0.4;
    const personalCredit = 2000;
    const employeeCredit = 2000; // employed gets employee credit; self-employed gets earned income credit (same amount: 2000)

    // 1. Income Tax
    const standardBandIncome = Math.min(gross, standardBandSingle);
    const higherBandIncome = Math.max(0, gross - standardBandSingle);
    const grossTax = standardBandIncome * standardRate + higherBandIncome * higherRate;
    const credits = personalCredit + employeeCredit;
    const incomeTax = Math.max(0, grossTax - credits);

    // 2. USC
    let usc = 0;
    if (gross > 13000) {
      const uscBand1 = Math.min(gross, 12012) * 0.005;
      const uscBand2 = Math.max(0, Math.min(gross, 28700) - 12012) * 0.02;
      const uscBand3 = Math.max(0, Math.min(gross, 70044) - 28700) * 0.03;
      const uscBand4 = Math.max(0, gross - 70044) * 0.08;
      usc = uscBand1 + uscBand2 + uscBand3 + uscBand4;
    }

    // 3. PRSI (Rate: 4.35% = 0.0435)
    let prsi = 0;
    if (employmentType === "employed") {
      if (gross > 18304) {
        prsi = gross * 0.0435;
      }
    } else if (employmentType === "self-employed") {
      if (gross > 5000) {
        prsi = Math.max(500, gross * 0.0435);
      }
    }

    const roundedIncomeTax = Math.round(incomeTax);
    const roundedNI = Math.round(usc + prsi);
    const netAnnual = Math.max(0, gross - roundedIncomeTax - roundedNI);
    const monthlyTakeHome = Math.round(netAnnual / 12);

    return {
      gross,
      pension: 0,
      personalAllowance: 0,
      taxableIncome: 0,
      incomeTax: roundedIncomeTax,
      ni: roundedNI,
      netAnnual,
      monthlyTakeHome,
    };
  }

  // 1. Pension
  const pension = Math.round(gross * (pensionPercent / 100));

  // Salary sacrifice reduces both tax and NI bases
  // Relief at source / standard reduces only tax base
  const adjustedGrossForTax = Math.max(0, gross - pension);
  const adjustedGrossForNI = isSalarySacrifice ? Math.max(0, gross - pension) : gross;

  // 2. Personal Allowance
  let personalAllowance = 12570;
  if (adjustedGrossForTax > 100000) {
    const reduction = (adjustedGrossForTax - 100000) / 2;
    personalAllowance = Math.max(0, 12570 - reduction);
  }

  // 3. Income Tax
  const taxableIncome = Math.max(0, adjustedGrossForTax - personalAllowance);
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

  // 4. National Insurance
  let ni = 0;
  if (employmentType === "employed") {
    // Class 1 NI (2026/2027)
    if (adjustedGrossForNI > 12570) {
      if (adjustedGrossForNI <= 50270) {
        ni = (adjustedGrossForNI - 12570) * 0.08;
      } else {
        ni = (50270 - 12570) * 0.08 + (adjustedGrossForNI - 50270) * 0.02;
      }
    }
  } else if (employmentType === "self-employed") {
    // Class 4 NI (pension does not reduce self-employed profit for NI)
    const adjustedGrossForSelfEmployedNI = gross;
    if (adjustedGrossForSelfEmployedNI > 12570) {
      if (adjustedGrossForSelfEmployedNI <= 50270) {
        ni = (adjustedGrossForSelfEmployedNI - 12570) * 0.06;
      } else {
        ni = (50270 - 12570) * 0.06 + (adjustedGrossForSelfEmployedNI - 50270) * 0.02;
      }
    }
  }

  const roundedPension = Math.round(pension);
  const roundedPersonalAllowance = Math.round(personalAllowance);
  const roundedTaxableIncome = Math.round(taxableIncome);
  const roundedIncomeTax = Math.round(incomeTax);
  const roundedNI = Math.round(ni);

  const netAnnual = Math.max(0, gross - roundedPension - roundedIncomeTax - roundedNI);
  const monthlyTakeHome = Math.round(netAnnual / 12);

  return {
    gross,
    pension: roundedPension,
    personalAllowance: roundedPersonalAllowance,
    taxableIncome: roundedTaxableIncome,
    incomeTax: roundedIncomeTax,
    ni: roundedNI,
    netAnnual,
    monthlyTakeHome,
  };
};

export default function ProfileScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("GB");
  const [currency, setCurrency] = useState("GBP");
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [annualSalary, setAnnualSalary] = useState("");
  const [monthlyTakeHome, setMonthlyTakeHome] = useState("");
  const [employmentType, setEmploymentType] = useState<
    "employed" | "self-employed" | "other" | null
  >(null);

  const [pensionPercent, setPensionPercent] = useState("5");
  const [isSalarySacrifice, setIsSalarySacrifice] = useState(true);

  const [warningDismissed, setWarningDismissed] = useState(false);

  const parsedSalary = annualSalary ? Number.parseFloat(annualSalary) : 0;
  const parsedTakeHome = monthlyTakeHome ? Number.parseFloat(monthlyTakeHome) : 0;

  const calculatedBreakdown =
    parsedSalary > 0
      ? calculateNetTakeHome(
          parsedSalary,
          employmentType,
          pensionPercent ? Number.parseFloat(pensionPercent) : 5,
          isSalarySacrifice,
          country,
        )
      : null;

  const calculatedTakeHome = calculatedBreakdown ? calculatedBreakdown.monthlyTakeHome : 0;

  const isTakeHomeOverridden =
    (country === "GB" || country === "IE") &&
    parsedSalary > 0 &&
    parsedTakeHome > 0 &&
    parsedTakeHome !== calculatedTakeHome;

  const handleAnnualSalaryChange = (val: string) => {
    setAnnualSalary(val);
    const gross = val ? Number.parseFloat(val) : 0;
    const pct = pensionPercent ? Number.parseFloat(pensionPercent) : 5;
    if (gross > 0) {
      const breakdown = calculateNetTakeHome(
        gross,
        employmentType,
        pct,
        isSalarySacrifice,
        country,
      );
      setMonthlyTakeHome(breakdown.monthlyTakeHome > 0 ? breakdown.monthlyTakeHome.toString() : "");
    } else {
      setMonthlyTakeHome("");
    }
  };

  const handleEmploymentTypeChange = (type: "employed" | "self-employed" | "other" | null) => {
    setEmploymentType(type);
    const gross = annualSalary ? Number.parseFloat(annualSalary) : 0;
    const pct = pensionPercent ? Number.parseFloat(pensionPercent) : 5;
    if (gross > 0) {
      const breakdown = calculateNetTakeHome(gross, type, pct, isSalarySacrifice, country);
      setMonthlyTakeHome(breakdown.monthlyTakeHome > 0 ? breakdown.monthlyTakeHome.toString() : "");
    }
  };

  const handlePensionPercentChange = (val: string) => {
    setPensionPercent(val);
    const pct = val ? Number.parseFloat(val) : 0;
    const gross = annualSalary ? Number.parseFloat(annualSalary) : 0;
    if (gross > 0) {
      const breakdown = calculateNetTakeHome(
        gross,
        employmentType,
        pct,
        isSalarySacrifice,
        country,
      );
      setMonthlyTakeHome(breakdown.monthlyTakeHome > 0 ? breakdown.monthlyTakeHome.toString() : "");
    }
  };

  const handleSalarySacrificeChange = (val: boolean) => {
    setIsSalarySacrifice(val);
    const pct = pensionPercent ? Number.parseFloat(pensionPercent) : 5;
    const gross = annualSalary ? Number.parseFloat(annualSalary) : 0;
    if (gross > 0) {
      const breakdown = calculateNetTakeHome(gross, employmentType, pct, val, country);
      setMonthlyTakeHome(breakdown.monthlyTakeHome > 0 ? breakdown.monthlyTakeHome.toString() : "");
    }
  };
  const [hasSecondIncome, setHasSecondIncome] = useState(false);
  const [secondIncomeMonthly, setSecondIncomeMonthly] = useState("");
  const [hasRentalIncome, setHasRentalIncome] = useState(false);
  const [rentalIncomeMonthly, setRentalIncomeMonthly] = useState("");
  const [hasMortgage, setHasMortgage] = useState(false);

  const fetchProfile = async () => {
    try {
      const profile = await api.getUserProfile();
      setDisplayName(profile.displayName || "");
      setCountry(profile.country || "GB");
      setCurrency(profile.currency || "GBP");
      setAnnualSalary(profile.annualSalary ? profile.annualSalary.toString() : "");
      setMonthlyTakeHome(profile.monthlyTakeHome ? profile.monthlyTakeHome.toString() : "");
      setEmploymentType(profile.employmentType);
      setPensionPercent(
        profile.pensionPercent !== undefined && profile.pensionPercent !== null
          ? profile.pensionPercent.toString()
          : "5",
      );
      setIsSalarySacrifice(
        profile.isSalarySacrifice !== undefined && profile.isSalarySacrifice !== null
          ? profile.isSalarySacrifice
          : true,
      );
      setHasSecondIncome(profile.hasSecondIncome);
      setSecondIncomeMonthly(
        profile.secondIncomeMonthly ? profile.secondIncomeMonthly.toString() : "",
      );
      setHasRentalIncome(profile.hasRentalIncome);
      setRentalIncomeMonthly(
        profile.rentalIncomeMonthly ? profile.rentalIncomeMonthly.toString() : "",
      );
      setHasMortgage(profile.hasMortgage);
    } catch (err) {
      console.warn("Failed to fetch user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        displayName: displayName || null,
        country,
        currency,
        annualSalary: annualSalary ? Number.parseFloat(annualSalary) : null,
        monthlyTakeHome: monthlyTakeHome ? Number.parseFloat(monthlyTakeHome) : null,
        employmentType,
        pensionPercent: pensionPercent ? Number.parseFloat(pensionPercent) : 5,
        isSalarySacrifice,
        hasSecondIncome,
        secondIncomeMonthly:
          hasSecondIncome && secondIncomeMonthly ? Number.parseFloat(secondIncomeMonthly) : null,
        hasRentalIncome,
        rentalIncomeMonthly:
          hasRentalIncome && rentalIncomeMonthly ? Number.parseFloat(rentalIncomeMonthly) : null,
        hasMortgage,
      };

      await api.updateUserProfile(updates);
      Alert.alert("Success", "Profile settings saved successfully!");
    } catch (err) {
      console.warn("Failed to update profile:", err);
      Alert.alert("Error", "Could not save profile details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.indigo[600]} />
        <Text style={styles.loadingText}>Loading profile details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.headerTitle}>Financial Profile</Text>
            <Text style={styles.headerSubtitle}>Manage high-level data used across tools</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
            <View style={styles.avatarContainer}>
              <FontAwesome name="user-circle" size={40} color={colors.indigo[500]} />
            </View>
          </View>
        </View>

        {/* Display Name, Country & Currency */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>General Info</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
          <View style={[styles.inputGroup, { marginTop: spacing[3] }]}>
            <Text style={styles.label}>Country</Text>
            <TouchableOpacity
              style={styles.inputPickerBtn}
              onPress={() => setIsCountryModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.inputPickerText}>
                {COUNTRIES.find((c) => c.code === country)?.name || country}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, { marginTop: spacing[3] }]}>
            <Text style={styles.label}>Currency</Text>
            <TouchableOpacity
              style={styles.inputPickerBtn}
              onPress={() => setIsCurrencyModalVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.inputPickerText}>{currency}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Income Settings */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Employment & Income</Text>

          <Text style={styles.label}>Employment Type</Text>
          <View style={styles.segmentedControl}>
            {(["employed", "self-employed", "other"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segmentButton,
                  employmentType === type && styles.segmentButtonActive,
                ]}
                onPress={() => handleEmploymentTypeChange(type)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[styles.segmentText, employmentType === type && styles.segmentTextActive]}
                >
                  {type === "employed"
                    ? "Employed"
                    : type === "self-employed"
                      ? "Self-Employed"
                      : "Other"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing[3] }]}>
              <Text style={styles.label}>Annual Gross Salary</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>{getCurrencySymbol(currency)}</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 24 }]}
                  keyboardType="numeric"
                  placeholder="45000"
                  placeholderTextColor={colors.textMuted}
                  value={annualSalary}
                  onChangeText={handleAnnualSalaryChange}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Monthly Net Take-Home</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>{getCurrencySymbol(currency)}</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 24 }]}
                  keyboardType="numeric"
                  placeholder="2800"
                  placeholderTextColor={colors.textMuted}
                  value={monthlyTakeHome}
                  onChangeText={(val) => {
                    setMonthlyTakeHome(val);
                    setWarningDismissed(false);
                  }}
                />
              </View>
            </View>
          </View>

          {country === "GB" &&
            (employmentType === "employed" || employmentType === "self-employed") && (
              <View
                style={{
                  marginTop: spacing[3],
                  borderTopWidth: 1,
                  borderColor: colors.borderLight,
                  paddingTop: spacing[3],
                }}
              >
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: spacing[3] }]}>
                    <Text style={styles.label}>Pension Contribution (%)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      value={pensionPercent}
                      onChangeText={handlePensionPercentChange}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Salary Sacrifice</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        height: 40,
                        marginTop: 4,
                      }}
                    >
                      <Switch
                        value={isSalarySacrifice}
                        onValueChange={handleSalarySacrificeChange}
                        trackColor={{ false: colors.slate[800], true: colors.indigo[600] }}
                        thumbColor={Platform.OS === "android" ? colors.slate[100] : undefined}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

          {isTakeHomeOverridden && calculatedTakeHome > 0 && (
            <View style={{ marginTop: spacing[2] }}>
              {warningDismissed ? (
                <TouchableOpacity
                  onPress={() => {
                    setMonthlyTakeHome(calculatedTakeHome.toString());
                    setWarningDismissed(false);
                  }}
                  style={styles.subtleResetButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.subtleResetText}>
                    Reset to auto-calculated ({getCurrencySymbol(currency)}
                    {calculatedTakeHome.toLocaleString()})
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownTitle}>⚠️ Auto-calculation Breakdown</Text>
                    <TouchableOpacity
                      onPress={() => setWarningDismissed(true)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>

                  {calculatedBreakdown && (
                    <View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Gross Annual Salary</Text>
                        <Text style={styles.breakdownValue}>
                          {getCurrencySymbol(currency)}
                          {calculatedBreakdown.gross.toLocaleString()}
                        </Text>
                      </View>
                      {calculatedBreakdown.pension > 0 && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Pension ({pensionPercent}%)</Text>
                          <Text style={[styles.breakdownValue, { color: "#ef4444" }]}>
                            -{getCurrencySymbol(currency)}
                            {calculatedBreakdown.pension.toLocaleString()}
                          </Text>
                        </View>
                      )}
                      {country === "GB" && (
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>Personal Allowance</Text>
                          <Text style={styles.breakdownValue}>
                            {getCurrencySymbol(currency)}
                            {calculatedBreakdown.personalAllowance.toLocaleString()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Income Tax</Text>
                        <Text style={[styles.breakdownValue, { color: "#ef4444" }]}>
                          -{getCurrencySymbol(currency)}
                          {calculatedBreakdown.incomeTax.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                          {country === "IE" ? "USC & PRSI" : "National Insurance"}
                        </Text>
                        <Text style={[styles.breakdownValue, { color: "#ef4444" }]}>
                          -{getCurrencySymbol(currency)}
                          {calculatedBreakdown.ni.toLocaleString()}
                        </Text>
                      </View>
                      <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                        <Text style={styles.breakdownTotalLabel}>Monthly Take-Home</Text>
                        <Text style={styles.breakdownTotalValue}>
                          {getCurrencySymbol(currency)}
                          {calculatedTakeHome.toLocaleString()}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          setMonthlyTakeHome(calculatedTakeHome.toString());
                          setWarningDismissed(false);
                        }}
                        style={styles.breakdownResetBtn}
                      >
                        <Text style={styles.breakdownResetBtnText}>Reset to Auto-calculated</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Secondary Incomes */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Secondary Sources</Text>

          {/* Second Job */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing[4] }}>
              <Text style={styles.toggleTitle}>Second Income</Text>
              <Text style={styles.toggleDesc}>Do you have a side hustle or second job?</Text>
            </View>
            <Switch
              value={hasSecondIncome}
              onValueChange={setHasSecondIncome}
              trackColor={{ false: colors.slate[800], true: colors.indigo[600] }}
              thumbColor={Platform.OS === "android" ? colors.slate[100] : undefined}
            />
          </View>

          {hasSecondIncome && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Second Income (Monthly Net)</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>{getCurrencySymbol(currency)}</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 24 }]}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={colors.textMuted}
                  value={secondIncomeMonthly}
                  onChangeText={setSecondIncomeMonthly}
                />
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Rental Income */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing[4] }}>
              <Text style={styles.toggleTitle}>Rental Income</Text>
              <Text style={styles.toggleDesc}>Do you receive money from rental properties?</Text>
            </View>
            <Switch
              value={hasRentalIncome}
              onValueChange={setHasRentalIncome}
              trackColor={{ false: colors.slate[800], true: colors.indigo[600] }}
              thumbColor={Platform.OS === "android" ? colors.slate[100] : undefined}
            />
          </View>

          {hasRentalIncome && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rental Income (Monthly Net)</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>{getCurrencySymbol(currency)}</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 24 }]}
                  keyboardType="numeric"
                  placeholder="800"
                  placeholderTextColor={colors.textMuted}
                  value={rentalIncomeMonthly}
                  onChangeText={setRentalIncomeMonthly}
                />
              </View>
            </View>
          )}
        </View>

        {/* Expenses / Liabilities */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Expenses & Liabilities</Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: spacing[4] }}>
              <Text style={styles.toggleTitle}>Mortgage Holder</Text>
              <Text style={styles.toggleDesc}>Do you have a mortgage on property?</Text>
            </View>
            <Switch
              value={hasMortgage}
              onValueChange={setHasMortgage}
              trackColor={{ false: colors.slate[800], true: colors.indigo[600] }}
              thumbColor={Platform.OS === "android" ? colors.slate[100] : undefined}
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Details</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Country Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={styles.modalItem}
                  onPress={() => {
                    setCountry(c.code);
                    setCurrency(c.currency);
                    setIsCountryModalVisible(false);
                    if (parsedSalary > 0) {
                      const pct = pensionPercent ? Number.parseFloat(pensionPercent) : 5;
                      const breakdown = calculateNetTakeHome(
                        parsedSalary,
                        employmentType,
                        pct,
                        isSalarySacrifice,
                        c.code,
                      );
                      setMonthlyTakeHome(
                        breakdown.monthlyTakeHome > 0 ? breakdown.monthlyTakeHome.toString() : "",
                      );
                    }
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{c.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 14 }}>{c.currency}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsCountryModalVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCurrencyModalVisible}
        onRequestClose={() => setIsCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.modalItem}
                  onPress={() => {
                    setCurrency(c);
                    setIsCurrencyModalVisible(false);
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold" }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsCurrencyModalVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing[4],
      paddingBottom: spacing[12],
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
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[6],
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "bold",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 2,
    },
    avatarContainer: {
      width: 48,
      height: 48,
      borderRadius: radii.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.slate[800],
    },
    themeToggle: {
      padding: 10,
      borderRadius: radii.full,
      backgroundColor: colors.slate[800],
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing[4],
      marginBottom: spacing[4],
    },
    cardHeader: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.indigo[400],
      marginBottom: spacing[4],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputGroup: {
      marginBottom: spacing[3],
    },
    inputRow: {
      flexDirection: "row",
      marginTop: spacing[2],
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.slate[800],
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[3],
      color: colors.text,
      fontSize: 15,
    },
    inputWrapper: {
      position: "relative",
    },
    currencyPrefix: {
      position: "absolute",
      left: spacing[3],
      top: 15,
      color: colors.textMuted,
      fontSize: 15,
      zIndex: 1,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: colors.slate[900],
      borderRadius: radii.md,
      padding: 3,
      marginBottom: spacing[4],
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderRadius: radii.sm,
    },
    segmentButtonActive: {
      backgroundColor: colors.indigo[600],
    },
    segmentText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "600",
    },
    segmentTextActive: {
      color: "#ffffff",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing[1],
    },
    toggleTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    toggleDesc: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: spacing[4],
    },
    saveButton: {
      backgroundColor: colors.indigo[600],
      borderRadius: radii.md,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing[4],
      shadowColor: colors.indigo[600],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
    overrideWarning: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing[3],
      backgroundColor: colors.slate[900],
      borderRadius: radii.sm,
      padding: spacing[2],
      borderWidth: 1,
      borderColor: colors.warning[600],
    },
    overrideWarningText: {
      fontSize: 13,
      color: colors.warning[500],
      fontWeight: "500",
      flex: 1,
      marginRight: spacing[2],
    },
    resetButton: {
      paddingHorizontal: spacing[2],
      paddingVertical: 4,
    },
    resetButtonText: {
      fontSize: 13,
      color: colors.indigo[400],
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    subtleResetButton: {
      paddingVertical: spacing[1],
      marginTop: spacing[2],
    },
    subtleResetText: {
      fontSize: 14,
      color: colors.indigo[400],
      textDecorationLine: "underline",
      fontWeight: "600",
    },
    breakdownCard: {
      backgroundColor: colors.slate[900],
      borderColor: colors.warning[600],
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[3],
      marginTop: spacing[2],
    },
    breakdownCardDismissed: {
      display: "none",
    },
    breakdownHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[2],
    },
    breakdownTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.warning[500],
    },
    dismissText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    breakdownLabel: {
      fontSize: 13,
      color: colors.textMuted,
    },
    breakdownValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "500",
    },
    breakdownTotalRow: {
      borderTopWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
      paddingTop: 6,
    },
    breakdownTotalLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    breakdownTotalValue: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.success[500],
    },
    breakdownResetBtn: {
      marginTop: spacing[3],
      backgroundColor: colors.indigo[600],
      paddingVertical: 12,
      borderRadius: radii.sm,
      alignItems: "center",
    },
    breakdownResetBtnText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    inputPickerBtn: {
      backgroundColor: colors.slate[800] || "rgba(255, 255, 255, 0.05)",
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing[3],
      paddingVertical: 12,
      justifyContent: "center",
    },
    inputPickerText: {
      color: colors.text,
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing[4],
    },
    modalContent: {
      backgroundColor: colors.slate[900] || "#1e293b",
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[4],
      width: "100%",
      maxHeight: 450,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing[3],
    },
    modalItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing[3],
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalCloseBtn: {
      marginTop: spacing[4],
      backgroundColor: colors.indigo[600],
      paddingVertical: 14,
      borderRadius: radii.sm,
      alignItems: "center",
    },
    modalCloseBtnText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
  });
