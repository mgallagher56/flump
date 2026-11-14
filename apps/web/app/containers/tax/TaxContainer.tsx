import {
  calculateUKTax,
  getCategoriesForSource,
  getCurrentUKTaxYear,
  getPreviousTaxYear,
  getTaxYearForRecordDate,
  getUkTaxYearContext,
  isRecordActiveInTaxYear,
  isSupportedUkTaxYear,
  type TaxCalculationResult,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  DELTA_PANEL_COPY,
  EmptyState,
  Illustration,
  PageBody,
  PageHeader,
  ProjectionNotice,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { type FC, useCallback, useMemo, useState } from "react";
import { Link, useFetcher, useLoaderData, useRevalidator } from "react-router";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { AddIncomeMenu } from "~/features/tax/components/AddIncomeMenu";
import { CopyTaxYearModal } from "~/features/tax/components/CopyTaxYearModal";
import { nonPayeIncome, TaxHeadline } from "~/features/tax/components/TaxHeadline";
import { TaxReceiptDialog } from "~/features/tax/components/TaxReceiptDialog";
import { TaxRecordDialog, type TaxRecordDraft } from "~/features/tax/components/TaxRecordDialog";
import { TaxRecordsTable } from "~/features/tax/components/TaxRecordsTable";
import { TaxReservePanel } from "~/features/tax/components/TaxReservePanel";
import { TaxSourcesPanel } from "~/features/tax/components/TaxSourcesPanel";
import { TaxYearBar } from "~/features/tax/components/TaxYearBar";
import { TaxYearComparison } from "~/features/tax/components/TaxYearComparison";
import { recordAmount } from "~/features/tax/tax-labels";
import { DEFAULT_PROFILE, useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.self-assessment";
import { useFinancialBaseline } from "~/state/baseline.store";
import { isPageEnabled } from "~/utils/pageConfig";
import {
  drawers,
  errorText,
  numeric,
  pageRoot,
  quietAction,
  textLink,
} from "./TaxContainer.styles";

/** The one standard tax caveat (copy audit ruling 3), folded into the page's single notice. */
export const TAX_UNVERIFIED_LEAD = DELTA_PANEL_COPY.unverifiedBanner;

const PAGE_TITLE = "Self Assessment";

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

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Adds "tax" to a stored list exactly as the settings toggle does (ProfileTab): the list is kept
 * as it is, an empty list included, since that is the user's choice. Only an absent list uses the
 * default the toggle sees, the normalised profile default.
 */
const withTax = (list: string[] | null | undefined, absentDefault: readonly string[]) => [
  ...(list ?? absentDefault).filter((k) => k !== "tax"),
  "tax",
];

/**
 * Self Assessment is opt-in (E16 D3-B, D9). Someone who has not turned it on sees one empty
 * state with one button, and no figures. Turning it on uses the same profile update as the
 * settings toggle (page, nav entry and dashboard widget), then reloads this page's data.
 */
const SelfAssessmentOff: FC<{
  enabledPages?: string[] | null;
  dashboardWidgets?: string[] | null;
  dashboardWidgetOrder?: string[] | null;
  onEnabled: () => void;
}> = ({ enabledPages, dashboardWidgets, dashboardWidgetOrder, onEnabled }) => {
  const { updateProfile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnOn = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        enabledPages: withTax(enabledPages, DEFAULT_PROFILE.enabledPages),
        dashboardWidgets: withTax(dashboardWidgets, DEFAULT_PROFILE.dashboardWidgets),
        dashboardWidgetOrder: withTax(dashboardWidgetOrder, DEFAULT_PROFILE.dashboardWidgetOrder),
      });
      onEnabled();
    } catch {
      setError("We could not turn on Self Assessment. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageBody className={pageRoot()} data-testid="tax-page">
      <PageHeader title={PAGE_TITLE} />
      <EmptyState
        action={
          <Button pending={saving} type="button" variant="primary" onClick={turnOn}>
            Turn on Self Assessment
          </Button>
        }
        id="self-assessment-off"
        illustration={<Illustration scene="empty-accounts" size="sm" />}
        title="Self Assessment is for income outside PAYE, such as self-employment or rent"
      />
      {error ? (
        <p className={errorText()} role="alert">
          {error}
        </p>
      ) : null}
    </PageBody>
  );
};

const TaxContainer: FC = () => {
  const { userProfile, ...loaderData } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [justEnabled, setJustEnabled] = useState(false);

  const enabledPages = (userProfile?.enabledPages ?? null) as string[] | null;
  const optedIn = justEnabled || isPageEnabled(enabledPages, "tax");

  if (!optedIn) {
    return (
      <SelfAssessmentOff
        dashboardWidgetOrder={userProfile?.dashboardWidgetOrder as string[] | null | undefined}
        dashboardWidgets={userProfile?.dashboardWidgets as string[] | null | undefined}
        enabledPages={enabledPages}
        onEnabled={() => {
          setJustEnabled(true);
          revalidator.revalidate();
        }}
      />
    );
  }

  return <SelfAssessmentPage records={loaderData.records ?? []} userProfile={userProfile} />;
};

type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

const SelfAssessmentPage: FC<{
  records: TaxRecord[];
  userProfile: LoaderData["userProfile"];
}> = ({ records: initialRecords, userProfile }) => {
  const fetcher = useFetcher();

  // Which year's rates apply today, and whether that is a fallback (E22)
  const ratesContext = useMemo(() => getUkTaxYearContext(), []);
  const currentTaxYear = getCurrentUKTaxYear();
  const { baseline } = useFinancialBaseline();

  // Salary and property share default to the baseline, then the profile.
  const profileSalary =
    baseline.annualGrossSalary > 0
      ? baseline.annualGrossSalary
      : (toNumber(userProfile?.annualSalary) ?? 0);
  const profileShare =
    baseline.propertyOwnershipSharePct !== undefined
      ? baseline.propertyOwnershipSharePct
      : (toNumber(userProfile?.propertyOwnershipShare) ?? 100);

  const [payeSalary, setPayeSalary] = useState<number>(profileSalary);
  const [propertyOwnershipShare, setPropertyOwnershipShare] = useState<number>(profileShare);
  const [isProfileSaving, setIsProfileSaving] = useState<boolean>(false);

  // Current tax year plus any year with records, limited to years the engine supports (E22).
  const availableYears = useMemo(() => {
    const fromRecords = initialRecords.map((r) => getTaxYearForRecordDate(r.date));
    const set = new Set<string>([currentTaxYear, ...fromRecords].filter(isSupportedUkTaxYear));
    return Array.from(set).sort();
  }, [currentTaxYear, initialRecords]);

  const [chosenYear, setChosenYear] = useState<string>(currentTaxYear);
  const selectedTaxYear = availableYears.includes(chosenYear)
    ? chosenYear
    : availableYears.includes(currentTaxYear)
      ? currentTaxYear
      : (availableYears[availableYears.length - 1] ?? currentTaxYear);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);

  // Add / edit dialog
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxRecord | null>(null);
  const [draft, setDraft] = useState<TaxRecordDraft>(() =>
    emptyDraft("self-employed", "income", `${currentTaxYear.split("/")[0]}-04-06`),
  );

  const [transactionToDelete, setTransactionToDelete] = useState<TaxRecord | null>(null);
  const [taxYearToDelete, setTaxYearToDelete] = useState<string | null>(null);
  const deleteTransactionOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTransactionToDelete(null),
  });
  const deleteTaxYearOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTaxYearToDelete(null),
  });

  const [activeReceiptRecord, setActiveReceiptRecord] = useState<TaxRecord | null>(null);

  const onOpenAddModal = (source: TaxSource, type: "income" | "expense") => {
    // New records start on 6 April, the first day of the selected tax year.
    const startYr = selectedTaxYear.split("/")[0] || new Date().getFullYear().toString();
    setEditingRecord(null);
    setDraft(emptyDraft(source, type, `${startYr}-04-06`));
    setIsRecordDialogOpen(true);
  };

  const onOpenEditModal = (record: TaxRecord) => {
    setEditingRecord(record);
    setDraft(draftFromRecord(record));
    setIsRecordDialogOpen(true);
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

  const activeYearData: TaxCalculationResult | undefined =
    calculatedTaxYearsData[selectedTaxYear] ?? Object.values(calculatedTaxYearsData)[0];

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
    if (!transactionToDelete) return;
    deleteTransactionOutcome.begin();
    fetcher.submit(
      { intent: "delete-transaction", id: transactionToDelete.id },
      { method: "POST" },
    );
  };

  const recordsInSelectedTaxYear = useMemo(
    () => initialRecords.filter((r) => getTaxYearForRecordDate(r.date) === selectedTaxYear),
    [initialRecords, selectedTaxYear],
  );
  const hasRecordsInYear = initialRecords.some((r) => isRecordActiveInTaxYear(r, selectedTaxYear));

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

  const addIncome = (
    <AddIncomeMenu onAdd={onOpenAddModal} onCopyFromLastYear={() => setIsCopyModalOpen(true)} />
  );
  // The one "Unverified estimate" notice goes only where an estimate is shown: a year with
  // income outside PAYE. A year with costs only has no estimate, so no notice.
  const showEstimate =
    activeYearData !== undefined && nonPayeIncome(initialRecords, selectedTaxYear) > 0;

  return (
    <PageBody className={pageRoot()} data-testid="tax-page">
      <PageHeader
        title={PAGE_TITLE}
        subtitle="Income outside PAYE, its costs and an estimated tax bill for each tax year."
        actions={
          <TaxYearBar
            years={availableYears}
            selectedYear={selectedTaxYear}
            onSelectYear={setChosenYear}
          />
        }
      />

      <TaxRatesStatusBanner {...ratesContext} />

      <TaxHeadline
        emptyAction={hasRecordsInYear ? undefined : addIncome}
        records={initialRecords}
        result={activeYearData}
        taxYear={selectedTaxYear}
      />

      {showEstimate ? <ProjectionNotice lead={TAX_UNVERIFIED_LEAD} /> : null}

      <TaxSourcesPanel action={addIncome} records={initialRecords} taxYear={selectedTaxYear} />

      <p className={textLink()}>
        <Link to="/app/take-home">See what more pay is worth after tax</Link>
      </p>

      <div className={drawers()}>
        {showEstimate && activeYearData ? (
          <CollapsibleDrawer title="How the estimate is worked out" variant="quiet">
            <TaxReservePanel
              taxYear={selectedTaxYear}
              result={activeYearData}
              totalIncome={activeYearData.totalGrossIncome || payeSalary}
              payeSalary={payeSalary}
              onPayeSalaryChange={setPayeSalary}
              ownershipSharePct={propertyOwnershipShare}
              onOwnershipShareChange={setPropertyOwnershipShare}
              onSave={handleSaveProfile}
              saving={isProfileSaving}
            />
          </CollapsibleDrawer>
        ) : null}

        {initialRecords.length > 0 ? (
          <CollapsibleDrawer
            itemCount={initialRecords.length}
            itemNoun={{ one: "record", other: "records" }}
            title="All records"
            variant="quiet"
          >
            <TaxRecordsTable
              records={initialRecords}
              availableYears={availableYears}
              onEdit={onOpenEditModal}
              onDelete={(id) =>
                setTransactionToDelete(initialRecords.find((r) => r.id === id) ?? null)
              }
              onViewReceipt={setActiveReceiptRecord}
              onAdd={() => onOpenAddModal("self-employed", "income")}
            />
            {recordsInSelectedTaxYear.length > 0 ? (
              <Button
                className={quietAction()}
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => setTaxYearToDelete(selectedTaxYear)}
              >
                Delete all records for {selectedTaxYear}
              </Button>
            ) : null}
          </CollapsibleDrawer>
        ) : null}

        {availableYears.length > 1 ? (
          <CollapsibleDrawer title="Year by year" variant="quiet">
            <TaxYearComparison
              years={availableYears}
              selectedYear={selectedTaxYear}
              results={calculatedTaxYearsData}
            />
          </CollapsibleDrawer>
        ) : null}
      </div>

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
        initialSourceSection="all"
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
        title={`Delete ${transactionToDelete?.name ?? "this record"}?`}
        description="It will no longer count towards your estimate. This cannot be undone."
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
        description="They will no longer count towards your estimate. This cannot be undone."
        confirmLabel="Delete records"
        tone="danger"
        onConfirm={confirmDeleteTaxYear}
      />
    </PageBody>
  );
};

export default TaxContainer;
