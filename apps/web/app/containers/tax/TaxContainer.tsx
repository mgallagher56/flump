import {
  calculateUKTax,
  getCategoriesForSource,
  getCurrentUKTaxYear,
  getPreviousTaxYear,
  getTaxYearForRecordDate,
  isRecordActiveInTaxYear,
  isSupportedUkTaxYear,
  type TaxCalculationResult,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import { ProjectionNotice } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaBriefcase,
  FaCalculator,
  FaCamera,
  FaCopy,
  FaEdit,
  FaFileAlt,
  FaFileImage,
  FaFilePdf,
  FaHome,
  FaInfoCircle,
  FaLaptopCode,
  FaList,
  FaPercent,
  FaPiggyBank,
  FaPlus,
  FaSave,
  FaTrash,
  FaUpload,
} from "react-icons/fa";
import { useFetcher, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPModal from "~/components/core/dialogs/FLPModal";
import TaxDisclaimerButton from "~/components/core/dialogs/TaxDisclaimerButton";
import FLPInput from "~/components/core/inputs/input/FLPInput";
import FLPSelect from "~/components/core/inputs/select/FLPSelect";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import CopyTaxYearModal from "~/components/tax/CopyTaxYearModal";
import PaymentsOnAccountCard from "~/components/tax/PaymentsOnAccountCard";
import TaxIncomeSectionCard from "~/components/tax/TaxIncomeSectionCard";
import TaxTrapAlertBanner from "~/components/tax/TaxTrapAlertBanner";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { NotSet } from "~/features/feedback/components/NotSet";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.tax";
import { useFinancialBaseline } from "~/state/baseline.store";
import { getKnownTrapRegion } from "~/utils/taxTrapCopy";

const numeric = css({ fontVariantNumeric: "tabular-nums" });

/** Unknown PAYE salary renders "Not set", never £0. */
const formatPaye = (value: number | undefined, format: (n: number) => string): ReactNode =>
  value && value > 0 ? format(value) : <NotSet href="/app/profile" subject="salary" />;

const TaxContainer: FC = () => {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const {
    records: initialRecords = [],
    userProfile,
    accounts = [],
  } = useLoaderData<typeof loader>();

  // Current UK Tax Year
  const currentTaxYear = getCurrentUKTaxYear();

  // Page state
  const [activeTab, setActiveTab] = useState<
    "streams" | "trap-reserve" | "multi-year" | "detailed" | "summary"
  >("streams");
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>(() => getCurrentUKTaxYear());

  const { baseline } = useFinancialBaseline();

  // User input overrides for salary & property ownership share (synced with profile)
  const profileSalary =
    baseline.annualGrossSalary > 0
      ? baseline.annualGrossSalary
      : userProfile?.annualSalary
        ? typeof userProfile.annualSalary === "string"
          ? Number.parseFloat(userProfile.annualSalary)
          : userProfile.annualSalary
        : 0;

  const profileShare =
    baseline.propertyOwnershipSharePct !== undefined
      ? baseline.propertyOwnershipSharePct
      : userProfile?.propertyOwnershipShare
        ? typeof userProfile.propertyOwnershipShare === "string"
          ? Number.parseFloat(userProfile.propertyOwnershipShare)
          : userProfile.propertyOwnershipShare
        : 100.0;

  const [payeSalary, setPayeSalary] = useState<number>(profileSalary);
  const [propertyOwnershipShare, setPropertyOwnershipShare] = useState<number>(profileShare);
  const [isProfileSaving, setIsProfileSaving] = useState<boolean>(false);

  // Available Tax Years: current tax year only by default, plus any years with records
  const availableYears = useMemo(() => {
    const fromRecords = initialRecords.map((r) => getTaxYearForRecordDate(r.date));
    // Only years the engine can compute are selectable. A record in an unsupported year stays
    // in the records list but never borrows another year's numbers (E22).
    const set = new Set<string>([currentTaxYear, ...fromRecords].filter(isSupportedUkTaxYear));
    return Array.from(set).sort();
  }, [currentTaxYear, initialRecords]);

  // Keep selectedTaxYear in sync if availableYears changes
  useEffect(() => {
    if (!availableYears.includes(selectedTaxYear)) {
      setSelectedTaxYear(
        availableYears.includes(currentTaxYear)
          ? currentTaxYear
          : availableYears[availableYears.length - 1],
      );
    }
  }, [availableYears, selectedTaxYear, currentTaxYear]);

  // Copy Tax Year modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copyModalScope, setCopyModalScope] = useState<TaxSource | "all">("all");

  // Filters for detailed view
  const [filterTaxYear, setFilterTaxYear] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | TaxSource>("all");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  // Add/Edit transaction modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [taxYearToDelete, setTaxYearToDelete] = useState<string | null>(null);
  const deleteTransactionOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTransactionToDelete(null),
  });
  const deleteTaxYearOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTaxYearToDelete(null),
  });
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);

  // Form inputs
  const [formName, setFormName] = useState<string>("");
  const [formSource, setFormSource] = useState<TaxSource>("rental");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formFrequency, setFormFrequency] = useState<"one-off" | "monthly" | "annual">("one-off");
  const [formEndDate, setFormEndDate] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");

  // Receipt upload base64 states
  const [receiptFilename, setReceiptFilename] = useState<string | null>(null);
  const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<string | null>(null);

  // View receipt modal state
  const [activeReceiptRecord, setActiveReceiptRecord] = useState<TaxRecord | null>(null);

  // Auto-fill category when source or type changes
  const availableCategories = useMemo(() => {
    return getCategoriesForSource(formSource, formType);
  }, [formSource, formType]);

  const onOpenAddModal = (
    defaultSource: TaxSource = "rental",
    defaultType: "income" | "expense" = "expense",
  ) => {
    setEditingRecord(null);
    setFormName("");
    setFormSource(defaultSource);
    setFormType(defaultType);
    const cats = getCategoriesForSource(defaultSource, defaultType);
    setFormCategory(cats[0]?.id || "");
    setFormAmount("");

    // Set date to 6 April (tax year start) of selectedTaxYear
    const startYr = selectedTaxYear.split("/")[0] || new Date().getFullYear().toString();
    setFormDate(`${startYr}-04-06`);

    setFormFrequency("monthly");
    setFormEndDate("");
    setFormNotes("");
    setReceiptFilename(null);
    setReceiptMimeType(null);
    setReceiptData(null);
    setIsModalOpen(true);
  };

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
    setReceiptFilename(record.receiptFilename);
    setReceiptMimeType(record.receiptMimeType);
    setReceiptData(record.receiptData);
    setIsModalOpen(true);
  };

  const handleOpenCopyModal = (scope: TaxSource | "all" = "all") => {
    setCopyModalScope(scope);
    setIsCopyModalOpen(true);
  };

  // Quick Add handler from collapsible cards
  const handleQuickAdd = (record: {
    name: string;
    source: TaxSource;
    type: "income" | "expense";
    category: string;
    amount: number;
    frequency: "one-off" | "monthly" | "annual";
    date: string;
  }) => {
    fetcher.submit(
      {
        intent: "create-transaction",
        name: record.name,
        source: record.source,
        type: record.type,
        category: record.category,
        amount: record.amount.toString(),
        date: record.date,
        frequency: record.frequency,
      },
      { method: "POST" },
    );
  };

  // Handle image/file selection & convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFilename(file.name);
    setReceiptMimeType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearReceipt = () => {
    setReceiptFilename(null);
    setReceiptMimeType(null);
    setReceiptData(null);
  };

  // Perform UK tax calculations for all available tax years
  const calculatedTaxYearsData = useMemo(() => {
    const results: Record<string, TaxCalculationResult> = {};
    for (const year of availableYears) {
      // Unsupported years (before 2020/21 or beyond the latest supported year) are not
      // computed: calculateUKTax is strict and would throw (E22).
      if (!isSupportedUkTaxYear(year)) continue;
      results[year] = calculateUKTax(year, initialRecords, payeSalary, propertyOwnershipShare);
    }
    return results;
  }, [availableYears, initialRecords, payeSalary, propertyOwnershipShare]);

  const activeYearData = useMemo(() => {
    return (
      calculatedTaxYearsData[selectedTaxYear] ||
      calculatedTaxYearsData[currentTaxYear] ||
      Object.values(calculatedTaxYearsData)[0]
    );
  }, [calculatedTaxYearsData, selectedTaxYear, currentTaxYear]);

  // Filtered detailed transaction records (uses isRecordActiveInTaxYear)
  const filteredRecords = useMemo(() => {
    return initialRecords.filter((record) => {
      if (filterTaxYear !== "all") {
        if (!isRecordActiveInTaxYear(record, filterTaxYear)) return false;
      }
      if (filterSource !== "all" && record.source !== filterSource) return false;
      if (filterType !== "all" && record.type !== filterType) return false;
      return true;
    });
  }, [initialRecords, filterTaxYear, filterSource, filterType]);

  // Submit profile changes
  const handleSaveProfile = useCallback(() => {
    setIsProfileSaving(true);
    fetcher.submit(
      {
        intent: "update-profile",
        annualSalary: payeSalary.toString(),
        propertyOwnershipShare: propertyOwnershipShare.toString(),
      },
      { method: "POST" },
    );
    setTimeout(() => setIsProfileSaving(false), 800);
  }, [payeSalary, propertyOwnershipShare, fetcher]);

  // Submit transaction CRUD
  const handleSaveTransaction = () => {
    const payload = {
      intent: editingRecord ? "update-transaction" : "create-transaction",
      id: editingRecord?.id || "",
      name: formName,
      source: formSource,
      type: formType,
      category: formCategory,
      amount: formAmount,
      date: formDate,
      frequency: formFrequency,
      endDate: formEndDate || undefined,
      notes: formNotes || undefined,
      receiptFilename: receiptFilename || undefined,
      receiptMimeType: receiptMimeType || undefined,
      receiptData: receiptData || undefined,
    } as any;

    fetcher.submit(payload, { method: "POST" });
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTransactionToDelete(id);
  };

  const confirmDeleteTransaction = () => {
    if (!transactionToDelete) {
      setTransactionToDelete(null);
      return;
    }
    deleteTransactionOutcome.begin();
    fetcher.submit({ intent: "delete-transaction", id: transactionToDelete }, { method: "POST" });
  };

  const recordsInSelectedTaxYear = useMemo(() => {
    return initialRecords.filter((r) => getTaxYearForRecordDate(r.date) === selectedTaxYear);
  }, [initialRecords, selectedTaxYear]);

  const handleDeleteTaxYear = (yearToDelete: string) => {
    // The Delete year control only renders when the year has records.
    if (recordsInSelectedTaxYear.length === 0) return;
    setTaxYearToDelete(yearToDelete);
  };

  const confirmDeleteTaxYear = () => {
    const recordIds = taxYearToDelete
      ? initialRecords
          .filter((r) => getTaxYearForRecordDate(r.date) === taxYearToDelete)
          .map((r) => r.id)
      : [];
    if (recordIds.length === 0) {
      setTaxYearToDelete(null);
      return;
    }
    deleteTaxYearOutcome.begin();
    fetcher.submit(
      {
        intent: "delete-tax-year",
        recordIds: JSON.stringify(recordIds),
      },
      { method: "POST" },
    );
  };

  const { formatCurrencyDecimal } = useFormatCurrency();
  const formatCurrency = formatCurrencyDecimal;

  const getCategoryName = (catId: string, source: TaxSource) => {
    const list = getCategoriesForSource(source);
    return list.find((c) => c.id === catId)?.name || catId;
  };

  const previousTaxYear = getPreviousTaxYear(selectedTaxYear);

  // Styles
  const tabStyle = (active: boolean) =>
    css({
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 18px",
      minHeight: "38px",
      borderRadius: "lg",
      fontSize: "sm",
      fontWeight: active ? "semibold" : "medium",
      cursor: "pointer",
      backgroundColor: active ? "surface" : "transparent",
      color: active ? "text.primary" : "text.muted",
      boxShadow: active ? "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)" : "none",
      border: "1px solid",
      borderColor: active ? "border.subtle" : "transparent",
      transition: "all 0.15s ease",
      whiteSpace: "nowrap",
      _hover: active ? {} : { color: "text.primary" },
    });

  const cardsGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
    gap: "16px",
    marginBottom: "24px",
    width: "100%",
    maxWidth: "100%",
  });

  const layoutGrid = css({
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "3.2fr 1.3fr" },
    gap: { base: "18px", md: "28px" },
    alignItems: "start",
    width: "100%",
    maxWidth: "100%",
  });

  const tableContainer = css({
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    maxHeight: "480px",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    marginBottom: "24px",
    boxSizing: "border-box",
  });

  const tableStyle = css({
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "sm",
  });

  const thStyle = css({
    padding: "10px 14px",
    fontWeight: "bold",
    color: "text.primary",
    backgroundColor: "rgba(0,0,0,0.02)",
    borderBottom: "1px solid",
    borderColor: "border",
    fontVariantNumeric: "tabular-nums",
  });

  const tdStyle = css({
    padding: "10px 14px",
    borderBottom: "1px solid",
    borderColor: "border",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  });

  const trStyle = css({
    transition: "background 0.2s",
    "&:hover": {
      backgroundColor: "rgba(0,0,0,0.01)",
    },
  });

  const filterBar = css({
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
    alignItems: "center",
  });

  const inputGroupStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
    minWidth: { base: "100%", sm: "140px" },
  });

  const editableFormPanel = css({
    padding: { base: "16px", md: "20px" },
    borderRadius: "md",
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "24px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  });

  return (
    <div
      className={css({
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        paddingBottom: { base: "24px", md: "48px" },
      })}
    >
      {/* Page Header */}
      <ProjectionNotice className={css({ marginBottom: "16px" })} />
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "16px",
          marginBottom: "8px",
          flexWrap: "wrap",
          gap: "16px",
        })}
      >
        <div>
          <FLPHeading as="h1" color="text.primary" size="2xl">
            Income & Self Assessment Tax Planner
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Track PAYE salary, freelance profits, rental property P&L, and savings interest across
            UK fiscal years.
          </FLPText>
        </div>

        {/* Action Buttons: Disclaimer & Add Record */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <TaxDisclaimerButton showShortText />
          <FLPButton onClick={() => onOpenAddModal("rental", "income")}>
            <FaPlus size={12} style={{ marginRight: "6px" }} /> Add Record
          </FLPButton>
        </div>
      </div>

      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: { base: "8px 12px", md: "10px 16px" },
          backgroundColor: "surface",
          border: "1px solid",
          borderColor: "border.subtle",
          borderRadius: "xl",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        })}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            maxWidth: "100%",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--colors-text-muted)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            Fiscal Year:
          </span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxWidth: "100%" }}>
            {availableYears.map((yr) => {
              const isSelected = yr === selectedTaxYear;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedTaxYear(yr)}
                  className={css({
                    padding: "4px 12px",
                    borderRadius: "full",
                    fontSize: "xs",
                    fontWeight: isSelected ? 700 : 500,
                    border: "1px solid",
                    borderColor: isSelected ? "primary" : "border",
                    backgroundColor: isSelected ? "primary.solid" : "surface",
                    color: isSelected ? "primary.foreground" : "text.muted",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: "primary",
                      color: isSelected ? "primary.foreground" : "text.primary",
                    },
                  })}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <FLPButton size="sm" variant="outline" onClick={() => handleOpenCopyModal("all")}>
            <FaCopy size={11} style={{ marginRight: "6px" }} /> Copy from {previousTaxYear}
          </FLPButton>
          {recordsInSelectedTaxYear.length > 0 && (
            <FLPButton
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteTaxYear(selectedTaxYear)}
              title={`Delete all records for tax year ${selectedTaxYear}`}
            >
              <FaTrash
                size={11}
                style={{ marginRight: "6px", color: "var(--colors-destructive)" }}
              />
              Delete {selectedTaxYear}
            </FLPButton>
          )}
        </div>
      </div>

      {/* Top 4-KPI Row (Single sleek row on desktop) */}
      <div className={cardsGrid}>
        <FLPCard
          className={css({
            padding: "16px",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
            backgroundColor: "surface",
          })}
        >
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Estimated Self Assessment due ({selectedTaxYear})
          </FLPText>
          <FLPHeading as="h2" color="blue.500" mt={2} size="xl" className="tabular-nums">
            {formatCurrency(activeYearData.netAdditionalTaxToPay)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" className={css({ marginTop: "4px" })}>
            Additional tax & Class 4 NI on top of PAYE deductions.
          </FLPText>
        </FLPCard>

        <FLPCard
          className={css({
            padding: "16px",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
            backgroundColor: "surface",
          })}
        >
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Total Gross Income ({selectedTaxYear})
          </FLPText>
          <FLPHeading as="h2" color="success.500" mt={2} size="xl" className="tabular-nums">
            {formatCurrency(activeYearData.totalGrossIncome)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" className={css({ marginTop: "4px" })}>
            PAYE ({formatPaye(activeYearData.effectivePayeSalary, formatCurrency)}) + Business +
            Rental + Savings.
          </FLPText>
        </FLPCard>

        <FLPCard
          className={css({
            padding: "16px",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
            backgroundColor: "surface",
          })}
        >
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Rental Profit Share ({selectedTaxYear})
          </FLPText>
          <FLPHeading as="h2" color="warning.500" mt={2} size="xl" className="tabular-nums">
            {formatCurrency(activeYearData.rentalProfitPostInterestShare)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" className={css({ marginTop: "4px" })}>
            {propertyOwnershipShare}% share of total property profit{" "}
            {formatCurrency(activeYearData.rentalProfitPostInterest)}.
          </FLPText>
        </FLPCard>

        <FLPCard
          className={css({
            padding: "16px",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
            backgroundColor: "surface",
          })}
        >
          <FLPText color="text.muted" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
            Self-Employed Profit ({selectedTaxYear})
          </FLPText>
          <FLPHeading as="h2" color="purple.500" mt={2} size="xl" className="tabular-nums">
            {formatCurrency(activeYearData.seProfit)}
          </FLPHeading>
          <FLPText color="text.muted" fontSize="xs" className={css({ marginTop: "4px" })}>
            Turnover {formatCurrency(activeYearData.seIncomeGross)} less allowable costs.
          </FLPText>
        </FLPCard>
      </div>

      {/* 3 Segmented Tabs */}
      <div
        className={css({
          display: "flex",
          backgroundColor: "surface.sunken",
          border: "1px solid",
          borderColor: "border.subtle",
          padding: "4px",
          borderRadius: "lg",
          gap: "4px",
          marginBottom: "24px",
          overflowX: "auto",
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
        })}
      >
        <button
          className={tabStyle(activeTab === "streams" || activeTab === "summary")}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          type="button"
          onClick={() => setActiveTab("streams")}
        >
          <FaBriefcase size={13} style={{ marginRight: "6px" }} /> Income & Expense Streams
        </button>
        <button
          className={tabStyle(activeTab === "trap-reserve")}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          type="button"
          onClick={() => setActiveTab("trap-reserve")}
        >
          <FaPercent size={13} style={{ marginRight: "6px" }} /> Tax Trap & HMRC Reserve
        </button>
        <button
          className={tabStyle(activeTab === "multi-year")}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          type="button"
          onClick={() => setActiveTab("multi-year")}
        >
          <FaCalculator size={13} style={{ marginRight: "6px" }} /> Multi-Year Comparison
        </button>
        <button
          className={tabStyle(activeTab === "detailed")}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          type="button"
          onClick={() => setActiveTab("detailed")}
        >
          <FaList size={13} style={{ marginRight: "6px" }} /> Detailed Transaction Log
        </button>
      </div>

      {/* Tab 1: Income & Expense Streams */}
      {(activeTab === "streams" || activeTab === "summary") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Collapsible Sections Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div>
              <FLPHeading as="h3" size="md">
                Income & Expense Sections ({selectedTaxYear})
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Expand sections to review active items, log receipts, or use inline quick-add.
              </FLPText>
            </div>
          </div>

          {/* SECTION 1: PAYE Employment Income */}
          <TaxIncomeSectionCard
            source="paye"
            title="Employment Income (PAYE)"
            subtitle="Salary, bonuses, benefits in kind, and pension contributions"
            icon={<FaBriefcase />}
            colorScheme="blue"
            records={initialRecords}
            selectedTaxYear={selectedTaxYear}
            previousTaxYear={previousTaxYear}
            isOpenDefault={true}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            onDeleteRecord={handleDeleteTransaction}
            onOpenCopyModal={handleOpenCopyModal}
            onQuickAdd={handleQuickAdd}
            onViewReceipt={setActiveReceiptRecord}
            contextBanner={
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <span>
                  Profile salary baseline:{" "}
                  <strong className={numeric}>
                    {profileSalary > 0 ? (
                      `${formatCurrency(profileSalary)}/year`
                    ) : (
                      <NotSet href="/app/profile" subject="salary" />
                    )}
                  </strong>
                  .
                  {activeYearData.payeIncomeGross > 0
                    ? ` Currently using ${formatCurrency(activeYearData.effectivePayeSalary)} from detailed payslip records.`
                    : " No payslip items logged; automatically using profile salary."}
                </span>
                <FLPButton
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenAddModal("paye", "income")}
                >
                  Log Payslip / Bonus
                </FLPButton>
              </div>
            }
          />

          {/* SECTION 2: Rental Property */}
          <TaxIncomeSectionCard
            source="rental"
            title="Rental property"
            subtitle="Tenancy rent, maintenance, service charges, and mortgage finance costs"
            icon={<FaHome />}
            colorScheme="amber"
            records={initialRecords}
            selectedTaxYear={selectedTaxYear}
            previousTaxYear={previousTaxYear}
            isOpenDefault={false}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            onDeleteRecord={handleDeleteTransaction}
            onOpenCopyModal={handleOpenCopyModal}
            onQuickAdd={handleQuickAdd}
            onViewReceipt={setActiveReceiptRecord}
            contextBanner={
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                <span>
                  Ownership share: <strong>{propertyOwnershipShare}%</strong>. Section 24 finance
                  credit:{" "}
                  <strong style={{ color: "var(--colors-success-500)" }}>
                    -{formatCurrency(activeYearData.rentalPropertyTaxCredit)}
                  </strong>{" "}
                  (20% basic rate relief).
                </span>
              </div>
            }
          />

          {/* SECTION 3: Self-Employed & Freelance */}
          <TaxIncomeSectionCard
            source="self-employed"
            title="Self-Employed & Freelance Business"
            subtitle="Sole trader turnover, client retainers, and allowable expenses"
            icon={<FaLaptopCode />}
            colorScheme="emerald"
            records={initialRecords}
            selectedTaxYear={selectedTaxYear}
            previousTaxYear={previousTaxYear}
            isOpenDefault={false}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            onDeleteRecord={handleDeleteTransaction}
            onOpenCopyModal={handleOpenCopyModal}
            onQuickAdd={handleQuickAdd}
            onViewReceipt={setActiveReceiptRecord}
            contextBanner={
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "rgba(16, 185, 129, 0.05)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                <span>
                  Allowable expenses logged:{" "}
                  <strong>{formatCurrency(activeYearData.seExpenses)}</strong>. (Note: UK Trading
                  Allowance of £1,000 can be claimed in lieu of expenses if actual expenses are
                  lower).
                </span>
              </div>
            }
          />

          {/* SECTION 4: Savings & Dividends */}
          <TaxIncomeSectionCard
            source="savings"
            title="Savings & Dividend Income"
            subtitle="Bank savings interest, ISA tax-free growth, share dividends"
            icon={<FaPiggyBank />}
            colorScheme="purple"
            records={initialRecords}
            selectedTaxYear={selectedTaxYear}
            previousTaxYear={previousTaxYear}
            isOpenDefault={false}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            onDeleteRecord={handleDeleteTransaction}
            onOpenCopyModal={handleOpenCopyModal}
            onQuickAdd={handleQuickAdd}
            onViewReceipt={setActiveReceiptRecord}
            contextBanner={
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "rgba(139, 92, 246, 0.05)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                <span>
                  Personal Savings Allowance:{" "}
                  <strong>{formatCurrency(activeYearData.personalSavingsAllowance)}</strong> |
                  Dividend Allowance:{" "}
                  <strong>{formatCurrency(activeYearData.dividendAllowance)}</strong>. ISA interest
                  is 100% tax-free.
                </span>
              </div>
            }
          />
        </div>
      )}

      {/* Tab 2: Tax Trap & HMRC Reserve */}
      {activeTab === "trap-reserve" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Side-by-Side £100k-£125k Tax Trap Escape Slider & Payments on Account Cash-Flow Reserve */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" },
              gap: "20px",
              alignItems: "start",
            })}
          >
            <TaxTrapAlertBanner
              grossIncome={activeYearData?.totalGrossIncome || payeSalary}
              region={getKnownTrapRegion(baseline.ukRegion)}
            />
            {activeYearData && (
              <PaymentsOnAccountCard
                annualSelfAssessmentTax={
                  activeYearData.netAdditionalTaxToPay ??
                  Math.max(0, activeYearData.totalTaxDue - activeYearData.payeTaxDue)
                }
              />
            )}
          </div>

          {/* Side-by-Side Tax Parameters & Calculation Breakdown */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", lg: "1fr 1.6fr" },
              gap: "20px",
              alignItems: "start",
            })}
          >
            {/* Profile Config panel */}
            <div className={editableFormPanel}>
              <FLPHeading
                as="h4"
                size="sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FaPercent /> Tax Parameters
              </FLPHeading>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <FLPInput
                  label="Employment Income (PAYE Baseline Salary)"
                  type="number"
                  value={payeSalary === 0 ? "" : payeSalary}
                  onChange={(e) => setPayeSalary(Number.parseFloat(e.target.value) || 0)}
                />
                <FLPInput
                  label="Property Ownership Share (%)"
                  type="number"
                  max={100}
                  min={0}
                  value={propertyOwnershipShare}
                  onChange={(e) =>
                    setPropertyOwnershipShare(Number.parseFloat(e.target.value) || 0)
                  }
                />
              </div>

              <FLPButton
                loading={isProfileSaving}
                onClick={handleSaveProfile}
                size="sm"
                style={{ alignSelf: "flex-end", marginTop: "4px" }}
              >
                <FaSave size={12} style={{ marginRight: "6px" }} /> Sync parameters
              </FLPButton>
            </div>

            {/* SA Tax Breakdown detail card */}
            <FLPCard
              className={css({
                padding: "20px",
                borderRadius: "md",
                backgroundColor: "surface",
                border: "1px solid token(colors.border)",
              })}
            >
              <FLPHeading
                as="h4"
                size="sm"
                mb={4}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FaInfoCircle /> Tax Calculations breakdown ({selectedTaxYear})
              </FLPHeading>

              <FLPBox display="flex" flexDirection="column" gap={3} style={{ fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">PAYE regular salary:</FLPText>
                  <FLPText fontWeight="semibold" className={numeric}>
                    {formatPaye(activeYearData.effectivePayeSalary, formatCurrency)}
                  </FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Self-employed net profit:</FLPText>
                  <FLPText fontWeight="semibold">{formatCurrency(activeYearData.seProfit)}</FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Rental profit share (excl. interest):</FLPText>
                  <FLPText fontWeight="semibold">
                    {formatCurrency(activeYearData.rentalProfitBeforeInterestShare)}
                  </FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Savings & dividend income:</FLPText>
                  <FLPText fontWeight="semibold">
                    {formatCurrency(
                      activeYearData.savingsInterestGross + activeYearData.dividendIncomeGross,
                    )}
                  </FLPText>
                </div>
                <hr style={{ border: "0", borderTop: "1px solid var(--colors-border)" }} />
                <div
                  style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}
                >
                  <FLPText>Total gross income:</FLPText>
                  <FLPText>{formatCurrency(activeYearData.totalGrossIncome)}</FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Personal allowance:</FLPText>
                  <FLPText fontWeight="semibold">
                    {formatCurrency(activeYearData.personalAllowance)}
                  </FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Combined taxable income:</FLPText>
                  <FLPText fontWeight="semibold">
                    {formatCurrency(activeYearData.totalTaxableIncome)}
                  </FLPText>
                </div>
                <hr style={{ border: "0", borderTop: "1px solid var(--colors-border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Self-employed income tax:</FLPText>
                  <FLPText fontWeight="semibold">{formatCurrency(activeYearData.seTaxDue)}</FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Self-employed Class 4 NI:</FLPText>
                  <FLPText fontWeight="semibold">
                    {formatCurrency(activeYearData.seClass4NIDue)}
                  </FLPText>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <FLPText color="text.muted">Property tax due:</FLPText>
                  <FLPText fontWeight="semibold">
                    {formatCurrency(activeYearData.rentalPropertyTaxDueBeforeCredit)}
                  </FLPText>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "var(--colors-success-500)",
                  }}
                >
                  <FLPText>Section 24 Tax Credit:</FLPText>
                  <FLPText>-{formatCurrency(activeYearData.rentalPropertyTaxCredit)}</FLPText>
                </div>
                {activeYearData.savingsTaxDue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <FLPText color="text.muted">Savings tax (above PSA):</FLPText>
                    <FLPText fontWeight="semibold">
                      {formatCurrency(activeYearData.savingsTaxDue)}
                    </FLPText>
                  </div>
                )}
                {activeYearData.dividendTaxDue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <FLPText color="text.muted">Dividend tax:</FLPText>
                    <FLPText fontWeight="semibold">
                      {formatCurrency(activeYearData.dividendTaxDue)}
                    </FLPText>
                  </div>
                )}
                <hr
                  style={{
                    border: "0",
                    borderTop: "2px solid var(--colors-border)",
                    margin: "4px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  <FLPText color="blue.500">Self Assessment due:</FLPText>
                  <FLPText color="blue.500">
                    {formatCurrency(activeYearData.netAdditionalTaxToPay)}
                  </FLPText>
                </div>
              </FLPBox>
            </FLPCard>
          </div>
        </div>
      )}

      {/* Tab 3: Multi-Year Comparison */}
      {activeTab === "multi-year" && (
        <FLPCard
          className={css({
            padding: "24px",
            borderRadius: "xl",
            backgroundColor: "card",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
          })}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <FLPHeading as="h3" size="md">
                P&L & Tax Comparison Table
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Historical and projected figures across all fiscal tax years.
              </FLPText>
            </div>
          </div>

          <div className={tableContainer}>
            <table className={tableStyle} style={{ minWidth: "550px" }}>
              <thead>
                <tr>
                  <th className={thStyle}>Line Item</th>
                  {availableYears.map((year) => (
                    <th
                      key={year}
                      className={thStyle}
                      style={{
                        textAlign: "right",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Rental */}
                <tr className={trStyle}>
                  <td
                    className={tdStyle}
                    style={{ fontWeight: "bold", backgroundColor: "rgba(245,158,11,0.04)" }}
                  >
                    Rental Property (100% Share)
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        backgroundColor: "rgba(245,158,11,0.04)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    />
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Rental Income
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-success-500)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.rentalIncomeGross || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Rental Expenses (Excl. Interest)
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-text-muted)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(
                        calculatedTaxYearsData[year]?.rentalExpensesExclInterest || 0,
                      )}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Mortgage Interest Costs
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-destructive)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.rentalMortgageInterest || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle} style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
                  <td className={tdStyle} style={{ fontWeight: "bold", paddingLeft: "24px" }}>
                    Total Rental Profit (Post-Interest)
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        fontWeight: "bold",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.rentalProfitPostInterest || 0)}
                    </td>
                  ))}
                </tr>

                {/* Self-Employed */}
                <tr className={trStyle}>
                  <td
                    className={tdStyle}
                    style={{ fontWeight: "bold", backgroundColor: "rgba(16,185,129,0.04)" }}
                  >
                    Self-Employed (Sole Trader)
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        backgroundColor: "rgba(16,185,129,0.04)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    />
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Business Turnover
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-success-500)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.seIncomeGross || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Allowable Business Expenses
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-text-muted)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.seExpenses || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle} style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
                  <td className={tdStyle} style={{ fontWeight: "bold", paddingLeft: "24px" }}>
                    Self-Employed Net Profit
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        fontWeight: "bold",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.seProfit || 0)}
                    </td>
                  ))}
                </tr>

                {/* Savings & Dividends */}
                <tr className={trStyle}>
                  <td
                    className={tdStyle}
                    style={{ fontWeight: "bold", backgroundColor: "rgba(139,92,246,0.04)" }}
                  >
                    Savings & Investments
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        backgroundColor: "rgba(139,92,246,0.04)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    />
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Taxable Savings Interest
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-text-primary)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.savingsInterestGross || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Dividends Income
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-text-primary)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.dividendIncomeGross || 0)}
                    </td>
                  ))}
                </tr>

                {/* Tax Profile & Liabilities */}
                <tr className={trStyle}>
                  <td
                    className={tdStyle}
                    style={{ fontWeight: "bold", backgroundColor: "rgba(99,99,241,0.04)" }}
                  >
                    Tax Profile & Liabilities
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        backgroundColor: "rgba(99,99,241,0.04)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    />
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    PAYE Salary
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-text-primary)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatPaye(
                        calculatedTaxYearsData[year]?.effectivePayeSalary,
                        formatCurrency,
                      )}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Total Gross Taxable Income
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        fontWeight: "bold",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.totalGrossIncome || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Personal Allowance
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-text-muted)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.personalAllowance || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle}>
                  <td className={tdStyle} style={{ paddingLeft: "24px" }}>
                    Section 24 Mortgage Relief Credit
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        color: "var(--colors-success-500)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      -{formatCurrency(calculatedTaxYearsData[year]?.rentalPropertyTaxCredit || 0)}
                    </td>
                  ))}
                </tr>
                <tr className={trStyle} style={{ backgroundColor: "rgba(99,99,241,0.06)" }}>
                  <td className={tdStyle} style={{ fontWeight: "bold", paddingLeft: "24px" }}>
                    Self Assessment tax & NI due
                  </td>
                  {availableYears.map((year) => (
                    <td
                      key={year}
                      className={tdStyle}
                      style={{
                        textAlign: "right",
                        fontWeight: "bold",
                        color: "var(--colors-blue-500)",
                        borderLeft:
                          year === selectedTaxYear ? "2px solid var(--colors-primary)" : "none",
                      }}
                    >
                      {formatCurrency(calculatedTaxYearsData[year]?.netAdditionalTaxToPay || 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </FLPCard>
      )}

      {/* Detailed Transaction Log Tab */}
      {activeTab === "detailed" && (
        <>
          {/* Filters Bar */}
          <div className={filterBar}>
            <div className={inputGroupStyle}>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                  fontWeight: "semibold",
                }}
              >
                Tax Year
              </span>
              <select
                className={css({
                  padding: "8px 12px",
                  fontSize: "sm",
                  borderRadius: "sm",
                  border: "1px solid token(colors.border)",
                  backgroundColor: "surface",
                })}
                value={filterTaxYear}
                onChange={(e) => setFilterTaxYear(e.target.value)}
              >
                <option value="all">All Tax Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className={inputGroupStyle}>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                  fontWeight: "semibold",
                }}
              >
                Source Section
              </span>
              <select
                className={css({
                  padding: "8px 12px",
                  fontSize: "sm",
                  borderRadius: "sm",
                  border: "1px solid token(colors.border)",
                  backgroundColor: "surface",
                })}
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
              >
                <option value="all">All Sources</option>
                <option value="paye">Employment (PAYE)</option>
                <option value="rental">Rental Property</option>
                <option value="self-employed">Self-Employed</option>
                <option value="savings">Savings & Dividends</option>
              </select>
            </div>

            <div className={inputGroupStyle}>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--colors-text-muted)",
                  fontWeight: "semibold",
                }}
              >
                Type
              </span>
              <select
                className={css({
                  padding: "8px 12px",
                  fontSize: "sm",
                  borderRadius: "sm",
                  border: "1px solid token(colors.border)",
                  backgroundColor: "surface",
                })}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: "120px",
                display: "flex",
                justifyContent: "flex-end",
                alignSelf: "flex-end",
              }}
            >
              <FLPText color="text.muted" fontSize="xs" fontWeight="medium">
                Showing {filteredRecords.length} records
              </FLPText>
            </div>
          </div>

          {/* Transactions Detailed Log Table */}
          <div className={tableContainer}>
            <table className={tableStyle} style={{ minWidth: "650px" }}>
              <thead>
                <tr>
                  <th className={thStyle}>Date</th>
                  <th className={thStyle}>Name</th>
                  <th className={thStyle}>Source</th>
                  <th className={thStyle}>Category</th>
                  <th className={thStyle}>Frequency</th>
                  <th className={thStyle}>Receipt</th>
                  <th className={thStyle} style={{ textAlign: "right" }}>
                    Amount
                  </th>
                  <th className={thStyle} style={{ textAlign: "center" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className={tdStyle}
                      style={{
                        textAlign: "center",
                        padding: "32px",
                        color: "var(--colors-text-muted)",
                      }}
                    >
                      No tax records found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const isIncome = record.type === "income";
                    const amtVal =
                      typeof record.amount === "string"
                        ? Number.parseFloat(record.amount)
                        : record.amount;
                    return (
                      <tr
                        key={record.id}
                        className={trStyle}
                        onClick={() => onOpenEditModal(record)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className={tdStyle}>{record.date}</td>
                        <td className={tdStyle} style={{ fontWeight: "medium" }}>
                          {record.name}
                          {record.endDate && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--colors-text-muted)",
                                marginLeft: "6px",
                              }}
                            >
                              (until {record.endDate})
                            </span>
                          )}
                        </td>
                        <td className={tdStyle}>
                          <span
                            className={css({
                              fontSize: "10px",
                              fontWeight: "bold",
                              padding: "2px 8px",
                              borderRadius: "full",
                              textTransform: "uppercase",
                              backgroundColor:
                                record.source === "rental"
                                  ? "rgba(245, 158, 11, 0.12)"
                                  : record.source === "self-employed"
                                    ? "rgba(16, 185, 129, 0.12)"
                                    : record.source === "savings"
                                      ? "rgba(139, 92, 246, 0.12)"
                                      : "rgba(59, 130, 246, 0.12)",
                              color:
                                record.source === "rental"
                                  ? "warning.500"
                                  : record.source === "self-employed"
                                    ? "success.500"
                                    : record.source === "savings"
                                      ? "purple.500"
                                      : "blue.500",
                            })}
                          >
                            {record.source}
                          </span>
                        </td>
                        <td
                          className={tdStyle}
                          style={{ fontSize: "xs", color: "var(--colors-text-muted)" }}
                        >
                          {getCategoryName(record.category, record.source)}
                        </td>
                        <td className={tdStyle} style={{ textTransform: "capitalize" }}>
                          {record.frequency}
                        </td>
                        <td className={tdStyle}>
                          {record.receiptFilename ? (
                            <button
                              className={css({
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                border: "none",
                                background: "none",
                                color: "primary",
                                cursor: "pointer",
                                fontSize: "xs",
                                "&:hover": { textDecoration: "underline" },
                              })}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveReceiptRecord(record);
                              }}
                            >
                              {record.receiptMimeType?.includes("pdf") ? (
                                <FaFilePdf
                                  size={14}
                                  style={{ color: "var(--colors-status-danger-text)" }}
                                />
                              ) : (
                                <FaFileImage size={14} style={{ color: "#3B82F6" }} />
                              )}
                              View
                            </button>
                          ) : (
                            <span style={{ color: "var(--colors-text-muted)", fontSize: "xs" }}>
                              -
                            </span>
                          )}
                        </td>
                        <td
                          className={tdStyle}
                          style={{
                            textAlign: "right",
                            fontWeight: "semibold",
                            color: isIncome
                              ? "var(--colors-success-500)"
                              : "var(--colors-text-primary)",
                          }}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(amtVal)}
                        </td>
                        <td className={tdStyle} style={{ textAlign: "center" }}>
                          <button
                            aria-label={`Edit ${record.name}`}
                            className={css({
                              padding: "6px",
                              border: "none",
                              background: "none",
                              color: "text.muted",
                              cursor: "pointer",
                              borderRadius: "sm",
                              "&:hover": { color: "primary" },
                            })}
                            title="Edit record"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEditModal(record);
                            }}
                          >
                            <FaEdit size={12} />
                          </button>
                          <button
                            className={css({
                              padding: "6px",
                              border: "none",
                              background: "none",
                              color: "status.danger.text",
                              cursor: "pointer",
                              borderRadius: "sm",
                              "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                            })}
                            aria-label="Delete record"
                            title="Delete record"
                            type="button"
                            onClick={(e) => handleDeleteTransaction(record.id, e)}
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add / Edit Dialog using Radix via FLPModal */}
      <FLPModal
        confirmButton={{
          id: "tax-record-form",
          text: editingRecord ? "Save Record" : "Add Record",
        }}
        open={isModalOpen}
        title={editingRecord ? "Edit Record" : "Add New Transaction Record"}
        triggerBtn={<span />}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSaveTransaction}
      >
        <form id="tax-record-form" onSubmit={(e) => e.preventDefault()}>
          <FLPBox display="flex" flexDirection="column" gap={4}>
            <FLPInput
              label="Transaction Name"
              placeholder="e.g. Flat rent, client retainer, interest"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <FLPSelect
                  collection={{
                    items: [
                      { id: "rental", name: "Rental Property" },
                      { id: "self-employed", name: "Self-Employed" },
                      { id: "paye", name: "Employment (PAYE)" },
                      { id: "savings", name: "Savings & Dividends" },
                    ],
                  }}
                  label="Source"
                  value={[formSource]}
                  onValueChange={(e) => {
                    const src = e.value[0] as TaxSource;
                    setFormSource(src);
                    const cats = getCategoriesForSource(src, formType);
                    setFormCategory(cats[0]?.id || "");
                  }}
                />
              </div>

              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <FLPSelect
                  collection={{
                    items: [
                      { id: "expense", name: "Expense" },
                      { id: "income", name: "Income" },
                    ],
                  }}
                  label="Type"
                  value={[formType]}
                  onValueChange={(e) => {
                    const type = e.value[0] as "income" | "expense";
                    setFormType(type);
                    const cats = getCategoriesForSource(formSource, type);
                    setFormCategory(cats[0]?.id || "");
                  }}
                />
              </div>
            </div>

            <FLPSelect
              collection={{
                items: availableCategories.map((c) => ({ id: c.id, name: c.name })),
              }}
              label="Category"
              value={[formCategory]}
              onValueChange={(e) => setFormCategory(e.value[0])}
            />

            <FLPInput
              label="Amount (£)"
              placeholder="0.00"
              required
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
            />

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <FLPInput
                  label="Date"
                  required
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <FLPSelect
                  collection={{
                    items: [
                      { id: "one-off", name: "One-off" },
                      { id: "monthly", name: "Monthly" },
                      { id: "annual", name: "Annual" },
                    ],
                  }}
                  label="Frequency"
                  value={[formFrequency]}
                  onValueChange={(e) => setFormFrequency(e.value[0] as any)}
                />
              </div>
            </div>

            {formFrequency !== "one-off" && (
              <FLPInput
                label="End Date (Optional)"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            )}

            <FLPInput
              label="Notes"
              placeholder="Any additional details..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />

            {/* Receipt Upload Field */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "medium",
                  color: "var(--colors-text-primary)",
                }}
              >
                Receipt / Document (Image or PDF)
              </span>

              {receiptFilename ? (
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "sm",
                    border: "1px solid token(colors.border)",
                    backgroundColor: "rgba(0,0,0,0.02)",
                  })}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "sm" }}
                  >
                    {receiptMimeType?.includes("pdf") ? (
                      <FaFilePdf style={{ color: "var(--colors-status-danger-text)" }} />
                    ) : (
                      <FaFileImage style={{ color: "#3B82F6" }} />
                    )}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "200px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {receiptFilename}
                    </span>
                  </div>
                  <button
                    className={css({
                      border: "none",
                      background: "none",
                      color: "status.danger.text",
                      fontSize: "xs",
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                    })}
                    type="button"
                    onClick={clearReceipt}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <label
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      fontSize: "xs",
                      fontWeight: "bold",
                      border: "1px solid token(colors.border)",
                      borderRadius: "sm",
                      backgroundColor: "surface",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                    })}
                  >
                    <FaUpload /> Upload File
                    <input
                      style={{ display: "none" }}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>

                  <label
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      fontSize: "xs",
                      fontWeight: "bold",
                      border: "1px solid token(colors.border)",
                      borderRadius: "sm",
                      backgroundColor: "surface",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.02)" },
                    })}
                  >
                    <FaCamera /> Take Photo
                    <input
                      style={{ display: "none" }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
            </div>
          </FLPBox>
        </form>
      </FLPModal>

      {/* View Receipt lightbox modal using Radix via FLPModal */}
      <FLPModal
        open={!!activeReceiptRecord}
        title={`Receipt for ${activeReceiptRecord?.name || ""}`}
        triggerBtn={<span />}
        onClose={() => setActiveReceiptRecord(null)}
        onConfirm={() => setActiveReceiptRecord(null)}
      >
        {activeReceiptRecord?.receiptData ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "8px",
            }}
          >
            {activeReceiptRecord.receiptMimeType?.includes("pdf") ? (
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  borderRadius: "md",
                  border: "1px dashed token(colors.border)",
                  width: "100%",
                })}
              >
                <FaFileAlt
                  size={48}
                  style={{ color: "var(--colors-status-danger-text)", marginBottom: "12px" }}
                />
                <span style={{ fontSize: "sm", fontWeight: "semibold", marginBottom: "4px" }}>
                  {activeReceiptRecord.receiptFilename}
                </span>
                <span style={{ fontSize: "xs", color: "var(--colors-text-muted)" }}>
                  PDF Document (Base64)
                </span>
                <a
                  href={activeReceiptRecord.receiptData}
                  download={activeReceiptRecord.receiptFilename || "receipt.pdf"}
                  className={css({
                    marginTop: "16px",
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "primary.solid",
                    color: "primary.foreground",
                    fontSize: "xs",
                    fontWeight: "bold",
                    borderRadius: "sm",
                    textDecoration: "none",
                    "&:hover": { opacity: 0.9 },
                  })}
                >
                  Download PDF
                </a>
              </div>
            ) : (
              <img
                src={activeReceiptRecord.receiptData}
                alt={activeReceiptRecord.name}
                className={css({
                  maxWidth: "100%",
                  maxHeight: "350px",
                  borderRadius: "md",
                  boxShadow: "sm",
                  objectFit: "contain",
                })}
              />
            )}
            <div
              style={{
                width: "100%",
                textAlign: "left",
                fontSize: "xs",
                color: "var(--colors-text-muted)",
              }}
            >
              <strong>Filename:</strong> {activeReceiptRecord.receiptFilename} <br />
              <strong>Type:</strong> {activeReceiptRecord.receiptMimeType}
            </div>
          </div>
        ) : (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--colors-text-muted)" }}>
            No file content available.
          </div>
        )}
      </FLPModal>

      {/* Copy / Populate Tax Year Wizard Modal */}
      <CopyTaxYearModal
        open={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        records={initialRecords}
        initialSourceSection={copyModalScope}
        initialSourceYear={previousTaxYear}
        initialTargetYear={selectedTaxYear}
        availableYears={availableYears}
      />

      <ConfirmDialog
        open={transactionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransactionToDelete(null);
            deleteTransactionOutcome.dismiss();
          }
        }}
        pending={deleteTransactionOutcome.pending}
        error={deleteTransactionOutcome.error}
        title="Delete transaction?"
        description="This removes the transaction record. This can't be undone."
        confirmLabel="Delete transaction"
        tone="danger"
        onConfirm={confirmDeleteTransaction}
      />

      <ConfirmDialog
        open={taxYearToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTaxYearToDelete(null);
            deleteTaxYearOutcome.dismiss();
          }
        }}
        pending={deleteTaxYearOutcome.pending}
        error={deleteTaxYearOutcome.error}
        title={
          <>
            Delete all <span className={numeric}>{recordsInSelectedTaxYear.length}</span> records
            for <span className={numeric}>{taxYearToDelete}</span>?
          </>
        }
        description="These records are removed from your tax planner. This can't be undone."
        confirmLabel="Delete year"
        tone="danger"
        onConfirm={confirmDeleteTaxYear}
      />
    </div>
  );
};

export default TaxContainer;
