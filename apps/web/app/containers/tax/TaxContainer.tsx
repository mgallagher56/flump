import {
  calculateEstimatedTax,
  categorizeAccountType,
  estimateInputsFor,
  getCurrentUKTaxYear,
  getPreviousTaxYear,
  getTaxYearForRecordDate,
  getUkTaxYearContext,
  isBuyToLetAccount,
  isRecordActiveInTaxYear,
  isSupportedUkTaxYear,
  type TaxCalculationResult,
  type TaxEstimateMissingFact,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  ButtonLink,
  CollapsibleDrawer,
  DELTA_PANEL_COPY,
  EmptyState,
  Icon,
  IconButton,
  Menu,
  PageBody,
  PageHeader,
  ProjectionNotice,
  TaxRatesStatusBanner,
} from "@repo/ui";
import { MoreHorizontal } from "lucide-react";
import { type FC, useCallback, useMemo, useState } from "react";
import { Link, useLoaderData, useRevalidator, useSearchParams } from "react-router";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { AddIncomeMenu } from "~/features/tax/components/AddIncomeMenu";
import { CalculatedFigures } from "~/features/tax/components/CalculatedFigures";
import { CopyTaxYearModal } from "~/features/tax/components/CopyTaxYearModal";
import { TaxHeadline } from "~/features/tax/components/TaxHeadline";
import { TaxRecordsTable } from "~/features/tax/components/TaxRecordsTable";
import { TaxReservePanel } from "~/features/tax/components/TaxReservePanel";
import { TaxSourcesPanel } from "~/features/tax/components/TaxSourcesPanel";
import { TaxYearBar } from "~/features/tax/components/TaxYearBar";
import { TaxYearComparison } from "~/features/tax/components/TaxYearComparison";
import { availableTaxYears, resolveSelectedTaxYear } from "~/features/tax/hooks/taxYears";
import { useTaxRecordEditor } from "~/features/tax/hooks/useTaxRecordEditor";
import {
  calculatedInterestOffers,
  rentalShareLines,
  rentalShareNotice,
  type TaxAccount,
} from "~/features/tax/linkedAccounts";
import { SOURCE_PAGE_ORDER, taxYearFromParam } from "~/features/tax/source-pages";
import {
  ACCOUNTS_PATH,
  addableEstimateFact,
  ESTIMATE_MISSING_PROMPT,
  RENTAL_SHARE_NOTICE,
  SALARY_SETTINGS_PATH,
  SCOTTISH_BANDS_NOTE,
  SOURCE_LABEL,
} from "~/features/tax/tax-labels";
import { DEFAULT_PROFILE, useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.self-assessment";
import { PROFILE_VERSION_FIELD, versionField } from "~/services/conflict";
import { isPageEnabled } from "~/utils/pageConfig";
import { salaryProfileFirst } from "~/utils/profileFirst";
import {
  drawers,
  errorText,
  headerActions,
  narrowOnly,
  numeric,
  otherDatesHeading,
  pageRoot,
  recordGroup,
  recordGroupHeading,
  wideOnly,
} from "./TaxContainer.styles";

/** The one standard tax caveat (copy audit ruling 3), folded into the page's single notice. */
export const TAX_UNVERIFIED_LEAD = DELTA_PANEL_COPY.unverifiedBanner;

const PAGE_TITLE = "Self Assessment";

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
  onEnabled: () => void;
}> = ({ enabledPages, dashboardWidgets, onEnabled }) => {
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
        // No dashboardWidgetOrder: the dashboard puts a newly shown section at the end.
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
      <PageHeader
        description="Income outside PAYE, its expenses and an estimated tax bill for each tax year."
        // The page icon; the empty state below has none, so one illustration is in view.
        illustration="empty-accounts"
        title={PAGE_TITLE}
      />
      <EmptyState
        description="You can turn it off again in Settings."
        action={
          <Button pending={saving} type="button" variant="primary" onClick={turnOn}>
            Turn on Self Assessment
          </Button>
        }
        id="self-assessment-off"
        size="sm"
        tone="card"
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

/**
 * The lead of the page's one notice: the standard tax caveat, then a Scottish taxpayer's rates
 * note (SA-3) and why unlinked rental records are counted in full (owner decision 6), when either
 * applies. One notice per surface (UX P4), so these fold into it.
 */
export const EstimateNoticeLead: FC<{
  scottish: boolean;
  shareNotice: keyof typeof RENTAL_SHARE_NOTICE | null;
}> = ({ scottish, shareNotice }) => {
  const share = shareNotice ? RENTAL_SHARE_NOTICE[shareNotice] : null;
  if (!scottish && !share) return <>{TAX_UNVERIFIED_LEAD}</>;
  return (
    <>
      {TAX_UNVERIFIED_LEAD}
      {scottish ? <span> {SCOTTISH_BANDS_NOTE}</span> : null}
      {share ? (
        <span data-testid="rental-share-notice" id="rental-share-notice">
          {" "}
          {share.before}
          {share.link ? <Link to={ACCOUNTS_PATH}>{share.link}</Link> : null}
          {share.after}
        </span>
      ) : null}
    </>
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
        dashboardWidgets={userProfile?.dashboardWidgets as string[] | null | undefined}
        enabledPages={enabledPages}
        onEnabled={() => {
          setJustEnabled(true);
          revalidator.revalidate();
        }}
      />
    );
  }

  return (
    <SelfAssessmentPage
      accounts={loaderData.accounts ?? []}
      records={loaderData.records ?? []}
      userProfile={userProfile}
    />
  );
};

type LoaderData = ReturnType<typeof useLoaderData<typeof loader>>;

const SelfAssessmentPage: FC<{
  records: TaxRecord[];
  userProfile: LoaderData["userProfile"];
  accounts?: LoaderData["accounts"];
}> = ({ records: initialRecords, userProfile, accounts = [] }) => {
  const [searchParams] = useSearchParams();

  // Which year's rates apply today, and whether that is a fallback (E22)
  const ratesContext = useMemo(() => getUkTaxYearContext(), []);
  const currentTaxYear = getCurrentUKTaxYear();

  // Saved figures only (audit slice 8): no browser baseline stands in for them.
  const profileSalary = salaryProfileFirst(userProfile);
  // The share of each rental property comes from its account (owner decision 6), never a field.
  const taxAccounts = accounts as readonly TaxAccount[];

  // Null while the salary is not known: the panels show the "add your salary" prompt, and the
  // calculation counts it as none.
  const [payeSalary, setPayeSalary] = useState<number | null>(profileSalary);
  // A saved figure that changes (a save here or elsewhere, then revalidation) replaces the field,
  // unless the user has an unsaved edit in it.
  const [seededSalary, setSeededSalary] = useState(profileSalary);
  if (seededSalary !== profileSalary) {
    setSeededSalary(profileSalary);
    if (payeSalary === seededSalary) setPayeSalary(profileSalary);
  }
  const [isProfileSaving, setIsProfileSaving] = useState<boolean>(false);

  // Current tax year plus any year with records, limited to years the engine supports (E22).
  const availableYears = useMemo(
    () => availableTaxYears(initialRecords, currentTaxYear),
    [currentTaxYear, initialRecords],
  );

  // A source page's back link carries its year (`?year=2026-27`), so the list opens on it.
  const [chosenYear, setChosenYear] = useState<string>(
    () => taxYearFromParam(searchParams.get("year")) ?? currentTaxYear,
  );
  const selectedTaxYear = resolveSelectedTaxYear(chosenYear, availableYears, currentTaxYear);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);

  const editor = useTaxRecordEditor({
    records: initialRecords,
    taxYear: selectedTaxYear,
    accounts: taxAccounts,
  });
  const { fetcher, saveOutcome } = editor;

  const [taxYearToDelete, setTaxYearToDelete] = useState<string | null>(null);
  const deleteTaxYearOutcome = useFetcherOutcome(fetcher, {
    onSuccess: () => setTaxYearToDelete(null),
  });

  // The engine's one rule (estimateInputsFor), as the Dashboard: a self-employed person's salary
  // is not PAYE pay, and a year whose estimate depends on a fact not set has no figure.
  const employmentType = userProfile?.employmentType ?? null;
  const taxRegion = userProfile?.taxRegion ?? null;
  const { calculatedTaxYearsData, missingByYear } = useMemo(() => {
    const results: Record<string, TaxCalculationResult> = {};
    const missing: Record<string, TaxEstimateMissingFact[]> = {};
    for (const year of availableYears) {
      // calculateUKTax is strict and throws for unsupported years (E22).
      if (!isSupportedUkTaxYear(year)) continue;
      const inputs = estimateInputsFor(
        { employmentType, annualSalary: payeSalary, taxRegion, accounts: taxAccounts },
        initialRecords,
        year,
      );
      if (inputs.status === "known") {
        results[year] = calculateEstimatedTax(inputs);
      } else {
        missing[year] = inputs.missing;
      }
    }
    return { calculatedTaxYearsData: results, missingByYear: missing };
  }, [availableYears, initialRecords, payeSalary, employmentType, taxRegion, taxAccounts]);

  const activeYearData: TaxCalculationResult | undefined = calculatedTaxYearsData[selectedTaxYear];
  // The fact to add when the selected year's estimate cannot be worked out.
  const missingFact = addableEstimateFact(missingByYear[selectedTaxYear]);

  const handleSaveProfile = useCallback(() => {
    setIsProfileSaving(true);
    saveOutcome.begin();
    fetcher.submit(
      {
        intent: "update-profile",
        // Empty saves no salary (null); a typed 0 saves 0.
        annualSalary: payeSalary === null ? "" : payeSalary.toString(),
        ...versionField(userProfile, PROFILE_VERSION_FIELD),
      },
      { method: "POST" },
    );
    setTimeout(() => setIsProfileSaving(false), 800);
  }, [payeSalary, fetcher, userProfile, saveOutcome.begin]);

  const recordsInSelectedTaxYear = useMemo(
    () => initialRecords.filter((r) => getTaxYearForRecordDate(r.date) === selectedTaxYear),
    [initialRecords, selectedTaxYear],
  );
  const hasRecordsInYear = initialRecords.some((r) => isRecordActiveInTaxYear(r, selectedTaxYear));
  // The records drawer groups the year's records by income source.
  const sourceGroups = SOURCE_PAGE_ORDER.filter((source) =>
    initialRecords.some((r) => r.source === source && isRecordActiveInTaxYear(r, selectedTaxYear)),
  );
  // Records that count towards none of the years on offer (dated outside the supported years,
  // saved before the dialog checked). They stay listed under every year, so each can still be
  // opened, changed or deleted.
  const isOtherDate = useCallback(
    (r: TaxRecord) => !availableYears.some((year) => isRecordActiveInTaxYear(r, year)),
    [availableYears],
  );
  const otherDateRecords = useMemo(
    () => initialRecords.filter(isOtherDate),
    [initialRecords, isOtherDate],
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

  // "Add an expense" starts on the source of the year's first income outside PAYE (rent, say).
  const expenseSource: TaxSource =
    initialRecords.find(
      (r) =>
        r.source !== "paye" && r.type === "income" && isRecordActiveInTaxYear(r, selectedTaxYear),
    )?.source ?? "self-employed";
  const previousTaxYear = getPreviousTaxYear(selectedTaxYear);
  const countFormat = new Intl.NumberFormat("en-GB");

  const addIncome = (
    <AddIncomeMenu onAdd={editor.openAdd} onCopyFromLastYear={() => setIsCopyModalOpen(true)} />
  );
  // The one "Unverified estimate" notice goes only where an estimate is shown: a year with
  // untaxed income outside PAYE, which the engine says by giving an estimate or naming the fact it
  // is missing. A year with expenses only, or ISA interest only, has no estimate, so no notice.
  const hasNonPayeIncome = activeYearData !== undefined || missingFact !== null;
  const showEstimate = activeYearData !== undefined;
  // Rental records counted in full until they are linked (owner decision 6), and the share each
  // linked property gives, read from Accounts.
  const shareNotice = rentalShareNotice(taxAccounts, initialRecords, selectedTaxYear);
  const shareLines = rentalShareLines(taxAccounts, initialRecords, selectedTaxYear);
  const offers = calculatedInterestOffers({
    accounts: taxAccounts,
    records: initialRecords,
    taxYear: selectedTaxYear,
  });
  const unknownAction =
    missingFact === "selfEmploymentRecords" ? (
      <Button
        size="sm"
        type="button"
        variant="secondary"
        onClick={() => editor.openAdd("self-employed", "income")}
      >
        {ESTIMATE_MISSING_PROMPT.selfEmploymentRecords.actionLabel}
      </Button>
    ) : missingFact === "annualSalary" ? (
      <ButtonLink asChild size="sm" variant="secondary">
        <Link to={SALARY_SETTINGS_PATH}>{ESTIMATE_MISSING_PROMPT.annualSalary.actionLabel}</Link>
      </ButtonLink>
    ) : undefined;

  return (
    <PageBody className={pageRoot()} data-testid="tax-page">
      <PageHeader
        illustration="empty-accounts"
        title={PAGE_TITLE}
        subtitle="Income outside PAYE, its expenses and an estimated tax bill for each tax year."
        actions={
          <div className={headerActions()}>
            <TaxYearBar
              years={availableYears}
              selectedYear={selectedTaxYear}
              onSelectYear={setChosenYear}
            />
            {/* From `md` only: under it the h1's row has room for the year alone, and the same
                action sits at the foot of the records. */}
            {recordsInSelectedTaxYear.length > 0 ? (
              <span className={wideOnly()}>
                <Menu
                  align="end"
                  aria-label={`More for ${selectedTaxYear}`}
                  id="tax-year-menu"
                  items={[
                    {
                      id: "delete-tax-year",
                      label: `Delete all records for ${selectedTaxYear}`,
                      tone: "danger",
                      onSelect: () => setTaxYearToDelete(selectedTaxYear),
                    },
                  ]}
                  trigger={
                    <IconButton label={`More for ${selectedTaxYear}`} size="sm" variant="outline">
                      <Icon icon={MoreHorizontal} size="sm" />
                    </IconButton>
                  }
                />
              </span>
            ) : null}
          </div>
        }
      />

      <TaxRatesStatusBanner {...ratesContext} />

      {saveOutcome.error && !editor.isRecordDialogOpen ? (
        <p className={errorText()} role="alert">
          {saveOutcome.error}
        </p>
      ) : null}

      {initialRecords.length === 0 ? (
        // Nothing added in any year: the page's one empty state and its one button (P54), not a
        // "Not set" bill card.
        <EmptyState
          action={addIncome}
          description="Such as self-employment, rent, savings interest or dividends."
          id="tax-empty"
          size="sm"
          tone="card"
          title="Add income outside PAYE to see an estimated tax bill"
        />
      ) : (
        <TaxHeadline
          emptyAction={hasRecordsInYear ? undefined : addIncome}
          onAddExpense={() => editor.openAdd(expenseSource, "expense")}
          result={activeYearData}
          taxYear={selectedTaxYear}
          unknownAction={unknownAction}
          unknownPrompt={missingFact ? ESTIMATE_MISSING_PROMPT[missingFact].prompt : undefined}
        />
      )}

      {/* How the estimate is worked out sits with the estimate, before the list of sources. */}
      {/* Shown while the estimate is unknown too, so the salary can be typed in here. */}
      {hasNonPayeIncome && (activeYearData || missingFact) ? (
        <CollapsibleDrawer title="How the estimate is worked out" variant="quiet">
          <TaxReservePanel
            taxYear={selectedTaxYear}
            result={activeYearData}
            totalIncome={activeYearData?.totalGrossIncome || (payeSalary ?? 0)}
            payeSalary={payeSalary}
            onPayeSalaryChange={setPayeSalary}
            rentalShares={shareLines}
            onSave={handleSaveProfile}
            saving={isProfileSaving}
          />
        </CollapsibleDrawer>
      ) : null}

      <TaxSourcesPanel
        // The add menu sits in the hero or the empty state until the year has records, so it is
        // never offered twice (P25).
        action={hasRecordsInYear ? addIncome : undefined}
        btlAccounts={(
          accounts as Array<{
            id?: string;
            name?: string;
            type?: string;
            accountSubtype?: string | null;
          }>
        )
          .filter((a) => categorizeAccountType(a.type) === "mortgages" && isBuyToLetAccount(a))
          .map((a) => ({ id: String(a.id ?? ""), name: String(a.name ?? "Buy-to-let mortgage") }))}
        records={initialRecords}
        taxYear={selectedTaxYear}
      />

      <CalculatedFigures
        offers={offers}
        pending={editor.saving}
        taxYear={selectedTaxYear}
        onAdd={editor.addCalculated}
      />

      <div className={drawers()}>
        {hasRecordsInYear || otherDateRecords.length > 0 ? (
          <CollapsibleDrawer title="Records" variant="quiet">
            {/* One table per income source, in the page's source order. */}
            {sourceGroups.length > 0 ? (
              sourceGroups.map((source) => (
                <div key={source} className={recordGroup()} data-testid={`tax-records-${source}`}>
                  <h3 className={recordGroupHeading()}>{SOURCE_LABEL[source]}</h3>
                  <TaxRecordsTable
                    caption={`${SOURCE_LABEL[source]} records for ${selectedTaxYear}`}
                    include={(r) =>
                      r.source === source && isRecordActiveInTaxYear(r, selectedTaxYear)
                    }
                    records={initialRecords}
                    taxYear={selectedTaxYear}
                    onEdit={editor.openEdit}
                    onDelete={editor.requestDelete}
                    onViewReceipt={editor.viewReceipt}
                    onAdd={() => editor.openAdd(source, "income")}
                  />
                </div>
              ))
            ) : (
              <TaxRecordsTable
                records={initialRecords}
                taxYear={selectedTaxYear}
                onEdit={editor.openEdit}
                onDelete={editor.requestDelete}
                onViewReceipt={editor.viewReceipt}
                onAdd={() => editor.openAdd("self-employed", "income")}
              />
            )}
            {otherDateRecords.length > 0 ? (
              <>
                <h3 className={otherDatesHeading()}>
                  {`Other dates (${countFormat.format(otherDateRecords.length)})`}
                </h3>
                <TaxRecordsTable
                  caption="Records on other dates"
                  include={isOtherDate}
                  records={initialRecords}
                  taxYear={selectedTaxYear}
                  onEdit={editor.openEdit}
                  onDelete={editor.requestDelete}
                  onViewReceipt={editor.viewReceipt}
                  onAdd={() => editor.openAdd("self-employed", "income")}
                />
              </>
            ) : null}
            {recordsInSelectedTaxYear.length > 0 ? (
              <Button
                className={narrowOnly()}
                size="sm"
                type="button"
                variant="dangerSubtle"
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
              salaryKnown={payeSalary !== null}
            />
          </CollapsibleDrawer>
        ) : null}
      </div>

      {/* The page's one notice, at its foot, under everything it covers. */}
      {showEstimate ? (
        <ProjectionNotice
          lead={
            <EstimateNoticeLead scottish={taxRegion === "SCOTLAND"} shareNotice={shareNotice} />
          }
        />
      ) : null}

      {editor.dialogs}

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
        scope="bulk"
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
        description={
          <>
            Deletes the{" "}
            <span className={numeric()}>{countFormat.format(recordsInSelectedTaxYear.length)}</span>{" "}
            records dated in <span className={numeric()}>{taxYearToDelete}</span>. Records that
            started in an earlier year and repeat into this one are kept. This cannot be undone.
          </>
        }
        confirmLabel="Delete records"
        tone="danger"
        onConfirm={confirmDeleteTaxYear}
      />
    </PageBody>
  );
};

export default TaxContainer;
