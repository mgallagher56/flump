import {
  calculate100kTaxTrap,
  calculateEmployerNISavings,
  getCurrentUKTaxYear,
  isInTaxTrapAlertBand,
  PortfolioSnapshot,
  profileFactsFromProfile,
  salarySacrificeFromProfile,
} from "@flump/finance-engine";
import { Button, EmptyState, Icon, InfoTip, PageBody, PageHeader } from "@repo/ui";
import { Plus } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useLocation } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { AddPensionAccountDialog } from "~/features/pension/components/AddPensionAccountDialog";
import { PensionAccountsList } from "~/features/pension/components/PensionAccountsList";
import {
  MAX_CONTRIBUTION_PERCENT,
  PENSION_SCENARIO_ZONE_ID,
  PensionContributionScenario,
} from "~/features/pension/components/PensionContributionScenario";
import {
  PensionDetails,
  type PensionDetailsSaveValues,
} from "~/features/pension/components/PensionDetails";
import { PensionRules } from "~/features/pension/components/PensionRules";
import { PensionSummary } from "~/features/pension/components/PensionSummary";
import { pensionRatesAssumed } from "~/features/pension/contribution";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useScenarioState } from "~/hooks/useScenarioState";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.pension";
import { useFinancialBaseline } from "~/state/baseline.store";
import { seededProfile } from "~/utils/profileFirst";
import { roundTo2dp } from "~/utils/roundTo2dp";
import {
  getKnownTrapRegion,
  REGION_ASSUMPTION_LABEL,
  REGION_SETTINGS_PATH,
  regionLinkStyle,
} from "~/utils/taxTrapCopy";
import { retirementLine, retirementLink, trapLine, trapText } from "./PensionContainer.styles";

export const RETIREMENT_PATH = "/app/retirement";

/**
 * The pension page (E16 PR 7, decision RD6): saved facts first (hero "Total in your pots", what
 * goes in each month, "Your details" with the pots and the quiet "UK pension rules" drawer), then
 * one ScenarioZone for the effect of a contribution change on take-home pay. Pension projections
 * live on the Retirement page. Headline figures read saved loader data only (ruling D2).
 */
export const PensionContainer: FC = () => {
  const loaderData = useLoaderData<typeof loader>();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];
  const userProfile = loaderData?.userProfile;
  const retirementAvailable = loaderData?.retirementAvailable === true;

  const { formatCurrency } = useFormatCurrency();
  const { profile: atomProfile, setProfile, updateProfile, markChecklistStep } = useUserProfile();
  // Saved loader figures until the atom holds this user's profile (no 5% and 3% first paint).
  const profile = seededProfile(atomProfile, userProfile as typeof atomProfile | undefined);
  const { baseline } = useFinancialBaseline();

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  // Bumped by "Model this contribution" so the page scrolls to the scenario zone.
  const [scrollToZone, setScrollToZone] = useState(0);
  // The scenario zone starts closed below the saved figures; "Model this contribution" opens it.
  const [isZoneOpen, setIsZoneOpen] = useState(false);
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

  const isReset = Boolean(profile.hasResetFinancialData ?? userProfile?.hasResetFinancialData);
  // No salary is a real state: the zone prompts for it instead of assuming a figure.
  const storedSalary: number | null = profile.annualSalary ?? userProfile?.annualSalary ?? null;
  const hasSalary = storedSalary !== null && storedSalary > 0;
  const annualSalary = storedSalary ?? 0;
  // The backend creates the profile row with the auto-enrolment minimums (5% and 3%), so
  // that exact pair is flagged as a default the user may never have chosen.
  const ratesAssumed = pensionRatesAssumed({
    pensionPercent: profile.pensionPercent ?? userProfile?.pensionPercent,
    pensionEmployerPercent: profile.pensionEmployerPercent ?? userProfile?.pensionEmployerPercent,
  });
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

  // Scenario input lives in memory only: no storage, no URL, no network. Seeded from saved data.
  const scenarioSeed = useMemo(() => ({ contributionPercent: employeePercent }), [employeePercent]);
  const scenario = useScenarioState(scenarioSeed);

  const hasPots = pensionAccounts.length > 0;
  const monthlyTotal = hasSalary
    ? monthlyEmployeeContrib + monthlyEmployerContrib + directMonthlyContrib
    : directMonthlyContrib > 0
      ? directMonthlyContrib
      : null;
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

  // The dashboard links to #pension-details: scroll to the section and move focus to its heading.
  useEffect(() => {
    if (hash !== "#pension-details") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("pension-details")?.scrollIntoView?.({ block: "start" });
      document.getElementById("pension-details-title")?.focus?.({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  useEffect(() => {
    if (scrollToZone === 0) return;
    document.getElementById(PENSION_SCENARIO_ZONE_ID)?.scrollIntoView?.({ block: "start" });
  }, [scrollToZone]);

  // One source for the £100,000 line and its "Model this contribution" seed: the saved profile,
  // the same figures the zone projects from, so the seeded contribution lands at £100,000. Only
  // the region comes from the baseline.

  const knownRegion = getKnownTrapRegion(baseline);
  const taxTrap = useMemo(() => {
    return calculate100kTaxTrap(
      annualSalary,
      employeePercent,
      isSalarySacrifice,
      knownRegion ?? "ENGLAND_NI_WALES",
    );
  }, [annualSalary, employeePercent, isSalarySacrifice, knownRegion]);
  // Saved profile figures only (adjusted net income after the saved contribution).
  const showTrapNote = isInTaxTrapAlertBand(taxTrap.adjustedNetIncome);

  // Seeds the zone's contribution input only. Nothing is saved (advice boundary R5).
  const handleModelTaxTrapContribution = (contributionReq: number) => {
    if (annualSalary <= 0) return;
    const needed = employeePercent + (Math.max(0, contributionReq) / annualSalary) * 100;
    // Rounded up to the slider's half-percent step, so the illustration reaches £100,000.
    const percent = Math.min(MAX_CONTRIBUTION_PERCENT, Math.ceil(needed * 2) / 2);
    scenario.set("contributionPercent", percent);
    setIsZoneOpen(true);
    setScrollToZone((n) => n + 1);
  };

  const openAddPot = () => setIsAddModalOpen(true);
  // Compact in the header, so at 375 it does not push the hero down as a full primary button.
  const addPotButton = (size: "sm" | "md") => (
    <Button size={size} type="button" onClick={openAddPot}>
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
        <PageHeader illustration="empty-pension" title="Your pension" />
        <EmptyState
          action={addPotButton("md")}
          description="Add a pension pot to see its value and what goes in each month."
          headingLevel="h2"
          title="No pension pots yet"
        />
        {dialog}
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        actions={addPotButton("sm")}
        // The page icon, empty or filled in; the empty state has none, so one is in view.
        illustration="empty-pension"
        subtitle="Your pots and what goes in each month."
        title="Your pension"
      />

      <PensionSummary
        includesPotPayments={hasSalary && directMonthlyContrib > 0}
        monthlyTotal={monthlyTotal}
        potsCount={pensionAccounts.length}
        ratesAssumed={ratesAssumed}
        totalValue={totalValue}
        onAddPot={openAddPot}
      />

      {retirementAvailable && (
        <p
          className={retirementLine}
          data-testid="pension-retirement-link"
          id="pension-retirement-link"
        >
          Your retirement plan shows what your pots could give you each year.{" "}
          <Link className={retirementLink} to={RETIREMENT_PATH}>
            Open your retirement plan
          </Link>
        </p>
      )}

      <PensionDetails
        annualSalary={annualSalary}
        employeePercent={employeePercent}
        employerPercent={employerPercent}
        factsOpen={hash === "#pension-details"}
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

      <PensionRules
        annualPaidIn={monthlyTotal === null ? null : monthlyTotal * 12}
        isSalarySacrifice={isSalarySacrifice}
        methodSet={methodSet}
        passEmployerNi={isSalarySacrificeEmployerNi}
      />

      <PensionContributionScenario
        hasSalary={hasSalary}
        open={isZoneOpen}
        salary={annualSalary}
        savedEmployeePercent={employeePercent}
        scenario={scenario}
        showsOtherTaxFigure={showTrapNote}
        takeHomeFacts={takeHomeFacts}
        onOpenChange={setIsZoneOpen}
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
            {/* The rates assumption sits behind the "i" (owner item 23); its link is in the popover. */}
            {!knownRegion && (
              <>
                {" "}
                <InfoTip id="pension-trap-region-info" term="Tax region">
                  {REGION_ASSUMPTION_LABEL}{" "}
                  <Link to={REGION_SETTINGS_PATH} className={regionLinkStyle}>
                    Set your region
                  </Link>
                </InfoTip>
              </>
            )}
          </p>
          {taxTrap.isInTaxTrap && (
            <p className={trapText}>
              In this estimate, an extra contribution of{" "}
              {formatCurrency(taxTrap.contributionRequiredToEscapeGbp)} a year brings it back to
              that line.{" "}
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
        </div>
      )}

      {dialog}
    </PageBody>
  );
};

export default PensionContainer;
