import {
  calculateUkTax,
  clearOnboardingSeed,
  hydrateBaselineFromSeed,
  type OnboardingSeedPayload,
  readOnboardingSeed,
} from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaHome,
  FaPiggyBank,
  FaRocket,
  FaUser,
} from "react-icons/fa";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
} from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import HomeLogo from "~/components/navigation/HomeLogo";
import type { UserProfile } from "~/hooks/useUserProfile";
import { useUserProfile } from "~/hooks/useUserProfile";
import { apiFetch } from "~/services/api-client";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { useFinancialBaseline } from "~/state/baseline.store";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { ALL_PAGE_KEYS, type AppPageKey, type DashboardWidgetKey } from "~/utils/pageConfig";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/user-profile"));
  try {
    const userProfile = await backendFetch<UserProfile>("/user-profile", {
      accessToken,
      signal: args.request.signal,
    });
    return data({ userProfile, user, accessToken });
  } catch (error) {
    throwRouteError(error);
  }
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const rawEnabledPages = formData.get("enabledPages");
  const enabledPages: AppPageKey[] = rawEnabledPages
    ? JSON.parse(rawEnabledPages as string)
    : ALL_PAGE_KEYS;

  const dashboardWidgets: DashboardWidgetKey[] = [...enabledPages];
  const dashboardWidgetOrder: DashboardWidgetKey[] = [...enabledPages];

  try {
    await backendFetch("/user-profile", {
      accessToken: token,
      method: "PATCH",
      body: {
        enabledPages,
        dashboardWidgets,
        dashboardWidgetOrder,
        onboardingCompleted: true,
      },
    });
  } catch (err) {
    // Redirecting home after a failed save would bounce straight back here: surface the error.
    return actionErrorResponse(err);
  }

  return redirect("/");
};

const FINISH_ERROR = "We couldn't save your details. Check your connection and try again.";

export default function OnboardingRoute() {
  const { userProfile, user, accessToken } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();
  const actionError =
    actionData && "success" in actionData && actionData.success === false ? actionData.error : null;
  const [clientError, setClientError] = useState<string | null>(null);
  const seededRef = useRef<Set<string>>(new Set());
  const { updateProfile } = useUserProfile();
  const { updateBaseline } = useFinancialBaseline();

  // Current Step: 1 = You & Income, 2 = Housing & Outgoings, 3 = Savings, Pension & Debt
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: You & Income
  const [age, setAge] = useState<number>(32);
  const [employmentType, setEmploymentType] = useState<"employed" | "self-employed">("employed");
  const [incomeMode, setIncomeMode] = useState<"gross" | "net">("gross");
  const [grossSalary, setGrossSalary] = useState<number>(45000);
  const [monthlyTakeHomeOverride, setMonthlyTakeHomeOverride] = useState<number>(2900);
  const [studentLoanPlan, setStudentLoanPlan] = useState<string>("NONE");

  // Step 2: Housing & Outgoings
  const [housingStatus, setHousingStatus] = useState<"renting" | "mortgage" | "own_outright">(
    "renting",
  );
  const [monthlyHousingCost, setMonthlyHousingCost] = useState<number>(900);
  const [propertyValue, setPropertyValue] = useState<number>(0);
  const [mortgageBalance, setMortgageBalance] = useState<number>(0);
  const [monthlyOtherOutgoings, setMonthlyOtherOutgoings] = useState<number>(1100);

  // Step 3: Savings, Pension & Debt
  const [cashSavings, setCashSavings] = useState<number>(5000);
  const [pensionPot, setPensionPot] = useState<number>(15000);
  const [pensionPercent, setPensionPercent] = useState<number>(5);
  const [isSalarySacrifice, setIsSalarySacrifice] = useState<boolean>(true);
  const [unsecuredDebt, setUnsecuredDebt] = useState<number>(0);

  // Seed banner from tools/calculators
  const [seed, setSeed] = useState<OnboardingSeedPayload | null>(null);
  const [showSeedBanner, setShowSeedBanner] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hydrate from seed on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const parsed = readOnboardingSeed();
      if (!parsed) return;
      const isFresh = Date.now() - (parsed.timestamp || 0) < 24 * 60 * 60 * 1000;
      if (
        isFresh &&
        (parsed.annualIncome || parsed.annualGrossSalary || parsed.initialCashSavings !== undefined)
      ) {
        setSeed(parsed);
        setShowSeedBanner(true);
        const hydrated = hydrateBaselineFromSeed(parsed);
        setGrossSalary(hydrated.annualGrossSalary);
        if (hydrated.age) setAge(hydrated.age);
        if (hydrated.employmentStatus === "SELF_EMPLOYED") setEmploymentType("self-employed");
        setPensionPercent(hydrated.pensionContributionPct);
        setIsSalarySacrifice(hydrated.isSalarySacrifice);
        setCashSavings(hydrated.totalCashSavings);
        setPensionPot(hydrated.totalPensionPot);
        setMortgageBalance(hydrated.mortgageBalance);
        if (hydrated.mortgageBalance > 0) {
          setHousingStatus("mortgage");
          setPropertyValue(hydrated.propertyValue);
        } else if (hydrated.housingStatus === "OWN_OUTRIGHT") {
          setHousingStatus("own_outright");
        } else {
          setHousingStatus("renting");
        }
        setUnsecuredDebt(hydrated.totalUnsecuredDebt);
        setMonthlyHousingCost(hydrated.monthlyHousingCost);
        setMonthlyOtherOutgoings(hydrated.monthlyOtherOutgoings);
      }
    } catch (err) {
      console.error("Failed to read onboarding seed:", err);
    }
  }, []);

  // Compute live UK take home
  const liveTakeHome = useMemo(() => {
    if (incomeMode === "net") {
      return {
        monthlyTakeHome: monthlyTakeHomeOverride,
        annualTakeHome: monthlyTakeHomeOverride * 12,
        trapAnalysis: { isInTaxTrap: false, marginalRatePct: 0 },
      };
    }
    const taxResult = calculateUkTax({
      grossSalary,
      pensionContributionPct: pensionPercent,
      isSalarySacrifice,
      studentLoanPlan: studentLoanPlan as any,
    });
    return {
      monthlyTakeHome: Math.round(taxResult.netTakeHomePayMonthlyGbp),
      annualTakeHome: Math.round(taxResult.netTakeHomePayAnnualGbp),
      trapAnalysis: taxResult.taxTrap,
    };
  }, [
    incomeMode,
    grossSalary,
    pensionPercent,
    isSalarySacrifice,
    monthlyTakeHomeOverride,
    studentLoanPlan,
  ]);

  // Live Summary Calculations
  const monthlyHousing = housingStatus === "own_outright" ? 0 : monthlyHousingCost;
  const totalOutgoings = monthlyHousing + monthlyOtherOutgoings;
  const monthlySurplus = liveTakeHome.monthlyTakeHome - totalOutgoings;
  const homeEquity = housingStatus === "renting" ? 0 : Math.max(0, propertyValue - mortgageBalance);
  const startingNetWorth = cashSavings + pensionPot + homeEquity - unsecuredDebt;

  // Auto-inferred modules
  const inferredModules = useMemo<AppPageKey[]>(() => {
    const modules = new Set<AppPageKey>(["accounts", "budget", "savings", "forecast"]);
    if (unsecuredDebt > 0) modules.add("debt");
    if (pensionPot > 0 || pensionPercent > 0) modules.add("pension");
    if (housingStatus === "mortgage" || mortgageBalance > 0 || propertyValue > 0)
      modules.add("mortgage");
    if (employmentType === "self-employed" || grossSalary >= 95000) modules.add("tax");
    return Array.from(modules);
  }, [
    unsecuredDebt,
    pensionPot,
    pensionPercent,
    housingStatus,
    mortgageBalance,
    propertyValue,
    employmentType,
    grossSalary,
  ]);

  const handleFinish = async () => {
    setIsSubmitting(true);
    setClientError(null);
    const pagesToSave = inferredModules;
    const dashboardWidgets: DashboardWidgetKey[] = [...(pagesToSave as DashboardWidgetKey[])];
    const dashboardWidgetOrder: DashboardWidgetKey[] = [...(pagesToSave as DashboardWidgetKey[])];

    try {
      // 1. Update UserProfile
      await updateProfile({
        age,
        annualSalary: incomeMode === "gross" ? grossSalary : monthlyTakeHomeOverride * 12,
        monthlyTakeHome: liveTakeHome.monthlyTakeHome,
        employmentType,
        studentLoanPlan,
        housingStatus,
        monthlyHousingCost: monthlyHousing,
        monthlyOtherOutgoings,
        totalCashSavings: cashSavings,
        totalPensionPot: pensionPot,
        totalUnsecuredDebt: unsecuredDebt,
        hasMortgage: housingStatus === "mortgage" || mortgageBalance > 0,
        homeValue: propertyValue > 0 ? propertyValue : null,
        mortgageBalance: mortgageBalance > 0 ? mortgageBalance : null,
        pensionPercent,
        isSalarySacrifice,
        enabledPages: pagesToSave,
        dashboardWidgets,
        dashboardWidgetOrder,
      });

      // 2. Update Central FinancialBaseline Store
      updateBaseline({
        age,
        employmentStatus: employmentType === "self-employed" ? "SELF_EMPLOYED" : "PAYE",
        annualGrossSalary: incomeMode === "gross" ? grossSalary : monthlyTakeHomeOverride * 12,
        monthlyTakeHomeOverride: incomeMode === "net" ? monthlyTakeHomeOverride : undefined,
        housingStatus:
          housingStatus === "renting"
            ? "RENTING"
            : housingStatus === "mortgage"
              ? "MORTGAGE"
              : "OWN_OUTRIGHT",
        monthlyHousingCost: monthlyHousing,
        propertyValue,
        mortgageBalance,
        monthlyOtherOutgoings,
        totalCashSavings: cashSavings,
        totalPensionPot: pensionPot,
        totalUnsecuredDebt: unsecuredDebt,
        pensionContributionPct: pensionPercent,
        isSalarySacrifice,
        studentLoanPlan: studentLoanPlan as any,
        financialStage:
          unsecuredDebt > 0
            ? "STAGE_1_DEBT_RECOVERY"
            : grossSalary >= 100000
              ? "STAGE_3_WEALTH_OPTIMIZE"
              : "STAGE_2_BUFFER_BUILD",
        enabledModules: pagesToSave.filter((p): p is any => p !== "savings"),
      });

      // 3. Seed initial baseline accounts and budget entries
      // Jobs that already succeeded are remembered so a retry never creates duplicates.
      const runSeed = async (key: string, endpoint: string, payload: unknown, enabled: boolean) => {
        if (!enabled || seededRef.current.has(key)) return;
        await apiFetch<unknown>(endpoint, { accessToken, method: "POST", body: payload });
        seededRef.current.add(key);
      };

      const createAccountSafe = (name: string, type: string, balance: number) =>
        runSeed(
          `account:${name}`,
          "/accounts",
          { name, type, balance, isCurrent: true },
          balance > 0,
        );

      const createBudgetEntrySafe = (
        title: string,
        category: string,
        amount: number,
        isIncome: boolean,
      ) =>
        runSeed(
          `entry:${title}`,
          "/budget-entries",
          { title, category, amount, isIncome, frequency: "monthly" },
          amount > 0,
        );

      const seedResults = await Promise.allSettled([
        createAccountSafe("Cash and emergency savings", "Saving", cashSavings),
        createAccountSafe("Workplace and personal pension", "Pension", pensionPot),
        ...(mortgageBalance > 0
          ? [createAccountSafe("Residential Mortgage", "Mortgage", mortgageBalance)]
          : []),
        ...(unsecuredDebt > 0
          ? [createAccountSafe("Cards and loans baseline", "Credit Card", unsecuredDebt)]
          : []),
        createBudgetEntrySafe(
          "Monthly Take-Home Income",
          "income",
          liveTakeHome.monthlyTakeHome,
          true,
        ),
        ...(monthlyHousing > 0
          ? [
              createBudgetEntrySafe(
                housingStatus === "mortgage" ? "Mortgage Payment" : "Rent Payment",
                "housing",
                monthlyHousing,
                false,
              ),
            ]
          : []),
        ...(monthlyOtherOutgoings > 0
          ? [
              createBudgetEntrySafe(
                "General living and outgoings",
                "living",
                monthlyOtherOutgoings,
                false,
              ),
            ]
          : []),
      ]);

      if (seedResults.some((r) => r.status === "rejected")) {
        setClientError(FINISH_ERROR);
        return;
      }

      // Only now is onboarding complete; a failed seed leaves the flag false so the user stays here.
      await updateProfile({ onboardingCompleted: true });

      clearOnboardingSeed();
      navigate("/");
    } catch (err) {
      console.error("Error saving onboarding settings:", err);
      setClientError(FINISH_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={css({
        minHeight: { base: "auto", md: "calc(100vh - 120px)" },
        backgroundColor: "background",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: { base: "flex-start", md: "center" },
        padding: { base: "12px 10px 24px", sm: "24px 16px", md: "40px 32px" },
      })}
    >
      <div
        className={css({
          width: "100%",
          maxWidth: "680px",
          display: "flex",
          flexDirection: "column",
          gap: { base: "14px", md: "24px" },
        })}
      >
        {/* Brand Header */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: { base: "8px", md: "12px" },
            borderBottom: "1px solid",
            borderColor: "border",
          })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <HomeLogo />
            <div>
              <FLPHeading as="h3" color="blue.500" size="sm">
                Flump financial baseline
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Set up your UK financial baseline in ~60 seconds
              </FLPText>
            </div>
          </div>
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "bold",
              color: "primary",
              backgroundColor: "rgba(99, 99, 241, 0.1)",
              padding: "4px 10px",
              borderRadius: "full",
            })}
          >
            Step {step} of 3
          </span>
        </div>

        {(clientError ?? actionError) && (
          <div
            role="alert"
            className={css({
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "sm",
              backgroundColor: "status.danger.bg",
              color: "status.danger.text",
              border: "1px solid",
              borderColor: "status.danger.border",
            })}
          >
            {clientError ?? actionError}
          </div>
        )}

        {/* Pre-loaded Seed Banner */}
        {showSeedBanner && seed && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "14px 18px",
              borderRadius: "12px",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: "13px",
              color: "text.primary",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
              <FaCheckCircle style={{ color: "#10b981", flexShrink: 0 }} />
              <span>
                We've pre-loaded your £
                {(seed.annualIncome ?? seed.annualGrossSalary ?? grossSalary).toLocaleString()}{" "}
                salary and savings baseline from the calculator.
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <FLPButton size="sm" variant="primary" onClick={handleFinish} disabled={isSubmitting}>
                {isSubmitting ? "Launching..." : "Launch dashboard with this baseline (10s) →"}
              </FLPButton>
              <FLPButton size="sm" variant="outline" onClick={() => setShowSeedBanner(false)}>
                Review and tweak numbers
              </FLPButton>
            </div>
          </div>
        )}

        {/* Step Indicator Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: step === 1 ? "var(--colors-primary)" : "var(--colors-border)",
              backgroundColor: step === 1 ? "rgba(99, 102, 241, 0.08)" : "transparent",
              color: step === 1 ? "var(--colors-primary)" : "var(--colors-text-muted)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <FaUser size={12} /> 1. You and income
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: step === 2 ? "var(--colors-primary)" : "var(--colors-border)",
              backgroundColor: step === 2 ? "rgba(99, 102, 241, 0.08)" : "transparent",
              color: step === 2 ? "var(--colors-primary)" : "var(--colors-text-muted)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <FaHome size={12} /> 2. Housing and outgoings
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: step === 3 ? "var(--colors-primary)" : "var(--colors-border)",
              backgroundColor: step === 3 ? "rgba(99, 102, 241, 0.08)" : "transparent",
              color: step === 3 ? "var(--colors-primary)" : "var(--colors-text-muted)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <FaPiggyBank size={12} /> 3. Savings and debt
          </button>
        </div>

        {/* Card Content */}
        <FLPCard
          className={css({
            padding: { base: "20px 16px", sm: "32px 24px" },
            borderRadius: "2xl",
            border: "1px solid",
            borderColor: "border",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "sm",
          })}
        >
          {/* STEP 1: YOU & INCOME */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <FLPHeading as="h2" size="md">
                  Step 1: You and income
                </FLPHeading>
                <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                  Your age and income calculate your net take-home and 10–30 year compound
                  projections.
                </FLPText>
              </div>

              {/* Age & Employment Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="baseline-age" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Current age
                  </label>
                  <input
                    id="baseline-age"
                    type="number"
                    min={18}
                    max={85}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 0)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                    {[25, 32, 40, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAge(preset)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          border: "1px solid",
                          borderColor:
                            age === preset ? "var(--colors-primary)" : "var(--colors-border)",
                          backgroundColor:
                            age === preset ? "rgba(99, 102, 241, 0.1)" : "transparent",
                          color: age === preset ? "var(--colors-primary)" : "inherit",
                          cursor: "pointer",
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="baseline-employment"
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    Employment Setup
                  </label>
                  <select
                    id="baseline-employment"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                    }}
                  >
                    <option value="employed">Employed (PAYE)</option>
                    <option value="self-employed">Self-Employed (Class 4 NI)</option>
                  </select>
                </div>
              </div>

              {/* Income Mode Toggle & Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <label htmlFor="baseline-income" style={{ fontSize: "13px", fontWeight: 600 }}>
                    {incomeMode === "gross"
                      ? "Annual Gross Salary (£)"
                      : "Monthly Take-Home Pay (£)"}
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setIncomeMode("gross")}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        border: "1px solid",
                        borderColor:
                          incomeMode === "gross" ? "var(--colors-primary)" : "var(--colors-border)",
                        backgroundColor:
                          incomeMode === "gross" ? "rgba(99, 102, 241, 0.1)" : "transparent",
                        color: incomeMode === "gross" ? "var(--colors-primary)" : "inherit",
                        cursor: "pointer",
                      }}
                    >
                      Annual Gross
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncomeMode("net")}
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        border: "1px solid",
                        borderColor:
                          incomeMode === "net" ? "var(--colors-primary)" : "var(--colors-border)",
                        backgroundColor:
                          incomeMode === "net" ? "rgba(99, 102, 241, 0.1)" : "transparent",
                        color: incomeMode === "net" ? "var(--colors-primary)" : "inherit",
                        cursor: "pointer",
                      }}
                    >
                      Monthly Net
                    </button>
                  </div>
                </div>

                {incomeMode === "gross" ? (
                  <>
                    <input
                      id="baseline-income"
                      type="number"
                      step={1000}
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(Number(e.target.value) || 0)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border)",
                        backgroundColor: "var(--colors-surface)",
                        color: "inherit",
                        fontSize: "16px",
                        fontWeight: 600,
                      }}
                    />
                    <div
                      style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}
                    >
                      {[32000, 45000, 65000, 105000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setGrossSalary(preset)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            border: "1px solid",
                            borderColor:
                              grossSalary === preset
                                ? "var(--colors-primary)"
                                : "var(--colors-border)",
                            backgroundColor:
                              grossSalary === preset ? "rgba(99, 102, 241, 0.1)" : "transparent",
                            color: grossSalary === preset ? "var(--colors-primary)" : "inherit",
                            cursor: "pointer",
                          }}
                        >
                          £{preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <input
                    id="baseline-income"
                    type="number"
                    step={100}
                    value={monthlyTakeHomeOverride}
                    onChange={(e) => setMonthlyTakeHomeOverride(Number(e.target.value) || 0)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  />
                )}
              </div>

              {/* Student Loan Plan */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label
                  htmlFor="baseline-student-loan"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  UK Student Loan Plan
                </label>
                <select
                  id="baseline-student-loan"
                  value={studentLoanPlan}
                  onChange={(e) => setStudentLoanPlan(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--colors-border)",
                    backgroundColor: "var(--colors-surface)",
                    color: "inherit",
                  }}
                >
                  <option value="NONE">None</option>
                  <option value="PLAN_1">Plan 1 (Pre-2012)</option>
                  <option value="PLAN_2">Plan 2 (Post-2012)</option>
                  <option value="PLAN_4">Plan 4 (Scotland)</option>
                  <option value="PLAN_5">Plan 5 (Post-2023)</option>
                  <option value="POSTGRAD">Postgraduate Loan</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <FLPButton size="md" variant="primary" onClick={() => setStep(2)}>
                  Next: Housing and outgoings →
                </FLPButton>
              </div>
            </div>
          )}

          {/* STEP 2: HOUSING & OUTGOINGS */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <FLPHeading as="h2" size="md">
                  Step 2: Housing and monthly outgoings
                </FLPHeading>
                <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                  Your regular living costs power your emergency runway and safe-to-spend weekly
                  allowance.
                </FLPText>
              </div>

              {/* Housing Status Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Housing status</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setHousingStatus("renting");
                      setMortgageBalance(0);
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor:
                        housingStatus === "renting"
                          ? "var(--colors-primary)"
                          : "var(--colors-border)",
                      backgroundColor:
                        housingStatus === "renting" ? "rgba(99, 102, 241, 0.08)" : "transparent",
                      color: "inherit",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    🏢 Renting
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHousingStatus("mortgage");
                      if (mortgageBalance === 0) setMortgageBalance(180000);
                      if (propertyValue === 0) setPropertyValue(240000);
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor:
                        housingStatus === "mortgage"
                          ? "var(--colors-primary)"
                          : "var(--colors-border)",
                      backgroundColor:
                        housingStatus === "mortgage" ? "rgba(99, 102, 241, 0.08)" : "transparent",
                      color: "inherit",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    🏡 Mortgage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHousingStatus("own_outright");
                      setMortgageBalance(0);
                      if (propertyValue === 0) setPropertyValue(280000);
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor:
                        housingStatus === "own_outright"
                          ? "var(--colors-primary)"
                          : "var(--colors-border)",
                      backgroundColor:
                        housingStatus === "own_outright"
                          ? "rgba(99, 102, 241, 0.08)"
                          : "transparent",
                      color: "inherit",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    🔑 Own Outright
                  </button>
                </div>
              </div>

              {/* Monthly Housing Cost (if not owning outright) */}
              {housingStatus !== "own_outright" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="baseline-housing-cost"
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    {housingStatus === "mortgage"
                      ? "Monthly Mortgage Payment (£/mo)"
                      : "Monthly Rent (£/mo)"}
                  </label>
                  <input
                    id="baseline-housing-cost"
                    type="number"
                    step={50}
                    value={monthlyHousingCost}
                    onChange={(e) => setMonthlyHousingCost(Number(e.target.value) || 0)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                      fontSize: "15px",
                    }}
                  />
                </div>
              )}

              {/* Property Value & Mortgage Balance if owning */}
              {housingStatus !== "renting" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label
                      htmlFor="baseline-property-val"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      Property Value (£)
                    </label>
                    <input
                      id="baseline-property-val"
                      type="number"
                      step={5000}
                      value={propertyValue}
                      onChange={(e) => setPropertyValue(Number(e.target.value) || 0)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border)",
                        backgroundColor: "var(--colors-surface)",
                        color: "inherit",
                      }}
                    />
                  </div>
                  {housingStatus === "mortgage" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label
                        htmlFor="baseline-mortgage-bal"
                        style={{ fontSize: "13px", fontWeight: 600 }}
                      >
                        Mortgage Balance (£)
                      </label>
                      <input
                        id="baseline-mortgage-bal"
                        type="number"
                        step={5000}
                        value={mortgageBalance}
                        onChange={(e) => setMortgageBalance(Number(e.target.value) || 0)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--colors-border)",
                          backgroundColor: "var(--colors-surface)",
                          color: "inherit",
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Other Monthly Outgoings */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label
                  htmlFor="baseline-other-outgoings"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  Other Monthly Outgoings (Bills, Living, Subs, Food)
                </label>
                <input
                  id="baseline-other-outgoings"
                  type="number"
                  step={50}
                  value={monthlyOtherOutgoings}
                  onChange={(e) => setMonthlyOtherOutgoings(Number(e.target.value) || 0)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--colors-border)",
                    backgroundColor: "var(--colors-surface)",
                    color: "inherit",
                    fontSize: "15px",
                  }}
                />
                <FLPText color="text.muted" fontSize="xs">
                  A rough total is fine! You can break this down into individual budget categories
                  later.
                </FLPText>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <FLPButton size="sm" variant="ghost" onClick={() => setStep(1)}>
                  <FaArrowLeft style={{ marginRight: "6px" }} /> Back
                </FLPButton>
                <FLPButton size="md" variant="primary" onClick={() => setStep(3)}>
                  Next: Savings, pension and debt →
                </FLPButton>
              </div>
            </div>
          )}

          {/* STEP 3: SAVINGS, PENSION & DEBT */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <FLPHeading as="h2" size="md">
                  Step 3: Savings, pension and debt
                </FLPHeading>
                <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                  Rough balances to unlock net worth, emergency runway and your retirement
                  forecaster.
                </FLPText>
              </div>

              {/* Total Cash & Savings */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label htmlFor="baseline-savings" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Total cash and ISA savings (£)
                  </label>
                  <span style={{ fontWeight: 700, color: "#10b981" }}>
                    £{cashSavings.toLocaleString()}
                  </span>
                </div>
                <input
                  id="baseline-savings"
                  type="number"
                  step={500}
                  value={cashSavings}
                  onChange={(e) => setCashSavings(Number(e.target.value) || 0)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--colors-border)",
                    backgroundColor: "var(--colors-surface)",
                    color: "inherit",
                    fontSize: "15px",
                  }}
                />
              </div>

              {/* Pension Pot & Contribution */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="baseline-pension-pot"
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    Current pension pot (£)
                  </label>
                  <input
                    id="baseline-pension-pot"
                    type="number"
                    step={1000}
                    value={pensionPot}
                    onChange={(e) => setPensionPot(Number(e.target.value) || 0)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="baseline-pension-pct"
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    Contribution (%)
                  </label>
                  <input
                    id="baseline-pension-pct"
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={pensionPercent}
                    onChange={(e) => setPensionPercent(Number(e.target.value) || 0)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>

              {/* Total Unsecured Debt */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label htmlFor="baseline-debt" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Total credit cards and personal loans (unsecured debt)
                  </label>
                  <span
                    style={{ fontWeight: 700, color: unsecuredDebt > 0 ? "#ef4444" : "inherit" }}
                  >
                    £{unsecuredDebt.toLocaleString()}
                  </span>
                </div>
                <input
                  id="baseline-debt"
                  type="number"
                  step={250}
                  value={unsecuredDebt}
                  onChange={(e) => setUnsecuredDebt(Number(e.target.value) || 0)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--colors-border)",
                    backgroundColor: "var(--colors-surface)",
                    color: "inherit",
                    fontSize: "15px",
                  }}
                />
                <FLPText color="text.muted" fontSize="xs">
                  Exclude your mortgage. Enter £0 if debt-free.
                </FLPText>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <FLPButton size="sm" variant="ghost" onClick={() => setStep(2)}>
                  <FaArrowLeft style={{ marginRight: "6px" }} /> Back
                </FLPButton>
                <FLPButton
                  size="md"
                  variant="primary"
                  disabled={isSubmitting}
                  onClick={handleFinish}
                >
                  {isSubmitting ? "Launching..." : "Finish setup and launch dashboard →"}
                </FLPButton>
              </div>
            </div>
          )}

          {/* Live Baseline Summary Bar */}
          <div
            style={{
              marginTop: "8px",
              padding: "14px 16px",
              borderRadius: "12px",
              backgroundColor: "rgba(99, 102, 241, 0.05)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              textAlign: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--colors-text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Net take-home
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginTop: "2px",
                  color: "var(--colors-primary)",
                }}
              >
                £{liveTakeHome.monthlyTakeHome.toLocaleString()}/mo
              </div>
            </div>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--colors-text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Monthly surplus
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginTop: "2px",
                  color: monthlySurplus >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                {monthlySurplus >= 0 ? "+" : ""}£{monthlySurplus.toLocaleString()}/mo
              </div>
            </div>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--colors-text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Starting net worth
              </span>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  marginTop: "2px",
                  color: startingNetWorth >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                £{startingNetWorth.toLocaleString()}
              </div>
            </div>
          </div>
        </FLPCard>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
