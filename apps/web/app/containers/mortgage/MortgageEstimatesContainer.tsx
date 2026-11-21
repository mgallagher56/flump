import {
  calculateBudgetLoanEstimate,
  DEFAULT_INCOME_MULTIPLE_HIGH,
  DEFAULT_INCOME_MULTIPLE_LOW,
  isFigureKnown,
  MORTGAGE_ESTIMATE_STANDALONE_NOTICE,
  profileFactsFromProfile,
  selectHousingRoom,
} from "@flump/finance-engine";
import {
  HeroFigure,
  KpiCard,
  KpiStrip,
  PageBody,
  PageHeader,
  ProjectionNotice,
  ScenarioZone,
  Tabs,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { HousingRoomSummary } from "~/features/mortgage/components/HousingRoomSummary";
import { IncomeMultipleTool } from "~/features/mortgage/components/IncomeMultipleTool";
import { LoanFromPaymentTool } from "~/features/mortgage/components/LoanFromPaymentTool";
import { RateChangeTool } from "~/features/mortgage/components/RateChangeTool";
import { useScenarioState } from "~/hooks/useScenarioState";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import {
  pageRoot,
  savedSection,
  standingNotice,
  tabPanel,
} from "./MortgageEstimatesContainer.styles";

type EstimateTool = "from-payment" | "from-income" | "rate-change";

const ESTIMATE_TABS = [
  { value: "from-payment", label: "From a monthly payment" },
  { value: "from-income", label: "From income" },
  { value: "rate-change", label: "If rates change" },
] as const;

interface RawMortgageAccount {
  id?: string;
  type?: string;
  propertyCategory?: string | null;
  balance?: number | string | null;
  interestRate?: number | string | null;
  remainingTermMonths?: number | null;
  remainingTermYears?: number | null;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Standalone Mortgage Estimates page (`/app/mortgage-estimates`, E39 sections 5, 6, 10a).
 * Prefills every figure from `@flump/finance-engine` picture selectors and runs all estimates in
 * memory via `useScenarioState` without storing scenario inputs.
 */
const MortgageEstimatesContainer: FC = () => {
  const navigate = useNavigate();
  const loaderData = useLoaderData<{
    accounts?: RawMortgageAccount[];
    accountDetails?: unknown[];
    budgetEntries?: unknown[];
    userProfile?: Record<string, unknown> | null;
  }>();

  const accounts = loaderData?.accounts ?? [];
  const accountDetails = loaderData?.accountDetails ?? [];
  const budgetEntries = loaderData?.budgetEntries ?? [];
  const userProfile = loaderData?.userProfile ?? null;

  const picture = useMemo(
    () =>
      buildWorkspacePicture({
        accounts,
        accountDetails,
        budgetEntries,
        userProfile,
      }),
    [accounts, accountDetails, budgetEntries, userProfile],
  );

  const [includeSavings, setIncludeSavings] = useState(false);
  const [includeOtherSpending, setIncludeOtherSpending] = useState(false);
  const [activeTool, setActiveTool] = useState<EstimateTool>("from-payment");

  const activeHousingRoom = useMemo(() => {
    if (!includeSavings && !includeOtherSpending) return picture.housingRoom;
    return selectHousingRoom(
      {
        takeHome: picture.takeHome,
        budgetRows: picture.budgetRows,
        safeToSpend: picture.safeToSpend,
        housingPayment: picture.housingPayment,
      },
      { includeSavings, includeOtherSpending },
    );
  }, [picture, includeSavings, includeOtherSpending]);

  const profileFacts = useMemo(() => profileFactsFromProfile(userProfile), [userProfile]);

  const residentialMortgage = useMemo(
    () =>
      accounts.find((acc) => acc.type === "Mortgage" && acc.propertyCategory !== "buy_to_let") ??
      null,
    [accounts],
  );

  const savedSalary =
    profileFacts.annualSalary !== null &&
    profileFacts.annualSalary !== undefined &&
    profileFacts.annualSalary > 0
      ? profileFacts.annualSalary
      : null;

  const savedMortgageBalance = toNumber(residentialMortgage?.balance);
  const savedMortgageRate = toNumber(residentialMortgage?.interestRate);
  const savedMortgageTermYears = (() => {
    const months = toNumber(residentialMortgage?.remainingTermMonths);
    if (months && months > 0) return Math.round(months / 12);
    const years = toNumber(residentialMortgage?.remainingTermYears);
    if (years && years > 0) return Math.round(years);
    return 25;
  })();

  const defaultMonthlyPayment =
    isFigureKnown(activeHousingRoom) && activeHousingRoom.value.monthly > 0
      ? Math.round(activeHousingRoom.value.monthly)
      : null;

  const savedScenario = useMemo(
    () => ({
      monthlyPaymentGbp: defaultMonthlyPayment,
      annualRatePct: null as number | null,
      termYears: savedMortgageTermYears,
      depositGbp: null as number | null,
      buyingCostsGbp: null as number | null,
      primaryAnnualIncomeGbp: savedSalary,
      secondAnnualIncomeGbp: null as number | null,
      lowMultiple: DEFAULT_INCOME_MULTIPLE_LOW,
      highMultiple: DEFAULT_INCOME_MULTIPLE_HIGH,
      rateChangeLoanGbp: null as number | null,
      rateChangeRatePct: null as number | null,
      rateChangeDeltaPct: 1,
    }),
    [defaultMonthlyPayment, savedMortgageTermYears, savedSalary],
  );

  const scenario = useScenarioState(savedScenario);
  const v = scenario.values;

  const budgetEstimate = useMemo(
    () =>
      calculateBudgetLoanEstimate({
        monthlyPaymentGbp: v.monthlyPaymentGbp ?? 0,
        termMonths: Math.max(0, Math.round(v.termYears * 12)),
        annualRatePct: v.annualRatePct,
        depositGbp: v.depositGbp,
        buyingCostsGbp: v.buyingCostsGbp,
      }),
    [v.monthlyPaymentGbp, v.termYears, v.annualRatePct, v.depositGbp, v.buyingCostsGbp],
  );

  const derivedRateChangeLoan =
    v.rateChangeLoanGbp ??
    budgetEstimate.loanGbp ??
    budgetEstimate.lowLoanGbp ??
    (savedMortgageBalance && savedMortgageBalance > 0 ? savedMortgageBalance : null);

  const derivedRateChangeRate =
    v.rateChangeRatePct ??
    v.annualRatePct ??
    budgetEstimate.lowAnnualRatePct ??
    (savedMortgageRate && savedMortgageRate > 0 ? savedMortgageRate : null);

  const roomKnown = isFigureKnown(activeHousingRoom);

  return (
    <PageBody className={pageRoot()}>
      <PageHeader
        description="Estimates of a loan size and monthly payment, from your figures and the assumptions you set."
        illustration="empty-accounts"
        title="Mortgage estimates"
      />

      <section aria-label="Left each month before housing" className={savedSection()}>
        <HeroFigure
          emptyPrompt="Add your salary in Settings and your essentials in Budget to see what your figures leave."
          explain="Your take-home pay, less your essentials and debt payments. Housing is not counted."
          id="mortgage-estimates-hero"
          label="Left each month before housing"
          value={roomKnown ? Math.round(activeHousingRoom.value.monthly) : null}
          valueFormat={{ fractionDigits: 0 }}
        />

        <KpiStrip columns={3}>
          <KpiCard
            label="Take-home pay"
            value={roomKnown ? Math.round(activeHousingRoom.value.takeHomeMonthly) : null}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            label="Essentials without housing"
            value={roomKnown ? Math.round(activeHousingRoom.value.essentialsWithoutHousing) : null}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            label="Debt payments"
            value={roomKnown ? Math.round(activeHousingRoom.value.debtCommitment) : null}
            valueFormat={{ fractionDigits: 0 }}
          />
        </KpiStrip>
      </section>

      <HousingRoomSummary
        housingRoom={activeHousingRoom}
        includeOtherSpending={includeOtherSpending}
        includeSavings={includeSavings}
        onIncludeOtherSpendingChange={setIncludeOtherSpending}
        onIncludeSavingsChange={setIncludeSavings}
        onNavigate={(to) => navigate(to)}
      />

      <ScenarioZone
        id="mortgage-estimates-scenario"
        isModified={scenario.isModified}
        notice={
          <div>
            <p className={standingNotice}>{MORTGAGE_ESTIMATE_STANDALONE_NOTICE}</p>
            <ProjectionNotice />
          </div>
        }
        title="Model a mortgage"
        onReset={scenario.reset}
      >
        <Tabs
          aria-label="Mortgage estimate tools"
          items={[...ESTIMATE_TABS]}
          panelClassName={tabPanel()}
          panels={{
            "from-payment": (
              <LoanFromPaymentTool
                annualRatePct={v.annualRatePct}
                buyingCostsGbp={v.buyingCostsGbp}
                depositGbp={v.depositGbp}
                monthlyPaymentGbp={v.monthlyPaymentGbp}
                termYears={v.termYears}
                onAnnualRateChange={(val) => scenario.set("annualRatePct", val)}
                onBuyingCostsChange={(val) => scenario.set("buyingCostsGbp", val)}
                onDepositChange={(val) => scenario.set("depositGbp", val)}
                onMonthlyPaymentChange={(val) => scenario.set("monthlyPaymentGbp", val)}
                onTermYearsChange={(val) => scenario.set("termYears", val)}
              />
            ),
            "from-income": (
              <IncomeMultipleTool
                buyingCostsGbp={v.buyingCostsGbp}
                depositGbp={v.depositGbp}
                highMultiple={v.highMultiple}
                lowMultiple={v.lowMultiple}
                primaryAnnualIncomeGbp={v.primaryAnnualIncomeGbp}
                secondAnnualIncomeGbp={v.secondAnnualIncomeGbp}
                onBuyingCostsChange={(val) => scenario.set("buyingCostsGbp", val)}
                onDepositChange={(val) => scenario.set("depositGbp", val)}
                onHighMultipleChange={(val) => scenario.set("highMultiple", val)}
                onLowMultipleChange={(val) => scenario.set("lowMultiple", val)}
                onPrimaryIncomeChange={(val) => scenario.set("primaryAnnualIncomeGbp", val)}
                onSecondIncomeChange={(val) => scenario.set("secondAnnualIncomeGbp", val)}
              />
            ),
            "rate-change": (
              <RateChangeTool
                annualRatePct={derivedRateChangeRate}
                deltaPct={v.rateChangeDeltaPct}
                loanGbp={derivedRateChangeLoan}
                mode="new-loan"
                termYears={v.termYears}
                onDeltaChange={(val) => scenario.set("rateChangeDeltaPct", val)}
                onLoanChange={(val) => scenario.set("rateChangeLoanGbp", val)}
                onRateChange={(val) => scenario.set("rateChangeRatePct", val)}
              />
            ),
          }}
          size="sm"
          value={activeTool}
          onValueChange={(value) => setActiveTool(value as EstimateTool)}
        />
      </ScenarioZone>
    </PageBody>
  );
};

export default MortgageEstimatesContainer;
