import {
  calculateUKTakeHome,
  ONBOARDING_SEED_STORAGE_KEY,
  type OnboardingSeedPayload,
} from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBuilding,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaCoins,
  FaFileInvoiceDollar,
  FaPiggyBank,
  FaRegCircle,
  FaRocket,
  FaShieldAlt,
  FaSlidersH,
  FaWallet,
} from "react-icons/fa";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import HomeLogo from "~/components/navigation/HomeLogo";
import type { UserProfile } from "~/hooks/useUserProfile";
import { DEFAULT_PROFILE, useUserProfile } from "~/hooks/useUserProfile";
import {
  ALL_PAGE_KEYS,
  APP_PAGES,
  type AppPageKey,
  type DashboardWidgetKey,
} from "~/utils/pageConfig";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    const res = await fetch(`${apiUrl}/user-profile`, {
      headers: { Authorization: `Bearer ${accessToken || "mock-session-token"}` },
    });
    const userProfile: UserProfile = res.ok ? await res.json() : DEFAULT_PROFILE;
    return data({ userProfile, user, accessToken });
  } catch (error) {
    console.error("Onboarding loader error:", error);
    return data({ userProfile: DEFAULT_PROFILE, user, accessToken: null });
  }
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const formData = await args.request.formData();
  const rawEnabledPages = formData.get("enabledPages");
  const enabledPages: AppPageKey[] = rawEnabledPages
    ? JSON.parse(rawEnabledPages as string)
    : ALL_PAGE_KEYS;

  const dashboardWidgets: DashboardWidgetKey[] = ["financialHealth", ...enabledPages];
  const dashboardWidgetOrder: DashboardWidgetKey[] = ["financialHealth", ...enabledPages];

  try {
    await fetch(`${apiUrl}/user-profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || "mock-session-token"}`,
      },
      body: JSON.stringify({
        enabledPages,
        dashboardWidgets,
        dashboardWidgetOrder,
        onboardingCompleted: true,
      }),
    });
  } catch (err) {
    console.error("Failed to complete onboarding:", err);
  }

  return redirect("/");
};

interface QuestionConfig {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  associatedPages: AppPageKey[];
  yesLabel: string;
  noLabel: string;
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 1,
    category: "Everyday Banking & Budgeting",
    title: "Do you want to manage accounts and plan your monthly budget?",
    description:
      "Track your accounts, see your overall net worth, organize spending into categories, and find out your emergency savings runway.",
    icon: <FaWallet size={24} />,
    iconBg: "rgba(99, 99, 241, 0.12)",
    iconColor: "#6363f1",
    associatedPages: ["accounts", "budget"],
    yesLabel: "Yes, include Accounts & Budgeting",
    noLabel: "No, skip for now",
  },
  {
    id: 2,
    category: "Savings & Wealth Growth",
    title: "Do you have savings accounts or investment portfolios?",
    description:
      "Record your interest rates, set regular monthly contributions, and forecast compound interest growth 10+ years into the future.",
    icon: <FaPiggyBank size={24} />,
    iconBg: "rgba(16, 185, 129, 0.12)",
    iconColor: "#10b981",
    associatedPages: ["savings", "forecast"],
    yesLabel: "Yes, track Savings & Forecaster",
    noLabel: "No, not right now",
  },
  {
    id: 3,
    category: "Pension & Retirement",
    title: "Do you contribute to a workplace or personal pension?",
    description:
      "Monitor UK auto-enrolment employer and employee contribution splits, salary sacrifice tax savings, and forecast retirement funds.",
    icon: <FaShieldAlt size={24} />,
    iconBg: "rgba(139, 92, 246, 0.12)",
    iconColor: "#8b5cf6",
    associatedPages: ["pension"],
    yesLabel: "Yes, track Pension Pots",
    noLabel: "No, don't track pensions",
  },
  {
    id: 4,
    category: "Homeownership & Mortgages",
    title: "Do you own a home with a mortgage or plan to buy soon?",
    description:
      "Track amortization schedules, simulate how overpayments shorten your loan term, and compare paying off the mortgage vs. saving.",
    icon: <FaBuilding size={24} />,
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconColor: "#f59e0b",
    associatedPages: ["mortgage"],
    yesLabel: "Yes, add Mortgage Tools",
    noLabel: "No, I rent or don't have a mortgage",
  },
  {
    id: 5,
    category: "Self-Employment & Property Tax",
    title: "Do you earn self-employed income or rent out residential property?",
    description:
      "Keep cash-basis P&L records, upload receipts, and estimate UK Self-Assessment income tax, Class 4 NI, and Section 24 mortgage relief.",
    icon: <FaFileInvoiceDollar size={24} />,
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconColor: "#3b82f6",
    associatedPages: ["tax"],
    yesLabel: "Yes, include Tax Tracker",
    noLabel: "No, I am standard PAYE employed only",
  },
];

export default function OnboardingRoute() {
  const { userProfile, user, accessToken } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { updateProfile } = useUserProfile();

  // Mode: "welcome" | "progressive" | "quiz" | "manual"
  const [mode, setMode] = useState<"welcome" | "progressive" | "quiz" | "manual">("welcome");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [cameFromQuiz, setCameFromQuiz] = useState(false);

  // Progressive flow step: 1 | 2 | 3
  const [progressiveStep, setProgressiveStep] = useState<1 | 2 | 3>(1);

  // Primary user focus: "debt" | "savings" | "wealth"
  const [primaryFocus, setPrimaryFocus] = useState<"debt" | "savings" | "wealth">("wealth");

  // Financial baseline inputs
  const [grossSalary, setGrossSalary] = useState<number>(65000);
  const [employmentType, setEmploymentType] = useState<"employed" | "self-employed">("employed");
  const [pensionPercent, setPensionPercent] = useState<number>(5);
  const [isSalarySacrifice, setIsSalarySacrifice] = useState<boolean>(true);
  const [cashSavings, setCashSavings] = useState<number>(15000);
  const [investments, setInvestments] = useState<number>(20000);
  const [mortgageDebt, setMortgageDebt] = useState<number>(0);

  // Seed state from landing page
  const [seed, setSeed] = useState<OnboardingSeedPayload | null>(null);
  const [showSeedBanner, setShowSeedBanner] = useState<boolean>(false);

  // Initial pages
  const initialPages = useMemo<AppPageKey[]>(() => {
    if (userProfile?.enabledPages && userProfile.enabledPages.length > 0) {
      return userProfile.enabledPages as AppPageKey[];
    }
    return ["accounts", "budget", "savings", "pension", "forecast"];
  }, [userProfile?.enabledPages]);

  const [selectedPages, setSelectedPages] = useState<AppPageKey[]>(initialPages);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hydrate from localStorage seed on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(ONBOARDING_SEED_STORAGE_KEY);
      if (!raw) return;
      const parsed: OnboardingSeedPayload = JSON.parse(raw);
      const isFresh = Date.now() - (parsed.timestamp || 0) < 24 * 60 * 60 * 1000;
      if (isFresh && parsed.grossSalary) {
        setSeed(parsed);
        setShowSeedBanner(true);
        setGrossSalary(parsed.grossSalary);
        if (parsed.pensionContributionPct !== undefined) {
          setPensionPercent(parsed.pensionContributionPct);
        }
        if (parsed.salarySacrifice !== undefined) {
          setIsSalarySacrifice(parsed.salarySacrifice);
        }
        if (parsed.initialCashSavings !== undefined) {
          setCashSavings(parsed.initialCashSavings);
        }
        if (parsed.initialInvestments !== undefined) {
          setInvestments(parsed.initialInvestments);
        }
        if (parsed.mortgageBalance !== undefined) {
          setMortgageDebt(parsed.mortgageBalance);
        }
        if (parsed.inferredModules?.length) {
          setSelectedPages(parsed.inferredModules as AppPageKey[]);
        }
      }
    } catch (err) {
      console.error("Failed to read onboarding seed:", err);
    }
  }, []);

  // Auto-adjust inferred modules based on baseline values
  useEffect(() => {
    setSelectedPages((prev) => {
      const set = new Set(prev);
      set.add("accounts");
      set.add("budget");
      set.add("forecast");

      if (mortgageDebt > 0) {
        set.add("mortgage");
      }
      if (grossSalary >= 95000 || employmentType === "self-employed") {
        set.add("tax");
      }
      if (pensionPercent > 0) {
        set.add("pension");
      }
      if (cashSavings > 0 || investments > 0) {
        set.add("savings");
      }
      return Array.from(set) as AppPageKey[];
    });
  }, [mortgageDebt, grossSalary, employmentType, pensionPercent, cashSavings, investments]);

  // Primary focus selection
  const handleSelectFocus = (focus: "debt" | "savings" | "wealth") => {
    setPrimaryFocus(focus);
    if (focus === "debt") {
      setSelectedPages(["accounts", "budget", "debt"]);
      setMortgageDebt(0);
      setGrossSalary((prev) => Math.min(prev, 36000));
    } else if (focus === "savings") {
      setSelectedPages(["accounts", "budget", "savings", "forecast"]);
      setCashSavings((prev) => (prev === 0 ? 5000 : prev));
    } else {
      setSelectedPages(["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"]);
    }
  };

  // Live calculation of take-home pay and tax trap status
  const liveTakeHome = useMemo(() => {
    return calculateUKTakeHome(grossSalary, pensionPercent, isSalarySacrifice);
  }, [grossSalary, pensionPercent, isSalarySacrifice]);

  // Questionnaire navigation
  const handleAnswerQuestion = (enable: boolean) => {
    const q = QUESTIONS[currentQuestionIndex];
    setSelectedPages((prev) => {
      let next = [...prev];
      if (enable) {
        q.associatedPages.forEach((p) => {
          if (!next.includes(p)) next.push(p);
        });
      } else {
        next = next.filter((p) => !q.associatedPages.includes(p));
      }
      return next;
    });

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setCameFromQuiz(true);
      setMode("manual");
    }
  };

  const handleTogglePage = (key: AppPageKey) => {
    setSelectedPages((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const pagesToSave = selectedPages.length > 0 ? selectedPages : ["accounts", "budget"];
    const dashboardWidgets: DashboardWidgetKey[] = [
      "financialHealth",
      ...(pagesToSave as DashboardWidgetKey[]),
    ];
    const dashboardWidgetOrder: DashboardWidgetKey[] = [
      "financialHealth",
      ...(pagesToSave as DashboardWidgetKey[]),
    ];

    try {
      await updateProfile({
        annualSalary: grossSalary,
        monthlyTakeHome: liveTakeHome.monthlyTakeHome,
        employmentType,
        pensionPercent,
        isSalarySacrifice,
        hasMortgage: mortgageDebt > 0,
        enabledPages: pagesToSave,
        dashboardWidgets,
        dashboardWidgetOrder,
        onboardingCompleted: true,
      });

      // Seed initial baseline accounts if provided so dashboard is immediately alive
      const apiUrl =
        (window as Window & { ENV?: { VITE_API_URL?: string } }).ENV?.VITE_API_URL ??
        import.meta.env.VITE_API_URL ??
        "http://localhost:4000";

      const authHdr = `Bearer ${accessToken || "mock-session-token"}`;

      const createAccountSafe = async (name: string, type: string, balance: number) => {
        if (balance <= 0) return;
        try {
          await fetch(`${apiUrl}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHdr },
            body: JSON.stringify({ name, type, balance, isCurrent: true }),
          });
        } catch {
          // Ignore network errors in offline/test environment
        }
      };

      await Promise.allSettled([
        createAccountSafe("Emergency Cash Savings", "Saving", cashSavings),
        createAccountSafe("Investment Portfolio", "Investment", investments),
        ...(mortgageDebt > 0
          ? [createAccountSafe("Residential Mortgage", "Mortgage", mortgageDebt)]
          : []),
      ]);

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(ONBOARDING_SEED_STORAGE_KEY);
        } catch {}
      }

      navigate("/");
    } catch (err) {
      console.error("Error saving onboarding settings:", err);
      window.location.href = "/";
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = QUESTIONS[currentQuestionIndex];

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
                Flump Onboarding
              </FLPHeading>
              <FLPText color="text.muted" fontSize="xs">
                Personalise your UK financial universe
              </FLPText>
            </div>
          </div>

          {mode === "quiz" && (
            <button
              className={css({
                fontSize: "xs",
                color: "text.muted",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "md",
                _hover: { color: "primary", backgroundColor: "rgba(99, 99, 241, 0.08)" },
              })}
              type="button"
              onClick={() => {
                setCameFromQuiz(true);
                setMode("manual");
              }}
            >
              <FaSlidersH size={11} /> Skip to manual picker
            </button>
          )}

          {mode === "progressive" && (
            <button
              className={css({
                fontSize: "xs",
                color: "text.muted",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "md",
                _hover: { color: "primary" },
              })}
              type="button"
              onClick={() => setMode("welcome")}
            >
              Cancel
            </button>
          )}
        </div>

        {/* MODE: WELCOME SCREEN */}
        {mode === "welcome" && (
          <FLPCard
            className={css({
              padding: { base: "20px 16px", sm: "32px 24px", md: "40px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: { base: "16px", md: "24px" },
              boxShadow: "sm",
            })}
          >
            {/* Seed Hydration Banner */}
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
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}
                >
                  <FaCheckCircle style={{ color: "#10b981", flexShrink: 0 }} />
                  <span>
                    We've pre-loaded your £{seed.grossSalary.toLocaleString()} salary and savings
                    baseline from the calculator.
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <FLPButton
                    size="sm"
                    variant="primary"
                    onClick={handleFinish}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Launching..." : "Launch Dashboard with this Baseline (10s) →"}
                  </FLPButton>
                  <FLPButton
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProgressiveStep(1);
                      setMode("progressive");
                    }}
                  >
                    Review & Tweak Numbers
                  </FLPButton>
                </div>
              </div>
            )}

            <div style={{ textAlign: "center" }}>
              <div
                className={css({
                  width: "64px",
                  height: "64px",
                  borderRadius: "full",
                  backgroundColor: "rgba(99, 99, 241, 0.12)",
                  color: "primary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  margin: "0 auto 16px",
                })}
              >
                <FaRocket />
              </div>
              <FLPHeading as="h1" color="blue.500" size="xl">
                Welcome to Flump{user?.name ? `, ${user.name}` : ""}
              </FLPHeading>
              <FLPText
                color="text.muted"
                fontSize="sm"
                style={{ marginTop: "8px", maxWidth: "480px", marginInline: "auto" }}
              >
                Flump adapts to your individual financial situation. Set your 4 baseline pillars in
                90 seconds, answer a quick questionnaire, or choose your modules manually.
              </FLPText>
            </div>

            {/* 3 Onboarding Options */}
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
                gap: "16px",
                marginTop: "8px",
              })}
            >
              <button
                className={css({
                  padding: "24px 20px",
                  borderRadius: "xl",
                  border: "2px solid",
                  borderColor: "primary",
                  backgroundColor: "rgba(99, 99, 241, 0.04)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  transition: "all 0.2s ease",
                  _hover: {
                    transform: "translateY(-2px)",
                    boxShadow: "md",
                    backgroundColor: "rgba(99, 99, 241, 0.08)",
                  },
                })}
                type="button"
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setCameFromQuiz(true);
                  setMode("quiz");
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "bold",
                      color: "primary",
                      backgroundColor: "rgba(99, 99, 241, 0.15)",
                      padding: "2px 8px",
                      borderRadius: "full",
                    })}
                  >
                    Quick Start
                  </span>
                  <FaArrowRight color="var(--colors-primary)" size={14} />
                </div>
                <div>
                  <FLPHeading as="h3" size="sm">
                    Answer 5 Quick Questions
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    We'll tailor your sections based on your housing, pension, and employment setup.
                  </FLPText>
                </div>
              </button>

              <button
                className={css({
                  padding: "24px 20px",
                  borderRadius: "xl",
                  border: "1px solid",
                  borderColor: "border",
                  backgroundColor: "surface",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  transition: "all 0.2s ease",
                  _hover: {
                    borderColor: "primary",
                    transform: "translateY(-2px)",
                    boxShadow: "sm",
                  },
                })}
                type="button"
                onClick={() => {
                  setCameFromQuiz(false);
                  setMode("manual");
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "medium",
                      color: "text.muted",
                    })}
                  >
                    Direct Setup
                  </span>
                  <FaSlidersH color="var(--colors-text-muted)" size={14} />
                </div>
                <div>
                  <FLPHeading as="h3" size="sm">
                    Choose Modules Manually
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    Browse all available financial modules and toggle each one on or off yourself.
                  </FLPText>
                </div>
              </button>
            </div>
          </FLPCard>
        )}

        {/* MODE: PROGRESSIVE BASELINE FLOW */}
        {mode === "progressive" && (
          <FLPCard
            className={css({
              padding: { base: "20px 16px", sm: "32px 24px", md: "36px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: { base: "20px", md: "24px" },
              boxShadow: "sm",
            })}
          >
            {/* Step Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--colors-border)",
                paddingBottom: "16px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "full",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor:
                      progressiveStep === 1 ? "var(--colors-primary)" : "var(--colors-surface)",
                    color: progressiveStep === 1 ? "#fff" : "var(--colors-text-muted)",
                    border: "1px solid",
                    borderColor: progressiveStep === 1 ? "transparent" : "var(--colors-border)",
                  }}
                >
                  1. Income & Tax
                </span>
                <span style={{ color: "var(--colors-text-muted)" }}>→</span>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "full",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor:
                      progressiveStep === 2 ? "var(--colors-primary)" : "var(--colors-surface)",
                    color: progressiveStep === 2 ? "#fff" : "var(--colors-text-muted)",
                    border: "1px solid",
                    borderColor: progressiveStep === 2 ? "transparent" : "var(--colors-border)",
                  }}
                >
                  2. Cash & Debt
                </span>
                <span style={{ color: "var(--colors-text-muted)" }}>→</span>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "full",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor:
                      progressiveStep === 3 ? "var(--colors-primary)" : "var(--colors-surface)",
                    color: progressiveStep === 3 ? "#fff" : "var(--colors-text-muted)",
                    border: "1px solid",
                    borderColor: progressiveStep === 3 ? "transparent" : "var(--colors-border)",
                  }}
                >
                  3. Workspace
                </span>
              </div>
              <span
                style={{ fontSize: "12px", color: "var(--colors-text-muted)", fontWeight: 500 }}
              >
                Step {progressiveStep} of 3
              </span>
            </div>

            {/* STEP 1: INCOME & TAX STATUS */}
            {progressiveStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <FLPHeading as="h2" size="md">
                    Step 1: Focus & Baseline
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    Select your primary objective to adapt your dashboard experience, tools, and
                    calculators.
                  </FLPText>
                </div>

                {/* Focus Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Where is your primary focus right now?
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectFocus("debt")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "2px solid",
                        borderColor: primaryFocus === "debt" ? "#ef4444" : "var(--colors-border)",
                        backgroundColor:
                          primaryFocus === "debt"
                            ? "rgba(239, 68, 68, 0.05)"
                            : "var(--colors-surface)",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>🔥</span>
                        <strong
                          style={{
                            fontSize: "13px",
                            color: primaryFocus === "debt" ? "#ef4444" : "inherit",
                          }}
                        >
                          Clear debt & stabilize
                        </strong>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                        Crush credit card & loan interest, find margin, and reach £0 debt.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectFocus("savings")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "2px solid",
                        borderColor:
                          primaryFocus === "savings" ? "#10b981" : "var(--colors-border)",
                        backgroundColor:
                          primaryFocus === "savings"
                            ? "rgba(16, 185, 129, 0.05)"
                            : "var(--colors-surface)",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>🛡️</span>
                        <strong
                          style={{
                            fontSize: "13px",
                            color: primaryFocus === "savings" ? "#10b981" : "inherit",
                          }}
                        >
                          Buffer & protect
                        </strong>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                        Build a £1,000 starter buffer and establish a 3–6 month emergency runway.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectFocus("wealth")}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: "2px solid",
                        borderColor:
                          primaryFocus === "wealth"
                            ? "var(--colors-primary)"
                            : "var(--colors-border)",
                        backgroundColor:
                          primaryFocus === "wealth"
                            ? "rgba(99, 99, 241, 0.05)"
                            : "var(--colors-surface)",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>🚀</span>
                        <strong
                          style={{
                            fontSize: "13px",
                            color: primaryFocus === "wealth" ? "var(--colors-primary)" : "inherit",
                          }}
                        >
                          Optimize wealth & tax
                        </strong>
                      </div>
                      <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>
                        Salary sacrifice, £100k tax trap, pensions, and mortgage equity.
                      </span>
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label
                    htmlFor="onboarding-gross-salary"
                    style={{ fontSize: "13px", fontWeight: 600 }}
                  >
                    Annual Gross Salary (£)
                  </label>
                  <input
                    id="onboarding-gross-salary"
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
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                    {[38000, 65000, 105000, 135000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGrossSalary(preset)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
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
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label
                      htmlFor="onboarding-pension-percent"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      Workplace Pension (%)
                    </label>
                    <input
                      id="onboarding-pension-percent"
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={pensionPercent}
                      onChange={(e) => setPensionPercent(Number(e.target.value) || 0)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border)",
                        backgroundColor: "var(--colors-surface)",
                        color: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label
                      htmlFor="onboarding-employment-type"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      Employment Setup
                    </label>
                    <select
                      id="onboarding-employment-type"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as any)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border)",
                        backgroundColor: "var(--colors-surface)",
                        color: "inherit",
                      }}
                    >
                      <option value="employed">Employed (PAYE)</option>
                      <option value="self-employed">Self-Employed</option>
                    </select>
                  </div>
                </div>

                {/* Live Take-Home Preview Card */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(99, 102, 241, 0.06)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        color: "var(--colors-primary)",
                      }}
                    >
                      Live Take-Home Preview
                    </span>
                    <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "2px" }}>
                      £{liveTakeHome.monthlyTakeHome.toLocaleString()}{" "}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "normal",
                          color: "var(--colors-text-muted)",
                        }}
                      >
                        / month
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                      Marginal Tax & NI Rate:
                    </span>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: liveTakeHome.trapAnalysis.isInTaxTrap
                          ? "#ef4444"
                          : "var(--colors-primary)",
                      }}
                    >
                      {liveTakeHome.trapAnalysis.marginalRatePct}%
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <FLPButton size="md" variant="primary" onClick={() => setProgressiveStep(2)}>
                    Next: Cash & Debt (30 sec) →
                  </FLPButton>
                </div>
              </div>
            )}

            {/* STEP 2: HIGH-LEVEL CASH & DEBT */}
            {progressiveStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <FLPHeading as="h2" size="md">
                    Step 2: High-Level Cash & Debt
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    Enter rough balances so your Net Worth tracker and runway are immediately
                    populated.
                  </FLPText>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label
                      htmlFor="onboarding-cash-savings"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      Total Cash & Emergency Savings
                    </label>
                    <span style={{ fontWeight: 700, color: "#10b981" }}>
                      £{cashSavings.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="onboarding-cash-savings"
                    type="range"
                    min={0}
                    max={150000}
                    step={1000}
                    value={cashSavings}
                    onChange={(e) => setCashSavings(Number(e.target.value) || 0)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label
                      htmlFor="onboarding-investments"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      Total Investments & Workplace Pensions
                    </label>
                    <span style={{ fontWeight: 700, color: "var(--colors-primary)" }}>
                      £{investments.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="onboarding-investments"
                    type="range"
                    min={0}
                    max={300000}
                    step={2500}
                    value={investments}
                    onChange={(e) => setInvestments(Number(e.target.value) || 0)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <label
                      htmlFor="onboarding-mortgage-debt"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      Remaining Residential Mortgage or Debt
                    </label>
                    <span
                      style={{ fontWeight: 700, color: mortgageDebt > 0 ? "#f59e0b" : "inherit" }}
                    >
                      £{mortgageDebt.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="onboarding-mortgage-debt"
                    type="range"
                    min={0}
                    max={600000}
                    step={5000}
                    value={mortgageDebt}
                    onChange={(e) => setMortgageDebt(Number(e.target.value) || 0)}
                  />
                </div>

                {/* Net Worth Summary Preview */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    backgroundColor: "var(--colors-surface)",
                    border: "1px solid var(--colors-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--colors-text-muted)" }}>
                    Starting Estimated Net Worth:
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: "#10b981" }}>
                    £{(cashSavings + investments - mortgageDebt).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <FLPButton size="sm" variant="ghost" onClick={() => setProgressiveStep(1)}>
                    ← Back to Income
                  </FLPButton>
                  <FLPButton size="md" variant="primary" onClick={() => setProgressiveStep(3)}>
                    Next: Workspace Modules →
                  </FLPButton>
                </div>
              </div>
            )}

            {/* STEP 3: WORKSPACE MODULE CONFIRMATION */}
            {progressiveStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <FLPHeading as="h2" size="md">
                    Step 3: Confirm Your Workspace Modules
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    We've auto-selected the modules matching your financial baseline.
                  </FLPText>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {ALL_PAGE_KEYS.map((key) => {
                    const cfg = APP_PAGES[key];
                    const isChecked = selectedPages.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTogglePage(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor: isChecked ? "var(--colors-primary)" : "var(--colors-border)",
                          backgroundColor: isChecked ? "rgba(99, 102, 241, 0.05)" : "transparent",
                          cursor: "pointer",
                          color: "inherit",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: 600, fontSize: "13px" }}>{cfg.label}</span>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--colors-text-muted)",
                              textTransform: "uppercase",
                            }}
                          >
                            {cfg.category}
                          </span>
                        </div>
                        {isChecked ? (
                          <FaCheckCircle style={{ color: "#10b981" }} />
                        ) : (
                          <FaRegCircle style={{ color: "var(--colors-text-muted)" }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <FLPButton size="sm" variant="ghost" onClick={() => setProgressiveStep(2)}>
                    ← Back to Cash & Debt
                  </FLPButton>
                  <FLPButton
                    size="md"
                    variant="primary"
                    disabled={isSubmitting || selectedPages.length === 0}
                    onClick={handleFinish}
                  >
                    {isSubmitting ? "Launching..." : "Finish Setup & Launch Dashboard →"}
                  </FLPButton>
                </div>
              </div>
            )}
          </FLPCard>
        )}

        {/* MODE: 5-QUESTION QUESTIONNAIRE */}
        {mode === "quiz" && (
          <FLPCard
            className={css({
              padding: { base: "16px 14px", sm: "28px 24px", md: "36px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: { base: "16px", md: "24px" },
              boxShadow: "sm",
            })}
          >
            {/* Progress Bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "bold",
                    color: "primary",
                    textTransform: "uppercase",
                    letterSpacing: "wider",
                  })}
                >
                  Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                </span>
                <span className={css({ fontSize: "xs", color: "text.muted" })}>
                  {currentQ.category}
                </span>
              </div>
              <div
                className={css({
                  width: "100%",
                  height: "6px",
                  backgroundColor: "secondary",
                  borderRadius: "full",
                  overflow: "hidden",
                })}
              >
                <div
                  className={css({
                    height: "100%",
                    backgroundColor: "primary",
                    borderRadius: "full",
                    transition: "width 0.3s ease",
                  })}
                  style={{
                    width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card Content */}
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: { base: "8px 0", sm: "16px 0" },
              })}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    backgroundColor: currentQ.iconBg,
                    color: currentQ.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {currentQ.icon}
                </div>
                <div>
                  <FLPHeading as="h2" size="md">
                    {currentQ.title}
                  </FLPHeading>
                  <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "6px" }}>
                    {currentQ.description}
                  </FLPText>
                </div>
              </div>
            </div>

            {/* Answer Buttons */}
            <div
              className={css({
                display: "flex",
                flexDirection: { base: "column", sm: "row" },
                gap: "12px",
              })}
            >
              <FLPButton
                className={css({ flex: 1 })}
                size="lg"
                variant="primary"
                onClick={() => handleAnswerQuestion(true)}
              >
                <FaCheck style={{ marginRight: "8px" }} /> {currentQ.yesLabel}
              </FLPButton>
              <FLPButton
                className={css({ flex: 1 })}
                size="lg"
                variant="outline"
                onClick={() => handleAnswerQuestion(false)}
              >
                {currentQ.noLabel}
              </FLPButton>
            </div>

            {/* Bottom Nav */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              <FLPButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex((prev) => prev - 1);
                  } else {
                    setMode("welcome");
                  }
                }}
              >
                <FaArrowLeft style={{ marginRight: "6px" }} /> Back
              </FLPButton>

              <button
                className={css({
                  fontSize: "xs",
                  color: "text.muted",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  _hover: { color: "primary", textDecoration: "underline" },
                })}
                type="button"
                onClick={() => {
                  setCameFromQuiz(true);
                  setMode("manual");
                }}
              >
                Skip to Review
              </button>
            </div>
          </FLPCard>
        )}

        {/* MODE: MANUAL MODULE SELECTION */}
        {mode === "manual" && (
          <FLPCard
            className={css({
              padding: { base: "16px 14px", sm: "28px 24px", md: "36px 32px" },
              borderRadius: "2xl",
              border: "1px solid",
              borderColor: "border",
              display: "flex",
              flexDirection: "column",
              gap: { base: "16px", md: "20px" },
              boxShadow: "sm",
            })}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <FLPHeading as="h2" size="md">
                  Select Your Active Modules
                </FLPHeading>
                <span
                  className={css({
                    fontSize: "xs",
                    color: "primary",
                    fontWeight: "bold",
                    backgroundColor: "rgba(99, 99, 241, 0.1)",
                    padding: "2px 8px",
                    borderRadius: "full",
                  })}
                >
                  {selectedPages.length} of {ALL_PAGE_KEYS.length} enabled
                </span>
              </div>
              <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
                Choose which financial sections to enable. You can change these anytime in Profile.
              </FLPText>
            </div>

            {/* List of Modules */}
            <div className={css({ display: "flex", flexDirection: "column", gap: "10px" })}>
              {ALL_PAGE_KEYS.map((key) => {
                const config = APP_PAGES[key];
                const isChecked = selectedPages.includes(key);

                return (
                  <button
                    key={key}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      textAlign: "left",
                      fontFamily: "inherit",
                      padding: "14px 16px",
                      borderRadius: "xl",
                      border: "1px solid",
                      borderColor: isChecked ? "primary" : "border",
                      backgroundColor: isChecked ? "rgba(99, 99, 241, 0.04)" : "surface",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      _hover: {
                        borderColor: "primary",
                      },
                    })}
                    type="button"
                    onClick={() => handleTogglePage(key)}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "lg",
                          backgroundColor: `${config.badgeColor}20`,
                          color: config.badgeColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {key === "accounts" && <FaWallet size={16} />}
                        {key === "budget" && <FaCoins size={16} />}
                        {key === "savings" && <FaPiggyBank size={16} />}
                        {key === "pension" && <FaShieldAlt size={16} />}
                        {key === "mortgage" && <FaBuilding size={16} />}
                        {key === "forecast" && <FaChartLine size={16} />}
                        {key === "tax" && <FaFileInvoiceDollar size={16} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FLPHeading as="h4" size="xs">
                            {config.label}
                          </FLPHeading>
                          <span
                            className={css({
                              fontSize: "10px",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                              padding: "1px 6px",
                              borderRadius: "full",
                              backgroundColor: "secondary",
                              color: "text.muted",
                            })}
                          >
                            {config.category}
                          </span>
                        </div>
                        <FLPText
                          color="text.muted"
                          fontSize="xs"
                          style={{
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {config.description}
                        </FLPText>
                      </div>
                    </div>

                    <div style={{ marginLeft: "12px", flexShrink: 0 }}>
                      {isChecked ? (
                        <FaCheckCircle style={{ color: "#10b981", fontSize: "20px" }} />
                      ) : (
                        <FaRegCircle
                          style={{ color: "var(--colors-text-muted)", fontSize: "20px" }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "12px",
                borderTop: "1px solid var(--colors-border)",
              }}
            >
              <FLPButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (cameFromQuiz) {
                    setMode("quiz");
                  } else {
                    setMode("welcome");
                  }
                }}
              >
                <FaArrowLeft style={{ marginRight: "6px" }} />{" "}
                {cameFromQuiz ? "Back to Questions" : "Back to Welcome"}
              </FLPButton>

              <FLPButton
                disabled={isSubmitting || selectedPages.length === 0}
                size="md"
                variant="primary"
                onClick={handleFinish}
              >
                {isSubmitting ? "Personalising..." : "Finish Setup & Launch Dashboard →"}
              </FLPButton>
            </div>
          </FLPCard>
        )}
      </div>
    </div>
  );
}
