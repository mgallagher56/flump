import {
  calculate100kTaxTrap,
  calculateEmployerNISavings,
  getCurrentUKTaxYear,
  isInTaxTrapAlertBand,
  PortfolioSnapshot,
  profileFactsFromProfile,
  salarySacrificeFromProfile,
  UK_STATE_PENSION_AGE,
} from "@flump/finance-engine";
import { Button, EmptyState, Icon, Illustration, PageBody, PageHeader } from "@repo/ui";
import { Plus } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useLocation } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { AddPensionAccountDialog } from "~/features/pension/components/AddPensionAccountDialog";
import { ForecastAssumptions } from "~/features/pension/components/ForecastAssumptions";
import { MAX_CONTRIBUTION_PERCENT } from "~/features/pension/components/ForecasterControls";
import { PensionAccountsList } from "~/features/pension/components/PensionAccountsList";
import {
  PensionDetails,
  type PensionDetailsSaveValues,
} from "~/features/pension/components/PensionDetails";
import {
  buildForecastInput,
  PENSION_SCENARIO_ZONE_ID,
  PensionForecast,
  type PensionTool,
} from "~/features/pension/components/PensionForecast";
import { PensionSummary } from "~/features/pension/components/PensionSummary";
import { projectPension } from "~/features/pension/forecast";
import { DEFAULT_HORIZON_YEARS, usePensionScenario } from "~/features/pension/usePensionScenario";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.pension";
import { useFinancialBaseline } from "~/state/baseline.store";
import { roundTo2dp } from "~/utils/roundTo2dp";
import {
  getKnownTrapRegion,
  REGION_ASSUMPTION_LABEL,
  REGION_SETTINGS_PATH,
  regionLinkStyle,
} from "~/utils/taxTrapCopy";
import { mutedNote, trapLine, trapText } from "./PensionContainer.styles";

/** Growth the illustration starts from when no pot has a rate. Never shown as a saved figure. */
const ASSUMED_GROWTH_RATE = 5;

/**
 * The pension page (E16 PR 7): saved facts first (hero "Total in your pots", a strip of three,
 * "Your details" with the pots), then one ScenarioZone, then one quiet "Assumptions and UK rules"
 * drawer. Headline figures read saved loader data only (ruling D2: no hero holds an estimate).
 */
export const PensionContainer: FC = () => {
  const loaderData = useLoaderData<typeof loader>();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];
  const userProfile = loaderData?.userProfile;

  const { formatCurrency } = useFormatCurrency();
  const { profile, setProfile, updateProfile, markChecklistStep } = useUserProfile();
  const { baseline } = useFinancialBaseline();

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tool, setTool] = useState<PensionTool>("retirement");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  // Bumped by "Model this contribution" so the page scrolls to the scenario zone.
  const [scrollToZone, setScrollToZone] = useState(0);
  const { hash } = useLocation();

  // Filter pension accounts and calculate current balances
  const pensionAccounts = useMemo(() => {
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return accounts
      .filter((acc) => acc.type === "Pension")
      .map((acc) => {
        const resolved = snapshot.getAccount(acc.id);
        const isCurrent = acc.isCurrent !== false;
        return {
          ...acc,
          balance: resolved?.nominalBalance ?? (Number(acc.balance) || 0),
          interestRate:
            acc.interestRate !== undefined && acc.interestRate !== null
              ? Number(acc.interestRate)
              : null,
          isCurrent,
          monthlyContribution:
            isCurrent && acc.monthlyContribution !== undefined && acc.monthlyContribution !== null
              ? Number(acc.monthlyContribution)
              : 0,
        };
      });
  }, [accounts, accountDetails]);

  const totalValue = useMemo(() => {
    const snapshot = new PortfolioSnapshot(accounts, accountDetails);
    return snapshot.getTotalPensions();
  }, [accounts, accountDetails]);

  // Direct monthly contributions set on individual pension pots (current pots only)
  const directMonthlyContrib = useMemo(() => {
    return pensionAccounts
      .filter((acc) => acc.isCurrent !== false)
      .reduce((sum, acc) => sum + (Number(acc.monthlyContribution) || 0), 0);
  }, [pensionAccounts]);

  // Portfolio balance-weighted average return rate over pots that actually have a rate.
  // A stored 0% is a real rate; only an unset rate is excluded.
  const { weightedReturnRate, growthRateIsPlaceholder } = useMemo(() => {
    const rated = pensionAccounts.filter((acc) => acc.interestRate !== null);
    if (rated.length === 0) {
      return { weightedReturnRate: ASSUMED_GROWTH_RATE, growthRateIsPlaceholder: true };
    }
    const ratedTotal = rated.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    if (ratedTotal <= 0) {
      const sumRates = rated.reduce((sum, acc) => sum + (acc.interestRate ?? 0), 0);
      return {
        weightedReturnRate: Number((sumRates / rated.length).toFixed(1)),
        growthRateIsPlaceholder: false,
      };
    }
    const weightedSum = rated.reduce(
      (sum, acc) => sum + (acc.balance || 0) * (acc.interestRate ?? 0),
      0,
    );
    return {
      weightedReturnRate: Number((weightedSum / ratedTotal).toFixed(1)),
      growthRateIsPlaceholder: false,
    };
  }, [pensionAccounts]);

  const isReset = Boolean(profile.hasResetFinancialData ?? userProfile?.hasResetFinancialData);
  // No salary is a real state: the zone prompts for it instead of assuming a figure.
  const storedSalary: number | null = profile.annualSalary ?? userProfile?.annualSalary ?? null;
  const hasSalary = storedSalary !== null && storedSalary > 0;
  const annualSalary = storedSalary ?? 0;
  // The backend creates the profile row with the auto-enrolment minimums (5% and 3%), so
  // that exact pair is flagged as a default the user may never have chosen.
  const ratesAssumed =
    (profile.pensionPercent ?? userProfile?.pensionPercent) === 5 &&
    (profile.pensionEmployerPercent ?? userProfile?.pensionEmployerPercent) === 3;
  const employeePercent = isReset
    ? (profile.pensionPercent ?? userProfile?.pensionPercent ?? 0)
    : (profile.pensionPercent ?? userProfile?.pensionPercent ?? 5.0);
  const employerPercent = isReset
    ? (profile.pensionEmployerPercent ?? userProfile?.pensionEmployerPercent ?? 0)
    : (profile.pensionEmployerPercent ?? userProfile?.pensionEmployerPercent ?? 3.0);
  // The contribution method counts only when the user chose it. The column is NOT NULL and
  // used to default to salary sacrifice, so the method reads "Not set" while the pension facts
  // are still the creation defaults, and a legacy stored true is never used as a choice
  // (salarySacrificeFromProfile, shared with the engine's take-home).
  const methodSet = !ratesAssumed;
  const storedSalarySacrifice = salarySacrificeFromProfile({
    isSalarySacrifice: profile.isSalarySacrifice ?? userProfile?.isSalarySacrifice,
    pensionPercent: profile.pensionPercent ?? userProfile?.pensionPercent,
    pensionEmployerPercent: profile.pensionEmployerPercent ?? userProfile?.pensionEmployerPercent,
  });
  const isSalarySacrifice = storedSalarySacrifice ?? false;
  const isSalarySacrificeEmployerNi =
    profile.isSalarySacrificeEmployerNi ?? userProfile?.isSalarySacrificeEmployerNi ?? false;
  const employmentType = profile.employmentType ?? userProfile?.employmentType ?? null;

  const monthlyEmployeeContrib = (annualSalary * (employeePercent / 100)) / 12;
  const standardMonthlyEmployerContrib = (annualSalary * (employerPercent / 100)) / 12;
  const annualEmployerNiSavings =
    isSalarySacrifice && isSalarySacrificeEmployerNi
      ? calculateEmployerNISavings(
          annualSalary,
          annualSalary * (employeePercent / 100),
          getCurrentUKTaxYear(),
        )
      : 0;
  const monthlyEmployerContrib = standardMonthlyEmployerContrib + annualEmployerNiSavings / 12;

  // Saved profile facts for the take-home engine. Region and student-loan plans come from the
  // profile, so a Scottish or Plan 2 user gets the right figures. Read only.
  const savedFacts = useMemo(() => {
    const stored: Record<string, unknown> = { ...userProfile };
    for (const [key, value] of Object.entries(profile)) {
      if (value !== null && value !== undefined) stored[key] = value;
    }
    return {
      ...profileFactsFromProfile(stored),
      annualSalary,
      employmentType: employmentType ?? null,
      isSalarySacrifice,
      pensionPercent: employeePercent,
    };
  }, [annualSalary, employeePercent, employmentType, isSalarySacrifice, profile, userProfile]);

  // The take-home tool reads only answered pension facts: an unanswered percentage or method
  // stays null so the tool asks for it instead of using the 5% / salary sacrifice defaults.
  const takeHomeFacts = useMemo(
    () => ({
      ...savedFacts,
      pensionPercent: ratesAssumed
        ? null
        : (profile.pensionPercent ?? userProfile?.pensionPercent ?? null),
      isSalarySacrifice: methodSet ? storedSalarySacrifice : null,
    }),
    [savedFacts, ratesAssumed, methodSet, storedSalarySacrifice, profile, userProfile],
  );

  // Saved age: the year of birth wins over a legacy stored age. Never assumed.
  const birthYear = profile.birthYear ?? userProfile?.birthYear ?? null;
  const legacyAge = profile.age ?? userProfile?.age ?? null;
  const rawAge = birthYear ? new Date().getFullYear() - Number(birthYear) : legacyAge;
  const currentAge =
    rawAge !== null && rawAge !== undefined && rawAge > 0 && rawAge < 120 ? Number(rawAge) : null;
  // The estimate runs to the State Pension age (a rule, not a choice the user made).
  const retirementAge = currentAge !== null ? Math.max(UK_STATE_PENSION_AGE, currentAge + 1) : null;

  // Scenario inputs live in memory only: no storage, no URL, no network. Seeded from saved data.
  const scenario = usePensionScenario({
    contributionPercent: employeePercent,
    horizonYears:
      retirementAge !== null && currentAge !== null
        ? retirementAge - currentAge
        : DEFAULT_HORIZON_YEARS,
    growthRate: Number(weightedReturnRate.toFixed(1)),
  });

  const forecastBase = useMemo(
    () => ({
      salary: annualSalary,
      employerPercent,
      isSalarySacrifice,
      passEmployerNi: isSalarySacrificeEmployerNi,
      currentPotTotal: totalValue,
      directMonthlyContrib,
    }),
    [
      annualSalary,
      employerPercent,
      isSalarySacrifice,
      isSalarySacrificeEmployerNi,
      totalValue,
      directMonthlyContrib,
    ],
  );
  // The projection at the saved figures only: the estimate KPI and the zone's comparison.
  const savedResult = useMemo(
    () => projectPension(buildForecastInput(forecastBase, scenario.saved)),
    [forecastBase, scenario.saved],
  );

  const hasPots = pensionAccounts.length > 0;
  const monthlyTotal = hasSalary
    ? monthlyEmployeeContrib + monthlyEmployerContrib + directMonthlyContrib
    : directMonthlyContrib > 0
      ? directMonthlyContrib
      : null;
  // The estimate needs a saved age, a growth rate from a pot, and something to grow.
  const estimateKnown =
    currentAge !== null && hasPots && !growthRateIsPlaceholder && (hasSalary || totalValue > 0);
  const estimateMissing =
    currentAge === null
      ? { label: "Add your year of birth", to: "/app/profile" }
      : hasPots && growthRateIsPlaceholder
        ? { label: "Add a growth rate to a pot", to: "#pension-pots" }
        : undefined;

  // Mark setup checklist step as completed if accounts exist
  useEffect(() => {
    if (pensionAccounts.length > 0) {
      markChecklistStep("pension", true).catch(() => {});
    }
  }, [pensionAccounts.length, markChecklistStep]);

  const handleSaveDetails = async (values: PensionDetailsSaveValues) => {
    const salaryValue = Math.max(0, values.annualSalary ?? 0);
    await updateProfile({
      ...(salaryValue > 0 ? { annualSalary: salaryValue } : {}),
      pensionPercent: roundTo2dp(Math.max(0, values.employeePercent ?? 0)),
      pensionEmployerPercent: roundTo2dp(Math.max(0, values.employerPercent ?? 0)),
      // The method is written only when the user changed it: the form starts from a guess when
      // no method is stored, and saving that guess would turn it into a choice.
      ...(values.methodChanged
        ? {
            isSalarySacrifice: values.isSalarySacrifice,
            isSalarySacrificeEmployerNi:
              values.isSalarySacrifice && values.isSalarySacrificeEmployerNi,
          }
        : {}),
    });
  };

  // The dashboard links to #pension-details: scroll to the card and move focus there.
  useEffect(() => {
    if (hash !== "#pension-details") return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById("pension-details");
      target?.scrollIntoView?.({ block: "start" });
      target?.focus?.({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  useEffect(() => {
    if (scrollToZone === 0) return;
    document.getElementById(PENSION_SCENARIO_ZONE_ID)?.scrollIntoView?.({ block: "start" });
  }, [scrollToZone]);

  const effectiveSalary =
    baseline.annualGrossSalary > 0 ? baseline.annualGrossSalary : annualSalary;
  const effectiveEmployeePct =
    baseline.pensionContributionPct > 0 ? baseline.pensionContributionPct : employeePercent;
  const effectiveIsSalarySacrifice = baseline.isSalarySacrifice ?? isSalarySacrifice;

  const knownRegion = getKnownTrapRegion(baseline);
  const taxTrap = useMemo(() => {
    return calculate100kTaxTrap(
      effectiveSalary,
      effectiveEmployeePct,
      effectiveIsSalarySacrifice,
      knownRegion ?? "ENGLAND_NI_WALES",
    );
  }, [effectiveSalary, effectiveEmployeePct, effectiveIsSalarySacrifice, knownRegion]);
  // Saved baseline and profile figures only (adjusted net income after the saved contribution).
  const showTrapNote = isInTaxTrapAlertBand(taxTrap.adjustedNetIncome);

  // Seeds the zone's contribution input only. Nothing is saved (advice boundary R5).
  const handleModelTaxTrapContribution = (contributionReq: number) => {
    if (!effectiveSalary || effectiveSalary <= 0) return;
    const needed = employeePercent + (Math.max(0, contributionReq) / effectiveSalary) * 100;
    // Rounded up to the slider's half-percent step, so the illustration reaches £100,000.
    const percent = Math.min(MAX_CONTRIBUTION_PERCENT, Math.ceil(needed * 2) / 2);
    scenario.set("contributionPercent", percent);
    setTool("retirement");
    setScrollToZone((n) => n + 1);
  };

  const openAddPot = () => setIsAddModalOpen(true);
  const addPotButton = (
    <Button type="button" onClick={openAddPot}>
      <Icon icon={Plus} size="sm" />
      Add pension pot
    </Button>
  );
  const dialog = (
    <AddPensionAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
  );

  // Nothing saved yet: the header and one prompt, with no strip, zone or drawer (E16 P12.2).
  if (!hasPots && !hasSalary) {
    return (
      <PageBody>
        <PageHeader title="Your pension" />
        <EmptyState
          action={addPotButton}
          description="Add a pension pot to see its value and an estimate of your income at retirement."
          headingLevel="h2"
          illustration={<Illustration scene="onboarding" />}
          title="No pension pots yet"
        />
        {dialog}
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader actions={addPotButton} title="Your pension" />

      <PensionSummary
        estimatedMonthlyIncome={estimateKnown ? savedResult.monthlyRetirementIncome : null}
        estimateMissing={estimateMissing}
        includesPotPayments={hasSalary && directMonthlyContrib > 0}
        monthlyTotal={monthlyTotal}
        potsCount={pensionAccounts.length}
        ratesAssumed={ratesAssumed}
        retirementAge={retirementAge}
        totalValue={totalValue}
        onAddPot={openAddPot}
      />

      <PensionDetails
        annualSalary={annualSalary}
        employeePercent={employeePercent}
        employerPercent={employerPercent}
        hasSalary={hasSalary}
        isEditing={isEditingDetails}
        isSalarySacrifice={isSalarySacrifice}
        isSalarySacrificeEmployerNi={isSalarySacrificeEmployerNi}
        methodSet={methodSet}
        ratesAssumed={ratesAssumed}
        onEditingChange={setIsEditingDetails}
        onSave={handleSaveDetails}
      >
        <PensionAccountsList accounts={pensionAccounts} />
      </PensionDetails>

      <PensionForecast
        {...forecastBase}
        currentAge={currentAge}
        hasSalary={hasSalary}
        savedEmployeePercent={employeePercent}
        savedResult={savedResult}
        scenario={scenario}
        showsOtherTaxFigure={showTrapNote}
        takeHomeFacts={takeHomeFacts}
        tool={tool}
        onToolChange={setTool}
      />

      {/* Personal Allowance taper (E31, ruling 6): one factual line after the main content, and
          only when saved adjusted net income is in the engine's alert band. Never a banner or a
          heading, never gated on scenario inputs. */}
      {showTrapNote && (
        <div className={trapLine} data-testid="pension-trap-note" id="pension-trap-note">
          <p className={trapText}>
            {taxTrap.isInTaxTrap
              ? "Your adjusted net income is above £100,000, where the Personal Allowance reduces."
              : "The Personal Allowance reduces when adjusted net income is above £100,000."}
          </p>
          {taxTrap.isInTaxTrap && (
            <p className={trapText}>
              In this estimate, an extra contribution of{" "}
              {formatCurrency(taxTrap.contributionRequiredToEscapeGbp)} a year brings it down to the
              start of the band.{" "}
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  handleModelTaxTrapContribution(taxTrap.contributionRequiredToEscapeGbp)
                }
              >
                Model this contribution
              </Button>
            </p>
          )}
          {!knownRegion && (
            <p className={mutedNote}>
              {REGION_ASSUMPTION_LABEL}{" "}
              <Link to={REGION_SETTINGS_PATH} className={regionLinkStyle}>
                Set your region
              </Link>
            </p>
          )}
        </div>
      )}

      <ForecastAssumptions
        annualPaidIn={savedResult.totalAnnualInflow}
        employerAndGrowth={
          estimateKnown ? savedResult.totalEmployerContribs + savedResult.totalGrowth : null
        }
        growthRateIsPlaceholder={growthRateIsPlaceholder}
        isSalarySacrifice={isSalarySacrifice}
        methodSet={methodSet}
        passEmployerNi={isSalarySacrificeEmployerNi}
        placeholderGrowthRate={ASSUMED_GROWTH_RATE}
        statePensionAnnual={savedResult.statePensionAnnual}
        totalGrowth={estimateKnown ? savedResult.totalGrowth : null}
      />

      {dialog}
    </PageBody>
  );
};

export default PensionContainer;
