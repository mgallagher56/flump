import {
  calculate100kTaxTrap,
  calculateEmployerNISavings,
  getCurrentUKTaxYear,
  isFigureKnown,
  PortfolioSnapshot,
  profileFactsFromProfile,
  selectTakeHome,
} from "@flump/finance-engine";
import { LiveRegion, ProjectionNotice } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaEdit, FaMagic, FaPlus, FaShieldAlt, FaTimes } from "react-icons/fa";
import { Link, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPCheckbox from "~/components/core/inputs/checkbox/FLPCheckbox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddPensionAccountDialog from "~/components/pension/AddPensionAccountDialog";
import PensionAccountsList from "~/components/pension/PensionAccountsList";
import PensionForecasterCard from "~/components/pension/PensionForecasterCard";
import PensionQuickStartWizard from "~/components/pension/PensionQuickStartWizard";
import PensionSummaryCards from "~/components/pension/PensionSummaryCards";
import AnnualAllowancePill from "~/components/savings/AnnualAllowancePill";
import type { Account } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { useUserProfile } from "~/hooks/useUserProfile";
import type { loader } from "~/routes/app.pension";
import { useFinancialBaseline } from "~/state/baseline.store";
import { roundTo2dp } from "~/utils/roundTo2dp";
import { getKnownTrapRegion, getTaxTrapCopy, REGION_ASSUMPTION_LABEL } from "~/utils/taxTrapCopy";
import { currentMonth, currentYear } from "~/utils/utils";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingBottom: "48px",
});

const headerContainerStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
  marginTop: "16px",
  marginBottom: "8px",
});

const segmentedControlStyle = css({
  display: "inline-flex",
  alignItems: "center",
  backgroundColor: "surface.sunken",
  padding: "4px",
  borderRadius: "xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  gap: "4px",
  maxWidth: "100%",
  overflowX: "auto",
  width: "fit-content",
});

const segmentedTabStyle = (active: boolean) =>
  css({
    padding: "8px 18px",
    minHeight: "38px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    whiteSpace: "nowrap",
    fontSize: "sm",
    fontWeight: active ? "semibold" : "medium",
    color: active ? "text.primary" : "text.muted",
    backgroundColor: active ? "surface" : "transparent",
    borderRadius: "lg",
    border: "none",
    cursor: "pointer",
    boxShadow: active ? "var(--shadows-card)" : "none",
    transition: "all 0.15s ease",
    _hover: {
      color: "text.primary",
    },
  });

const inlineEditGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr) 1.5fr" },
  gap: "12px",
  padding: "14px",
  borderRadius: "lg",
  backgroundColor: "var(--colors-primary-subtle)",
  border: "1px solid var(--colors-primary-border)",
});

const inlineInputStyle = css({
  width: "100%",
  padding: "8px 12px",
  fontSize: "sm",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  outline: "none",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

const ASSUMED_RATE_LABEL = "Default: auto-enrolment minimum. Change in Profile";
const DEFAULT_GROWTH_NOTE =
  "No growth rate is set on your pots, so the forecast uses a 5% placeholder. Edit a pot to set its rate.";

const assumedLabelStyle = css({
  fontSize: "xs",
  color: "text.muted",
  fontStyle: "italic",
});

const promptLinkStyle = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
});

export const PensionContainer: FC = () => {
  const { t } = useTranslation();
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
  const [activeTab, setActiveTab] = useState<"forecaster" | "pots" | "rules">("forecaster");
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
  const [editSalary, setEditSalary] = useState(annualSalary);
  const [editEmployeePct, setEditEmployeePct] = useState(employeePercent);
  const [editEmployerPct, setEditEmployerPct] = useState(employerPercent);
  const [editSalarySacrifice, setEditSalarySacrifice] = useState(isSalarySacrifice);
  const [editSalarySacrificeEmployerNi, setEditSalarySacrificeEmployerNi] = useState(
    isSalarySacrificeEmployerNi,
  );
  const [isSavingRates, setIsSavingRates] = useState(false);

  useEffect(() => {
    setEditSalary(annualSalary);
    setEditEmployeePct(employeePercent);
    setEditEmployerPct(employerPercent);
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
    try {
      await updateProfile({
        ...(editSalary > 0 ? { annualSalary: editSalary } : {}),
        pensionPercent: roundTo2dp(editEmployeePct),
        pensionEmployerPercent: roundTo2dp(editEmployerPct),
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

  return (
    <div className={containerStyle}>
      <LiveRegion debounceMs={1000} message={pensionHeadline} visuallyHidden />
      <ProjectionNotice />
      {/* £100k-£125k Marginal Tax Trap Optimizer Callout */}
      {taxTrap.isInTaxTrap && (
        <div
          className={css({
            padding: "16px 20px",
            borderRadius: "lg",
            backgroundColor: "var(--colors-status-warning-bg)",
            border: "1px solid var(--colors-status-warning-border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <FLPHeading as="h3" size="sm" style={{ color: "var(--colors-status-warning-text)" }}>
              £100k–£125,140 {trapCopy.incomeTaxRate} marginal tax trap active
            </FLPHeading>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: "var(--colors-status-warning-bg)",
                color: "var(--colors-status-warning-text)",
              }}
            >
              {trapCopy.breakdown}
            </span>
          </div>
          <FLPText fontSize="xs" color="text.secondary">
            Your adjusted net income is <strong>{formatCurrency(taxTrap.adjustedNetIncome)}</strong>
            . Every £2 earned above £100k reduces your Personal Allowance by £1, resulting in a
            marginal rate of {trapCopy.breakdown} and{" "}
            {formatCurrency(taxTrap.estimatedTaxSavedByEscapingGbp)} in additional tax.
          </FLPText>
          {!knownRegion && (
            <FLPText fontSize="xs" color="text.muted">
              {REGION_ASSUMPTION_LABEL}
            </FLPText>
          )}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "6px",
              backgroundColor: "var(--colors-surface)",
              border: "1px solid var(--colors-status-warning-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", maxWidth: "600px" }}>
              Adjusted net income above £100,000 reduces the personal allowance. A contribution of{" "}
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(taxTrap.contributionRequiredToEscapeGbp)}
              </strong>{" "}
              would bring adjusted net income to £100,000 in this estimate.
            </div>
            <FLPButton
              size="sm"
              variant="primary"
              onClick={() =>
                handleModelTaxTrapContribution(taxTrap.contributionRequiredToEscapeGbp)
              }
            >
              Model this contribution
            </FLPButton>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={headerContainerStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FLPHeading as="h1" color="text.primary" size="2xl">
              Pension and retirement tracking
            </FLPHeading>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "var(--colors-primary)",
                backgroundColor: "var(--colors-primary-subtle)",
                padding: "2px 8px",
                borderRadius: "full",
              })}
            >
              UK auto-enrolment
            </span>
          </div>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Track your pension pots, monitor employer and employee contributions, and forecast
            compound growth to retirement.
          </FLPText>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <FLPButton size="md" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <FaPlus style={{ marginRight: "6px" }} /> Add Pension Pot
          </FLPButton>
        </div>
      </div>

      {/* Summary Cards */}
      <PensionSummaryCards
        directMonthlyContrib={directMonthlyContrib}
        employeePercent={employeePercent}
        employerPercent={employerPercent}
        monthlyEmployeeContrib={monthlyEmployeeContrib}
        monthlyEmployerContrib={monthlyEmployerContrib}
        monthlyEmployerNiContrib={monthlyEmployerNiContrib}
        netMonthlyCost={netMonthlyCost}
        potsCount={pensionAccounts.length}
        taxReliefMonthly={taxReliefMonthly}
        totalValue={totalValue}
        weightedReturnRate={weightedReturnRate}
      />

      {/* Primary Workspace Segmented Tabs */}
      <div>
        <div className={segmentedControlStyle}>
          <button
            type="button"
            onClick={() => setActiveTab("forecaster")}
            className={segmentedTabStyle(activeTab === "forecaster")}
          >
            Retirement Simulator & Forecast
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pots")}
            className={segmentedTabStyle(activeTab === "pots")}
          >
            Pension Pots & Schemes ({pensionAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={segmentedTabStyle(activeTab === "rules")}
          >
            Contributions & Allowances
          </button>
        </div>
      </div>

      {/* Tab 1: Forecaster Card (Simulator) */}
      <div
        style={
          activeTab === "forecaster"
            ? undefined
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        {hasSalary && growthRateIsPlaceholder && pensionAccounts.length > 0 && (
          <FLPText color="text.muted" fontSize="xs">
            {DEFAULT_GROWTH_NOTE}
          </FLPText>
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
          <FLPCard>
            <FLPText color="text.muted" fontSize="sm">
              Add your salary in{" "}
              <Link className={promptLinkStyle} to="/app/profile">
                Profile
              </Link>{" "}
              to project your pension.
            </FLPText>
          </FLPCard>
        )}
      </div>

      {/* Tab 2: Pension Pots List */}
      <div
        style={
          activeTab === "pots"
            ? undefined
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        <PensionAccountsList
          accounts={pensionAccounts}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenWizard={() => setShowWizard(true)}
        />
      </div>

      {/* Tab 3: Contribution Rules & UK Auto-Enrolment Breakdown */}
      <div
        style={
          activeTab === "rules"
            ? { display: "flex", flexDirection: "column", gap: "20px" }
            : {
                height: 0,
                overflow: "hidden",
                opacity: 0,
                position: "absolute",
                pointerEvents: "none",
              }
        }
      >
        {/* UK Pension Annual Allowance Tracker (£60k Limit) */}
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

        {/* Contribution Rules & Split Banner */}
        <FLPCard
          className={css({
            padding: "20px",
            borderRadius: "xl",
            border: "1px solid",
            borderColor: "border",
            backgroundColor: "surface",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          })}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaShieldAlt
                style={{ color: "var(--colors-chart-accent-purple)", fontSize: "16px" }}
              />
              <FLPHeading as="h4" size="sm">
                Current Contributions Breakdown (UK Auto-Enrolment)
              </FLPHeading>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <FLPText color="text.muted" fontSize="xs">
                Standard: 5% employee + 3% employer = 8% total
              </FLPText>
              {!isEditingRates ? (
                <FLPButton size="sm" variant="outline" onClick={() => setIsEditingRates(true)}>
                  <FaEdit style={{ marginRight: "4px" }} /> Edit Rates
                </FLPButton>
              ) : (
                <div style={{ display: "flex", gap: "6px" }}>
                  <FLPButton size="sm" variant="ghost" onClick={() => setIsEditingRates(false)}>
                    <FaTimes style={{ marginRight: "4px" }} /> Cancel
                  </FLPButton>
                  <FLPButton
                    disabled={isSavingRates}
                    size="sm"
                    variant="primary"
                    onClick={handleSaveInlineRates}
                  >
                    <FaCheck style={{ marginRight: "4px" }} />{" "}
                    {isSavingRates ? "Saving..." : "Save to Profile"}
                  </FLPButton>
                </div>
              )}
            </div>
          </div>

          {isEditingRates && (
            <div className={inlineEditGridStyle}>
              <div>
                <label
                  htmlFor="inline-pension-salary"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Annual Salary (£)
                </label>
                <input
                  className={inlineInputStyle}
                  id="inline-pension-salary"
                  min="0"
                  step="500"
                  type="number"
                  value={editSalary}
                  onChange={(e) => setEditSalary(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label
                  htmlFor="inline-employee-pct"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Employee Contrib (%)
                </label>
                <input
                  className={inlineInputStyle}
                  id="inline-employee-pct"
                  max="100"
                  min="0"
                  step="0.5"
                  type="number"
                  value={editEmployeePct}
                  onChange={(e) => setEditEmployeePct(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label
                  htmlFor="inline-employer-pct"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Employer Contrib (%)
                </label>
                <input
                  className={inlineInputStyle}
                  id="inline-employer-pct"
                  max="100"
                  min="0"
                  step="0.5"
                  type="number"
                  value={editEmployerPct}
                  onChange={(e) => setEditEmployerPct(Number(e.target.value) || 0)}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  justifyContent: "center",
                  marginTop: "8px",
                }}
              >
                <FLPCheckbox
                  checked={editSalarySacrifice}
                  id="pension-salary-sacrifice-checkbox"
                  label="Salary Sacrifice (saves NI)"
                  size="sm"
                  onChange={(e) => {
                    setEditSalarySacrifice(e.target.checked);
                    if (!e.target.checked) {
                      setEditSalarySacrificeEmployerNi(false);
                    }
                  }}
                />
                <FLPCheckbox
                  checked={editSalarySacrifice && editSalarySacrificeEmployerNi}
                  disabled={!editSalarySacrifice}
                  id="pension-employer-ni-checkbox"
                  label="Pass on Employer NI"
                  description={
                    editSalarySacrifice
                      ? "Employer reinvests their NI saving into your pot"
                      : "Requires salary sacrifice"
                  }
                  size="sm"
                  onChange={(e) => setEditSalarySacrificeEmployerNi(e.target.checked)}
                />
              </div>
            </div>
          )}

          {/* Visual Progress / Proportion Bar */}
          <div
            style={{
              height: "12px",
              borderRadius: "999px",
              backgroundColor: "var(--colors-border)",
              display: "flex",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <div
              style={{
                width: `${(employeePercent / (employeePercent + employerPercent || 1)) * 100}%`,
                backgroundColor: "var(--colors-chart-primary)",
                transition: "width 0.4s ease",
              }}
              title={`Employee: ${employeePercent}%`}
            />
            <div
              style={{
                width: `${(employerPercent / (employeePercent + employerPercent || 1)) * 100}%`,
                backgroundColor: "var(--colors-chart-debt)",
                transition: "width 0.4s ease",
              }}
              title={`Employer: ${employerPercent}%`}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "13px",
            }}
          >
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "var(--colors-chart-primary)",
                    display: "inline-block",
                  }}
                />
                <strong>Employee:</strong> {employeePercent}% (
                {formatCurrency(monthlyEmployeeContrib)}/mo)
                {ratesAssumed && <span className={assumedLabelStyle}>{ASSUMED_RATE_LABEL}</span>}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "var(--colors-chart-debt)",
                    display: "inline-block",
                  }}
                />
                <strong>Employer:</strong> {employerPercent}% (
                {formatCurrency(standardMonthlyEmployerContrib)}/mo
                {monthlyEmployerNiContrib > 0 && (
                  <span style={{ color: "var(--colors-status-positive-text)", marginLeft: "4px" }}>
                    + {formatCurrency(monthlyEmployerNiContrib)}/mo NI
                  </span>
                )}
                ){ratesAssumed && <span className={assumedLabelStyle}>{ASSUMED_RATE_LABEL}</span>}
              </span>
            </div>

            <FLPText color="text.muted" fontSize="xs">
              Salary:{" "}
              <strong>{hasSalary ? `${formatCurrency(annualSalary)}/yr` : "not set"}</strong> ·{" "}
              {isSalarySacrifice
                ? isSalarySacrificeEmployerNi
                  ? "Salary Sacrifice + Employer NI"
                  : "Salary Sacrifice"
                : "Net Pay"}{" "}
              · Synced with User Profile
            </FLPText>
          </div>
        </FLPCard>
      </div>

      {/* Add Pot Modal */}
      <AddPensionAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default PensionContainer;
