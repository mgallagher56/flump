import {
  calculate100kTaxTrap,
  calculateEmployerNISavings,
  getCurrentUKTaxYear,
  isFigureKnown,
  isInTaxTrapAlertBand,
  PortfolioSnapshot,
  profileFactsFromProfile,
  salarySacrificeFromProfile,
  selectTakeHome,
} from "@flump/finance-engine";
import { Button, Icon, LiveRegion, PageHeader, StatusBadge } from "@repo/ui";
import { LineChart, PiggyBank, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useLocation } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { AddPensionAccountDialog } from "~/features/pension/components/AddPensionAccountDialog";
import { PensionAccountsList } from "~/features/pension/components/PensionAccountsList";
import {
  PensionDetails,
  type PensionDetailsSaveValues,
} from "~/features/pension/components/PensionDetails";
import {
  PENSION_SCENARIO_ZONE_ID,
  PensionForecast,
} from "~/features/pension/components/PensionForecast";
import { PensionSummary } from "~/features/pension/components/PensionSummary";
import { usePensionScenario } from "~/features/pension/usePensionScenario";
import { AnnualAllowancePill } from "~/features/savings/components/AnnualAllowancePill";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.pension";
import { useFinancialBaseline } from "~/state/baseline.store";
import { roundTo2dp } from "~/utils/roundTo2dp";
import {
  getKnownTrapRegion,
  getTaxTrapCopy,
  REGION_ASSUMPTION_LABEL,
  REGION_SETTINGS_PATH,
  regionLinkStyle,
} from "~/utils/taxTrapCopy";
import {
  mutedNote,
  pageRoot,
  panelStack,
  strong,
  tabButton,
  tabList,
  trapAction,
  trapAlert,
  trapHeading,
  trapHeadingRow,
} from "./PensionContainer.styles";

type PensionTab = "forecaster" | "pots" | "rules";

/** Highest extra monthly payment the what-if lever offers. */
const MAX_EXTRA_MONTHLY = 5000;

export const PensionContainer: FC = () => {
  const loaderData = useLoaderData<typeof loader>();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];
  const userProfile = loaderData?.userProfile;

  const { formatCurrency } = useFormatCurrency();
  const { profile, setProfile, updateProfile, markChecklistStep } = useUserProfile();
  const updatedAt: string | null =
    (profile as { updatedAt?: string }).updatedAt ||
    (userProfile as { updatedAt?: string } | undefined)?.updatedAt ||
    null;
  const { baseline } = useFinancialBaseline();

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PensionTab>("forecaster");
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

  // Total pension value
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
    if (rated.length === 0) return { weightedReturnRate: 5.0, growthRateIsPlaceholder: true };
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

  // Rates from profile
  const isReset = Boolean(profile.hasResetFinancialData ?? userProfile?.hasResetFinancialData);
  // No salary is a real state: the forecaster prompts for it instead of assuming a figure.
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
  const isSalarySacrificeEmployerNi = isReset
    ? (profile.isSalarySacrificeEmployerNi ?? userProfile?.isSalarySacrificeEmployerNi ?? false)
    : (profile.isSalarySacrificeEmployerNi ?? userProfile?.isSalarySacrificeEmployerNi ?? false);
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
  const monthlyEmployerNiContrib = annualEmployerNiSavings / 12;
  const monthlyEmployerContrib = standardMonthlyEmployerContrib + monthlyEmployerNiContrib;

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

  // The take-home effect reads only answered pension facts: an unanswered percentage or method
  // stays null so the panel asks for it instead of using the 5% / salary sacrifice defaults.
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

  // UK Tax & NI relief calculation for employee pension contribution. An unknown employment type
  // or setting gives no relief figure.
  const { netMonthlyCost, taxReliefMonthly } = useMemo(() => {
    if (annualSalary <= 0 || employeePercent <= 0) {
      return { netMonthlyCost: 0, taxReliefMonthly: 0 };
    }
    const withoutPension = selectTakeHome(savedFacts, { overrides: { pensionPercent: 0 } });
    const withPension = selectTakeHome(savedFacts, {
      overrides: { pensionPercent: employeePercent },
    });
    if (!isFigureKnown(withoutPension) || !isFigureKnown(withPension)) {
      return { netMonthlyCost: 0, taxReliefMonthly: 0 };
    }
    const netCost = Math.max(0, (withoutPension.value.annual - withPension.value.annual) / 12);
    const relief = Math.max(0, Math.round(monthlyEmployeeContrib - netCost));
    return { netMonthlyCost: netCost, taxReliefMonthly: relief };
  }, [annualSalary, employeePercent, monthlyEmployeeContrib, savedFacts]);

  // Scenario inputs live in memory only: no storage, no URL, no network. Seeded from saved data.
  const savedGrowthRate = weightedReturnRate > 0 ? Number(weightedReturnRate.toFixed(1)) : 5;
  const scenario = usePensionScenario(savedGrowthRate);

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
      isSalarySacrifice: values.isSalarySacrifice,
      isSalarySacrificeEmployerNi: values.isSalarySacrifice && values.isSalarySacrificeEmployerNi,
    });
  };

  // Opens the normal edit form (saved values) and brings it into view.
  const handleEditDetails = () => {
    setIsEditingDetails(true);
    document.getElementById("pension-details")?.scrollIntoView?.({ block: "start" });
  };

  // The dashboard links to #pension-details. The details card sits above the tabs, so the link
  // only needs to scroll to it and move focus there.
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
  const trapCopy = getTaxTrapCopy(taxTrap);
  // Saved baseline and profile figures only (adjusted net income after the saved contribution).
  const showTrapNote = isInTaxTrapAlertBand(taxTrap.adjustedNetIncome);

  // Seeds the zone's extra-monthly lever only. Nothing is saved (advice boundary R5).
  const handleModelTaxTrapContribution = (contributionReq: number) => {
    if (!effectiveSalary || effectiveSalary <= 0) return;
    const extraMonthly = Math.min(MAX_EXTRA_MONTHLY, Math.max(0, Math.round(contributionReq / 12)));
    scenario.set("extraMonthly", extraMonthly);
    setActiveTab("forecaster");
    setScrollToZone((n) => n + 1);
  };

  // Headline outcome only; empty (nothing announced) when salary or contribution is not set.
  const pensionHeadline =
    netMonthlyCost > 0
      ? `Your pension contribution costs ${formatCurrency(netMonthlyCost)} a month after ${formatCurrency(
          taxReliefMonthly,
        )} tax relief`
      : "";

  const tabItems: { id: PensionTab; label: string; icon: typeof LineChart }[] = [
    { id: "forecaster", label: "Forecast", icon: LineChart },
    { id: "pots", label: `Your pots (${pensionAccounts.length})`, icon: PiggyBank },
    { id: "rules", label: "Contributions and allowances", icon: ShieldCheck },
  ];
  const panelProps = (id: PensionTab) => ({
    "aria-labelledby": `pension-tab-${id}`,
    className: panelStack,
    hidden: activeTab !== id,
    id: `pension-panel-${id}`,
    role: "tabpanel" as const,
  });

  return (
    <div className={pageRoot}>
      <PageHeader
        actions={
          <Button type="button" onClick={() => setIsAddModalOpen(true)}>
            <Icon icon={Plus} size="sm" />
            Add pension pot
          </Button>
        }
        subtitle="Your pension pots, what goes in each month, and how it could grow by retirement."
        title="Your pension"
      />
      <LiveRegion debounceMs={1000} message={pensionHeadline} visuallyHidden />

      <PensionSummary
        directMonthlyContrib={directMonthlyContrib}
        employeePercent={employeePercent}
        employerPercent={employerPercent}
        growthRateIsPlaceholder={growthRateIsPlaceholder}
        hasSalary={hasSalary}
        monthlyEmployeeContrib={monthlyEmployeeContrib}
        monthlyEmployerContrib={monthlyEmployerContrib}
        netMonthlyCost={netMonthlyCost}
        potsCount={pensionAccounts.length}
        taxReliefMonthly={taxReliefMonthly}
        totalValue={totalValue}
        weightedReturnRate={weightedReturnRate}
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
        monthlyEmployeeContrib={monthlyEmployeeContrib}
        monthlyEmployerNiContrib={monthlyEmployerNiContrib}
        ratesAssumed={ratesAssumed}
        standardMonthlyEmployerContrib={standardMonthlyEmployerContrib}
        updatedAt={updatedAt}
        onEditingChange={setIsEditingDetails}
        onSave={handleSaveDetails}
      />

      {/* Roving-tabindex tabs on plain buttons, as on the mortgage and debt pages.
          TODO(E15 Phase 2): adopt @repo/ui SegmentedTabs once it renders its panels. */}
      <div aria-label="Pension tools" className={tabList()} role="tablist">
        {tabItems.map((tab, index) => (
          <button
            aria-controls={`pension-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={tabButton({ active: activeTab === tab.id })}
            id={`pension-tab-${tab.id}`}
            key={tab.id}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
              const last = tabItems.length - 1;
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabItems.length
                  : event.key === "ArrowLeft"
                    ? (index + last) % tabItems.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? last
                        : null;
              if (next === null) return;
              event.preventDefault();
              setActiveTab(tabItems[next].id);
              document.getElementById(`pension-tab-${tabItems[next].id}`)?.focus();
            }}
          >
            <Icon icon={tab.icon} size="sm" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels stay mounted (hidden) so scenario inputs survive a tab switch. */}
      <div {...panelProps("forecaster")}>
        <PensionForecast
          currentPotTotal={totalValue}
          directMonthlyContrib={directMonthlyContrib}
          employeePercent={employeePercent}
          employerPercent={employerPercent}
          growthRateIsPlaceholder={growthRateIsPlaceholder}
          hasPots={pensionAccounts.length > 0}
          hasSalary={hasSalary}
          isSalarySacrifice={isSalarySacrifice}
          passEmployerNi={isSalarySacrificeEmployerNi}
          portfolioReturnRate={weightedReturnRate}
          salary={annualSalary}
          scenario={scenario}
          takeHomeFacts={takeHomeFacts}
          onEditDetails={handleEditDetails}
        />
      </div>

      <div {...panelProps("pots")}>
        <PensionAccountsList
          accounts={pensionAccounts}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </div>

      <div {...panelProps("rules")}>
        <AnnualAllowancePill
          type="pension"
          currentAmount={
            (monthlyEmployeeContrib +
              monthlyEmployerContrib +
              monthlyEmployerNiContrib +
              directMonthlyContrib) *
            12
          }
        />
        <p className={mutedNote}>
          Auto-enrolment minimum: 5% from you and 3% from your employer, 8% in total.
        </p>
      </div>

      {/* Personal Allowance taper (E31): after the main content, and only when saved adjusted net
          income is in the engine's alert band. Never gated on scenario inputs. */}
      {showTrapNote && (
        <section aria-labelledby="pension-trap-title" className={trapAlert}>
          {taxTrap.isInTaxTrap ? (
            <>
              <div className={trapHeadingRow}>
                <h2 className={trapHeading} id="pension-trap-title">
                  <Icon icon={TriangleAlert} size="sm" />
                  Personal Allowance taper, £100,000–£125,140: {trapCopy.incomeTaxRate} marginal
                  rate (unverified estimate)
                </h2>
                <StatusBadge size="sm" variant="warning">
                  {trapCopy.breakdown}
                </StatusBadge>
              </div>
              <p>
                Your adjusted net income is{" "}
                <strong className={strong}>{formatCurrency(taxTrap.adjustedNetIncome)}</strong>.
                Every £2 earned above £100k reduces your Personal Allowance by £1, resulting in a
                marginal rate of {trapCopy.breakdown} and{" "}
                {formatCurrency(taxTrap.estimatedTaxSavedByEscapingGbp)} in additional tax.
              </p>
            </>
          ) : (
            <>
              <h2 className={trapHeading} id="pension-trap-title">
                <Icon icon={TriangleAlert} size="sm" />
                Personal Allowance taper starts at £100,000
              </h2>
              <p>
                Your adjusted net income is{" "}
                <strong className={strong}>{formatCurrency(taxTrap.adjustedNetIncome)}</strong>.
                Above £100,000, every £2 of adjusted net income reduces your Personal Allowance by
                £1, until it reaches zero at £125,140.
              </p>
            </>
          )}
          {!knownRegion && (
            <p className={mutedNote}>
              {REGION_ASSUMPTION_LABEL}{" "}
              <Link to={REGION_SETTINGS_PATH} className={regionLinkStyle}>
                Set your region
              </Link>
            </p>
          )}
          {taxTrap.isInTaxTrap && (
            <div className={trapAction}>
              <p>
                Adjusted net income above £100,000 reduces the personal allowance. A contribution of{" "}
                <strong className={strong}>
                  {formatCurrency(taxTrap.contributionRequiredToEscapeGbp)}
                </strong>{" "}
                would bring adjusted net income to £100,000 in this estimate.
              </p>
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
            </div>
          )}
        </section>
      )}

      <AddPensionAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default PensionContainer;
