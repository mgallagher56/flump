import {
  calculateUKTax,
  compareExpensesWithAllowance,
  estimateInputsFor,
  getCurrentUKTaxYear,
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  DELTA_PANEL_COPY,
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
import { TaxRecordsTable } from "~/features/tax/components/TaxRecordsTable";
import { TaxYearBar } from "~/features/tax/components/TaxYearBar";
import { availableTaxYears, resolveSelectedTaxYear } from "~/features/tax/hooks/taxYears";
import { useTaxRecordEditor } from "~/features/tax/hooks/useTaxRecordEditor";
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
  SCOTTISH_BANDS_NOTE,
  SOURCE_LABEL,
} from "~/features/tax/tax-labels";
import type { loader } from "~/routes/app.self-assessment_.$source";
import { useFinancialBaseline } from "~/state/baseline.store";
import { propertyShareProfileFirst, salaryProfileFirst } from "~/utils/profileFirst";
import { addActions, backLink, errorText, pageRoot } from "./TaxSourceContainer.styles";

/** What each page says under its title: one sentence, no figures. */
const DESCRIPTION: Record<TaxSource, string> = {
  "self-employed": "Income and expenses from working for yourself, for one tax year.",
  rental: "Rent and expenses for the whole property, for one tax year.",
  savings: "Taxable interest, dividends and fees, for one tax year.",
  paye: "Bonuses, taxable benefits and pension contributions on top of your salary.",
};

/** The year's income and expenses for one source, before any allowance. */
const sourceTotals = (records: TaxRecord[], source: TaxSource, taxYear: string) => {
  let income = 0;
  let expenses = 0;
  for (const r of records) {
    if (r.source !== source || !isRecordActiveInTaxYear(r, taxYear)) continue;
    const yearly = getRecordAnnualTotalForTaxYear(r, taxYear);
    if (r.type === "income") income += yearly;
    else expenses += yearly;
  }
  return { income, expenses };
};

/**
 * One income source's page: its income and expenses for a tax year, the allowance beside the
 * recorded expenses (self-employed and rental), and its records, with adding, editing and
 * deleting scoped to the source. The tax year comes from `?year=2026-27`, the current year by
 * default; changing it keeps the page and updates the link.
 */
const TaxSourceContainer: FC = () => {
  const { source, records = [], userProfile } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTaxYear = getCurrentUKTaxYear();
  const { baseline } = useFinancialBaseline();

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

  const editor = useTaxRecordEditor({ records, taxYear });

  // The estimate uses the saved profile salary and share, as the list page does, through the
  // engine's one rule (estimateInputsFor): a self-employed person's salary is not PAYE pay, and an
  // estimate that depends on a fact not set is unknown, as on the Dashboard.
  const employmentType = userProfile?.employmentType ?? null;
  const annualSalary = salaryProfileFirst(userProfile, baseline.annualGrossSalary);
  const ownershipShare = propertyShareProfileFirst(userProfile, baseline.propertyOwnershipSharePct);
  const inputs = useMemo(
    () =>
      estimateInputsFor(
        { employmentType, annualSalary, propertyOwnershipShare: ownershipShare },
        records,
        taxYear,
      ),
    [employmentType, annualSalary, ownershipShare, records, taxYear],
  );
  // The source's gross income and expenses do not depend on the salary, so they are read from
  // the ledger either way. What the estimate used (the allowance, a tie) is read only when known.
  const result = useMemo(
    () =>
      calculateUKTax(
        taxYear,
        records,
        inputs.status === "known" ? inputs.payeSalary : 0,
        ownershipShare,
      ),
    [taxYear, records, inputs, ownershipShare],
  );
  const estimate = inputs.status === "known" ? result : undefined;
  const missingFact = inputs.status === "known" ? null : addableEstimateFact(inputs.missing);

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
            value: compareExpensesWithAllowance({
              source,
              taxYear,
              grossIncome: result.rentalIncomeGross,
              recordedExpenses: result.rentalExpensesExclInterest,
              financeCosts: result.rentalMortgageInterest,
              ownershipSharePct: ownershipShare,
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
          ownershipSharePct={source === "rental" ? ownershipShare : undefined}
          routesTie={source === "rental" ? estimate?.propertyRoutesTie : undefined}
          unknownEstimate={
            missingFact ? (
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
            userProfile?.taxRegion === "SCOTLAND" ? (
              <>
                {DELTA_PANEL_COPY.unverifiedBanner} <span>{SCOTTISH_BANDS_NOTE}</span>
              </>
            ) : (
              DELTA_PANEL_COPY.unverifiedBanner
            )
          }
        />
      ) : null}

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
