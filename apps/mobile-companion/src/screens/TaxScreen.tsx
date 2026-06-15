import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  calculateUKTax,
  getTaxYearForDate,
  RENTAL_CATEGORIES,
  SELF_EMPLOYED_CATEGORIES,
  TAX_DISCLAIMER,
  type TaxCalculationResult,
  type TaxRecord,
  type UserProfile,
} from "@repo/common";
import { type FC, useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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

const TAX_YEARS = ["2020/21", "2021/22", "2022/23", "2023/24", "2024/25", "2025/26"];

const TaxScreen: FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Page state
  const [activeTab, setActiveTab] = useState<"summary" | "transactions">("summary");
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>("2024/25");

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payeSalary, setPayeSalary] = useState<number>(0);
  const [propertyOwnershipShare, setPropertyOwnershipShare] = useState<number>(100.0);
  const [isProfileSaving, setIsProfileSaving] = useState<boolean>(false);

  // Transactions list
  const [records, setRecords] = useState<TaxRecord[]>([]);

  // Detailed view filters
  const [filterTaxYear, setFilterTaxYear] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | "self-employed" | "rental">("all");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  // Add/Edit transaction modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);

  // Form inputs
  const [formName, setFormName] = useState<string>("");
  const [formSource, setFormSource] = useState<"self-employed" | "rental">("rental");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formFrequency, setFormFrequency] = useState<"one-off" | "monthly" | "annual">("one-off");
  const [formEndDate, setFormEndDate] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");

  // Categories based on formSource and formType
  const availableCategories = useMemo(() => {
    const cats = formSource === "rental" ? RENTAL_CATEGORIES : SELF_EMPLOYED_CATEGORIES;
    return cats.filter((c) => c.type === formType);
  }, [formSource, formType]);

  // Load screen data
  const loadData = async () => {
    try {
      const [recs, prof] = await Promise.all([api.getTaxRecords(), api.getUserProfile()]);
      setRecords(recs);
      setProfile(prof as any);
      setPayeSalary(prof.annualSalary ? Number(prof.annualSalary) : 0);
      setPropertyOwnershipShare(
        prof.propertyOwnershipShare ? Number(prof.propertyOwnershipShare) : 100.0,
      );
    } catch (err) {
      console.warn("Failed to load tax data", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  // Profile Save
  const handleSaveProfile = async () => {
    setIsProfileSaving(true);
    try {
      const updated = await api.updateUserProfile({
        annualSalary: payeSalary,
        propertyOwnershipShare: propertyOwnershipShare,
      });
      setProfile(updated as any);
      Alert.alert("Success", "Tax settings saved to your profile.");
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to update profile settings.");
    } finally {
      setIsProfileSaving(false);
    }
  };

  // Perform tax calculations for all relevant years
  const calculatedTaxYearsData = useMemo(() => {
    const results: Record<string, TaxCalculationResult> = {};
    for (const year of TAX_YEARS) {
      results[year] = calculateUKTax(year, records, payeSalary, propertyOwnershipShare);
    }
    return results;
  }, [records, payeSalary, propertyOwnershipShare]);

  const activeYearData = useMemo(() => {
    return calculatedTaxYearsData[selectedTaxYear] || calculatedTaxYearsData["2024/25"];
  }, [calculatedTaxYearsData, selectedTaxYear]);

  // Filtered transactions list
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filterTaxYear !== "all") {
        const year = getTaxYearForDate(record.date);
        if (year !== filterTaxYear) return false;
      }
      if (filterSource !== "all" && record.source !== filterSource) return false;
      if (filterType !== "all" && record.type !== filterType) return false;
      return true;
    });
  }, [records, filterTaxYear, filterSource, filterType]);

  // Open modal for adding
  const onOpenAddModal = () => {
    setEditingRecord(null);
    setFormName("");
    setFormSource("rental");
    setFormType("expense");
    setFormCategory(RENTAL_CATEGORIES[1].id); // Default to first expense
    setFormAmount("");
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormFrequency("one-off");
    setFormEndDate("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const onOpenEditModal = (record: TaxRecord) => {
    setEditingRecord(record);
    setFormName(record.name);
    setFormSource(record.source);
    setFormType(record.type);
    setFormCategory(record.category);
    setFormAmount(record.amount.toString());
    setFormDate(record.date);
    setFormFrequency(record.frequency);
    setFormEndDate(record.endDate || "");
    setFormNotes(record.notes || "");
    setIsModalOpen(true);
  };

  // Save Transaction
  const handleSaveTransaction = async () => {
    if (!formName.trim() || !formAmount || isNaN(Number(formAmount))) {
      Alert.alert("Invalid input", "Please enter a valid name and numeric amount.");
      return;
    }

    const payload = {
      name: formName,
      source: formSource,
      type: formType,
      category: formCategory,
      amount: Number(formAmount),
      date: formDate,
      frequency: formFrequency,
      endDate: formEndDate || null,
      notes: formNotes || null,
      receiptFilename: editingRecord?.receiptFilename || null,
      receiptMimeType: editingRecord?.receiptMimeType || null,
      receiptData: editingRecord?.receiptData || null,
    };

    try {
      if (editingRecord) {
        await api.updateTaxRecord(editingRecord.id, payload);
      } else {
        await api.createTaxRecord(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to save transaction.");
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this transaction record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteTaxRecord(id);
            loadData();
          } catch (err) {
            console.warn(err);
            Alert.alert("Error", "Failed to delete transaction.");
          }
        },
      },
    ]);
  };

  const getCategoryName = (catId: string, source: "self-employed" | "rental") => {
    const list = source === "rental" ? RENTAL_CATEGORIES : SELF_EMPLOYED_CATEGORIES;
    return list.find((c) => c.id === catId)?.name || catId;
  };

  const formatCurrency = (val: number) => {
    const currency = profile?.currency || "GBP";
    const getLocale = (curr: string) => {
      switch (curr) {
        case "USD":
          return "en-US";
        case "EUR":
          return "de-DE";
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

  const renderTransactionItem = ({ item }: { item: TaxRecord }) => {
    const isIncome = item.type === "income";
    const amountVal = typeof item.amount === "string" ? parseFloat(item.amount) : item.amount;
    return (
      <TouchableOpacity onPress={() => onOpenEditModal(item)} style={styles.transactionCard}>
        <View style={styles.transactionMain}>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionName}>{item.name}</Text>
            <Text style={styles.transactionMeta}>
              {item.source === "rental" ? "Rental" : "Self-Employed"} •{" "}
              {getCategoryName(item.category, item.source)}
            </Text>
            <Text style={styles.transactionDate}>
              {item.date} {item.frequency !== "one-off" ? `(${item.frequency})` : ""}
            </Text>
          </View>
          <View style={styles.transactionRight}>
            <Text
              style={[styles.transactionAmount, isIncome ? styles.textIncome : styles.textExpense]}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(amountVal)}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteTransaction(item.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome name="trash" size={16} color={colors.slate[400]} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Taxes & P&L Summary</Text>
        <Text style={styles.headerSubtitle}>UK Self Assessment Calculator</Text>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab("summary")}
          style={[styles.tabButton, activeTab === "summary" && styles.tabButtonActive]}
        >
          <Text
            style={[styles.tabButtonText, activeTab === "summary" && styles.tabButtonTextActive]}
          >
            Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("transactions")}
          style={[styles.tabButton, activeTab === "transactions" && styles.tabButtonActive]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "transactions" && styles.tabButtonTextActive,
            ]}
          >
            Transactions ({records.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "summary" ? (
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner}>
          {/* Tax Year Badges */}
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionTitle}>Select Tax Year</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
            {TAX_YEARS.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => setSelectedTaxYear(year)}
                style={[styles.yearBadge, selectedTaxYear === year && styles.yearBadgeActive]}
              >
                <Text
                  style={[
                    styles.yearBadgeText,
                    selectedTaxYear === year && styles.yearBadgeTextActive,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Profile Settings Input Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>PAYE Salary & Property Share</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupCol}>
                <Text style={styles.label}>Annual PAYE Salary</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={payeSalary.toString()}
                  onChangeText={(val) => setPayeSalary(val ? Number(val) : 0)}
                  placeholder="e.g. 45000"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.inputGroupCol}>
                <Text style={styles.label}>Property Share (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={propertyOwnershipShare.toString()}
                  onChangeText={(val) => setPropertyOwnershipShare(val ? Number(val) : 100)}
                  placeholder="100.0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={[styles.saveProfileBtn, isProfileSaving && styles.btnDisabled]}
              disabled={isProfileSaving}
            >
              <Text style={styles.saveProfileBtnText}>
                {isProfileSaving ? "Saving..." : "Save settings to profile"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Self-Employed P&L Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>Self-Employed P&L</Text>
              <Text style={styles.sourceTag}>Sole Trader</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Turnover (Gross Income)</Text>
              <Text style={[styles.rowVal, styles.textIncome]}>
                {formatCurrency(activeYearData.seIncomeGross)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Allowable Business Expenses</Text>
              <Text style={[styles.rowVal, styles.textExpense]}>
                -{formatCurrency(activeYearData.seExpenses)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rowHighlight}>
              <Text style={styles.rowHighlightLabel}>Net Trading Profit</Text>
              <Text style={styles.rowHighlightVal}>{formatCurrency(activeYearData.seProfit)}</Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabelSub}>Estimated Income Tax (20%/40%/45%)</Text>
              <Text style={styles.rowValSub}>{formatCurrency(activeYearData.seTaxDue)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabelSub}>Estimated Class 4 NI</Text>
              <Text style={styles.rowValSub}>{formatCurrency(activeYearData.seClass4NIDue)}</Text>
            </View>
          </View>

          {/* Rental P&L Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeader}>Rental Property P&L</Text>
              <Text style={styles.sourceTag}>{propertyOwnershipShare}% Share</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Gross Rental Income</Text>
              <Text style={[styles.rowVal, styles.textIncome]}>
                {formatCurrency(activeYearData.rentalIncomeGrossShare)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Expenses (excl. Interest)</Text>
              <Text style={[styles.rowVal, styles.textExpense]}>
                -{formatCurrency(activeYearData.rentalExpensesExclInterestShare)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Mortgage Interest (Residential)</Text>
              <Text style={[styles.rowVal, styles.textMuted]}>
                {formatCurrency(activeYearData.rentalMortgageInterestShare)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rowHighlight}>
              <Text style={styles.rowHighlightLabel}>Owned Net Profit (Post-Interest)</Text>
              <Text style={styles.rowHighlightVal}>
                {formatCurrency(activeYearData.rentalProfitPostInterestShare)}
              </Text>
            </View>
            <View style={styles.miniDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabelSub}>Tax due before credit</Text>
              <Text style={styles.rowValSub}>
                {formatCurrency(activeYearData.rentalPropertyTaxDueBeforeCredit)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabelSub}>Section 24 Tax Credit (20% cap)</Text>
              <Text style={[styles.rowValSub, { color: "#34d399" }]}>
                -{formatCurrency(activeYearData.rentalPropertyTaxCredit)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabelSub}>Net Rental Property Tax Due</Text>
              <Text style={styles.rowValSub}>
                {formatCurrency(activeYearData.rentalPropertyTaxDueAfterCredit)}
              </Text>
            </View>
          </View>

          {/* Combined Tax Statement Card */}
          <View style={[styles.card, styles.combinedCard]}>
            <Text style={styles.combinedCardHeader}>Combined Self Assessment Statement</Text>
            <View style={styles.row}>
              <Text style={styles.combinedRowLabel}>Total Gross Income (PAYE + SE + Rental)</Text>
              <Text style={styles.combinedRowVal}>
                {formatCurrency(activeYearData.totalGrossIncome)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.combinedRowLabel}>Personal Allowance (tapered if &gt;£100k)</Text>
              <Text style={styles.combinedRowVal}>
                {formatCurrency(activeYearData.personalAllowance)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.combinedRowLabel}>Total Taxable Income</Text>
              <Text style={styles.combinedRowVal}>
                {formatCurrency(activeYearData.totalTaxableIncome)}
              </Text>
            </View>
            <View style={styles.dividerDark} />
            <View style={styles.rowHighlight}>
              <Text style={styles.combinedRowHighlightLabel}>Total Estimated Tax & NI Due</Text>
              <Text style={styles.combinedRowHighlightVal}>
                {formatCurrency(activeYearData.totalTaxDue)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabelSub}>Minus PAYE Tax Paid on Salary</Text>
              <Text style={styles.rowValSub}>-{formatCurrency(activeYearData.payeTaxDue)}</Text>
            </View>
            <View style={styles.dividerDark} />
            <View style={styles.rowHighlightCombined}>
              <Text style={styles.combinedOutstandingLabel}>Outstanding Self Assessment Tax</Text>
              <Text style={styles.combinedOutstandingVal}>
                {formatCurrency(activeYearData.netAdditionalTaxToPay)}
              </Text>
            </View>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerBox}>
            <FontAwesome
              name="info-circle"
              size={16}
              color={colors.warning[500]}
              style={styles.infoIcon}
            />
            <Text style={styles.disclaimerText}>{TAX_DISCLAIMER.mobile}</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.transactionsContainer}>
          {/* Filters Row */}
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Source</Text>
              <View style={styles.filterBadges}>
                {(["all", "rental", "self-employed"] as const).map((src) => (
                  <TouchableOpacity
                    key={src}
                    onPress={() => setFilterSource(src)}
                    style={[styles.filterBadge, filterSource === src && styles.filterBadgeActive]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        filterSource === src && styles.filterBadgeTextActive,
                      ]}
                    >
                      {src === "all" ? "All" : src === "rental" ? "Rental" : "Self-Emp"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Type</Text>
              <View style={styles.filterBadges}>
                {(["all", "income", "expense"] as const).map((typ) => (
                  <TouchableOpacity
                    key={typ}
                    onPress={() => setFilterType(typ)}
                    style={[styles.filterBadge, filterType === typ && styles.filterBadgeActive]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        filterType === typ && styles.filterBadgeTextActive,
                      ]}
                    >
                      {typ === "all" ? "All" : typ === "income" ? "Income" : "Expense"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Transactions List */}
          <FlatList
            data={filteredRecords}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome name="list-alt" size={48} color={colors.slate[600]} />
                <Text style={styles.emptyText}>No tax records found matching filters.</Text>
              </View>
            }
          />

          {/* FAB Add Button */}
          <TouchableOpacity onPress={onOpenAddModal} style={styles.fabButton}>
            <FontAwesome name="plus" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingRecord ? "Edit Tax Record" : "Add Tax Record"}
            </Text>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name / Description</Text>
                <TextInput
                  style={styles.input}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Tenancy Rent, Laptop Purchase"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupCol}>
                  <Text style={styles.label}>Source</Text>
                  <View style={styles.rowPicker}>
                    {(["rental", "self-employed"] as const).map((src) => (
                      <TouchableOpacity
                        key={src}
                        onPress={() => {
                          setFormSource(src);
                          // Reset category to first item in source list
                          const list =
                            src === "rental" ? RENTAL_CATEGORIES : SELF_EMPLOYED_CATEGORIES;
                          const first = list.find((c) => c.type === formType) || list[0];
                          setFormCategory(first.id);
                        }}
                        style={[styles.pickerBtn, formSource === src && styles.pickerBtnActive]}
                      >
                        <Text
                          style={[
                            styles.pickerBtnText,
                            formSource === src && styles.pickerBtnTextActive,
                          ]}
                        >
                          {src === "rental" ? "Rental" : "Self-Emp"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroupCol}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.rowPicker}>
                    {(["income", "expense"] as const).map((typ) => (
                      <TouchableOpacity
                        key={typ}
                        onPress={() => {
                          setFormType(typ);
                          // Reset category to first item in list matching type
                          const list =
                            formSource === "rental" ? RENTAL_CATEGORIES : SELF_EMPLOYED_CATEGORIES;
                          const first = list.find((c) => c.type === typ) || list[0];
                          setFormCategory(first.id);
                        }}
                        style={[styles.pickerBtn, formType === typ && styles.pickerBtnActive]}
                      >
                        <Text
                          style={[
                            styles.pickerBtnText,
                            formType === typ && styles.pickerBtnTextActive,
                          ]}
                        >
                          {typ === "income" ? "Income" : "Expense"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.catScroll}
                >
                  {availableCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setFormCategory(cat.id)}
                      style={[styles.catBadge, formCategory === cat.id && styles.catBadgeActive]}
                    >
                      <Text
                        style={[
                          styles.catBadgeText,
                          formCategory === cat.id && styles.catBadgeTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroupCol}>
                  <Text style={styles.label}>Amount ({profile?.currency || "GBP"})</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formAmount}
                    onChangeText={setFormAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroupCol}>
                  <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.rowPicker}>
                  {(["one-off", "monthly", "annual"] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      onPress={() => setFormFrequency(freq)}
                      style={[styles.pickerBtn, formFrequency === freq && styles.pickerBtnActive]}
                    >
                      <Text
                        style={[
                          styles.pickerBtnText,
                          formFrequency === freq && styles.pickerBtnTextActive,
                        ]}
                      >
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formFrequency !== "one-off" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>End Date (Optional YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  value={formNotes}
                  onChangeText={setFormNotes}
                  placeholder="Additional details..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTransaction} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TaxScreen;

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.slate[950],
    },
    header: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      backgroundColor: colors.slate[900],
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.slate[400],
      marginTop: 2,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: colors.slate[900],
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing[2],
    },
    tabButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      borderBottomWidth: 2,
      borderColor: "transparent",
    },
    tabButtonActive: {
      borderColor: colors.indigo[500],
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.slate[400],
    },
    tabButtonTextActive: {
      color: colors.indigo[400],
      fontWeight: "700",
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentInner: {
      padding: spacing[4],
      paddingBottom: spacing[12],
    },
    sectionHeaderContainer: {
      marginBottom: spacing[2],
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.slate[300],
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    yearScroll: {
      flexDirection: "row",
      marginBottom: spacing[4],
    },
    yearBadge: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.full,
      backgroundColor: colors.slate[850],
      marginRight: spacing[2],
      borderWidth: 1,
      borderColor: colors.slate[800],
    },
    yearBadgeActive: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderColor: colors.indigo[500],
    },
    yearBadgeText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.slate[400],
    },
    yearBadgeTextActive: {
      color: colors.indigo[400],
      fontWeight: "700",
    },
    card: {
      backgroundColor: colors.slate[900],
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[4],
      marginBottom: spacing[4],
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing[3],
    },
    cardHeader: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: spacing[3],
    },
    sourceTag: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.indigo[400],
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: "rgba(99, 102, 241, 0.2)",
    },
    inputRow: {
      flexDirection: "row",
      gap: spacing[2],
    },
    inputGroupCol: {
      flex: 1,
      marginBottom: spacing[3],
    },
    inputGroup: {
      marginBottom: spacing[3],
      width: "100%",
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.slate[400],
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.slate[850],
      borderColor: colors.slate[800],
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: spacing[3],
      paddingVertical: 10,
      color: colors.text,
      fontSize: 15,
    },
    saveProfileBtn: {
      backgroundColor: colors.slate[800],
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: spacing[2],
    },
    saveProfileBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "700",
    },
    btnDisabled: {
      opacity: 0.6,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing[2],
    },
    rowLabel: {
      fontSize: 14,
      color: colors.slate[400],
    },
    rowVal: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    rowLabelSub: {
      fontSize: 13,
      color: colors.slate[400],
    },
    rowValSub: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.slate[800],
      marginVertical: spacing[2],
    },
    miniDivider: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.03)",
      marginVertical: spacing[2],
    },
    rowHighlight: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing[2],
    },
    rowHighlightLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    rowHighlightVal: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    combinedCard: {
      borderColor: colors.indigo[500],
      backgroundColor: "rgba(99, 102, 241, 0.03)",
    },
    combinedCardHeader: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.indigo[400],
      marginBottom: spacing[3],
    },
    combinedRowLabel: {
      fontSize: 14,
      color: colors.slate[300],
    },
    combinedRowVal: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    combinedRowHighlightLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.indigo[300],
    },
    combinedRowHighlightVal: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    combinedOutstandingLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    combinedOutstandingVal: {
      fontSize: 18,
      fontWeight: "900",
      color: colors.warning[500],
    },
    rowHighlightCombined: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing[3],
      marginTop: spacing[1],
    },
    dividerDark: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing[2],
    },
    disclaimerBox: {
      flexDirection: "row",
      padding: spacing[3],
      backgroundColor: colors.slate[900],
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      marginBottom: spacing[4],
    },
    infoIcon: {
      marginRight: spacing[2],
      marginTop: 2,
    },
    disclaimerText: {
      fontSize: 12,
      color: colors.slate[400],
      flex: 1,
      lineHeight: 16,
    },
    textIncome: {
      color: "#10b981",
    },
    textExpense: {
      color: "#ef4444",
    },
    textMuted: {
      color: colors.textMuted,
    },
    transactionsContainer: {
      flex: 1,
    },
    filterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: spacing[4],
      backgroundColor: colors.slate[900],
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: spacing[2],
    },
    filterGroup: {
      flex: 1,
    },
    filterLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.slate[400],
      marginBottom: 6,
      textTransform: "uppercase",
    },
    filterBadges: {
      flexDirection: "row",
      gap: 4,
    },
    filterBadge: {
      flex: 1,
      backgroundColor: colors.slate[850],
      borderColor: colors.slate[800],
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingVertical: 8,
      alignItems: "center",
    },
    filterBadgeActive: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderColor: colors.indigo[500],
    },
    filterBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.slate[400],
    },
    filterBadgeTextActive: {
      color: colors.indigo[400],
      fontWeight: "700",
    },
    listContent: {
      padding: spacing[4],
      paddingBottom: spacing[12] + 64,
    },
    transactionCard: {
      backgroundColor: colors.slate[900],
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[4],
      marginBottom: spacing[2],
    },
    transactionMain: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    transactionDetails: {
      flex: 1,
      paddingRight: spacing[2],
    },
    transactionName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    transactionMeta: {
      fontSize: 12,
      color: colors.slate[400],
      marginTop: 2,
    },
    transactionDate: {
      fontSize: 11,
      color: colors.slate[500],
      marginTop: 4,
    },
    transactionRight: {
      alignItems: "flex-end",
      gap: spacing[2],
    },
    transactionAmount: {
      fontSize: 15,
      fontWeight: "800",
    },
    deleteBtn: {
      padding: 6,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing[10],
    },
    emptyText: {
      fontSize: 14,
      color: colors.slate[500],
      marginTop: spacing[3],
      textAlign: "center",
    },
    fabButton: {
      position: "absolute",
      right: 24,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.indigo[600],
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing[4],
    },
    modalContent: {
      backgroundColor: colors.slate[900],
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing[4],
      width: "100%",
      maxHeight: "85%",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: spacing[4],
      textAlign: "center",
    },
    modalScroll: {
      flexGrow: 0,
      marginBottom: spacing[4],
    },
    rowPicker: {
      flexDirection: "row",
      backgroundColor: colors.slate[850],
      borderRadius: radii.sm,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.slate[800],
    },
    pickerBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: radii.sm - 2,
    },
    pickerBtnActive: {
      backgroundColor: colors.indigo[600],
    },
    pickerBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.slate[400],
    },
    pickerBtnTextActive: {
      color: "#ffffff",
      fontWeight: "700",
    },
    catScroll: {
      flexDirection: "row",
      paddingVertical: 2,
    },
    catBadge: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.full,
      backgroundColor: colors.slate[850],
      borderColor: colors.slate[800],
      borderWidth: 1,
      marginRight: 6,
    },
    catBadgeActive: {
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      borderColor: colors.indigo[500],
    },
    catBadgeText: {
      fontSize: 12,
      color: colors.slate[400],
    },
    catBadgeTextActive: {
      color: colors.indigo[400],
      fontWeight: "600",
    },
    textArea: {
      height: 80,
      textAlignVertical: "top",
    },
    modalButtons: {
      flexDirection: "row",
      gap: spacing[2],
      marginTop: spacing[2],
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: colors.slate[850],
      borderWidth: 1,
      borderColor: colors.slate[800],
      borderRadius: radii.sm,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelBtnText: {
      color: colors.slate[400],
      fontSize: 14,
      fontWeight: "700",
    },
    saveBtn: {
      flex: 2,
      backgroundColor: colors.indigo[600],
      borderRadius: radii.sm,
      paddingVertical: 14,
      alignItems: "center",
    },
    saveBtnText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
