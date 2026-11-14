import {
  calculateUKTax,
  getCategoriesForSource,
  getCurrentUKTaxYear,
  getPreviousTaxYear,
  getTaxYearForRecordDate,
  getUkTaxYearContext,
  isSupportedUkTaxYear,
  type TaxCalculationResult,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  EXPLORER_COPY,
  Icon,
  PageHeader,
  ProjectionNotice,
  ScenarioZone,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { Plus } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import TaxDisclaimerButton from "~/components/core/dialogs/TaxDisclaimerButton";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import {
  NextPoundExplorer,
  useNextPoundScenario,
} from "~/features/take-home/components/NextPoundExplorer";
import { CopyTaxYearModal } from "~/features/tax/components/CopyTaxYearModal";
import { TaxHeadline } from "~/features/tax/components/TaxHeadline";
import { TaxReceiptDialog } from "~/features/tax/components/TaxReceiptDialog";
import { TaxRecordDialog, type TaxRecordDraft } from "~/features/tax/components/TaxRecordDialog";
import { TaxRecordsTable } from "~/features/tax/components/TaxRecordsTable";
import { TaxReservePanel } from "~/features/tax/components/TaxReservePanel";
import { TaxSourcesPanel } from "~/features/tax/components/TaxSourcesPanel";
import { TaxTabs } from "~/features/tax/components/TaxTabs";
import { TaxYearBar } from "~/features/tax/components/TaxYearBar";
import { TaxYearComparison } from "~/features/tax/components/TaxYearComparison";
import { recordAmount } from "~/features/tax/tax-labels";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import type { loader } from "~/routes/app.self-assessment";
import { useFinancialBaseline } from "~/state/baseline.store";
import { getKnownTrapRegion } from "~/utils/taxTrapCopy";
import { headerActions, iconButton, numeric, pageRoot, zoneLink } from "./TaxContainer.styles";

/** Id of the pay planner zone, linked from the dashboard tax widget. */
export const TAX_PAY_PLANNER_ID = "tax-pay-planner";

type TaxTab = "streams" | "trap-reserve" | "multi-year" | "detailed";

const TABS: Array<{ value: TaxTab; label: string }> = [
  { value: "streams", label: "Income and costs" },
  { value: "trap-reserve", label: "Payments and reserve" },
  { value: "multi-year", label: "Year by year" },
  { value: "detailed", label: "All records" },
];

const emptyDraft = (source: TaxSource, type: "income" | "expense", date: string) =>
  ({
    name: "",
    source,
    type,
    category: getCategoriesForSource(source, type)[0]?.id ?? "",
    amount: null,
    date,
    frequency: "monthly",
    endDate: "",
    notes: "",
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    receiptCleared: false,
  }) satisfies TaxRecordDraft;

const draftFromRecord = (record: TaxRecord): TaxRecordDraft => ({
  name: record.name,
  source: record.source,
  type: record.type,
  category: record.category,
  amount: recordAmount(record),
  date: record.date,
  frequency: record.frequency,
  endDate: record.endDate || "",
  notes: record.notes || "",
  receiptFilename: record.receiptFilename,
  receiptMimeType: record.receiptMimeType,
  receiptData: null,
  receiptCleared: false,
});

const TaxContainer: FC = () => {
  const fetcher = useFetcher();
  const { records: initialRecords = [], userProfile } = useLoaderData<typeof loader>();

  // Which year's rates apply today, and whether that is a fallback (E22)
  const ratesContext = useMemo(() => getUkTaxYearContext(), []);
  const currentTaxYear = getCurrentUKTaxYear();

  const [activeTab, setActiveTab] = useState<TaxTab>("streams");
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>(() => getCurrentUKTaxYear());

  const { baseline } = useFinancialBaseline();

  // Salary and property share default to the baseline, then the profile.
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

  // The pay planner (E25-T13) starts from saved details only and never writes back.
  const savedPensionPercent = Number(userProfile?.pensionPercent ?? 0);
  const payScenario = useNextPoundScenario({
    salary: profileSalary,
    taxRegion: userProfile?.taxRegion ?? null,
    studentLoanPlans: userProfile?.studentLoanPlans ?? null,
    studentLoanPlan: userProfile?.studentLoanPlan ?? null,
    isSalarySacrifice: userProfile?.isSalarySacrifice === true,
    pensionPercent: Number.isFinite(savedPensionPercent) ? savedPensionPercent : 0,
    taxYear: ratesContext.ratesYear,
  });
  const { formatCurrency } = useFormatCurrency();
  const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
  const plannerBasis =
    profileSalary > 0
      ? `Starting from your figures: ${formatCurrency(profileSalary)} gross salary, ${percentFormat.format(Number.isFinite(savedPensionPercent) ? savedPensionPercent : 0)}% pension`
      : EXPLORER_COPY.defaultBasis;

  const [payeSalary, setPayeSalary] = useState<number>(profileSalary);
  const [propertyOwnershipShare, setPropertyOwnershipShare] = useState<number>(profileShare);
  const [isProfileSaving, setIsProfileSaving] = useState<boolean>(false);

  // Current tax year plus any year with records, limited to years the engine supports (E22).
  const availableYears = useMemo(() => {
    const fromRecords = initialRecords.map((r) => getTaxYearForRecordDate(r.date));
    const set = new Set<string>([currentTaxYear, ...fromRecords].filter(isSupportedUkTaxYear));
    return Array.from(set).sort();
  }, [currentTaxYear, initialRecords]);

  useEffect(() => {
    if (!availableYears.includes(selectedTaxYear)) {
      setSelectedTaxYear(
        availableYears.includes(currentTaxYear)
          ? currentTaxYear
          : availableYears[availableYears.length - 1],
      );
    }
  }, [availableYears, selectedTaxYear, currentTaxYear]);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copyModalScope, setCopyModalScope] = useState<TaxSource | "all">("all");

  // Add / edit dialog
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
  const [draft, setDraft] = useState<TaxRecordDraft>(() =>
    emptyDraft("rental", "income", `${currentTaxYear.split("/")[0]}-04-06`),
  );

  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [taxYearToDelete, setTaxYearToDelete] = useState<string | null>(null);
  const deleteTransactionOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTransactionToDelete(null),
  });
  const deleteTaxYearOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTaxYearToDelete(null),
  });

  const [activeReceiptRecord, setActiveReceiptRecord] = useState<TaxRecord | null>(null);

  const onOpenAddModal = (
    defaultSource: TaxSource = "rental",
    defaultType: "income" | "expense" = "expense",
  ) => {
    // New records start on 6 April, the first day of the selected tax year.
    const startYr = selectedTaxYear.split("/")[0] || new Date().getFullYear().toString();
    setEditingRecord(null);
    setDraft(emptyDraft(defaultSource, defaultType, `${startYr}-04-06`));
    setIsRecordDialogOpen(true);
  };

  const onOpenEditModal = (record: TaxRecord) => {
    setEditingRecord(record);
    setDraft(draftFromRecord(record));
    setIsRecordDialogOpen(true);
  };

  const handleOpenCopyModal = (scope: TaxSource | "all" = "all") => {
    setCopyModalScope(scope);
    setIsCopyModalOpen(true);
  };

  // Quick add from the collapsible source cards
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

  const calculatedTaxYearsData = useMemo(() => {
    const results: Record<string, TaxCalculationResult> = {};
    for (const year of availableYears) {
      // calculateUKTax is strict and throws for unsupported years (E22).
      if (!isSupportedUkTaxYear(year)) continue;
      results[year] = calculateUKTax(year, initialRecords, payeSalary, propertyOwnershipShare);
    }
    return results;
  }, [availableYears, initialRecords, payeSalary, propertyOwnershipShare]);

  const activeYearData = useMemo(
    () =>
      calculatedTaxYearsData[selectedTaxYear] ||
      calculatedTaxYearsData[currentTaxYear] ||
      Object.values(calculatedTaxYearsData)[0],
    [calculatedTaxYearsData, selectedTaxYear, currentTaxYear],
  );

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

  const handleSaveTransaction = (values: TaxRecordDraft) => {
    const payload = {
      intent: editingRecord ? "update-transaction" : "create-transaction",
      id: editingRecord?.id || "",
      name: values.name,
      source: values.source,
      type: values.type,
      category: values.category,
      amount: values.amount === null ? "" : values.amount.toString(),
      date: values.date,
      frequency: values.frequency,
      endDate: values.endDate || undefined,
      notes: values.notes || undefined,
      receiptFilename: values.receiptFilename || undefined,
      receiptMimeType: values.receiptMimeType || undefined,
      receiptData: values.receiptData || undefined,
      // An omitted receipt keeps the stored one; clearing must be said explicitly.
      receiptClear: values.receiptCleared && !values.receiptData ? "1" : undefined,
    };
    fetcher.submit(payload, { method: "POST" });
    setIsRecordDialogOpen(false);
  };

  const confirmDeleteTransaction = () => {
    if (!transactionToDelete) {
      setTransactionToDelete(null);
      return;
    }
    deleteTransactionOutcome.begin();
    fetcher.submit({ intent: "delete-transaction", id: transactionToDelete }, { method: "POST" });
  };

  const recordsInSelectedTaxYear = useMemo(
    () => initialRecords.filter((r) => getTaxYearForRecordDate(r.date) === selectedTaxYear),
    [initialRecords, selectedTaxYear],
  );

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
      { intent: "delete-tax-year", recordIds: JSON.stringify(recordIds) },
      { method: "POST" },
    );
  };

  const previousTaxYear = getPreviousTaxYear(selectedTaxYear);
  const countFormat = new Intl.NumberFormat("en-GB");

  return (
    <div className={pageRoot()}>
      <TaxRatesStatusBanner {...ratesContext} />
      <ProjectionNotice />

      <PageHeader
        title="Self Assessment"
        subtitle="Income, allowable costs and an estimated Self Assessment bill for each tax year."
        actions={
          <div className={headerActions()}>
            <TaxDisclaimerButton showShortText />
            <Button
              className={iconButton()}
              type="button"
              onClick={() => onOpenAddModal("rental", "income")}
            >
              <Icon icon={Plus} size="sm" />
              Add a record
            </Button>
          </div>
        }
      />

      <TaxYearBar
        years={availableYears}
        selectedYear={selectedTaxYear}
        onSelectYear={setSelectedTaxYear}
        previousYear={previousTaxYear}
        onCopy={() => handleOpenCopyModal("all")}
        onDeleteYear={
          recordsInSelectedTaxYear.length > 0
            ? () => setTaxYearToDelete(selectedTaxYear)
            : undefined
        }
      />

      <TaxHeadline
        taxYear={selectedTaxYear}
        result={activeYearData}
        ownershipSharePct={propertyOwnershipShare}
      />

      <TaxTabs
        idBase="tax-view"
        items={TABS}
        label="Tax views"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        {activeTab === "streams" ? (
          <TaxSourcesPanel
            records={initialRecords}
            taxYear={selectedTaxYear}
            previousTaxYear={previousTaxYear}
            result={activeYearData}
            profileSalary={profileSalary}
            ownershipSharePct={propertyOwnershipShare}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            onDeleteRecord={setTransactionToDelete}
            onOpenCopyModal={handleOpenCopyModal}
            onQuickAdd={handleQuickAdd}
            onViewReceipt={setActiveReceiptRecord}
          />
        ) : null}

        {activeTab === "trap-reserve" ? (
          <TaxReservePanel
            taxYear={selectedTaxYear}
            result={activeYearData}
            trapIncome={activeYearData?.totalGrossIncome || payeSalary}
            trapRegion={getKnownTrapRegion(baseline)}
            payeSalary={payeSalary}
            onPayeSalaryChange={setPayeSalary}
            ownershipSharePct={propertyOwnershipShare}
            onOwnershipShareChange={setPropertyOwnershipShare}
            onSave={handleSaveProfile}
            saving={isProfileSaving}
          />
        ) : null}

        {activeTab === "multi-year" ? (
          <TaxYearComparison
            years={availableYears}
            selectedYear={selectedTaxYear}
            results={calculatedTaxYearsData}
          />
        ) : null}

        {activeTab === "detailed" ? (
          <TaxRecordsTable
            records={initialRecords}
            availableYears={availableYears}
            onEdit={onOpenEditModal}
            onDelete={setTransactionToDelete}
            onViewReceipt={setActiveReceiptRecord}
            onAdd={() => onOpenAddModal("rental", "income")}
          />
        ) : null}
      </TaxTabs>

      <ScenarioZone
        basis={plannerBasis}
        footer={
          <Link className={zoneLink()} to="/app/profile">
            Update your details
          </Link>
        }
        id={TAX_PAY_PLANNER_ID}
        isModified={payScenario.isModified}
        // The page's own notice above already covers this zone.
        showNotice={false}
        title="Model a change to your pay"
        onReset={payScenario.reset}
      >
        <NextPoundExplorer scenario={payScenario} />
      </ScenarioZone>

      <TaxRecordDialog
        open={isRecordDialogOpen}
        onOpenChange={setIsRecordDialogOpen}
        mode={editingRecord ? "edit" : "add"}
        initial={draft}
        onSave={handleSaveTransaction}
      />

      <TaxReceiptDialog record={activeReceiptRecord} onClose={() => setActiveReceiptRecord(null)} />

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
        title="Delete this record?"
        description="This removes the record from your tax planner. This can't be undone."
        confirmLabel="Delete record"
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
            Delete all{" "}
            <span className={numeric()}>{countFormat.format(recordsInSelectedTaxYear.length)}</span>{" "}
            records for <span className={numeric()}>{taxYearToDelete}</span>?
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
