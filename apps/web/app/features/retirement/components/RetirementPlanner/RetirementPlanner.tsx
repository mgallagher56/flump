import type {
  RetirementBudgetLineStatusDto,
  RetirementPlanDto,
  UpsertRetirementPlanRequest,
} from "@flump/api-contract";
import {
  type AccountDetailInput,
  type BudgetEntryItem,
  calculateRetirementPlan,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
  isHousingBudgetLine,
  type RetirementBudgetTargetLine,
  type RetirementGrowthCase,
  type RetirementHousingInput,
  type RetirementPotAccountInput,
  selectRetirementCountedSeries,
  toSnapshotRows,
  UK_STATE_PENSION_AGE,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  HeroFigure,
  KpiCard,
  KpiStrip,
  PageBody,
  PageHeader,
  PageSection,
  ProjectionNotice,
  ResultBlock,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { Calendar, Compass } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import {
  budgetLineAmount,
  budgetLineItem,
  budgetLineName,
  budgetLinesList,
  caseRow,
  controlsCard,
  fieldGroup,
  fieldLabel,
  inputControl,
  mutedNote,
  plannerStack,
  resultsStack,
  scheduleCell,
  scheduleHeaderCell,
  scheduleTable,
  toggleRow,
} from "./RetirementPlanner.styles";

export interface RetirementPlannerProps {
  currentAge: number;
  accounts: readonly RetirementPotAccountInput[];
  accountDetails: readonly AccountDetailInput[];
  budgetEntries: readonly BudgetEntryItem[];
  housing: Omit<RetirementHousingInput, "currentAge" | "retirementAge" | "planToAge">;
  savedPlan: RetirementPlanDto | null;
  etag?: string | null;
  isSaving?: boolean;
  onSavePlan?: (payload: UpsertRetirementPlanRequest, etag: string | null) => void;
}

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function formatWholeGbp(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded < 0) return `-${gbpFormatter.format(Math.abs(rounded))}`;
  return gbpFormatter.format(rounded);
}

const CASE_LABELS: Record<RetirementGrowthCase, string> = {
  lower: "Lower case (2%)",
  middle: "Middle case (5%)",
  higher: "Higher case (8%)",
};

const HOUSING_LABELS: Record<string, string> = {
  "mortgage-ends-before-retirement": "Mortgage ends before retirement",
  "mortgage-continues": "Mortgage continues in retirement",
  "rent-for-life": "Renting for life",
  "own-outright": "Own outright",
  custom: "Custom housing figure",
};

export const RetirementPlanner: FC<RetirementPlannerProps> = ({
  currentAge,
  accounts,
  accountDetails,
  budgetEntries,
  housing,
  savedPlan,
  etag = null,
  isSaving = false,
  onSavePlan,
}) => {
  const [retirementAge, setRetirementAge] = useState<number>(
    savedPlan?.retirementAge ?? Math.max(currentAge + 1, 67),
  );
  const [planToAge, setPlanToAge] = useState<number>(
    savedPlan?.planToAge ?? Math.max((savedPlan?.retirementAge ?? 67) + 1, 90),
  );
  const [selectedCase, setSelectedCase] = useState<RetirementGrowthCase>("middle");
  const [extraMonthly, setExtraMonthly] = useState<number>(0);

  const initialTargetMode = savedPlan?.target?.kind ?? "typed";
  const [targetMode, setTargetMode] = useState<"typed" | "budget">(initialTargetMode);
  const [typedTargetInput, setTypedTargetInput] = useState<string>(
    savedPlan?.target?.kind === "typed" ? String(savedPlan.target.yearlyAmount) : "",
  );
  const [lineStatuses, setLineStatuses] = useState<Record<string, RetirementBudgetLineStatusDto>>(
    () => {
      const map: Record<string, RetirementBudgetLineStatusDto> = {};
      if (savedPlan?.target?.kind === "budget") {
        for (const item of savedPlan.target.lineSettings) {
          map[item.budgetEntryId] = item.status;
        }
      }
      return map;
    },
  );

  const [statePensionAge, setStatePensionAge] = useState<number>(
    savedPlan?.statePensionAge ?? UK_STATE_PENSION_AGE,
  );
  const [qualifyingYears, setQualifyingYears] = useState<number>(
    savedPlan?.statePensionQualifyingYears ?? 35,
  );
  const [forecastInput, setForecastInput] = useState<string>(
    savedPlan?.statePensionAnnualForecastGbp !== null &&
      savedPlan?.statePensionAnnualForecastGbp !== undefined
      ? String(savedPlan.statePensionAnnualForecastGbp)
      : "",
  );

  const nonHousingBudgetLines = useMemo(
    () =>
      budgetEntries.filter(
        (entry) =>
          !entry.isIncome &&
          !isHousingBudgetLine({ category: entry.category }) &&
          entry.category.trim().toLowerCase() !== "savings",
      ),
    [budgetEntries],
  );

  const effectiveTarget = useMemo(() => {
    if (targetMode === "typed") {
      const trimmed = typedTargetInput.trim();
      if (trimmed === "") return null;
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num < 0) return null;
      return { kind: "typed" as const, yearlyAmount: num };
    }
    if (nonHousingBudgetLines.length === 0) return null;
    const lines: RetirementBudgetTargetLine[] = nonHousingBudgetLines.map((entry) => ({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      amount: entry.amount,
      frequency: entry.frequency,
      isIncome: entry.isIncome,
      status: lineStatuses[entry.id] ?? "continues",
    }));
    return { kind: "budget" as const, lines };
  }, [targetMode, typedTargetInput, nonHousingBudgetLines, lineStatuses]);

  const savedForecastNum = useMemo(() => {
    const trimmed = forecastInput.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [forecastInput]);

  const growthRates = savedPlan?.growthRates ?? DEFAULT_RETIREMENT_GROWTH_CASES;
  const inflationRate = savedPlan?.inflationRate ?? DEFAULT_RETIREMENT_INFLATION_RATE;

  const safePlanToAge = Math.max(retirementAge + 1, planToAge);
  const safeRetirementAge = Math.max(currentAge, retirementAge);

  const savedResult = useMemo(
    () =>
      calculateRetirementPlan({
        currentAge,
        retirementAge: savedPlan?.retirementAge ?? safeRetirementAge,
        planToAge: Math.max(
          (savedPlan?.retirementAge ?? safeRetirementAge) + 1,
          savedPlan?.planToAge ?? safePlanToAge,
        ),
        accounts,
        target: effectiveTarget,
        housing: {
          ...housing,
          override: savedPlan?.housingOverride ?? housing.override,
        },
        statePension: {
          statePensionAge,
          annualForecastGbp: savedForecastNum,
          qualifyingYears,
        },
        assumptions: {
          growthRates,
          inflationRate,
          cashSavingsNominalRate: savedPlan?.cashSavingsNominalRate ?? undefined,
          realRentGrowthRate: savedPlan?.realRentGrowthRate ?? undefined,
        },
      }),
    [
      currentAge,
      savedPlan,
      safeRetirementAge,
      safePlanToAge,
      accounts,
      effectiveTarget,
      housing,
      statePensionAge,
      savedForecastNum,
      qualifyingYears,
      growthRates,
      inflationRate,
    ],
  );

  const scenarioResult = useMemo(
    () =>
      calculateRetirementPlan({
        currentAge,
        retirementAge: safeRetirementAge,
        planToAge: safePlanToAge,
        accounts,
        additionalMonthlyPensionContributionGbp: extraMonthly,
        target: effectiveTarget,
        housing: {
          ...housing,
          override: savedPlan?.housingOverride ?? housing.override,
        },
        statePension: {
          statePensionAge,
          annualForecastGbp: savedForecastNum,
          qualifyingYears,
        },
        assumptions: {
          growthRates,
          inflationRate,
          cashSavingsNominalRate: savedPlan?.cashSavingsNominalRate ?? undefined,
          realRentGrowthRate: savedPlan?.realRentGrowthRate ?? undefined,
        },
      }),
    [
      currentAge,
      safeRetirementAge,
      safePlanToAge,
      accounts,
      extraMonthly,
      effectiveTarget,
      housing,
      savedPlan,
      statePensionAge,
      savedForecastNum,
      qualifyingYears,
      growthRates,
      inflationRate,
    ],
  );

  const countedSeries = useMemo(() => {
    const withId = accounts
      .filter((a): a is RetirementPotAccountInput & { id: string } => Boolean(a.id))
      .map((a) => ({ ...a, id: String(a.id) }));
    return selectRetirementCountedSeries(withId, toSnapshotRows(accountDetails));
  }, [accounts, accountDetails]);

  const handleSave = () => {
    if (!onSavePlan) return;
    const payload: UpsertRetirementPlanRequest = {
      retirementAge: safeRetirementAge,
      planToAge: safePlanToAge,
      statePensionAge,
      statePensionAnnualForecastGbp: savedForecastNum,
      statePensionQualifyingYears: qualifyingYears,
      target:
        targetMode === "typed"
          ? effectiveTarget?.kind === "typed"
            ? effectiveTarget
            : null
          : {
              kind: "budget",
              lineSettings: nonHousingBudgetLines.map((entry) => ({
                budgetEntryId: entry.id,
                status: lineStatuses[entry.id] ?? "continues",
              })),
            },
    };
    onSavePlan(payload, etag);
  };

  const heroSubline =
    savedResult.targetYearlyIncome !== null && savedResult.differenceYearly !== null
      ? `Your target: ${formatWholeGbp(savedResult.targetYearlyIncome)} a year. Difference: ${formatWholeGbp(savedResult.differenceYearly.middle)} a year.`
      : "No yearly target set yet. Enter your own target below to compare.";

  const selectedEstimatedIncome = scenarioResult.estimatedYearlyIncomeGbp[selectedCase];
  const selectedDifference = scenarioResult.differenceYearly
    ? scenarioResult.differenceYearly[selectedCase]
    : null;

  return (
    <PageBody>
      <div className={plannerStack()}>
        <PageHeader title="Retirement plan" subtitle="All figures in today's prices, before tax." />

        <HeroFigure
          label={`Estimated income from age ${savedResult.retirementAge}`}
          value={savedResult.estimatedYearlyIncomeGbp.middle}
          estimateLabel="Unverified estimate"
          subline={heroSubline}
          explain="Built from accounts that count towards retirement, your State Pension details, and your housing in retirement in today's prices."
        />

        <KpiStrip
          items={[
            <KpiCard
              key="sp"
              label="State Pension"
              value={formatWholeGbp(savedResult.statePension.annualAmountGbp)}
              subtext={`From age ${savedResult.statePension.statePensionAge}`}
            />,
            <KpiCard
              key="pensions"
              label="Pensions at retirement"
              value={formatWholeGbp(savedResult.projectedPotByGroupGbp.pensions.middle)}
              subtext="Middle case (5% nominal)"
            />,
            <KpiCard
              key="isa-savings"
              label="ISAs and savings"
              value={formatWholeGbp(
                savedResult.projectedPotByGroupGbp.investments.middle +
                  savedResult.projectedPotByGroupGbp.savings,
              )}
              subtext="At retirement age"
            />,
            <KpiCard
              key="housing"
              label="Housing in retirement"
              value={formatWholeGbp(savedResult.housing.averageAnnualCostGbp)}
              subtext={HOUSING_LABELS[savedResult.housing.kind] ?? savedResult.housing.kind}
            />,
          ]}
        />

        <PageSection
          title="Your target and scenario"
          description="Explore changes in today's prices. Changes here are not saved until you select Save plan."
          icon={Compass}
        >
          <SimulatorSplitLayout
            controls={
              <div className={controlsCard()}>
                <SliderField
                  label="Retirement age"
                  value={safeRetirementAge}
                  min={Math.max(50, currentAge)}
                  max={80}
                  step={1}
                  onChange={setRetirementAge}
                  formatValue={(v) => `Age ${v}`}
                />

                <SliderField
                  label="Plan to age"
                  value={safePlanToAge}
                  min={Math.max(safeRetirementAge + 1, 70)}
                  max={105}
                  step={1}
                  onChange={setPlanToAge}
                  formatValue={(v) => `Age ${v}`}
                />

                <SliderField
                  label="Extra monthly contribution"
                  value={extraMonthly}
                  min={0}
                  max={2000}
                  step={50}
                  onChange={setExtraMonthly}
                  formatValue={(v) => formatWholeGbp(v)}
                />

                <div className={fieldGroup()}>
                  <span className={fieldLabel()}>Growth case</span>
                  <div className={toggleRow()}>
                    {(["lower", "middle", "higher"] as const).map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant={selectedCase === c ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setSelectedCase(c)}
                      >
                        {CASE_LABELS[c]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className={fieldGroup()}>
                  <span className={fieldLabel()}>Your yearly target (today's prices)</span>
                  <div className={toggleRow()}>
                    <Button
                      type="button"
                      variant={targetMode === "typed" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setTargetMode("typed")}
                    >
                      Typed figure
                    </Button>
                    <Button
                      type="button"
                      variant={targetMode === "budget" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setTargetMode("budget")}
                    >
                      From budget lines
                    </Button>
                  </div>

                  {targetMode === "typed" ? (
                    <input
                      aria-label="Yearly target in GBP"
                      className={inputControl()}
                      type="text"
                      inputMode="decimal"
                      placeholder="For example 26000"
                      value={typedTargetInput}
                      onChange={(e) => setTypedTargetInput(e.target.value)}
                    />
                  ) : (
                    <div className={budgetLinesList()}>
                      {nonHousingBudgetLines.length === 0 ? (
                        <p className={mutedNote()}>
                          No non-housing spending lines saved in your budget yet.
                        </p>
                      ) : (
                        nonHousingBudgetLines.map((entry) => {
                          const currentStatus = lineStatuses[entry.id] ?? "continues";
                          return (
                            <div key={entry.id} className={budgetLineItem()}>
                              <div>
                                <div className={budgetLineName()}>{entry.name}</div>
                                <div className={budgetLineAmount()}>
                                  {formatWholeGbp(entry.amount)} / {entry.frequency}
                                </div>
                              </div>
                              <div className={toggleRow()}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={currentStatus === "continues" ? "primary" : "secondary"}
                                  onClick={() =>
                                    setLineStatuses((prev) => ({
                                      ...prev,
                                      [entry.id]: "continues",
                                    }))
                                  }
                                >
                                  Continues
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={currentStatus === "stops" ? "primary" : "secondary"}
                                  onClick={() =>
                                    setLineStatuses((prev) => ({ ...prev, [entry.id]: "stops" }))
                                  }
                                >
                                  Stops
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <div className={fieldGroup()}>
                  <label className={fieldLabel()} htmlFor="sp-age-input">
                    State Pension age
                  </label>
                  <input
                    id="sp-age-input"
                    className={inputControl()}
                    type="text"
                    inputMode="numeric"
                    value={String(statePensionAge)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 50 && n <= 85) setStatePensionAge(n);
                    }}
                  />
                </div>

                <div className={fieldGroup()}>
                  <label className={fieldLabel()} htmlFor="sp-years-input">
                    National Insurance qualifying years (0 to 35)
                  </label>
                  <input
                    id="sp-years-input"
                    className={inputControl()}
                    type="text"
                    inputMode="numeric"
                    value={String(qualifyingYears)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 0 && n <= 50) setQualifyingYears(n);
                    }}
                  />
                </div>

                <div className={fieldGroup()}>
                  <label className={fieldLabel()} htmlFor="sp-forecast-input">
                    State Pension forecast (optional, GBP a year)
                  </label>
                  <input
                    id="sp-forecast-input"
                    className={inputControl()}
                    type="text"
                    inputMode="decimal"
                    placeholder="From gov.uk forecast"
                    value={forecastInput}
                    onChange={(e) => setForecastInput(e.target.value)}
                  />
                </div>

                {onSavePlan && (
                  <Button type="button" variant="primary" disabled={isSaving} onClick={handleSave}>
                    {isSaving ? "Saving..." : "Save plan"}
                  </Button>
                )}
              </div>
            }
            content={
              <div className={resultsStack()}>
                <ResultBlock
                  label={`Estimated income from age ${scenarioResult.retirementAge}`}
                  figure={formatWholeGbp(selectedEstimatedIncome)}
                  note={
                    selectedDifference !== null && scenarioResult.targetYearlyIncome !== null
                      ? `Your target: ${formatWholeGbp(scenarioResult.targetYearlyIncome)} a year. Difference: ${formatWholeGbp(selectedDifference)} a year.`
                      : "Enter your own yearly target to compare."
                  }
                  row={{
                    label: "Projected pot at retirement",
                    value: formatWholeGbp(scenarioResult.projectedPotAtRetirementGbp[selectedCase]),
                  }}
                />

                <div className={caseRow()}>
                  <ResultBlock
                    label="Lower case (2%)"
                    figure={formatWholeGbp(scenarioResult.estimatedYearlyIncomeGbp.lower)}
                    row={{
                      label: "Pot at retirement",
                      value: formatWholeGbp(scenarioResult.projectedPotAtRetirementGbp.lower),
                    }}
                  />
                  <ResultBlock
                    label="Middle case (5%)"
                    figure={formatWholeGbp(scenarioResult.estimatedYearlyIncomeGbp.middle)}
                    row={{
                      label: "Pot at retirement",
                      value: formatWholeGbp(scenarioResult.projectedPotAtRetirementGbp.middle),
                    }}
                  />
                  <ResultBlock
                    label="Higher case (8%)"
                    figure={formatWholeGbp(scenarioResult.estimatedYearlyIncomeGbp.higher)}
                    row={{
                      label: "Pot at retirement",
                      value: formatWholeGbp(scenarioResult.projectedPotAtRetirementGbp.higher),
                    }}
                  />
                </div>

                {countedSeries.length > 0 && (
                  <PageSection
                    title="Monthly counted pots"
                    description="Sum of accounts counted towards retirement from your monthly check-ins."
                    icon={Calendar}
                  >
                    <p className={mutedNote()}>
                      Latest recorded month ({countedSeries[countedSeries.length - 1]?.month}):{" "}
                      {formatWholeGbp(
                        countedSeries[countedSeries.length - 1]?.totalCountedGbp ?? 0,
                      )}
                      {countedSeries[countedSeries.length - 1]?.hasCarriedForward
                        ? " (includes carried-forward balances)"
                        : ""}
                    </p>
                  </PageSection>
                )}

                <CollapsibleDrawer title="Assumptions, UK rules and year-by-year schedule">
                  <div className={resultsStack()}>
                    <p className={mutedNote()}>
                      Reference growth band: 2%, 5%, and 8% nominal with{" "}
                      {(inflationRate * 100).toFixed(1)}% inflation, converted to today&apos;s
                      prices. State Pension uses 2026/27 rates and starts at age {statePensionAge}.
                    </p>
                    <table className={scheduleTable()}>
                      <thead>
                        <tr>
                          <th className={scheduleHeaderCell()}>Age</th>
                          <th className={scheduleHeaderCell()}>Pot drawdown</th>
                          <th className={scheduleHeaderCell()}>State Pension</th>
                          <th className={scheduleHeaderCell()}>Housing cost</th>
                          <th className={scheduleHeaderCell()}>Income after housing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenarioResult.yearlySchedule.map((row) => (
                          <tr key={row.age}>
                            <td className={scheduleCell()}>{row.age}</td>
                            <td className={scheduleCell()}>
                              {formatWholeGbp(row.potDrawdownYearly[selectedCase])}
                            </td>
                            <td className={scheduleCell()}>
                              {formatWholeGbp(row.statePensionYearlyGbp)}
                            </td>
                            <td className={scheduleCell()}>
                              {formatWholeGbp(row.housingCostYearlyGbp)}
                            </td>
                            <td className={scheduleCell()}>
                              {formatWholeGbp(row.yearlyIncomeAfterHousing[selectedCase])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleDrawer>

                <ProjectionNotice lead="Unverified estimate." />
              </div>
            }
          />
        </PageSection>
      </div>
    </PageBody>
  );
};
