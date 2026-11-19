import type {
  RetirementBudgetLineStatusDto,
  UpsertRetirementPlanRequest,
} from "@flump/api-contract";
import {
  type AccountDetailInput,
  type BuildRetirementPlanInputArgs,
  buildRetirementPlanInput,
  calculateEvenRealDrawdown,
  calculateRetirementPlan,
  DEFAULT_RETIREMENT_GROWTH_CASES,
  DEFAULT_RETIREMENT_INFLATION_RATE,
  doesAccountCountTowardsRetirement,
  getUkTaxYearRules,
  isHousingBudgetLine,
  type RetirementGrowthCase,
  type RetirementInputBuildResult,
  type RetirementInputOverrides,
  type RetirementPlanResult,
  resolveUkTaxYear,
  selectRetirementCountedSeries,
  toSnapshotRows,
  UK_QUALIFYING_EARNINGS_LOWER,
  UK_QUALIFYING_EARNINGS_UPPER,
} from "@flump/finance-engine";
import {
  Button,
  Checkbox,
  CollapsibleDrawer,
  CurrencyInput,
  formatMoney,
  HeroFigure,
  InfoTip,
  KpiCard,
  KpiStrip,
  type KpiStripItems,
  PageBody,
  PageHeader,
  PageSection,
  PercentInput,
  ProjectionNotice,
  ResultBlock,
  ScenarioZone,
  SimulatorSplitLayout,
  SliderField,
  Th,
  useTableSort,
  WholeNumberInput,
} from "@repo/ui";
import { Calendar, ClipboardList } from "lucide-react";
import { type FC, type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CONTRIBUTION_EDITED_TEXT,
  MAX_CONTRIBUTION_PERCENT,
} from "~/features/pension/contribution";
import { useScenarioState } from "~/hooks/useScenarioState";
import { formatEstimate, roundEstimate } from "~/utils/roundEstimate";
import { MoneyHelperGuidance } from "../MoneyHelperGuidance";
import { RetirementPotChart } from "../RetirementPotChart";
import {
  budgetLineAmount,
  budgetLineItem,
  budgetLineName,
  budgetLinesList,
  checkboxRow,
  controlsCard,
  fieldGrid,
  fieldGroup,
  fieldLabel,
  mutedNote,
  plannerStack,
  promptLink,
  resultsStack,
  scheduleCell,
  scheduleHeaderCell,
  scheduleTable,
  toggleRow,
} from "./RetirementPlanner.styles";

export interface RetirementPlannerProps {
  /** The saved data for the shared engine builder (no what-if overrides). */
  planArgs: BuildRetirementPlanInputArgs;
  accountDetails: readonly AccountDetailInput[];
  etag?: string | null;
  isSaving?: boolean;
  onSavePlan?: (payload: UpsertRetirementPlanRequest, etag: string | null) => void;
}

/** Year of birth lives in the age and pay section of the Profile tab. */
export const PROFILE_PATH = "/app/profile#settings-age-and-pay";
export const STATE_PENSION_AGE_CHECKER_URL = "https://www.gov.uk/state-pension-age";
export const PENSION_DETAILS_PATH = "/app/pension#pension-details";
/** The qualifying earnings InfoTip's hidden text, named by the checkbox (owner item 23). */
const QUALIFYING_INFO_ID = "retirement-qualifying-info";

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const pctFormatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/** A saved, present-day figure: exact whole pounds. */
function formatWholeGbp(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded < 0) return `-${gbpFormatter.format(Math.abs(rounded))}`;
  return gbpFormatter.format(rounded);
}

const pct = (rate: number) => `${pctFormatter.format(rate * 100)}%`;

/** An exact nothing is a fact, not an estimate: "£0", never "~£0". */
const formatEstimateOrNil = (amount: number): string =>
  Math.round(amount) === 0 ? formatWholeGbp(0) : formatEstimate(amount);

const GROWTH_CASES = ["lower", "middle", "higher"] as const;

/** The three growth cases side by side. Sorting only: three rows whose order (lower, middle, higher) carries meaning. */
const CaseTable: FC<{
  plan: RetirementPlanResult;
  caseLabel: (c: RetirementGrowthCase) => string;
}> = ({ plan, caseLabel }) => {
  const { sortedRows, getSortProps } = useTableSort({
    rows: GROWTH_CASES,
    columns: {
      income: { value: (c) => plan.estimatedYearlyIncomeGbp[c], firstDirection: "desc" },
      pot: { value: (c) => plan.projectedPotAtRetirementGbp[c], firstDirection: "desc" },
    },
  });
  return (
    <table className={scheduleTable()}>
      <thead>
        <tr>
          <th className={scheduleHeaderCell()}>Case</th>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("income")}>
            Yearly income
          </Th>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("pot")}>
            Pots at retirement
          </Th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((c) => (
          <tr key={c}>
            <td className={scheduleCell()}>{caseLabel(c)}</td>
            <td className={scheduleCell()}>{formatEstimate(plan.estimatedYearlyIncomeGbp[c])}</td>
            <td className={scheduleCell()}>
              {formatEstimate(plan.projectedPotAtRetirementGbp[c])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** Income by age for the chosen case. A schedule: age order until a header sorts it, no filter. */
const YearScheduleTable: FC<{
  plan: RetirementPlanResult;
  selectedCase: RetirementGrowthCase;
}> = ({ plan, selectedCase }) => {
  const { sortedRows, getSortProps } = useTableSort({
    rows: plan.yearlySchedule,
    columns: {
      age: { value: (r) => r.age },
      pots: { value: (r) => r.potDrawdownYearly[selectedCase], firstDirection: "desc" },
      statePension: { value: (r) => r.statePensionYearlyGbp, firstDirection: "desc" },
      housing: { value: (r) => r.housingCostYearlyGbp, firstDirection: "desc" },
      afterHousing: {
        value: (r) => r.yearlyIncomeAfterHousing[selectedCase],
        firstDirection: "desc",
      },
    },
  });
  return (
    <table className={scheduleTable()}>
      <thead>
        <tr>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("age")}>
            Age
          </Th>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("pots")}>
            From pots
          </Th>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("statePension")}>
            State Pension
          </Th>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("housing")}>
            Housing
          </Th>
          <Th bare className={scheduleHeaderCell()} {...getSortProps("afterHousing")}>
            After housing
          </Th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => (
          <tr key={row.age}>
            <td className={scheduleCell()}>{row.age}</td>
            <td className={scheduleCell()}>
              {formatEstimate(row.potDrawdownYearly[selectedCase])}
            </td>
            <td className={scheduleCell()}>{formatWholeGbp(row.statePensionYearlyGbp)}</td>
            <td className={scheduleCell()}>{formatEstimateOrNil(row.housingCostYearlyGbp)}</td>
            <td className={scheduleCell()}>
              {formatEstimate(row.yearlyIncomeAfterHousing[selectedCase])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
/** "2026-10" becomes "October 2026". */
function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}
/** A percentage already in percent (6 means 6%). */
const pctPoints = (points: number) => `${pctFormatter.format(points)}%`;

/**
 * A signed long-range change: "+~£1,200" or "−~£800" (U+2212, a minus sign, not a hyphen),
 * rounded to three significant figures.
 */
function formatSignedEstimate(amount: number): string {
  const rounded = roundEstimate(amount);
  if (rounded === 0) return formatEstimate(0);
  return `${rounded > 0 ? "+" : "\u2212"}${formatEstimate(Math.abs(rounded))}`;
}

/** Whole percentages read "5%", others keep one decimal place: "5.5%". */
const percentDigits = (value: number): number => (Number.isInteger(value) ? 0 : 1);

const CASE_NAMES: Record<RetirementGrowthCase, string> = {
  lower: "Lower case",
  middle: "Middle case",
  higher: "Higher case",
};

const HOUSING_LABELS: Record<string, string> = {
  "mortgage-ends-before-retirement": "Mortgage ends before retirement",
  "mortgage-continues": "Mortgage payments continue",
  "rent-for-life": "Rent for life",
  "own-outright": "No housing payments",
  custom: "Your own housing figure",
};

const MISSING_LABELS: Record<string, string> = {
  birthYear: "your year of birth",
  retirementAge: "your retirement age",
  planToAge: "the age to plan to",
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function parseWhole(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isInteger(n) ? n : Number.NaN;
}

function parseAmount(text: string): number | null {
  const trimmed = text.trim().replace(/[£,]/g, "");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

const asText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function parseRate(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/**
 * Binds a shared numeric input to a text state. A number writes its text; text that does not parse
 * is kept as typed, so Save can say what is wrong; an empty field clears it.
 */
function bindNumber(setText: (text: string) => void) {
  let invalidRaw: string | null = null;
  return {
    onInvalid: (raw: string) => {
      invalidRaw = raw;
    },
    onValueChange: (value: number | null) => {
      setText(value === null ? (invalidRaw ?? "") : String(value));
      invalidRaw = null;
    },
  };
}
const rateText = (rate: number) => pctFormatter.format(rate * 100);

interface Computed {
  built: RetirementInputBuildResult;
  plan: RetirementPlanResult | null;
  failed: boolean;
}

/** Runs the shared builder and the engine; never throws during render (fails soft). */
function compute(args: BuildRetirementPlanInputArgs): Computed {
  const built = buildRetirementPlanInput(args);
  if (!built.ok) return { built, plan: null, failed: false };
  try {
    return { built, plan: calculateRetirementPlan(built.input), failed: false };
  } catch {
    return { built, plan: null, failed: true };
  }
}

export const RetirementPlanner: FC<RetirementPlannerProps> = ({
  planArgs,
  accountDetails,
  etag = null,
  isSaving = false,
  onSavePlan,
}) => {
  const savedPlan = planArgs.plan;
  const budgetEntries = planArgs.budgetEntries ?? [];

  // ---- Saved figures (hero, KpiStrip): saved data only ----
  const saved = useMemo(() => compute(planArgs), [planArgs]);
  const savedResult = saved.plan;
  const growthRates = savedResult?.assumptions.growthRates ??
    savedPlan?.growthRates ?? { ...DEFAULT_RETIREMENT_GROWTH_CASES };
  const inflationRate =
    savedResult?.assumptions.inflationRate ??
    savedPlan?.inflationRate ??
    DEFAULT_RETIREMENT_INFLATION_RATE;
  const caseLabel = (c: RetirementGrowthCase) => `${CASE_NAMES[c]} (${pct(growthRates[c])})`;

  // ---- Scenario (what-if): never written to saved data ----
  const workplace = planArgs.workplacePension ?? null;
  const savedEmployeePercent = workplace?.employeePercent ?? 0;
  const scenarioSeed = useMemo(
    () => ({
      retirementAge: savedResult?.retirementAge ?? 0,
      planToAge: savedResult?.planToAge ?? 0,
      extraMonthly: 0,
      employeePercent: savedEmployeePercent,
      useQualifyingEarnings: workplace?.useQualifyingEarnings === true,
      growthCase: "middle" as RetirementGrowthCase,
    }),
    [
      savedResult?.retirementAge,
      savedResult?.planToAge,
      savedEmployeePercent,
      workplace?.useQualifyingEarnings,
    ],
  );
  const scenario = useScenarioState(scenarioSeed);
  const selectedCase = scenario.values.growthCase as RetirementGrowthCase;
  const scenarioComputed = useMemo(() => {
    if (!savedResult) return null;
    const overrides: RetirementInputOverrides = {
      retirementAge: scenario.values.retirementAge,
      planToAge: Math.max(scenario.values.retirementAge + 1, scenario.values.planToAge),
      // With a saved salary the contribution is a percentage of pay; without one, a £ amount.
      ...(workplace
        ? {
            employeePercent: scenario.values.employeePercent,
            useQualifyingEarnings: scenario.values.useQualifyingEarnings,
          }
        : { additionalMonthlyPensionContributionGbp: scenario.values.extraMonthly }),
    };
    return compute({ ...planArgs, overrides });
  }, [planArgs, savedResult, scenario.values, workplace]);
  const scenarioResult = scenarioComputed?.plan ?? null;

  // ---- Saved plan details form ----
  const [retirementAgeInput, setRetirementAgeInput] = useState(asText(savedPlan?.retirementAge));
  const [planToAgeInput, setPlanToAgeInput] = useState(asText(savedPlan?.planToAge));
  const [statePensionAgeInput, setStatePensionAgeInput] = useState(
    asText(savedPlan?.statePensionAge),
  );
  const [qualifyingYearsInput, setQualifyingYearsInput] = useState(
    asText(savedPlan?.statePensionQualifyingYears),
  );
  const [forecastInput, setForecastInput] = useState(
    asText(savedPlan?.statePensionAnnualForecastGbp),
  );
  const [targetMode, setTargetMode] = useState<"typed" | "budget">(
    savedPlan?.target?.kind ?? "typed",
  );
  const [typedTargetInput, setTypedTargetInput] = useState(
    savedPlan?.target?.kind === "typed" ? String(savedPlan.target.yearlyAmount) : "",
  );
  const [lineStatuses, setLineStatuses] = useState<Record<string, RetirementBudgetLineStatusDto>>(
    () => {
      const map: Record<string, RetirementBudgetLineStatusDto> = {};
      if (savedPlan?.target?.kind === "budget") {
        for (const item of savedPlan.target.lineSettings) {
          map[item.budgetEntryId] = item.status ?? "continues";
        }
      }
      return map;
    },
  );
  const savedRates = savedPlan?.growthRates ?? DEFAULT_RETIREMENT_GROWTH_CASES;
  const [lowerInput, setLowerInput] = useState(rateText(savedRates.lower));
  const [middleInput, setMiddleInput] = useState(rateText(savedRates.middle));
  const [higherInput, setHigherInput] = useState(rateText(savedRates.higher));
  const [inflationInput, setInflationInput] = useState(
    rateText(savedPlan?.inflationRate ?? DEFAULT_RETIREMENT_INFLATION_RATE),
  );
  const [excluded, setExcluded] = useState<Set<string>>(
    () => new Set(savedPlan?.excludedAccountIds ?? []),
  );
  const [formError, setFormError] = useState<string | null>(null);

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

  const countedSeries = useMemo(() => {
    const counted = saved.built.accounts.filter((a) => doesAccountCountTowardsRetirement(a));
    return selectRetirementCountedSeries(counted, toSnapshotRows(accountDetails));
  }, [saved.built.accounts, accountDetails]);

  const handleSave = () => {
    if (!onSavePlan) return;
    const retirementAge = parseWhole(retirementAgeInput);
    const planToAge = parseWhole(planToAgeInput);
    const statePensionAge = parseWhole(statePensionAgeInput);
    const qualifyingYears = parseWhole(qualifyingYearsInput);
    const forecast = parseAmount(forecastInput);
    const typedTarget = parseAmount(typedTargetInput);
    const rates = [lowerInput, middleInput, higherInput].map((t) => Number(t.trim()));
    const inflation = Number(inflationInput.trim());

    const wholeOk = [retirementAge, planToAge, statePensionAge, qualifyingYears].every(
      (n) => n === null || Number.isFinite(n),
    );
    if (!wholeOk) return setFormError("Ages and qualifying years need to be whole numbers.");
    if (Number.isNaN(forecast) || Number.isNaN(typedTarget)) {
      return setFormError("Amounts need to be numbers in pounds.");
    }
    if (retirementAge !== null && planToAge !== null && planToAge <= retirementAge) {
      return setFormError("The age to plan to needs to be later than the retirement age.");
    }
    if (rates.some((r) => !(r >= 0 && r <= 100)) || !(inflation >= -20 && inflation <= 50)) {
      return setFormError("Growth rates go from 0% to 100% and inflation from -20% to 50%.");
    }
    setFormError(null);

    const payload: UpsertRetirementPlanRequest = {
      retirementAge,
      planToAge,
      statePensionAge,
      statePensionAnnualForecastGbp: forecast,
      statePensionQualifyingYears: qualifyingYears,
      growthRates: {
        lower: (rates[0] ?? 0) / 100,
        middle: (rates[1] ?? 0) / 100,
        higher: (rates[2] ?? 0) / 100,
      },
      inflationRate: inflation / 100,
      excludedAccountIds: [...excluded],
      target:
        targetMode === "typed"
          ? typedTarget === null
            ? null
            : { kind: "typed", yearlyAmount: typedTarget }
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

  // ---- Hero ----
  const missing = saved.built.ok === false ? saved.built.missing : [];
  const heroLabel = savedResult
    ? `Estimated yearly income from age ${savedResult.retirementAge}`
    : "Estimated yearly income in retirement";
  let emptyPrompt: ReactNode;
  let emptyAction: ReactNode;
  if (missing.length > 0) {
    emptyPrompt = `To see an estimate, add ${joinList(missing.map((m) => MISSING_LABELS[m] ?? m))}.`;
    emptyAction = missing.includes("birthYear") ? (
      <Link className={promptLink()} to={PROFILE_PATH}>
        Add your year of birth
      </Link>
    ) : (
      <a className={promptLink()} href="#retirement-plan-details">
        Add your plan details
      </a>
    );
  } else if (saved.failed) {
    emptyPrompt =
      "The estimate cannot be worked out from your saved details. Check your plan details below.";
  }
  const targetYearly = savedResult?.targetYearlyIncome ?? null;
  const heroSubline =
    targetYearly !== null
      ? `Your target: ${formatWholeGbp(targetYearly)} a year.`
      : "No target set yet.";

  // ---- KpiStrip: yearly income figures (decision RD3), saved data only ----
  let kpis: KpiStripItems | null = null;
  if (savedResult) {
    const fromPensions = calculateEvenRealDrawdown(
      savedResult.projectedPotByGroupGbp.pensions.middle,
      savedResult.assumptions.realGrowthRates.middle,
      savedResult.yearsInRetirement,
    );
    const fromIsasAndSavings = Math.max(0, savedResult.annualPotIncomeGbp.middle - fromPensions);
    const housing = savedResult.housing;
    const sp = savedResult.statePension;
    kpis = [
      <KpiCard
        key="sp"
        label="State Pension"
        value={sp ? formatWholeGbp(sp.annualAmountGbp) : "Not included yet"}
        subtext={
          sp ? `A year from age ${sp.statePensionAge}` : "Add your State Pension details below"
        }
      />,
      <KpiCard
        key="pensions"
        label="From pensions"
        value={formatEstimate(fromPensions)}
        subtext={`A year, ${caseLabel("middle").toLowerCase()}`}
      />,
      <KpiCard
        key="isa-savings"
        label="From ISAs and savings"
        value={formatEstimate(fromIsasAndSavings)}
        subtext={`A year, ${caseLabel("middle").toLowerCase()}`}
      />,
      <KpiCard
        key="housing"
        label="Housing in retirement"
        value={formatEstimateOrNil(housing.annualCostAtRetirementGbp)}
        subtext={
          housing.kind === "mortgage-continues" && housing.mortgageEndAge !== null
            ? `A year, until age ${Math.ceil(housing.mortgageEndAge)}`
            : housing.kind === "rent-for-life"
              ? "A year, for life"
              : (HOUSING_LABELS[housing.kind] ?? housing.kind)
        }
      />,
    ];
  }

  // ---- Scenario outcome ----
  const scenarioIncome = scenarioResult?.estimatedYearlyIncomeGbp[selectedCase] ?? null;
  const scenarioDifference = scenarioResult?.differenceYearly?.[selectedCase] ?? null;
  const scenarioFromSpa = scenarioResult?.estimatedYearlyIncomeBeforeStatePensionAgeGbp
    ? scenarioResult.estimatedYearlyIncomeFromStatePensionAgeGbp
    : null;
  const spaForRow = scenarioResult?.statePension?.statePensionAge ?? null;
  // Against the saved plan in the same growth case, so only the moved inputs count; hidden while
  // nothing but the case has changed.
  const rawChange =
    scenario.isModified && scenarioIncome !== null && savedResult
      ? scenarioIncome - savedResult.estimatedYearlyIncomeGbp[selectedCase]
      : null;
  const changeFromSaved = rawChange !== null && Math.round(rawChange) !== 0 ? rawChange : null;
  const annualAllowance = getUkTaxYearRules(resolveUkTaxYear()).pensionAnnualAllowance;
  const paidInYearly = scenarioResult?.pensionPaidInYearlyGbp ?? 0;
  const aboveAllowance = scenarioResult !== null && paidInYearly > annualAllowance;
  const wholeMoney = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;
  const targetSentence =
    scenarioDifference !== null && scenarioResult?.targetYearlyIncome != null
      ? `Your target: ${formatWholeGbp(scenarioResult.targetYearlyIncome)} a year. Difference: ${formatEstimate(scenarioDifference)} a year.`
      : "Add your own yearly target in your plan details to compare.";
  const scenarioNote = (
    <>
      {targetSentence}
      {changeFromSaved !== null
        ? ` Change from your saved plan: ${formatSignedEstimate(changeFromSaved)} a year.`
        : null}
      {aboveAllowance ? (
        <>
          {" "}
          In this illustration {wholeMoney(paidInYearly)} a year is paid into pensions. The standard
          annual allowance is {wholeMoney(annualAllowance)}.
        </>
      ) : null}
    </>
  );

  const currentAge = saved.built.currentAge ?? 0;
  const savedRetirementAge = savedResult?.retirementAge ?? currentAge;
  const savedPlanToAge = savedResult?.planToAge ?? savedRetirementAge + 1;
  const scenarioRetirementAge = scenario.values.retirementAge;
  const scenarioPlanToAge = Math.max(scenarioRetirementAge + 1, scenario.values.planToAge);

  const latestCounted = countedSeries[countedSeries.length - 1];

  return (
    <PageBody>
      <div className={plannerStack()}>
        <PageHeader title="Retirement plan" subtitle="Estimates in today's prices, before tax." />

        <HeroFigure
          label={heroLabel}
          value={savedResult ? formatEstimate(savedResult.estimatedYearlyIncomeGbp.middle) : null}
          estimateLabel="Unverified estimate"
          subline={heroSubline}
          emptyPrompt={emptyPrompt}
          emptyAction={emptyAction}
          explain="Built from the accounts that count towards retirement, your State Pension details and your housing in retirement, in today's prices, middle growth case."
        />

        {kpis && <KpiStrip items={kpis} />}

        {savedResult && (
          <ScenarioZone
            basis={`Starting from your saved plan: retiring at ${savedRetirementAge}, planning to age ${savedPlanToAge}.`}
            collapsible
            showLabel="Show what-if: change your plan"
            summary={
              scenario.isModified
                ? `Your illustration: retiring at ${scenarioRetirementAge}, planning to age ${scenarioPlanToAge}.`
                : `Starts from your saved plan: retiring at ${savedRetirementAge}, planning to age ${savedPlanToAge}.`
            }
            isModified={scenario.isModified}
            onReset={scenario.reset}
            notice={<ProjectionNotice lead="Unverified estimate." />}
          >
            <SimulatorSplitLayout
              controls={
                <div className={controlsCard()}>
                  <SliderField
                    label="Retirement age"
                    value={scenarioRetirementAge}
                    min={currentAge}
                    max={Math.max(80, savedRetirementAge)}
                    step={1}
                    onChange={(v) => scenario.set("retirementAge", v)}
                    formatValue={(v) => `Age ${v}`}
                  />
                  <SliderField
                    label="Plan to age"
                    value={scenarioPlanToAge}
                    min={scenarioRetirementAge + 1}
                    max={Math.max(105, savedPlanToAge)}
                    step={1}
                    onChange={(v) => scenario.set("planToAge", v)}
                    formatValue={(v) => `Age ${v}`}
                  />
                  {workplace ? (
                    <div className={fieldGroup()}>
                      <SliderField
                        label="Your contribution"
                        format="percent"
                        fractionDigits={percentDigits(scenario.values.employeePercent)}
                        value={scenario.values.employeePercent}
                        min={0}
                        max={Math.max(MAX_CONTRIBUTION_PERCENT, savedEmployeePercent)}
                        step={0.5}
                        helperText={
                          scenario.isEdited("employeePercent")
                            ? CONTRIBUTION_EDITED_TEXT
                            : undefined
                        }
                        onChange={(v) => scenario.set("employeePercent", v)}
                      />
                      <div className={checkboxRow}>
                        <Checkbox
                          aria-describedby={QUALIFYING_INFO_ID}
                          label="Base contributions on pay that counts for your pension"
                          checked={scenario.values.useQualifyingEarnings}
                          onChange={(e) => scenario.set("useQualifyingEarnings", e.target.checked)}
                        />
                        <InfoTip descriptionId={QUALIFYING_INFO_ID} term="Pay that counts">
                          {`Counts only pay between ${formatWholeGbp(UK_QUALIFYING_EARNINGS_LOWER)} and ${formatWholeGbp(UK_QUALIFYING_EARNINGS_UPPER)} a year.`}
                        </InfoTip>
                      </div>
                    </div>
                  ) : (
                    <SliderField
                      label="Extra monthly contribution"
                      value={scenario.values.extraMonthly}
                      min={0}
                      max={2000}
                      step={50}
                      onChange={(v) => scenario.set("extraMonthly", v)}
                      formatValue={(v) => formatWholeGbp(v)}
                    />
                  )}
                  <div className={fieldGroup()}>
                    <span className={fieldLabel()}>Growth case</span>
                    <div className={toggleRow()}>
                      {(["lower", "middle", "higher"] as const).map((c) => (
                        <Button
                          key={c}
                          type="button"
                          variant={selectedCase === c ? "primary" : "secondary"}
                          size="sm"
                          aria-pressed={selectedCase === c}
                          onClick={() => scenario.set("growthCase", c)}
                        >
                          {caseLabel(c)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              }
              content={
                <div className={resultsStack()}>
                  <ResultBlock
                    id="retirement-scenario-outcome"
                    label={`Estimated yearly income from age ${scenarioResult?.retirementAge ?? scenarioRetirementAge}`}
                    figure={scenarioIncome === null ? undefined : formatEstimate(scenarioIncome)}
                    emptyPrompt="The estimate cannot be worked out for these figures."
                    note={scenarioNote}
                    row={
                      scenarioFromSpa && spaForRow !== null
                        ? {
                            label: `From State Pension age (${spaForRow})`,
                            value: `${formatEstimate(scenarioFromSpa[selectedCase])} a year`,
                          }
                        : undefined
                    }
                  />

                  {/* Drawn from three years to retirement: fewer points make no useful chart. */}
                  {scenarioResult && scenarioResult.accumulation.length >= 3 && (
                    <RetirementPotChart
                      points={scenarioResult.accumulation}
                      growthCase={selectedCase}
                    />
                  )}

                  {latestCounted && (
                    <PageSection
                      title="Counted towards retirement"
                      titleAddon={
                        <InfoTip term="Counted towards retirement">
                          The accounts that count towards retirement, from your monthly check-ins.
                        </InfoTip>
                      }
                      icon={Calendar}
                    >
                      <p className={mutedNote()}>
                        {formatMonthKey(latestCounted.month)}:{" "}
                        {formatWholeGbp(latestCounted.totalCountedGbp)}
                        {latestCounted.hasCarriedForward
                          ? " (includes balances carried forward)"
                          : ""}
                      </p>
                    </PageSection>
                  )}

                  {scenarioResult && (
                    <CollapsibleDrawer
                      title="Assumptions, pots and year by year"
                      itemCount={scenarioResult.yearlySchedule.length}
                      itemNoun={{ one: "year", other: "years" }}
                    >
                      <div className={resultsStack()}>
                        <p className={mutedNote()}>
                          Growth band: {pct(growthRates.lower)}, {pct(growthRates.middle)} and{" "}
                          {pct(growthRates.higher)} a year before inflation, with{" "}
                          {pct(inflationRate)} inflation. These are a reference for three cases, not
                          a prediction. Figures are in today&apos;s prices, before tax.
                        </p>
                        <p className={mutedNote()}>
                          {scenarioResult.statePension
                            ? `State Pension: ${formatWholeGbp(scenarioResult.statePension.annualAmountGbp)} a year from age ${scenarioResult.statePension.statePensionAge}, at ${scenarioResult.statePension.taxYear} rates.`
                            : "State Pension is not included yet. Add your State Pension age and a forecast or qualifying years to include it."}
                        </p>
                        {workplace && (
                          <p className={mutedNote()}>
                            {workplace.ratesAssumed
                              ? `Workplace pension: ${pctPoints(workplace.employeePercent)} from you and ${pctPoints(workplace.employerPercent)} from your employer, the auto-enrolment minimums, which are used until you set your own in your pension details. They apply to your saved salary of ${formatWholeGbp(workplace.annualSalary)}.`
                              : `Workplace pension: ${pctPoints(workplace.employeePercent)} from you and ${pctPoints(workplace.employerPercent)} from your employer, of your saved salary of ${formatWholeGbp(workplace.annualSalary)}, from your pension details.`}
                            {workplace.isSalarySacrifice && workplace.passEmployerNi
                              ? " Through salary sacrifice, your employer also adds the National Insurance it saves."
                              : ""}{" "}
                            <Link className={promptLink()} to={PENSION_DETAILS_PATH}>
                              Change them on the Pension page
                            </Link>
                          </p>
                        )}
                        <CaseTable caseLabel={caseLabel} plan={scenarioResult} />
                        <YearScheduleTable plan={scenarioResult} selectedCase={selectedCase} />
                      </div>
                    </CollapsibleDrawer>
                  )}
                </div>
              }
            />
          </ScenarioZone>
        )}

        {/* Owner decision RD11: the same quiet line for every user, with or without a plan. */}
        <MoneyHelperGuidance />

        <PageSection
          id="retirement-plan-details"
          title="Your plan details"
          description="These saved details make the estimate. Nothing changes until you select Save plan."
          icon={ClipboardList}
        >
          <div className={controlsCard()}>
            <div className={fieldGrid()}>
              <div className={fieldGroup()}>
                <label className={fieldLabel()} htmlFor="ret-age-input">
                  Retirement age
                </label>
                <WholeNumberInput
                  id="ret-age-input"
                  value={parseWhole(retirementAgeInput)}
                  {...bindNumber(setRetirementAgeInput)}
                />
              </div>
              <div className={fieldGroup()}>
                <label className={fieldLabel()} htmlFor="plan-to-age-input">
                  Plan to age
                </label>
                <WholeNumberInput
                  id="plan-to-age-input"
                  value={parseWhole(planToAgeInput)}
                  {...bindNumber(setPlanToAgeInput)}
                />
              </div>
            </div>

            <div className={fieldGroup()}>
              <span className={fieldLabel()}>Your yearly target (today&apos;s prices)</span>
              <div className={toggleRow()}>
                <Button
                  type="button"
                  variant={targetMode === "typed" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={targetMode === "typed"}
                  onClick={() => setTargetMode("typed")}
                >
                  Typed figure
                </Button>
                <Button
                  type="button"
                  variant={targetMode === "budget" ? "primary" : "secondary"}
                  size="sm"
                  aria-pressed={targetMode === "budget"}
                  onClick={() => setTargetMode("budget")}
                >
                  From budget lines
                </Button>
              </div>
              {targetMode === "typed" ? (
                <CurrencyInput
                  aria-label="Yearly target in pounds"
                  min={0}
                  value={parseAmount(typedTargetInput)}
                  {...bindNumber(setTypedTargetInput)}
                />
              ) : (
                <div className={budgetLinesList()}>
                  {nonHousingBudgetLines.length === 0 ? (
                    <p className={mutedNote()}>No spending lines other than housing saved yet.</p>
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
                            {(["continues", "stops"] as const).map((status) => (
                              <Button
                                key={status}
                                type="button"
                                size="sm"
                                variant={currentStatus === status ? "primary" : "secondary"}
                                aria-pressed={currentStatus === status}
                                onClick={() =>
                                  setLineStatuses((prev) => ({ ...prev, [entry.id]: status }))
                                }
                              >
                                {status === "continues" ? "Continues" : "Stops"}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className={fieldGrid()}>
              <div className={fieldGroup()}>
                <label className={fieldLabel()} htmlFor="sp-age-input">
                  State Pension age
                </label>
                <WholeNumberInput
                  id="sp-age-input"
                  value={parseWhole(statePensionAgeInput)}
                  {...bindNumber(setStatePensionAgeInput)}
                />
                <a
                  className={promptLink()}
                  href={STATE_PENSION_AGE_CHECKER_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Check your State Pension age on GOV.UK
                </a>
              </div>
              <div className={fieldGroup()}>
                <label className={fieldLabel()} htmlFor="sp-forecast-input">
                  State Pension forecast (pounds a year)
                </label>
                <CurrencyInput
                  id="sp-forecast-input"
                  min={0}
                  value={parseAmount(forecastInput)}
                  {...bindNumber(setForecastInput)}
                />
              </div>
              <div className={fieldGroup()}>
                <label className={fieldLabel()} htmlFor="sp-years-input">
                  Or National Insurance qualifying years
                </label>
                <WholeNumberInput
                  id="sp-years-input"
                  value={parseWhole(qualifyingYearsInput)}
                  {...bindNumber(setQualifyingYearsInput)}
                />
              </div>
            </div>

            <div className={fieldGroup()}>
              <span className={fieldLabel()}>
                Growth band and inflation (a reference, not a prediction)
              </span>
              <div className={fieldGrid()}>
                {(
                  [
                    [
                      "growth-lower-input",
                      "Lower case growth (% a year)",
                      lowerInput,
                      setLowerInput,
                    ],
                    [
                      "growth-middle-input",
                      "Middle case growth (% a year)",
                      middleInput,
                      setMiddleInput,
                    ],
                    [
                      "growth-higher-input",
                      "Higher case growth (% a year)",
                      higherInput,
                      setHigherInput,
                    ],
                    ["inflation-input", "Inflation (% a year)", inflationInput, setInflationInput],
                  ] as const
                ).map(([id, label, value, setValue]) => (
                  <div key={id} className={fieldGroup()}>
                    <label className={fieldLabel()} htmlFor={id}>
                      {label}
                    </label>
                    <PercentInput id={id} value={parseRate(value)} {...bindNumber(setValue)} />
                  </div>
                ))}
              </div>
            </div>

            <CollapsibleDrawer
              title="Accounts that count towards retirement"
              itemCount={saved.built.countableAccounts.length}
              itemNoun={{ one: "account", other: "accounts" }}
              openLabel="Hide accounts"
              closedLabel="Show accounts"
            >
              {saved.built.countableAccounts.length === 0 ? (
                <p className={mutedNote()}>No pensions, investments or savings saved yet.</p>
              ) : (
                <div className={budgetLinesList()}>
                  {saved.built.countableAccounts.map((account) => (
                    <Checkbox
                      key={account.id}
                      label={account.name || account.type}
                      hint={`${account.type}, ${formatWholeGbp(account.balanceGbp)}`}
                      checked={!excluded.has(account.id)}
                      onChange={(e) => {
                        const counts = e.target.checked;
                        setExcluded((prev) => {
                          const next = new Set(prev);
                          if (counts) next.delete(account.id);
                          else next.add(account.id);
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </CollapsibleDrawer>

            {formError && (
              <p className={mutedNote()} role="alert">
                {formError}
              </p>
            )}

            {onSavePlan && (
              <Button type="button" variant="primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving..." : "Save plan"}
              </Button>
            )}
          </div>
        </PageSection>
      </div>
    </PageBody>
  );
};
