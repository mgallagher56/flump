import {
  calculateEstimatedTax,
  calculateUKTax,
  compareExpensesWithAllowance,
  estimateInputsFor,
  estimateOptionsFor,
  getCurrentUKTaxYear,
  getUkTaxYearRules,
  isLegacySalaryRecord,
  isRecordActiveInTaxYear,
  isSupportedUkTaxYear,
  recordedTotalsForTaxYear,
  scottishRatesRefusal,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  Icon,
  Illustration,
  KpiCard,
  KpiStrip,
  PageBody,
  PageHeader,
  PageSection,
  ProjectionNotice,
} from "@repo/ui";
import { ArrowLeft, List, Plus } from "lucide-react";
import { type FC, useMemo } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { AllowanceComparison } from "~/features/tax/components/AllowanceComparison";
import { CalculatedFigures } from "~/features/tax/components/CalculatedFigures";
import { TaxRecordsTable } from "~/features/tax/components/TaxRecordsTable";
import { TaxYearBar } from "~/features/tax/components/TaxYearBar";
import { availableTaxYears, resolveSelectedTaxYear } from "~/features/tax/hooks/taxYears";
import { useTaxRecordEditor } from "~/features/tax/hooks/useTaxRecordEditor";
import {
  calculatedInterestOffers,
  rentalShareNotice,
  type TaxAccount,
  uniformRentalShare,
} from "~/features/tax/linkedAccounts";
import {
  selfAssessmentPath,
  sourcePagePath,
  taxYearFromParam,
  taxYearToParam,
} from "~/features/tax/source-pages";
import {
  addableEstimateFact,
  ESTIMATE_MISSING_PROMPT,
  SALARY_SETTINGS_PATH,
  SOURCE_LABEL,
} from "~/features/tax/tax-labels";
import type { loader } from "~/routes/app.self-assessment_.$source";
import { salaryProfileFirst } from "~/utils/profileFirst";
import { EstimateNoticeLead } from "./TaxContainer";
import { addActions, backLink, errorText, pageRoot } from "./TaxSourceContainer.styles";

/** What each page says under its title: one sentence, no figures. */
const DESCRIPTION: Record<TaxSource, string> = {
  "self-employed": "Income and expenses from working for yourself, for one tax year.",
  rental: "Rent and expenses for the whole property, for one tax year.",
  savings: "Interest, dividends and fees, for one tax year. Fees are not taken off for tax.",
  paye: "Bonuses, taxable benefits and pension contributions on top of your salary.",
};

/** The year's income and expenses for one source, before any allowance (engine). */
const sourceTotals = (records: TaxRecord[], source: TaxSource, taxYear: string) =>
  recordedTotalsForTaxYear(records, taxYear, source);

/**
 * One income source's page: its income and expenses for a tax year, the allowance beside the
 * recorded expenses (self-employed and rental), and its records, with adding, editing and
 * deleting scoped to the source. The tax year comes from `?year=2026-27`, the current year by
 * default; changing it keeps the page and updates the link.
 */
const TaxSourceContainer: FC = () => {
  const { source, records = [], userProfile, accounts = [] } = useLoaderData<typeof loader>();
  const taxAccounts = accounts as readonly TaxAccount[];
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTaxYear = getCurrentUKTaxYear();

  const years = useMemo(
    () => availableTaxYears(records, currentTaxYear),
    [records, currentTaxYear],
  );
  const taxYear = resolveSelectedTaxYear(
    taxYearFromParam(searchParams.get("year")),
    years,
    currentTaxYear,
  );
  const selectYear = (year: string) =>
    setSearchParams({ year: taxYearToParam(year) }, { replace: true, preventScrollReset: true });

  const editor = useTaxRecordEditor({ records, taxYear, accounts: taxAccounts });

  // The estimate uses the saved profile salary and region, and each rental property's share from
  // Accounts, as the list page does, through the engine's one rule (estimateInputsFor): a
  // self-employed person's salary is not PAYE pay, and an estimate that depends on a fact not set
  // is unknown, as on the Dashboard.
  const employmentType = userProfile?.employmentType ?? null;
  const taxRegion = userProfile?.taxRegion ?? null;
  const annualSalary = salaryProfileFirst(userProfile);
  const inputs = useMemo(
    () =>
      estimateInputsFor(
        { employmentType, annualSalary, taxRegion, accounts: taxAccounts },
        records,
        taxYear,
      ),
    [employmentType, annualSalary, taxRegion, taxAccounts, records, taxYear],
  );
  // The source's gross income and expenses do not depend on the salary, so they are read from
  // the ledger either way. What the estimate used (the allowance, a tie) is read only when known.
  const result = useMemo(() => {
    if (inputs.status === "known") return calculateEstimatedTax(inputs);
    const options = estimateOptionsFor({ taxRegion, accounts: taxAccounts });
    // Only the source's income and expense totals are read from this ledger, and they do not
    // depend on the region. A year with no Scottish rates would refuse the ledger, so the totals
    // are read under the other UK bands; no tax figure from it is shown (`estimate` stays unset).
    const scottishRefused =
      isSupportedUkTaxYear(taxYear) &&
      scottishRatesRefusal(getUkTaxYearRules(taxYear), options.region) !== null;
    return calculateUKTax(
      taxYear,
      // A legacy PAYE salary record never stands in for the saved salary (slice 6).
      records.filter((r) => !isLegacySalaryRecord(r)),
      0,
      100,
      scottishRefused ? { ...options, region: "ENGLAND_NI_WALES" } : options,
    );
  }, [taxYear, records, inputs, taxRegion, taxAccounts]);
  // One share for every rental record in the year, when they share one, for the comparison's note.
  const rentalShare = uniformRentalShare(taxAccounts, records, taxYear);
  const offers =
    source === "rental" || source === "savings"
      ? calculatedInterestOffers({ accounts: taxAccounts, records, taxYear }).filter((o) =>
          source === "rental" ? o.kind === "mortgage_interest" : o.kind === "savings_interest",
        )
      : [];
  const shareNotice = source === "rental" ? rentalShareNotice(taxAccounts, records, taxYear) : null;
  const estimate = inputs.status === "known" ? result : undefined;
  const missingFact = inputs.status === "unknown" ? addableEstimateFact(inputs.missing) : null;
  // The one quiet line in place of the estimate when the year's rates are not published.
  const refusalNotice = inputs.status === "refused" ? inputs.refusal.notice : null;

  const label = SOURCE_LABEL[source];
  const { income, expenses } = sourceTotals(records, source, taxYear);
  const recordCount = records.filter(
    (r) => r.source === source && isRecordActiveInTaxYear(r, taxYear),
  ).length;

  const comparison =
    source === "self-employed" && (income > 0 || expenses > 0)
      ? {
          value: compareExpensesWithAllowance({
            source,
            taxYear,
            grossIncome: result.seIncomeGross,
            recordedExpenses: result.seExpenses,
          }),
          used: estimate ? estimate.tradingAllowanceUsed : null,
        }
      : source === "rental" && (income > 0 || expenses > 0)
        ? {
            // The person's share of each record, from its account (owner decision 6).
            value: compareExpensesWithAllowance({
              source,
              taxYear,
              grossIncome: result.rentalIncomeGrossShare,
              recordedExpenses: result.rentalExpensesExclInterestShare,
              financeCosts: result.rentalMortgageInterestShare,
              ownershipSharePct: 100,
            }),
            used: estimate ? estimate.propertyAllowanceUsed : null,
          }
        : null;

  const addButtons = (
    <span className={addActions()}>
      <Button
        size="sm"
        type="button"
        variant="outline"
        onClick={() => editor.openAdd(source, "income")}
      >
        <Icon icon={Plus} size="sm" />
        Add income
      </Button>
      <Button
        size="sm"
        type="button"
        variant="outline"
        onClick={() => editor.openAdd(source, "expense")}
      >
        <Icon icon={Plus} size="sm" />
        Add expense
      </Button>
    </span>
  );

  return (
    <PageBody className={pageRoot()} data-testid="tax-source-page">
      <Link className={backLink()} to={selfAssessmentPath(taxYear)}>
        <Icon icon={ArrowLeft} size="sm" />
        Back to Self Assessment
      </Link>

      <PageHeader
        actions={<TaxYearBar years={years} selectedYear={taxYear} onSelectYear={selectYear} />}
        description={DESCRIPTION[source]}
        illustration="empty-accounts"
        title={label}
      />

      {editor.saveOutcome.error && !editor.isRecordDialogOpen ? (
        <p className={errorText()} role="alert">
          {editor.saveOutcome.error}
        </p>
      ) : null}

      {recordCount > 0 ? (
        <KpiStrip columns={2}>
          <KpiCard
            label="Income"
            subtext={source === "rental" ? "Whole property, this tax year" : "This tax year"}
            value={income}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            label="Expenses"
            notSetLabel="No expenses recorded"
            subtext={source === "rental" ? "Whole property, this tax year" : "This tax year"}
            value={expenses > 0 ? expenses : null}
            valueFormat={{ fractionDigits: 0 }}
          />
        </KpiStrip>
      ) : null}

      {comparison ? (
        <AllowanceComparison
          allowanceUsedInEstimate={comparison.used}
          comparison={comparison.value}
          ownershipSharePct={source === "rental" ? (rentalShare ?? undefined) : undefined}
          routesTie={source === "rental" ? estimate?.propertyRoutesTie : undefined}
          unknownEstimate={
            refusalNotice ? (
              <span>{refusalNotice}</span>
            ) : missingFact ? (
              <>
                <span>{ESTIMATE_MISSING_PROMPT[missingFact].prompt}</span>{" "}
                <Link
                  to={
                    missingFact === "annualSalary"
                      ? SALARY_SETTINGS_PATH
                      : sourcePagePath("self-employed", taxYear)
                  }
                >
                  {ESTIMATE_MISSING_PROMPT[missingFact].actionLabel}
                </Link>
              </>
            ) : undefined
          }
        />
      ) : null}

      {/* The page's one notice, under the allowance comparison it covers, only with an estimate.
          A Scottish taxpayer's bands note folds into it (SA-3). */}
      {comparison && estimate ? (
        <ProjectionNotice
          lead={
            <EstimateNoticeLead scottish={taxRegion === "SCOTLAND"} shareNotice={shareNotice} />
          }
        />
      ) : null}

      <CalculatedFigures
        offers={offers}
        pending={editor.saving}
        taxYear={taxYear}
        onAdd={editor.addCalculated}
      />

      <PageSection
        action={recordCount > 0 ? addButtons : undefined}
        domain="tax"
        icon={List}
        id={`tax-source-records-${source}`}
        title="Records"
      >
        {recordCount > 0 ? (
          <CollapsibleDrawer
            defaultOpen={recordCount <= 8}
            itemCount={recordCount}
            itemNoun={{ one: "record", other: "records" }}
            title={`${label} records for ${taxYear}`}
            variant="quiet"
          >
            <TaxRecordsTable
              caption={`${label} records for ${taxYear}`}
              include={(r) => r.source === source && isRecordActiveInTaxYear(r, taxYear)}
              records={records}
              taxYear={taxYear}
              onAdd={() => editor.openAdd(source, "income")}
              onDelete={editor.requestDelete}
              onEdit={editor.openEdit}
              onViewReceipt={editor.viewReceipt}
            />
          </CollapsibleDrawer>
        ) : (
          <EmptyState
            action={addButtons}
            description="Add income or an expense and it will appear here."
            headingLevel="h3"
            illustration={<Illustration scene="empty-accounts" size="sm" />}
            size="sm"
            title={`No records for ${taxYear}`}
          />
        )}
      </PageSection>

      {editor.dialogs}
    </PageBody>
  );
};

export default TaxSourceContainer;
