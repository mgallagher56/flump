import {
  calculate100kTaxTrap,
  calculateEmployerNISavings,
  getCurrentUKTaxYear,
  isFigureKnown,
  PortfolioSnapshot,
  profileFactsFromProfile,
  selectTakeHome,
} from "@flump/finance-engine";
import {
  Button,
  Card,
  Icon,
  LiveRegion,
  PageHeader,
  ProjectionNotice,
  StatusBadge,
} from "@repo/ui";
import {
  Check,
  LineChart,
  Pencil,
  PiggyBank,
  Plus,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useLocation } from "react-router";
import AddPensionAccountDialog from "~/components/pension/AddPensionAccountDialog";
import PensionAccountsList from "~/components/pension/PensionAccountsList";
import PensionForecasterCard from "~/components/pension/PensionForecasterCard";
import type { Account } from "~/containers/accounts/types";
import { PensionSummary } from "~/features/pension/components/PensionSummary";
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
  assumedLabel,
  buttonRow,
  checkHint,
  checkRow,
  checkStack,
  dot,
  employeeSegment,
  employerSegment,
  fieldLabel,
  inlineEditGrid,
  inlineInput,
  legendGroup,
  legendItem,
  legendRow,
  mutedNote,
  niNote,
  noteLink,
  pageRoot,
  panelStack,
  promptCard,
  proportionBar,
  rulesActions,
  rulesCard,
  rulesHeader,
  rulesTitle,
  strong,
  tabButton,
  tabList,
  trapAction,
  trapAlert,
  trapHeading,
  trapHeadingRow,
} from "./PensionContainer.styles";

type PensionTab = "forecaster" | "pots" | "rules";

const ASSUMED_RATE_LABEL = "Default: auto-enrolment minimum. Change in your pension details";
const DEFAULT_GROWTH_NOTE =
  "No growth rate is set on your pots, so the forecast uses a 5% placeholder. Edit a pot to set its rate.";

const percentFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const formatPercent = (value: number) => `${percentFormat.format(value)}%`;

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
  const [showWizard, setShowWizard] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const { hash } = useLocation();
  // The dashboard links to #pension-details, which lives on the rules tab.
  const [activeTab, setActiveTab] = useState<PensionTab>(
    hash === "#pension-details" ? "rules" : "forecaster",
  );
  useEffect(() => {
    if (hash !== "#pension-details") return;
    setActiveTab("rules");
    // Wait a frame so the rules tab is visible before scrolling to its details card.
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById("pension-details");
      target?.scrollIntoView?.({ block: "start" });
      target?.focus?.({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  const [whatIfRequest, setWhatIfRequest] = useState<{
    employeePercent: number;
    id: number;
  } | null>(null);

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
  const isSalarySacrifice = isReset
    ? (profile.isSalarySacrifice ?? userProfile?.isSalarySacrifice ?? false)
    : (profile.isSalarySacrifice ?? userProfile?.isSalarySacrifice ?? true);
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

  // UK Tax & NI relief calculation for employee pension contribution
  const { netMonthlyCost, taxReliefMonthly } = useMemo(() => {
    if (annualSalary <= 0 || employeePercent <= 0) {
      return { netMonthlyCost: 0, taxReliefMonthly: 0 };
    }
    // Region and student-loan plans come from the profile, so a Scottish or Plan 2 user gets
    // the right relief. An unknown employment type or setting gives no relief figure.
    const stored: Record<string, unknown> = { ...userProfile };
    for (const [key, value] of Object.entries(profile)) {
      if (value !== null && value !== undefined) stored[key] = value;
    }
    const facts = {
      ...profileFactsFromProfile(stored),
      annualSalary,
      employmentType: employmentType ?? null,
      isSalarySacrifice,
    };
    const withoutPension = selectTakeHome(facts, { overrides: { pensionPercent: 0 } });
    const withPension = selectTakeHome(facts, { overrides: { pensionPercent: employeePercent } });
    if (!isFigureKnown(withoutPension) || !isFigureKnown(withPension)) {
      return { netMonthlyCost: 0, taxReliefMonthly: 0 };
    }
    const netCost = Math.max(0, (withoutPension.value.annual - withPension.value.annual) / 12);
    const relief = Math.max(0, Math.round(monthlyEmployeeContrib - netCost));
    return { netMonthlyCost: netCost, taxReliefMonthly: relief };
  }, [
    annualSalary,
    employeePercent,
    employmentType,
    isSalarySacrifice,
    monthlyEmployeeContrib,
    profile,
    userProfile,
  ]);

  // Inline editing state for the Contributions Breakdown card
  const [isEditingRates, setIsEditingRates] = useState(false);
  // Held as strings so clearing a field does not snap it back to 0 while typing.
  const [editSalary, setEditSalary] = useState(String(annualSalary));
  const [editEmployeePct, setEditEmployeePct] = useState(String(employeePercent));
  const [editEmployerPct, setEditEmployerPct] = useState(String(employerPercent));
  const [editSalarySacrifice, setEditSalarySacrifice] = useState(isSalarySacrifice);
  const [editSalarySacrificeEmployerNi, setEditSalarySacrificeEmployerNi] = useState(
    isSalarySacrificeEmployerNi,
  );
  const [isSavingRates, setIsSavingRates] = useState(false);

  useEffect(() => {
    setEditSalary(String(annualSalary));
    setEditEmployeePct(String(employeePercent));
    setEditEmployerPct(String(employerPercent));
    setEditSalarySacrifice(isSalarySacrifice);
    setEditSalarySacrificeEmployerNi(isSalarySacrificeEmployerNi);
  }, [
    annualSalary,
    employeePercent,
    employerPercent,
    isSalarySacrifice,
    isSalarySacrificeEmployerNi,
  ]);

  // Mark setup checklist step as completed if accounts exist
  useEffect(() => {
    if (pensionAccounts.length > 0) {
      markChecklistStep("pension", true).catch(() => {});
    }
  }, [pensionAccounts.length, markChecklistStep]);

  const handleSyncContributions = async (
    newEmployeePct: number,
    newEmployerPct: number,
    newSalary?: number,
    newSalarySacrifice?: boolean,
    newEmployerNi?: boolean,
  ) => {
    try {
      await updateProfile({
        pensionPercent: roundTo2dp(newEmployeePct),
        pensionEmployerPercent: roundTo2dp(newEmployerPct),
        ...(newSalary ? { annualSalary: newSalary } : {}),
        ...(newSalarySacrifice !== undefined ? { isSalarySacrifice: newSalarySacrifice } : {}),
        ...(newEmployerNi !== undefined ? { isSalarySacrificeEmployerNi: newEmployerNi } : {}),
      });
    } catch (err) {
      console.error("Failed to sync pension rates to profile:", err);
    }
  };

  const handleSaveInlineRates = async () => {
    setIsSavingRates(true);
    const salaryValue = Math.max(0, Number(editSalary) || 0);
    try {
      await updateProfile({
        ...(salaryValue > 0 ? { annualSalary: salaryValue } : {}),
        pensionPercent: roundTo2dp(Math.max(0, Number(editEmployeePct) || 0)),
        pensionEmployerPercent: roundTo2dp(Math.max(0, Number(editEmployerPct) || 0)),
        isSalarySacrifice: editSalarySacrifice,
        isSalarySacrificeEmployerNi: editSalarySacrifice && editSalarySacrificeEmployerNi,
      });
      setIsEditingRates(false);
    } catch (err) {
      console.error("Failed to save inline pension rates:", err);
    } finally {
      setIsSavingRates(false);
    }
  };

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

  // Pre-fills the forecaster what-if only. Nothing is saved to the profile (advice boundary R5).
  const handleModelTaxTrapContribution = (contributionReq: number) => {
    if (!effectiveSalary || effectiveSalary <= 0) return;
    const currentMonthlyEmployee = (effectiveSalary * (effectiveEmployeePct / 100)) / 12;
    const extraMonthly = Math.round(contributionReq / 12);
    const targetMonthly = currentMonthlyEmployee + extraMonthly;
    const newEmployeePct = Math.min(
      100,
      Number((((targetMonthly * 12) / effectiveSalary) * 100).toFixed(1)),
    );
    setWhatIfRequest((prev) => ({ employeePercent: newEmployeePct, id: (prev?.id ?? 0) + 1 }));
  };

  // Headline outcome only; empty (nothing announced) when salary or contribution is not set.
  const pensionHeadline =
    netMonthlyCost > 0
      ? `Your pension contribution costs ${formatCurrency(netMonthlyCost)} a month after ${formatCurrency(
          taxReliefMonthly,
        )} tax relief`
      : "";

  const tabItems: { id: PensionTab; label: string; icon: typeof LineChart }[] = [
    { id: "forecaster", label: "Retirement forecast", icon: LineChart },
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
  const employeeShare = (employeePercent / (employeePercent + employerPercent || 1)) * 100;
  const employerShare = (employerPercent / (employeePercent + employerPercent || 1)) * 100;

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
      <ProjectionNotice />

      {/* £100k-£125k Personal Allowance taper: stated as fact, with a button to model it. */}
      {taxTrap.isInTaxTrap && (
        <section aria-labelledby="pension-trap-title" className={trapAlert}>
          <div className={trapHeadingRow}>
            <h2 className={trapHeading} id="pension-trap-title">
              <Icon icon={TriangleAlert} size="sm" />
              Personal Allowance taper, £100,000–£125,140: {trapCopy.incomeTaxRate} marginal rate
              (unverified estimate)
            </h2>
            <StatusBadge size="sm" variant="warning">
              {trapCopy.breakdown}
            </StatusBadge>
          </div>
          <p>
            Your adjusted net income is{" "}
            <strong className={strong}>{formatCurrency(taxTrap.adjustedNetIncome)}</strong>. Every
            £2 earned above £100k reduces your Personal Allowance by £1, resulting in a marginal
            rate of {trapCopy.breakdown} and{" "}
            {formatCurrency(taxTrap.estimatedTaxSavedByEscapingGbp)} in additional tax.
          </p>
          {!knownRegion && (
            <p className={mutedNote}>
              {REGION_ASSUMPTION_LABEL}{" "}
              <Link to={REGION_SETTINGS_PATH} className={regionLinkStyle}>
                Set your region
              </Link>
            </p>
          )}
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
        </section>
      )}

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

      {/* Panels stay mounted (hidden) so in-progress edits survive a tab switch. */}
      <div {...panelProps("forecaster")}>
        {hasSalary && growthRateIsPlaceholder && pensionAccounts.length > 0 && (
          <p className={mutedNote}>{DEFAULT_GROWTH_NOTE}</p>
        )}
        {hasSalary ? (
          <PensionForecasterCard
            currentPotTotal={totalValue}
            directMonthlyContrib={directMonthlyContrib}
            initialEmployeePercent={employeePercent}
            initialEmployerPercent={employerPercent}
            initialEmployerNiPassThrough={isSalarySacrificeEmployerNi}
            initialSalary={annualSalary}
            initialSalarySacrifice={isSalarySacrifice}
            portfolioReturnRate={weightedReturnRate}
            onSyncToProfile={handleSyncContributions}
            whatIfRequest={whatIfRequest}
          />
        ) : (
          <Card padding="md">
            <p className={promptCard}>
              Add your salary in{" "}
              <Link className={noteLink} to="/app/profile">
                Profile
              </Link>{" "}
              to project your pension.
            </p>
          </Card>
        )}
      </div>

      <div {...panelProps("pots")}>
        <PensionAccountsList
          accounts={pensionAccounts}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenWizard={() => setShowWizard(true)}
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

        <section
          aria-labelledby="pension-rules-title"
          className={rulesCard}
          data-testid="pension-details"
          id="pension-details"
          tabIndex={-1}
        >
          <div className={rulesHeader}>
            <h2 className={rulesTitle} id="pension-rules-title">
              <Icon icon={ShieldCheck} size="sm" />
              Your current contributions (UK auto-enrolment)
            </h2>
            <div className={rulesActions}>
              <p className={mutedNote}>Standard: 5% employee + 3% employer = 8% total</p>
              {!isEditingRates ? (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingRates(true)}
                >
                  <Icon icon={Pencil} size="sm" />
                  Edit rates
                </Button>
              ) : (
                <div className={buttonRow}>
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditingRates(false)}
                  >
                    <Icon icon={X} size="sm" />
                    Cancel
                  </Button>
                  <Button
                    disabled={isSavingRates}
                    size="sm"
                    type="button"
                    onClick={handleSaveInlineRates}
                  >
                    <Icon icon={Check} size="sm" />
                    {isSavingRates ? "Saving…" : "Save to profile"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isEditingRates && (
            <div className={inlineEditGrid}>
              <div>
                <label className={fieldLabel} htmlFor="inline-pension-salary">
                  Annual salary (£)
                </label>
                <input
                  className={inlineInput}
                  id="inline-pension-salary"
                  min="0"
                  step="500"
                  type="number"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="inline-employee-pct">
                  Your contribution (%)
                </label>
                <input
                  className={inlineInput}
                  id="inline-employee-pct"
                  max="100"
                  min="0"
                  step="0.5"
                  type="number"
                  value={editEmployeePct}
                  onChange={(e) => setEditEmployeePct(e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="inline-employer-pct">
                  Employer contribution (%)
                </label>
                <input
                  className={inlineInput}
                  id="inline-employer-pct"
                  max="100"
                  min="0"
                  step="0.5"
                  type="number"
                  value={editEmployerPct}
                  onChange={(e) => setEditEmployerPct(e.target.value)}
                />
              </div>
              <div className={checkStack}>
                <label className={checkRow} htmlFor="pension-salary-sacrifice-checkbox">
                  <input
                    checked={editSalarySacrifice}
                    id="pension-salary-sacrifice-checkbox"
                    type="checkbox"
                    onChange={(e) => {
                      setEditSalarySacrifice(e.target.checked);
                      if (!e.target.checked) {
                        setEditSalarySacrificeEmployerNi(false);
                      }
                    }}
                  />
                  <span>Salary sacrifice (saves NI)</span>
                </label>
                <label
                  className={checkRow}
                  data-disabled={!editSalarySacrifice}
                  htmlFor="pension-employer-ni-checkbox"
                >
                  <input
                    checked={editSalarySacrifice && editSalarySacrificeEmployerNi}
                    disabled={!editSalarySacrifice}
                    id="pension-employer-ni-checkbox"
                    type="checkbox"
                    onChange={(e) => setEditSalarySacrificeEmployerNi(e.target.checked)}
                  />
                  <span>
                    Pass on employer NI
                    <span className={checkHint}>
                      {editSalarySacrifice
                        ? "Employer reinvests their NI saving into your pot"
                        : "Requires salary sacrifice"}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* SVG rect widths are attributes, so the split needs no inline style. */}
          <svg
            aria-hidden="true"
            className={proportionBar}
            preserveAspectRatio="none"
            viewBox="0 0 100 12"
          >
            <rect className={employeeSegment} height="12" width={employeeShare} x="0" />
            <rect className={employerSegment} height="12" width={employerShare} x={employeeShare} />
          </svg>

          <div className={legendRow}>
            <div className={legendGroup}>
              <span className={legendItem}>
                <span aria-hidden="true" className={dot({ series: "employee" })} />
                <span>
                  <strong>Employee:</strong> {formatPercent(employeePercent)} (
                  {formatCurrency(monthlyEmployeeContrib)}
                  /mo)
                  {ratesAssumed && <span className={assumedLabel}>{ASSUMED_RATE_LABEL}</span>}
                </span>
              </span>
              <span className={legendItem}>
                <span aria-hidden="true" className={dot({ series: "employer" })} />
                <span>
                  <strong>Employer:</strong> {formatPercent(employerPercent)} (
                  {formatCurrency(standardMonthlyEmployerContrib)}/mo
                  {monthlyEmployerNiContrib > 0 && (
                    <span className={niNote}>
                      + {formatCurrency(monthlyEmployerNiContrib)}/mo NI
                    </span>
                  )}
                  ){ratesAssumed && <span className={assumedLabel}>{ASSUMED_RATE_LABEL}</span>}
                </span>
              </span>
            </div>

            <p className={mutedNote}>
              Salary:{" "}
              <strong>{hasSalary ? `${formatCurrency(annualSalary)}/yr` : "not set"}</strong> ·{" "}
              {isSalarySacrifice
                ? isSalarySacrificeEmployerNi
                  ? "Salary sacrifice + employer NI"
                  : "Salary sacrifice"
                : "Net pay"}{" "}
              · Synced with your profile
            </p>
          </div>
        </section>
      </div>

      <AddPensionAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default PensionContainer;
