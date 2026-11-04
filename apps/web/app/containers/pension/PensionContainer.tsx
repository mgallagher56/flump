import {
  calculateEmployerNISavings,
  calculateUKEWNITakeHome,
  getCurrentUKTaxYear,
} from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck, FaEdit, FaMagic, FaPlus, FaShieldAlt, FaTimes } from "react-icons/fa";
import { useLoaderData } from "react-router";
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
import { currentMonth, currentYear } from "~/utils/utils";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "28px",
  paddingBottom: "64px",
});

const headerContainerStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "16px",
  borderBottom: "1px solid",
  borderColor: "border",
  paddingBottom: "20px",
});

const inlineEditGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(3, 1fr) 1.5fr" },
  gap: "12px",
  padding: "14px",
  borderRadius: "lg",
  backgroundColor: "rgba(99, 99, 241, 0.04)",
  border: "1px solid rgba(99, 99, 241, 0.2)",
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

export const PensionContainer: FC = () => {
  const { t } = useTranslation();
  const loaderData = useLoaderData<typeof loader>();
  const accounts: Account[] = loaderData?.accounts || [];
  const accountDetails: any[] = loaderData?.accountDetails || [];
  const userProfile = loaderData?.userProfile;

  const { formatCurrency } = useFormatCurrency();
  const { profile, setProfile, updateProfile, markChecklistStep } = useUserProfile();

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setProfile]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(false);

  // Filter pension accounts and calculate current balances
  const pensionAccounts = useMemo(() => {
    return accounts
      .filter((acc) => acc.type === "Pension")
      .map((acc) => {
        const details = accountDetails.filter((d) => (d.account_id || d.accountId) === acc.id);
        const currentDetail = details.find(
          (d) => d.month === currentMonth && d.year === currentYear,
        );
        let balance = 0;
        if (acc.balance !== undefined && acc.balance !== null) {
          balance = Number(acc.balance);
        } else if (currentDetail) {
          balance = Number(currentDetail.value);
        } else if (details.length > 0) {
          balance = Number(details[details.length - 1].value);
        }

        const isCurrent = acc.isCurrent !== false;
        return {
          ...acc,
          balance,
          interestRate:
            acc.interestRate !== undefined && acc.interestRate !== null
              ? Number(acc.interestRate)
              : 5.0,
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
    return pensionAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [pensionAccounts]);

  // Direct monthly contributions set on individual pension pots (current pots only)
  const directMonthlyContrib = useMemo(() => {
    return pensionAccounts
      .filter((acc) => acc.isCurrent !== false)
      .reduce((sum, acc) => sum + (Number(acc.monthlyContribution) || 0), 0);
  }, [pensionAccounts]);

  // Portfolio balance-weighted average return rate
  const weightedReturnRate = useMemo(() => {
    if (pensionAccounts.length === 0) return 5.0;
    if (totalValue <= 0) {
      const sumRates = pensionAccounts.reduce(
        (sum, acc) => sum + (Number(acc.interestRate) || 5.0),
        0,
      );
      return Number((sumRates / pensionAccounts.length).toFixed(1));
    }
    const weightedSum = pensionAccounts.reduce(
      (sum, acc) => sum + (acc.balance || 0) * (Number(acc.interestRate) || 5.0),
      0,
    );
    return Number((weightedSum / totalValue).toFixed(1));
  }, [pensionAccounts, totalValue]);

  // Rates from profile
  const isReset = Boolean(profile.hasResetFinancialData ?? userProfile?.hasResetFinancialData);
  const annualSalary = isReset
    ? (profile.annualSalary ?? userProfile?.annualSalary ?? 0)
    : (profile.annualSalary ?? userProfile?.annualSalary ?? 45000);
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
  const employmentType = profile.employmentType ?? userProfile?.employmentType ?? "employed";

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
    const empType =
      employmentType === "employed" || employmentType === "self-employed"
        ? employmentType
        : "employed";
    const taxYear = getCurrentUKTaxYear();
    const withoutPension = calculateUKEWNITakeHome(
      annualSalary,
      empType,
      0,
      isSalarySacrifice,
      taxYear,
    ).monthlyTakeHome;
    const withPension = calculateUKEWNITakeHome(
      annualSalary,
      empType,
      employeePercent,
      isSalarySacrifice,
      taxYear,
    ).monthlyTakeHome;
    const netCost = Math.max(0, withoutPension - withPension);
    const relief = Math.max(0, Math.round(monthlyEmployeeContrib - netCost));
    return { netMonthlyCost: netCost, taxReliefMonthly: relief };
  }, [annualSalary, employeePercent, employmentType, isSalarySacrifice, monthlyEmployeeContrib]);

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

  // Open wizard by default only if user has no pension accounts and hasn't dismissed/completed it
  useEffect(() => {
    const alreadyCompleted =
      profile.setupChecklistCompletedSteps?.includes("pension") ||
      userProfile?.setupChecklistCompletedSteps?.includes("pension");
    if (pensionAccounts.length === 0 && !wizardDismissed && !alreadyCompleted) {
      setShowWizard(true);
    }
  }, [
    pensionAccounts.length,
    wizardDismissed,
    profile.setupChecklistCompletedSteps,
    userProfile?.setupChecklistCompletedSteps,
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
        pensionPercent: newEmployeePct,
        pensionEmployerPercent: newEmployerPct,
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
        annualSalary: editSalary,
        pensionPercent: editEmployeePct,
        pensionEmployerPercent: editEmployerPct,
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

  return (
    <div className={containerStyle}>
      {/* Header */}
      <div className={headerContainerStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FLPHeading as="h1" size="xl">
              Pension & Retirement Tracking
            </FLPHeading>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "bold",
                color: "#8b5cf6",
                backgroundColor: "rgba(139, 92, 246, 0.12)",
                padding: "2px 8px",
                borderRadius: "full",
              })}
            >
              UK Auto-Enrolment
            </span>
          </div>
          <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
            Track your pension pots, monitor employer and employee contributions, and forecast
            compound growth to retirement.
          </FLPText>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!showWizard && (
            <FLPButton size="md" variant="outline" onClick={() => setShowWizard(true)}>
              <FaMagic style={{ marginRight: "6px" }} /> Quick Start Wizard
            </FLPButton>
          )}
          <FLPButton size="md" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <FaPlus style={{ marginRight: "6px" }} /> Add Pension Pot
          </FLPButton>
        </div>
      </div>

      {/* Onboarding Wizard */}
      {showWizard && (
        <PensionQuickStartWizard
          initialEmployeePercent={employeePercent}
          initialEmployerPercent={employerPercent}
          initialSalary={annualSalary}
          onComplete={() => {
            setWizardDismissed(true);
            setShowWizard(false);
          }}
          onDismiss={() => {
            setWizardDismissed(true);
            setShowWizard(false);
          }}
        />
      )}

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
            <FaShieldAlt style={{ color: "#8b5cf6", fontSize: "16px" }} />
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
                style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}
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
                style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}
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
                style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}
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
              backgroundColor: "#6363f1",
              transition: "width 0.4s ease",
            }}
            title={`Employee: ${employeePercent}%`}
          />
          <div
            style={{
              width: `${(employerPercent / (employeePercent + employerPercent || 1)) * 100}%`,
              backgroundColor: "#f59e0b",
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
                  backgroundColor: "#6363f1",
                  display: "inline-block",
                }}
              />
              <strong>Employee:</strong> {employeePercent}% (
              {formatCurrency(monthlyEmployeeContrib)}/mo)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  display: "inline-block",
                }}
              />
              <strong>Employer:</strong> {employerPercent}% (
              {formatCurrency(standardMonthlyEmployerContrib)}/mo
              {monthlyEmployerNiContrib > 0 && (
                <span style={{ color: "#10b981", marginLeft: "4px" }}>
                  + {formatCurrency(monthlyEmployerNiContrib)}/mo NI
                </span>
              )}
              )
            </span>
          </div>

          <FLPText color="text.muted" fontSize="xs">
            Salary: <strong>{formatCurrency(annualSalary)}/yr</strong> ·{" "}
            {isSalarySacrifice
              ? isSalarySacrificeEmployerNi
                ? "Salary Sacrifice + Employer NI"
                : "Salary Sacrifice"
              : "Net Pay"}{" "}
            · Synced with User Profile
          </FLPText>
        </div>
      </FLPCard>

      {/* Pension Pots List */}
      <PensionAccountsList
        accounts={pensionAccounts}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenWizard={() => setShowWizard(true)}
      />

      {/* Forecaster Card */}
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
      />

      {/* Add Pot Modal */}
      <AddPensionAccountDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default PensionContainer;
